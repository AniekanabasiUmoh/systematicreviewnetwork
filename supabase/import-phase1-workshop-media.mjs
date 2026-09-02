/** Phase 1.2 — import a small, reviewed set of authentic workshop photos. */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const root = process.env.PHASE1_WORKSHOP_DIR;
if (!root) throw new Error("Set PHASE1_WORKSHOP_DIR to the reviewed source directory.");

function envFile() {
  const out = { ...process.env };
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const env = envFile();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const assets = [
  {
    source: "Workshop-153.jpg",
    storagePath: "workshop-group-historical.jpg",
    alt: "Participants and facilitators at an SRN systematic review and meta-analysis workshop gathered outside a university building; historic partner marks are visible in the original photograph.",
  },
  {
    source: "Workshop184-1.jpg",
    storagePath: "workshop-classroom-historical.jpg",
    alt: "Researchers taking part in an SRN systematic review workshop in a lecture room; historic partner marks are visible in the original photograph.",
  },
  {
    source: "Workshop063-1.jpg",
    storagePath: "workshop-discussion-historical.jpg",
    alt: "Workshop participants discussing systematic review methods around a table; the historic SRN/ACSRM context remains visible in the original photograph.",
  },
];

for (const asset of assets) {
  const source = join(root, asset.source);
  if (!existsSync(source)) {
    console.log(`SKIP ${asset.source}: source not found`);
    continue;
  }
  const buffer = await sharp(source)
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  const metadata = await sharp(buffer).metadata();
  const { error: uploadError } = await db.storage.from("media").upload(asset.storagePath, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) throw new Error(`${asset.source} storage: ${uploadError.message}`);
  const { error: rowError } = await db.from("media").upsert(
    {
      storage_path: asset.storagePath,
      file_name: asset.source,
      mime_type: "image/jpeg",
      size_bytes: buffer.length,
      width: metadata.width,
      height: metadata.height,
      alt_text: asset.alt,
    },
    { onConflict: "storage_path" },
  );
  if (rowError) throw new Error(`${asset.source} media row: ${rowError.message}`);
  console.log(`OK ${asset.source} -> ${asset.storagePath} (${metadata.width}x${metadata.height}, ${Math.round(buffer.length / 1024)}KB)`);
}
