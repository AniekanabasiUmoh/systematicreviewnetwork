import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Load .env into process.env before any test module is imported, so modules
   that read config at import time (lib/paystack, lib/email/client) see the real
   values. Same minimal parser as supabase/migrate.mjs — no dependency. */
try {
  const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no .env — tests that need it assert on its absence instead */
}
