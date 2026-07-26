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
  // Phase 3/4 internal tables — same posture: no anon policies at all.
  "paystack_events",
  "rate_limits",
  "profiles",
  // Sprint 5.1 — has been recording every admin mutation since; same posture.
  "admin_audit",
  // Sprint 6.1 — the first table holding personal data an end user can log in
  // and read back. Anon must get nothing: the only SELECT policy is
  // `id = auth.uid()`, which no anon caller can ever satisfy.
  "learners",
  // Sprint 6.3 — curriculum. Unlike courses/cohorts these have NO anon policy
  // at all: the catalogue is public, the teaching is not. A learner reads them
  // server-side after lib/academy/curriculum.ts has checked their enrolment.
  "modules",
  "lessons",
  "lesson_materials",
  "enrolments",
  // Sprint 6.4 — the waiting list. Same posture as enrolments.
  "cohort_waitlist",
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
  // Sprint 5.7 — was missing from this list; same public-read/staff-write shape.
  "programmes",
  // Sprint 6.2 — the Academy catalogue. Public reads published + non-archived
  // only, so an unpublished course must never be visible to anon.
  "courses",
  "cohorts",
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

describe("security-definer RPCs are not callable by anon", () => {
  /* These are SECURITY DEFINER, so an anon caller reaching them would run with
     owner privileges. PostgREST exposes any executable public-schema function
     over the anon endpoint, so EXECUTE must be revoked from `anon` explicitly —
     `revoke from public` is not enough. Guard against that regressing. */
  for (const [fn, args] of [
    ["bump_rate_limit", { p_form: "probe", p_ip: "probe" }],
    ["prune_rate_limits", {}],
    ["expire_pending_registrations", {}],
    ["is_staff", {}],
    // Sprint 5.6 — same trap as the others: revoke from public is not enough,
    // Supabase grants EXECUTE to anon/authenticated independently.
    ["append_application_note", { p_id: "00000000-0000-0000-0000-000000000000", p_note: {} }],
    // Sprint 5.11 — revoked from anon too: the public unsubscribe route uses
    // supabaseAdmin, so granting anon here would add an enumerable mutation
    // surface (probe tokens via the anon REST endpoint) for no reason.
    ["unsubscribe_newsletter", { p_token: "00000000-0000-0000-0000-000000000000" }],
    // Sprint 6.1 — the learner trust boundary. is_verified_learner() is granted
    // to `authenticated` only because a learner-owned RLS policy invokes it as
    // that role; anon must never reach it.
    ["is_verified_learner", {}],
    // Sprint 6.4 — expires abandoned checkouts. Called by the cron route on the
    // service role; anon reaching it could withdraw people mid-payment.
    ["expire_pending_enrolments", {}],
    // The two mutual-exclusion trigger functions. Never called directly, but
    // PostgREST exposes any callable public-schema function, so they are
    // revoked from every API role rather than left reachable.
    ["reject_staff_as_learner", {}],
    ["reject_learner_as_staff", {}],
  ] as const) {
    it(`anon cannot execute ${fn}()`, async () => {
      const { error } = await anon.rpc(fn as never, args as never);
      expect(error).not.toBeNull();
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
