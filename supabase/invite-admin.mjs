/**
 * Creates the first (or any subsequent) staff account: an auth user plus a
 * matching `profiles` row. Invite-only — there is no public signup surface
 * anywhere in the app, so this script is how a staffer ever gets in.
 *
 *   npm run admin:invite -- fortune@example.org --role admin --name "Fortune Effiong"
 *
 * Re-running with the same email is safe: it looks the existing auth user up
 * and just fixes the profile/role rather than failing.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));

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

function parseArgs(argv) {
  const positional = [];
  let role = "editor";
  let name = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--role") {
      role = argv[++i];
    } else if (a === "--name") {
      name = argv[++i];
    } else {
      positional.push(a);
    }
  }

  return { email: positional[0], role, name };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const { email, role, name } = parseArgs(process.argv.slice(2));

  if (!email || !EMAIL_RE.test(email)) {
    console.error(
      'Usage: npm run admin:invite -- <email> [--role admin|editor] [--name "Full Name"]',
    );
    process.exit(1);
  }
  if (role !== "admin" && role !== "editor") {
    console.error(`Unknown --role "${role}". Use "admin" or "editor".`);
    process.exit(1);
  }

  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.",
    );
    process.exit(1);
  }

  const db = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const normalizedEmail = email.trim().toLowerCase();
  const password = randomBytes(18).toString("base64url");

  const created = await db.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
  });

  let userId;
  let reused = false;

  if (created.error) {
    const isDuplicate = /already been registered|already exists/i.test(
      created.error.message,
    );
    if (!isDuplicate) {
      console.error(`Failed to create user: ${created.error.message}`);
      process.exit(1);
    }

    const { data: list, error: listError } = await db.auth.admin.listUsers();
    if (listError) {
      console.error(`Failed to look up existing user: ${listError.message}`);
      process.exit(1);
    }
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    );
    if (!existing) {
      console.error("User reported as duplicate but could not be found.");
      process.exit(1);
    }
    userId = existing.id;
    reused = true;
  } else {
    userId = created.data.user.id;
  }

  const { error: profileError } = await db.from("profiles").upsert(
    { id: userId, role, full_name: name, email: normalizedEmail },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error(`Failed to write profile: ${profileError.message}`);
    process.exit(1);
  }

  console.log(
    reused
      ? `Updated existing account: ${normalizedEmail} → role "${role}".`
      : `Created account: ${normalizedEmail} → role "${role}".`,
  );
  if (!reused) {
    console.log(`\nTemporary password: ${password}`);
    console.log(
      "Give this to them over a channel that isn't email, and have them change it at first sign-in.",
    );
  } else {
    console.log(
      "\n(Existing account — no new password generated. Use Supabase's password reset if needed.)",
    );
  }
}

main().catch((e) => {
  console.error(`Failed: ${e.message}`);
  process.exit(1);
});
