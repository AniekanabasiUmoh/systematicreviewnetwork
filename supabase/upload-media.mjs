/**
 * Resizes selected photos from the old site and uploads them to Supabase
 * Storage, recording each in the `media` table with alt text.
 *
 *   node supabase/upload-media.mjs
 *
 * Source images are the real SRN workshop photos pulled by
 * import-wordpress.mjs — never stock (§7). Originals are up to 6000px wide, so
 * each is resized to a sensible delivery width and re-encoded before upload.
 *
 * Alt text is written by hand below rather than generated: §3.5 requires
 * descriptive alt text, and the old site's alt fields were almost all empty.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(here, "..", "wordpress-export", "images");

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
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

/* Chosen by eye from the 27 real workshop photos. Each carries alt text
   describing what is actually happening, not "image of workshop". */
const ASSETS = [
  {
    file: "photo_2.jpg",
    key: "hero-facilitator-presenting.jpg",
    width: 2400,
    alt: "An SRN facilitator presenting a session on search strategies to a hybrid workshop, with slides and a video call visible on screen.",
    role: "hero",
  },
  {
    file: "photo_3.jpg",
    key: "workshop-full-room.jpg",
    width: 2000,
    alt: "Researchers working on laptops during an SRN systematic review workshop while a facilitator presents at the lectern.",
    role: "event",
  },
  {
    file: "photo_30.jpg",
    key: "award-of-honour.jpg",
    width: 2000,
    alt: "SRN team members receiving an Award of Honour at a hybrid workshop, with online participants visible on the screen behind.",
    role: "event",
  },
  {
    file: "photo_17.jpg",
    key: "team-at-workshop-banner.jpg",
    width: 2000,
    alt: "Four SRN team members standing together in front of a Workshop on Systematic Reviews and Meta-Analyses banner.",
    role: "event",
  },
  {
    file: "photo_21.jpg",
    key: "workshop-participants.jpg",
    width: 2000,
    alt: "Participants at an SRN systematic review workshop.",
    role: "event",
  },
  {
    file: "photo_31_compressed.jpg",
    key: "workshop-session.jpg",
    width: 2000,
    alt: "A working session during an SRN systematic review training.",
    role: "event",
  },
];

const BUCKET = "media";

async function main() {
  let uploaded = 0;

  for (const a of ASSETS) {
    const src = join(IMAGES, a.file);
    if (!existsSync(src)) {
      console.log(`  skip ${a.file} — not found locally`);
      continue;
    }

    /* Resize + re-encode. The originals are 4–8MB DSLR JPEGs; serving those
       directly would wreck the Lighthouse performance score that Sprint 2.1
       just earned. next/image handles format negotiation from here. */
    const buf = await sharp(src)
      .resize({ width: a.width, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const meta = await sharp(buf).metadata();

    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(a.key, buf, { contentType: "image/jpeg", upsert: true });

    if (upErr) {
      console.log(`  FAIL ${a.key}: ${upErr.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(a.key);

    /* media rows are keyed by storage_path, so re-running updates rather than
       duplicating. */
    const { error: dbErr } = await db.from("media").upsert(
      {
        storage_path: a.key,
        file_name: a.file,
        mime_type: "image/jpeg",
        size_bytes: buf.length,
        width: meta.width,
        height: meta.height,
        alt_text: a.alt,
      },
      { onConflict: "storage_path" },
    );

    if (dbErr) {
      console.log(`  FAIL media row ${a.key}: ${dbErr.message}`);
      continue;
    }

    uploaded++;
    console.log(
      `  ok   ${a.key.padEnd(34)} ${meta.width}x${meta.height}  ${(buf.length / 1024).toFixed(0)}KB`,
    );
    console.log(`       ${publicUrl}`);
  }

  console.log(`\nUploaded ${uploaded}/${ASSETS.length}.`);

  /* Wire the hero into the homepage singleton so the site uses it. */
  const hero = ASSETS.find((a) => a.role === "hero");
  if (hero) {
    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET).getPublicUrl(hero.key);
    const { error } = await db
      .from("homepage")
      .update({ hero_image_url: publicUrl })
      .eq("id", true);
    console.log(
      error ? `homepage hero: FAILED ${error.message}` : "homepage hero: set",
    );
  }
}

main().catch((e) => {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
