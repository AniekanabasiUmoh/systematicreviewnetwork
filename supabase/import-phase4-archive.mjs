/**
 * Phase 4 — import the recoverable WordPress news/events archive as drafts.
 *
 * Legacy records are prefixed in their slug, remain unpublished, and are
 * inserted only when that slug is absent. This preserves the source without
 * overwriting current editorial work or exposing expired registration links.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sql = readFileSync(join(root, "localhost.sql"), "utf8");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { ...process.env, ...env };
}
const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase URL or service role key in .env");
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

function tableRows(name) {
  const rows = []; const pattern = new RegExp("INSERT INTO `" + name + "` \\([^)]*\\) VALUES", "g"); let match;
  while ((match = pattern.exec(sql)) !== null) {
    const values = readStatementValues(match.index + match[0].length);
    rows.push(...parseRows(values));
    pattern.lastIndex = match.index + match[0].length + values.length + 1;
  }
  return rows;
}

const strip = (value) => String(value || "")
  .replace(/<\/?(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ")
  .replace(/<\s*br\s*\/?\s*>/gi, "\n")
  .replace(/<\s*\/\s*(?:p|div|li|h[1-6]|blockquote|section|tr)\s*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
  .replace(/&#8217;|&#39;|&apos;/gi, "'").replace(/&#8211;|&ndash;/gi, "–")
  .replace(/&#8212;|&mdash;/gi, "—").replace(/[ \t]+/g, " ")
  .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();

function richDoc(text) {
  const paragraphs = String(text || "").split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
  return { type: "doc", content: (paragraphs.length ? paragraphs : ["Legacy content pending editorial review."]).map((text) => ({ type: "paragraph", content: [{ type: "text", text: text.slice(0, 5000) }] })) };
}

function slugify(value) {
  return String(value || "legacy").toLowerCase().replace(/&[a-z]+;/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "legacy-item";
}

function parseDate(value, fallback) {
  const source = String(value || fallback || "").trim();
  const match = source.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (!match) return new Date(fallback || "2025-01-01T00:00:00Z").toISOString();
  return new Date(`${match[1]}T${match[2] || "00:00:00"}+01:00`).toISOString();
}

const posts = tableRows("wprg_posts");
const postmeta = tableRows("wprg_postmeta");
const meta = new Map();
for (const row of postmeta) {
  const id = String(row[1]);
  if (!meta.has(id)) meta.set(id, new Map());
  meta.get(id).set(String(row[2]), row[3]);
}

const legacyNews = posts.filter((row) => row[20] === "post" && row[7] === "publish").map((row) => {
  const text = strip(row[4]);
  return {
    sourcePostId: Number(row[0]), title: strip(row[5]), slug: `legacy-${row[0]}-${slugify(row[11] || row[5])}`,
    body_rich: richDoc(text), excerpt: text.slice(0, 420), author: "SRN archive",
    published_at: parseDate(row[2], row[2]), status: "draft",
  };
});

function eventType(title) {
  const t = title.toLowerCase();
  if (t.includes("mentorship")) return "mentorship";
  if (t.includes("webinar") || t.includes("q and a") || t.includes("q &")) return "webinar";
  if (t.includes("course") || t.includes("beginners")) return "course";
  return "workshop";
}

function location(title, text) {
  const value = `${title} ${text}`.toLowerCase();
  if (value.includes("hybrid") || value.includes("virtual/in-person")) return "hybrid";
  if (value.includes("virtual") || value.includes("online") || value.includes("zoom")) return "online";
  return "in_person";
}

const legacyEvents = posts.filter((row) => row[20] === "tribe_events" && row[7] === "publish").map((row) => {
  const id = String(row[0]); const text = strip(row[4]); const fields = meta.get(id) || new Map();
  const start = fields.get("_EventStartDate") || row[2]; const end = fields.get("_EventEndDate");
  const title = strip(row[5]);
  return {
    sourcePostId: Number(row[0]), title, slug: `legacy-${row[0]}-${slugify(row[11] || title)}`,
    description_rich: richDoc(text), type: eventType(title), starts_at: parseDate(start, row[2]),
    ends_at: end ? parseDate(end, start) : null, location_type: location(title, text),
    location_or_link: null, registration_opens: null, registration_closes: null,
    capacity: null, banner_url: null, recording_url: null, status: "draft",
    price_kobo: null, currency: "NGN", registration_closed_manually: false,
  };
});

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [{ data: existingNews, error: newsReadError }, { data: existingEvents, error: eventsReadError }] = await Promise.all([
  db.from("news").select("slug"), db.from("events").select("slug"),
]);
if (newsReadError) throw newsReadError; if (eventsReadError) throw eventsReadError;
const newsSlugs = new Set((existingNews || []).map((row) => row.slug));
const eventSlugs = new Set((existingEvents || []).map((row) => row.slug));
const importedNews = []; const importedEvents = [];

for (const item of legacyNews) {
  if (newsSlugs.has(item.slug)) continue;
  const { sourcePostId, ...record } = item;
  const { data, error } = await db.from("news").insert(record).select("id, slug").single();
  if (error) throw new Error(`News ${sourcePostId}: ${error.message}`);
  importedNews.push({ sourcePostId, ...data }); newsSlugs.add(item.slug);
}
for (const item of legacyEvents) {
  if (eventSlugs.has(item.slug)) continue;
  const { sourcePostId, ...record } = item;
  const { data, error } = await db.from("events").insert(record).select("id, slug").single();
  if (error) throw new Error(`Event ${sourcePostId}: ${error.message}`);
  importedEvents.push({ sourcePostId, ...data }); eventSlugs.add(item.slug);
}

const auditPath = join(root, "wordpress-export", "phase4-archive-audit.json");
mkdirSync(dirname(auditPath), { recursive: true });
writeFileSync(auditPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(), source: "localhost.sql", policy: "Published WordPress posts/events were imported as unpublished drafts with legacy-prefixed slugs. Original text and dates were retained; media and registration details remain editorial review fields.",
  sourceCounts: { publishedPosts: legacyNews.length, publishedEvents: legacyEvents.length },
  imported: { news: importedNews, events: importedEvents },
  skippedExisting: { news: legacyNews.length - importedNews.length, events: legacyEvents.length - importedEvents.length },
}, null, 2)}\n`, "utf8");
console.log(`Imported ${importedNews.length}/${legacyNews.length} legacy news drafts and ${importedEvents.length}/${legacyEvents.length} event drafts.`);
