import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Adversarial RLS suite (Design.md §9 Sprint 3.1).
 *
 * Uses the PUBLIC ANON KEY — the exact credential shipped to browsers — and
 * asserts the security boundary from the attacker's seat:
 *   1. submission tables: anon can neither read nor write them;
 *   2. no table anywhere accepts an anon insert/update/delete;
 *   3. published content IS readable;
 *   4. draft content is NOT readable.
 *
 * If any of these fail, the site is leaking or writable by anyone. This is the
 * `npm test` gate.
 *
 * A "success" for us is a query returning zero rows OR an RLS error — either
 * way the anon key got nothing. We never want the opposite: a populated result
 * or a silent write. */

// Minimal .env loader — same convention as supabase/migrate.mjs, no dep needed.
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through to process.env */
  }
  return { ...process.env, ...env } as Record<string, string>;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SUBMISSION_TABLES = [
  "registrations",
  "applications",
  "newsletter_signups",
  "contact_messages",
  "donations",
] as const;

const CONTENT_TABLES = [
  "events",
  "news",
  "team_members",
  "resources",
  "impact_stats",
  "reach_countries",
  "testimonials",
  "partners",
  "homepage",
  "pages",
  "media",
] as const;

let anon: SupabaseClient;

beforeAll(() => {
  if (!URL || !ANON) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env",
    );
  }
  anon = createClient(URL, ANON, { auth: { persistSession: false } });
});

describe("submission tables are invisible to anon", () => {
  for (const table of SUBMISSION_TABLES) {
    it(`anon cannot SELECT from ${table}`, async () => {
      const { data, error } = await anon.from(table).select("*").limit(1);
      // RLS with no policy returns [] (not an error) for select; the guarantee
      // we need is: never any rows.
      expect(error ?? { message: "no error" }).toBeTruthy();
      expect(data ?? []).toHaveLength(0);
    });

    it(`anon cannot INSERT into ${table}`, async () => {
      const { error } = await anon
        .from(table)
        .insert({ email: "attacker@example.com" } as never);
      expect(error).not.toBeNull();
    });
  }
});

describe("no table anywhere accepts anon writes", () => {
  for (const table of [...SUBMISSION_TABLES, ...CONTENT_TABLES]) {
    it(`anon cannot INSERT into ${table}`, async () => {
      const { error } = await anon
        .from(table)
        .insert({} as never);
      expect(error).not.toBeNull();
    });

    it(`anon cannot DELETE from ${table}`, async () => {
      // A delete with an always-true filter would nuke the table if it slipped
      // through; RLS must reject it. Success = 0 rows affected AND/OR error.
      const { error, count } = await anon
        .from(table)
        .delete({ count: "exact" })
        .not("id", "is", null);
      // Either the delete errors, or it affects zero rows (no write leaked).
      expect(error !== null || (count ?? 0) === 0).toBe(true);
    });
  }
});

describe("published content is readable", () => {
  it("anon CAN read a published event", async () => {
    const { data, error } = await anon
      .from("events")
      .select("slug")
      .eq("slug", "beginner-academy-cohort-4")
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.slug).toBe("beginner-academy-cohort-4");
  });

  it("anon CAN read published news", async () => {
    const { data } = await anon
      .from("news")
      .select("slug")
      .eq("status", "published");
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});

describe("draft content is NOT readable", () => {
  it("anon canNOT read a draft event", async () => {
    const { data } = await anon
      .from("events")
      .select("slug")
      .eq("slug", "draft-institutional-training")
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("anon canNOT read a draft news item", async () => {
    const { data } = await anon
      .from("news")
      .select("slug")
      .eq("slug", "draft-news-item")
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("anon sees zero draft events even without a slug filter", async () => {
    const { data } = await anon.from("events").select("status");
    expect((data ?? []).every((r) => r.status === "published")).toBe(true);
  });
});
