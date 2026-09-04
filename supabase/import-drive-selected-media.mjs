/**
 * Import the selected photo set supplied in the 3 September 2026 Drive
 * download. The ZIP is deliberately kept outside the repository; pass its
 * extracted directory as the only argument:
 *
 *   node supabase/import-drive-selected-media.mjs C:\\path\\to\\photos
 *
 * The import is idempotent: storage_path is stable and the media row is
 * upserted, so a retry cannot create duplicate library entries. It does not
 * assign images to pages automatically; staff can choose the right photograph
 * in the Media picker after the editorial context is confirmed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* Use the process environment when .env is unavailable. */
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase URL or service-role key.");
}

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error("Pass the extracted photo directory.");

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const photos = [
  [
    "ghana1.jpg",
    "A large group of researchers gathered outside a workshop venue.",
  ],
  [
    "ghana2.jpg",
    "Workshop participants gathered outside a venue with an SRN event banner.",
  ],
  [
    "ghana3.jpg",
    "A facilitator speaking at a lectern during a systematic review workshop.",
  ],
  [
    "ghana4.jpg",
    "A facilitator presenting from a lectern during an SRN training session.",
  ],
  [
    "ghana6.jpg",
    "Researchers greeting one another during an in-person SRN workshop.",
  ],
  [
    "ghana7.jpg",
    "Workshop participants following a presentation on a large screen.",
  ],
  [
    "ghana8.jpg",
    "A systematic review presentation displayed on a screen during training.",
  ],
  [
    "ghanavirtual.jpg",
    "Online workshop participants responding to a question on screen.",
  ],
  [
    "ghanavirtual2.jpg",
    "An online systematic review training presentation shown on screen.",
  ],
  ["nigeriaph2.jpg", "Researchers working on laptops during an SRN workshop."],
  [
    "nigeriaph3.jpg",
    "A speaker presenting to researchers during an SRN training session.",
  ],
  [
    "nigeriaphoto.jpg",
    "Participants listening to a presentation during an evidence-synthesis workshop.",
  ],
  [
    "prof lessi.jpg",
    "A speaker presenting from a laptop during an SRN workshop.",
  ],
  ["srnrwanda.jpg", "Researchers gathered for an SRN workshop in Rwanda."],
  [
    "ug3.jpg",
    "Workshop participants discussing evidence-synthesis work at a table.",
  ],
];

const destinationPrefix = "drive-selected/2026-09";
const bucket = db.storage.from("media");

async function retry(operation, label) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        const delay = attempt * 1_500;
        console.log(`retry ${label} in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

let imported = 0;
for (const [fileName, altText] of photos) {
  const source = join(sourceDir, fileName);
  if (!existsSync(source)) {
    console.log(`skip ${fileName} (not present)`);
    continue;
  }

  const output = await sharp(source)
    .rotate()
    .resize({ width: 2400, withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
  const metadata = await sharp(output).metadata();
  const storagePath = `${destinationPrefix}/${fileName.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await retry(
    () =>
      bucket.upload(storagePath, output, {
        contentType: "image/jpeg",
        upsert: true,
      }),
    fileName,
  );
  if (uploadError) throw new Error(`${fileName}: ${uploadError.message}`);

  const { error: rowError } = await db.from("media").upsert(
    {
      storage_path: storagePath,
      file_name: fileName,
      mime_type: "image/jpeg",
      size_bytes: output.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      alt_text: altText,
    },
    { onConflict: "storage_path" },
  );
  if (rowError) throw new Error(`${fileName}: ${rowError.message}`);

  imported += 1;
  console.log(
    `ok ${fileName} -> ${storagePath} (${metadata.width}x${metadata.height})`,
  );
}

console.log(`Imported ${imported}/${photos.length} selected photos.`);
