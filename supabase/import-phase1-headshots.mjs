/**
 * Phase 1.1 — import reviewed legacy portraits for existing team members.
 *
 * Set PHASE1_HEADSHOTS_DIR to the temporary extraction directory before
 * running. The source files stay outside the repository. The operation is
 * idempotent: storage paths and media rows are upserted, then the matching
 * team member is linked to the public media URL.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const root = process.env.PHASE1_HEADSHOTS_DIR;
if (!root) throw new Error("Set PHASE1_HEADSHOTS_DIR to the reviewed source directory.");

function loadEnv() {
  const raw = readFileSync(".env", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const assets = [
  {
    source: "dr.-nafisa.jpeg",
    member: "Nafisa Elehamer",
    storagePath: "headshot-nafisa-elehamer.jpg",
    alt: "Nafisa Elehamer, SRN team member, wearing a pink head wrap and smiling at the camera.",
  },
  {
    source: "dr-moses-asori.jpeg",
    member: "Moses Asori",
    storagePath: "headshot-moses-asori.jpg",
    alt: "Moses Asori, SRN team member, wearing a dark jacket and blue shirt against a white background.",
  },
];

const bucket = "media";
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/`;

for (const asset of assets) {
  const source = join(root, asset.source);
  if (!existsSync(source)) {
    console.log(`SKIP ${asset.member}: ${source} not found`);
    continue;
  }

  const buffer = await sharp(source)
    .resize(800, 800, { fit: "cover", position: "attention", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  const metadata = await sharp(buffer).metadata();

  const { error: uploadError } = await db.storage.from(bucket).upload(asset.storagePath, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (uploadError) throw new Error(`${asset.member} storage: ${uploadError.message}`);

  const { error: mediaError } = await db.from("media").upsert(
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
  if (mediaError) throw new Error(`${asset.member} media row: ${mediaError.message}`);

  const publicUrl = base + asset.storagePath;
  const { data: member, error: memberError } = await db
    .from("team_members")
    .update({ photo_url: publicUrl })
    .eq("name", asset.member)
    .select("id, name")
    .maybeSingle();
  if (memberError) throw new Error(`${asset.member} team link: ${memberError.message}`);
  if (!member) throw new Error(`No team member row found for ${asset.member}`);

  console.log(`OK ${asset.member} -> ${asset.storagePath} (${metadata.width}x${metadata.height}, ${Math.round(buffer.length / 1024)}KB)`);
}
