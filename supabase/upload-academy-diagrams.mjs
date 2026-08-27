/**
 * Uploads the three diagrams embedded in the client's Beginner Academy draft
 * (new/SRNAcademy2026Draft.docx.md, Module 6 "Where Does Extraction Fit?")
 * to the public `media` Storage bucket and records them in the `media` table,
 * following the same pattern as supabase/upload-media.mjs.
 *
 *   node --env-file=.env supabase/extract-academy-diagrams.mjs   (extracts first)
 *   node --env-file=.env supabase/upload-academy-diagrams.mjs
 *
 * These are the source document's own instructional diagrams (a 7-step
 * review-stage flow, a full review-process flowchart, and a 6-icon process
 * overview) — not stock imagery. Native resolution is small (the docx export
 * only preserved low-res screenshots), so each is upscaled with a
 * quality-preserving kernel; it will not look sharp, but it is the client's
 * real diagram, not a fabricated substitute, and the lesson text already
 * carries the same content in words for anyone who can't read it clearly.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(here, "academy-diagrams");

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(here, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through */
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "media";

export const DIAGRAMS = [
  {
    file: "image1.png",
    key: "academy-search-to-analysis-flow.png",
    width: 1200,
    alt: "A seven-step flow: database search, abstract screening, article retrieval, article screening, data extraction, synthesis, analysis.",
  },
  {
    file: "image2.png",
    key: "academy-review-process-flowchart.png",
    width: 1200,
    alt: "A flowchart of the systematic review process: develop the research question and protocol, run the literature search, screen titles and abstracts, retrieve full texts, screen full texts, extract data, and write and report the results.",
  },
  {
    file: "image3.png",
    key: "academy-six-step-overview.png",
    width: 1200,
    alt: "A six-icon overview: define the research question, identify inclusion and exclusion criteria, identify and assess relevant research, apply inclusion and exclusion criteria, analyse data, and interpret and write up findings.",
  },
];

async function main() {
  let uploaded = 0;

  for (const d of DIAGRAMS) {
    const src = join(IMAGES_DIR, d.file);
    if (!existsSync(src)) {
      console.log(`  skip ${d.file} — not found locally (run extract-academy-diagrams.mjs first)`);
      continue;
    }

    const buf = await sharp(src)
      .resize({ width: d.width, kernel: "lanczos3", withoutEnlargement: false })
      .png({ quality: 90 })
      .toBuffer();

    const meta = await sharp(buf).metadata();

    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(d.key, buf, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.log(`  FAIL ${d.key}: ${upErr.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(d.key);

    const { error: dbErr } = await db.from("media").upsert(
      {
        storage_path: d.key,
        file_name: d.file,
        mime_type: "image/png",
        size_bytes: buf.length,
        width: meta.width,
        height: meta.height,
        alt_text: d.alt,
      },
      { onConflict: "storage_path" },
    );
    if (dbErr) {
      console.log(`  FAIL media row ${d.key}: ${dbErr.message}`);
      continue;
    }

    uploaded++;
    console.log(`  ok   ${d.key.padEnd(38)} ${meta.width}x${meta.height}  ${(buf.length / 1024).toFixed(0)}KB`);
    console.log(`       ${publicUrl}`);
  }

  console.log(`\nUploaded ${uploaded}/${DIAGRAMS.length}.`);
}

main().catch((e) => {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
