/**
 * One-time extraction: pulls the base64-embedded PNGs out of
 * new/SRNAcademy2026Draft.docx.md into supabase/academy-diagrams/, so
 * upload-academy-diagrams.mjs has real files to upload.
 *
 *   node supabase/extract-academy-diagrams.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "..", "new", "SRNAcademy2026Draft.docx.md");
const OUT_DIR = join(here, "academy-diagrams");

mkdirSync(OUT_DIR, { recursive: true });

const content = readFileSync(SOURCE, "utf8");
const pattern = /\[image(\d+)\]: <data:image\/png;base64,([^>]+)>/g;

let count = 0;
let match;
while ((match = pattern.exec(content))) {
  const [, num, b64] = match;
  const path = join(OUT_DIR, `image${num}.png`);
  writeFileSync(path, Buffer.from(b64, "base64"));
  console.log(`wrote ${path}`);
  count++;
}

console.log(`\nExtracted ${count} image(s).`);
