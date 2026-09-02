/**
 * Phase 2.2 follow-up — publish the twelve WordPress team records whose
 * archived group membership is explicit (six Programme Committee, six
 * Communications Team). This is intentionally idempotent by source post ID
 * and only runs against the named records below.
 *
 * Set PHASE2_HELD_TEAM_DIR to the temporary directory containing the reviewed
 * portrait files extracted from cgi-bin.zip before running.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import pg from "pg";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sql = readFileSync(join(root, "localhost.sql"), "utf8");
const sourceDir = process.env.PHASE2_HELD_TEAM_DIR;
if (!sourceDir) throw new Error("Set PHASE2_HELD_TEAM_DIR to the reviewed portrait directory.");

function loadEnv() {
  const env = {};
  const raw = readFileSync(join(root, ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!projectRef || !env.SUPABASE_DB_PASSWORD || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase URL, database password, or service role key in .env");
}

function readStatementValues(start) {
  let quoted = false; let escaped = false;
  for (let i = start; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quoted) {
      if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === "'") quoted = false;
    } else if (ch === "'") quoted = true; else if (ch === ";") return sql.slice(start, i);
  }
  throw new Error("Unterminated INSERT statement");
}

function decode(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === "NULL") return null;
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return trimmed;
  return trimmed.slice(1, -1).replaceAll("''", "'").replaceAll("\\\\", "\\").replaceAll("\\'", "'").replaceAll("\\r", "\r").replaceAll("\\n", "\n");
}

function parseRows(values) {
  const rows = []; let row = null; let fieldStart = 0; let quoted = false; let escaped = false; let depth = 0;
  for (let i = 0; i < values.length; i += 1) {
    const ch = values[i];
    if (quoted) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === "'") quoted = false; continue; }
    if (ch === "'") { quoted = true; continue; }
    if (ch === "(" && depth === 0) { depth = 1; row = []; fieldStart = i + 1; }
    else if (ch === "," && depth === 1) { row.push(decode(values.slice(fieldStart, i))); fieldStart = i + 1; }
    else if (ch === ")" && depth === 1) { row.push(decode(values.slice(fieldStart, i))); rows.push(row); row = null; depth = 0; }
  }
  return rows;
}

const sourceRows = [];
const statementPattern = /INSERT INTO `wprg_posts` \([^)]*\) VALUES/g;
let match;
while ((match = statementPattern.exec(sql)) !== null) {
  const values = readStatementValues(match.index + match[0].length);
  sourceRows.push(...parseRows(values));
  statementPattern.lastIndex = match.index + match[0].length + values.length + 1;
}

const requested = {
  1852: { group: "programmes", photo: "Emmanuella-Ben.jpg" },
  1859: { group: "programmes", photo: "Sagir-Tambuwal-Muhammad.jpg" },
  1861: { group: "programmes", photo: "Head-Shot-Wambui-Njonge-_page-0001.jpg" },
  1863: { group: "programmes", photo: "M-Check-Isho.jpg" },
  1866: { group: "programmes", photo: "Adebayo-Uzoma-1-1.jpg" },
  1873: { group: "programmes", photo: "Headshot-Ngozi-Osadebe.jpg" },
  1890: { group: "communications", photo: "precious-nenga.jpeg" },
  1892: { group: "communications", photo: "Wazhi-Godsave-Binlak-.jpg" },
  1894: { group: "communications", photo: "PROFILE-PIC-3-OBIM-.jpg" },
  1895: { group: "communications", photo: null },
  1897: { group: "communications", photo: "Anthony_Godswill_Imolele-2.jpeg" },
  1898: { group: "communications", photo: "Aladejana-Abdulrahman-headshot.png" },
};

function htmlToText(value) {
  return String(value || "").replace(/<\/?(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ").replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<\s*\/\s*(?:p|div|li|h[1-6]|blockquote)\s*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const source = new Map(sourceRows.filter((row) => requested[row[0]] && row[20] === "wps-team-members" && row[7] === "publish").map((row) => [Number(row[0]), { id: Number(row[0]), name: row[5] || "", role: htmlToText(row[6]).slice(0, 160), bio: htmlToText(row[4]) }]));
if (source.size !== Object.keys(requested).length) throw new Error(`Expected ${Object.keys(requested).length} requested source rows, found ${source.size}.`);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const pgClient = new pg.Client({ host: `aws-0-${env.SUPABASE_REGION || "eu-west-1"}.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}`, password: env.SUPABASE_DB_PASSWORD, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 30000 });
await pgClient.connect();
const { rows: existing } = await pgClient.query("select name from public.team_members");
const existingNames = new Set(existing.map((row) => row.name.toLowerCase()));
const { rows: sortRows } = await pgClient.query("select coalesce(max(sort_order), 0) as max from public.team_members");
let sortOrder = Number(sortRows[0].max) + 1;
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
const imported = []; const skipped = [];

for (const [id, meta] of Object.entries(requested)) {
  const row = source.get(Number(id));
  if (existingNames.has(row.name.toLowerCase())) { skipped.push({ sourcePostId: Number(id), name: row.name, reason: "name already exists" }); continue; }
  let photoUrl = null;
  if (meta.photo) {
    const sourcePath = join(sourceDir, meta.photo);
    const buffer = await sharp(sourcePath).resize(800, 800, { fit: "cover", position: "attention", withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    const storagePath = `team-legacy-${String(id)}.jpg`;
    const upload = await supabase.storage.from("media").upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
    if (upload.error) throw new Error(`${row.name} storage: ${upload.error.message}`);
    const imageMeta = await sharp(buffer).metadata();
    const media = await supabase.from("media").upsert({ storage_path: storagePath, file_name: meta.photo, mime_type: "image/jpeg", size_bytes: buffer.length, width: imageMeta.width, height: imageMeta.height, alt_text: `${row.name}, SRN team member.` }, { onConflict: "storage_path" });
    if (media.error) throw new Error(`${row.name} media row: ${media.error.message}`);
    photoUrl = base + storagePath;
  }
  const inserted = await pgClient.query("insert into public.team_members (name, role, photo_url, bio, \"group\", sort_order) values ($1, $2, $3, $4, $5, $6) returning id, name", [row.name, row.role || null, photoUrl, row.bio, meta.group, sortOrder]);
  sortOrder += 1;
  imported.push({ sourcePostId: Number(id), sourceName: row.name, memberId: inserted.rows[0].id, group: meta.group, photo: Boolean(photoUrl), bioChars: row.bio.length });
}
await pgClient.end();

const auditPath = join(root, "wordpress-export", "phase2-team-bios-audit.json");
const prior = JSON.parse(readFileSync(auditPath, "utf8"));
prior.generatedAt = new Date().toISOString();
prior.policy = "Seven current bios were imported first. Twelve additional records were then published because the WordPress export explicitly assigns them to Programme Committee or Communications Team; they remain editable for Fortune's live corrections. No source record outside this explicit set was published.";
const publishedBySource = new Map([...(prior.publishedHeld || []), ...imported].map((entry) => [entry.sourcePostId, entry]));
prior.publishedHeld = [...publishedBySource.values()].sort((a, b) => a.sourcePostId - b.sourcePostId);
prior.skippedHeld = skipped;
prior.unmatched = [];
mkdirSync(dirname(auditPath), { recursive: true });
writeFileSync(auditPath, `${JSON.stringify(prior, null, 2)}\n`, "utf8");
console.log(`Published ${imported.length} held team records; skipped ${skipped.length}.`);
