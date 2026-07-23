/**
 * Applies supabase/migrations/*.sql in filename order.
 *
 * Tracked in a _migrations table and wrapped per-file in a transaction, so
 * re-running is safe and a failed migration leaves nothing half-applied.
 *
 *   node supabase/migrate.mjs          apply pending
 *   node supabase/migrate.mjs --status show what would run
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "migrations");

// Load .env without adding a dependency just for this.
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(here, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to process.env
  }
  /* .env wins over the ambient shell. A stale exported SUPABASE_DB_PASSWORD
     otherwise silently shadows the project's real one and surfaces as a
     confusing "password authentication failed". */
  return { ...process.env, ...env };
}

const env = loadEnv();

const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/,
)?.[1];
const password = env.SUPABASE_DB_PASSWORD;

if (!projectRef || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env",
  );
  process.exit(1);
}

/* Session pooler on port 5432. The pooler host is required because direct
   db.<ref>.supabase.co is IPv6-only and unreachable from most IPv4 networks.
   Region verified as eu-west-1 for this project; override via SUPABASE_REGION
   if the project ever moves.

   Credentials are passed as discrete fields rather than in a connection URL:
   passwords containing URL-significant characters get mangled in the URL path
   and surface as a misleading "password authentication failed". */
const region = env.SUPABASE_REGION || "eu-west-1";
const connection = {
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${projectRef}`,
  password,
  database: "postgres",
};

const statusOnly = process.argv.includes("--status");

const client = new pg.Client({
  ...connection,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

try {
  await client.connect();

  await client.query(`
    create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set(
    (await client.query("select name from _migrations")).rows.map(
      (r) => r.name,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (statusOnly) {
    console.log(`applied: ${files.length - pending.length}/${files.length}`);
    for (const f of files) {
      console.log(`  ${applied.has(f) ? "[x]" : "[ ]"} ${f}`);
    }
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log("No pending migrations.");
    process.exit(0);
  }

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`applying ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
    } catch (err) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`\n${err.message}\n`);
      if (err.position) {
        const upto = sql.slice(0, Number(err.position));
        console.error(`  at line ${upto.split("\n").length}`);
      }
      process.exit(1);
    }
  }

  console.log(`\nApplied ${pending.length} migration(s).`);
} catch (err) {
  console.error(`Connection failed: ${err.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
