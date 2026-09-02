/* Phase 5.1: catalogue the PDFs inside the preserved WordPress ZIP without
 * extracting or uploading their bytes. Certificates stay in the offline ZIP
 * until an administrator deliberately matches and uploads one to the private
 * bucket. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, "")]),
);

const zip = join(root, "cgi-bin.zip");
const paths = execFileSync("tar", ["-tf", zip], {
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
})
  .split(/\r?\n/)
  .map((path) => path.trim())
  .filter((path) => /\.pdf$/i.test(path));

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

const rows = paths.map((sourcePath) => ({
  source_path: sourcePath,
  file_name: sourcePath.split("/").pop() ?? sourcePath,
  mime_type: "application/pdf",
  classification: sourcePath.toLowerCase().includes("qsm-certificates")
    ? "certificate"
    : "restricted_record",
  status: "catalogued",
  metadata: {
    source: "cgi-bin.zip",
    extracted: false,
    uploadRequired: true,
  },
}));

for (let i = 0; i < rows.length; i += 100) {
  const { error } = await db
    .from("private_documents")
    .upsert(rows.slice(i, i + 100), {
      onConflict: "source_path",
    });
  if (error) throw new Error(error.message);
}

const { data: stored, error } = await db
  .from("private_documents")
  .select("classification,status")
  .order("source_path");
if (error) throw new Error(error.message);

const audit = {
  generatedAt: new Date().toISOString(),
  source: "cgi-bin.zip",
  totalPdfs: paths.length,
  certificatePdfs: rows.filter((row) => row.classification === "certificate")
    .length,
  restrictedOtherPdfs: rows.filter(
    (row) => row.classification === "restricted_record",
  ).length,
  storedCatalogRows: stored?.length ?? 0,
  uploadedBytes: 0,
  extracted: false,
  publicBucket: false,
  note: "All PDF bytes remain in the source ZIP; catalog rows are private and contain no public download URL.",
};
writeFileSync(
  join(root, "wordpress-export", "phase5-private-documents-audit.json"),
  JSON.stringify(audit, null, 2) + "\n",
);
console.log(JSON.stringify(audit, null, 2));
