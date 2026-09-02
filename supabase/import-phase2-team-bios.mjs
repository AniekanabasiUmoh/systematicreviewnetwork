/**
 * Phase 2.2 — recover public team biographies from the WordPress export.
 *
 * This is deliberately conservative: it updates biographies only for people
 * already present in the current SRN team table. Roles, groups, affiliations,
 * links, photos, and ordering remain the current site's source of truth. Older
 * or unmatched people are recorded in an audit file for editorial review.
 *
 * Run with: node supabase/import-phase2-team-bios.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const input = join(root, "localhost.sql");
const auditPath = join(root, "wordpress-export", "phase2-team-bios-audit.json");

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
const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/,
)?.[1];
if (!projectRef || !env.SUPABASE_DB_PASSWORD) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env");
}

const sql = readFileSync(input, "utf8");

function readStatementValues(start) {
  let quoted = false;
  let escaped = false;
  for (let i = start; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") quoted = false;
    } else if (ch === "'") quoted = true;
    else if (ch === ";") return sql.slice(start, i);
  }
  throw new Error("Unterminated INSERT statement");
}

function decode(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === "NULL") return null;
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return trimmed;
  return trimmed.slice(1, -1)
    .replaceAll("''", "'")
    .replaceAll("\\\\", "\\")
    .replaceAll("\\'", "'")
    .replaceAll("\\r", "\r")
    .replaceAll("\\n", "\n")
    .replaceAll("\\t", "\t");
}

function parseRows(values) {
  const rows = [];
  let row = null;
  let fieldStart = 0;
  let quoted = false;
  let escaped = false;
  let depth = 0;
  for (let i = 0; i < values.length; i += 1) {
    const ch = values[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === "'") quoted = false;
      continue;
    }
    if (ch === "'") { quoted = true; continue; }
    if (ch === "(" && depth === 0) {
      depth = 1; row = []; fieldStart = i + 1;
    } else if (ch === "," && depth === 1) {
      row.push(decode(values.slice(fieldStart, i))); fieldStart = i + 1;
    } else if (ch === ")" && depth === 1) {
      row.push(decode(values.slice(fieldStart, i))); rows.push(row); row = null; depth = 0;
    }
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

function normalizeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(professor|prof|doctor|dr|mr|mrs|ms)\.?\b/gi, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<\/?(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|blockquote)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const source = sourceRows
  .filter((row) => row[20] === "wps-team-members" && row[7] === "publish")
  .map((row) => ({
    id: Number(row[0]),
    title: row[5] || "",
    slug: row[11] || "",
    excerpt: htmlToText(row[6]),
    bio: htmlToText(row[4]),
    sourceChars: (row[4] || "").length,
  }))
  .filter((row) => row.bio.length >= 40);

const connection = {
  host: `aws-0-${env.SUPABASE_REGION || "eu-west-1"}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${projectRef}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};
const client = new pg.Client(connection);
await client.connect();

const { rows: current } = await client.query(
  'select id, name, bio from public.team_members order by sort_order, name',
);
const byName = new Map(current.map((row) => [normalizeName(row.name), row]));

const aliases = new Map([
  ["julia d ribeiro", "julia ribeiro"],
  ["julia daniela ribeiro", "julia ribeiro"],
]);
const matched = [];
const skippedExisting = [];
const unmatched = [];

for (const row of source) {
  const key = aliases.get(normalizeName(row.title)) || normalizeName(row.title);
  const member = byName.get(key);
  if (!member) {
    unmatched.push({ sourcePostId: row.id, sourceName: row.title, slug: row.slug, sourceExcerpt: row.excerpt, sourceChars: row.sourceChars });
    continue;
  }
  if (member.bio && member.bio.trim().length > 0) {
    skippedExisting.push({ sourcePostId: row.id, sourceName: row.title, memberId: member.id, memberName: member.name, reason: "current bio already populated" });
    continue;
  }
  await client.query("update public.team_members set bio = $1, updated_at = now() where id = $2", [row.bio, member.id]);
  matched.push({ sourcePostId: row.id, sourceName: row.title, memberId: member.id, memberName: member.name, bioChars: row.bio.length });
}

await client.end();
mkdirSync(dirname(auditPath), { recursive: true });
const audit = {
  generatedAt: new Date().toISOString(),
  source: "localhost.sql",
  sourceType: "wps-team-members",
  policy: "Only existing current team rows received biographies; current roles, groups, affiliations, links, photos, and order were preserved. Unmatched rows are held for editorial review.",
  sourcePublishedRows: source.length,
  matched,
  skippedExisting,
  unmatched,
};
writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Imported ${matched.length} biographies; skipped ${skippedExisting.length}; held ${unmatched.length} unmatched rows.`);
console.log(`Audit: ${auditPath}`);
