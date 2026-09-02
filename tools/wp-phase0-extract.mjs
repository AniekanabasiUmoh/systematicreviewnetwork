/**
 * Phase 0: extract a redacted manifest from the legacy WordPress SQL dump.
 *
 * This intentionally reads only wprg_posts. It records public content
 * routing metadata, not post bodies or any user/form/security table values.
 * Run from the repository root with:
 *   node tools/wp-phase0-extract.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const input = path.resolve('localhost.sql');
const output = path.resolve('wordpress-export/phase0-database-manifest.json');
const sql = fs.readFileSync(input, 'utf8');

function readStatementValues(start) {
  let quoted = false;
  let escaped = false;
  for (let i = start; i < sql.length; i += 1) {
    const ch = sql[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === "'") quoted = false;
    } else if (ch === "'") quoted = true;
    else if (ch === ';') return sql.slice(start, i);
  }
  throw new Error('Unterminated INSERT statement');
}

function decode(value) {
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === 'NULL') return null;
  if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return trimmed;
  return trimmed.slice(1, -1)
    .replaceAll("''", "'")
    .replaceAll('\\\\', '\\')
    .replaceAll("\\'", "'")
    .replaceAll('\\r', '\r')
    .replaceAll('\\n', '\n');
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
      else if (ch === '\\') escaped = true;
      else if (ch === "'") quoted = false;
      continue;
    }
    if (ch === "'") { quoted = true; continue; }
    if (ch === '(' && depth === 0) {
      depth = 1;
      row = [];
      fieldStart = i + 1;
    } else if (ch === ',' && depth === 1) {
      row.push(decode(values.slice(fieldStart, i)));
      fieldStart = i + 1;
    } else if (ch === ')' && depth === 1) {
      row.push(decode(values.slice(fieldStart, i)));
      rows.push(row);
      row = null;
      depth = 0;
    }
  }
  return rows;
}

const rows = [];
const statementPattern = /INSERT INTO `wprg_posts` \([^)]*\) VALUES/g;
let match;
while ((match = statementPattern.exec(sql)) !== null) {
  const values = readStatementValues(match.index + match[0].length);
  rows.push(...parseRows(values));
  statementPattern.lastIndex = match.index + match[0].length + values.length + 1;
}

// WordPress wp_posts column order used by this dump.
const publicTypes = new Set([
  'attachment', 'page', 'post', 'product', 'product_variation',
  'qsm_quiz', 'tribe_events', 'tribe_organizer', 'tribe_venue',
  'wps-team-members',
]);

const destinationByType = {
  attachment: 'media-review',
  page: 'pages-review',
  post: 'news-review',
  product: 'programmes-review',
  product_variation: 'programme-variant-review',
  qsm_quiz: 'academy-quiz-review',
  tribe_events: 'events-review',
  tribe_organizer: 'event-metadata-review',
  tribe_venue: 'event-metadata-review',
  'wps-team-members': 'team-review',
};

const allRecords = rows.map((r) => ({
  id: Number(r[0]),
  date: r[2],
  title: r[5] || '',
  slug: r[11] || '',
  status: r[7] || '',
  type: r[20] || '',
  proposedDestination: destinationByType[r[20] || ''] || 'manual-review',
  mimeType: r[21] || '',
  parentId: Number(r[17] || 0),
  guid: r[18] || '',
  contentChars: (r[4] || '').length,
  excerptChars: (r[6] || '').length,
})).sort((a, b) => a.id - b.id);

const records = allRecords.filter((record) => publicTypes.has(record.type));

const groupCounts = (list, key) => Object.fromEntries(
  [...list.reduce((map, record) => {
    map.set(record[key], (map.get(record[key]) || 0) + 1);
    return map;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b)),
);

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'localhost.sql',
  sourceTable: 'wprg_posts',
  redaction: 'No post bodies, user data, form values, quiz answers, credentials, IPs, or security records are included.',
  rowCount: records.length,
  excludedRowCount: allRecords.length - records.length,
  countsByType: groupCounts(records, 'type'),
  countsByStatus: groupCounts(records, 'status'),
  excludedCountsByType: groupCounts(allRecords.filter((record) => !publicTypes.has(record.type)), 'type'),
  records,
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} redacted post records to ${output}`);
console.log('Counts by post type:', manifest.countsByType);
