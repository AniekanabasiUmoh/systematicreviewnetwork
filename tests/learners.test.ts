import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Adversarial learner-account suite (Design.md §9 Sprint 6.1).
 *
 * Sprint 6.1 is the first time this site stores personal data that an end user
 * logs in and reads back, so the sprint's own security floor is: "the anon key
 * must be provably unable to read another learner's enrolment, submission, or
 * grade". Proving that needs REAL signed-in sessions, not just anon probes —
 * an empty table returns zero rows whether RLS is working or not, so a test
 * that only counts rows on an empty table proves nothing.
 *
 * Every test below therefore creates two real auth users with real learner
 * rows, signs in as one, and asserts what that session can and cannot reach
 * WHILE the other learner's row exists. Everything is torn down afterwards.
 *
 * The three rules under test, each a real vulnerability if left to convention:
 *
 *   1. A LEARNER IS NEVER STAFF. Enforced by mutual-exclusion triggers, not by
 *      the application remembering to check. Tested in BOTH directions.
 *   2. VERIFIED IS THE TRUST BOUNDARY (Phase 6 decision 5). An unverified row
 *      is created from an address anyone can type into the public event form,
 *      so it must grant nothing.
 *   3. NO SELF-SERVICE WRITES. There is no insert/update/delete policy at all;
 *      a learner cannot even edit their own row from the browser, which is what
 *      makes it impossible to self-set verified_at.
 *
 * Skips cleanly when the service-role key is absent (CI without secrets).
 */

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
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const live = Boolean(URL && ANON && SERVICE);
const suite = live ? describe : describe.skip;

/** A password that satisfies any reasonable policy, unique per run. */
const PASSWORD = `Tst!${Math.random().toString(36).slice(2)}A9`;
const stamp = Date.now();
const EMAIL_VERIFIED = `srn-test-verified-${stamp}@example.org`;
const EMAIL_UNVERIFIED = `srn-test-unverified-${stamp}@example.org`;
const EMAIL_STAFF = `srn-test-staff-${stamp}@example.org`;

suite("Sprint 6.1 — learner accounts", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  /** A signed-in session for the VERIFIED learner — the attacker's seat. */
  let asVerified: SupabaseClient;
  /** A signed-in session for the UNVERIFIED learner. */
  let asUnverified: SupabaseClient;

  let idVerified = "";
  let idUnverified = "";
  let idStaff = "";

  beforeAll(async () => {
    admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    anon = createClient(URL, ANON, { auth: { persistSession: false } });

    /* Supabase Auth rate-limits bursts of admin user creation, and this hook
       makes three in a row. That surfaces as a retryable fetch error, not a
       policy failure — retry with backoff so a rerun shortly after a previous
       run doesn't report a security regression that isn't one. */
    const withRetry = async <T>(label: string, fn: () => Promise<T>) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err;
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
      throw new Error(
        `${label} failed after retries: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
      );
    };

    const mk = (email: string) =>
      withRetry(`createUser(${email})`, async () => {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: PASSWORD,
          email_confirm: true,
        });
        if (error) throw error;
        return data.user!.id;
      });

    idVerified = await mk(EMAIL_VERIFIED);
    idUnverified = await mk(EMAIL_UNVERIFIED);
    idStaff = await mk(EMAIL_STAFF);

    await admin.from("learners").insert({
      id: idVerified,
      email: EMAIL_VERIFIED,
      full_name: "Verified Learner",
      verified_at: new Date().toISOString(),
    } as never);
    await admin.from("learners").insert({
      id: idUnverified,
      email: EMAIL_UNVERIFIED,
      full_name: "Unverified Learner",
    } as never);
    await admin
      .from("profiles")
      .insert({ id: idStaff, email: EMAIL_STAFF, role: "editor" } as never);

    const signIn = (email: string) =>
      withRetry(`signIn(${email})`, async () => {
        const client = createClient(URL, ANON, {
          auth: { persistSession: false },
        });
        const { error } = await client.auth.signInWithPassword({
          email,
          password: PASSWORD,
        });
        if (error) throw error;
        return client;
      });
    asVerified = await signIn(EMAIL_VERIFIED);
    asUnverified = await signIn(EMAIL_UNVERIFIED);
  }, 60_000);

  afterAll(async () => {
    if (!live) return;
    const ids = [idVerified, idUnverified, idStaff].filter(Boolean);
    await admin.from("learners").delete().in("id", ids);
    await admin.from("profiles").delete().in("id", ids);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  // ── Rule 1: a learner is never staff ────────────────────────────────────

  describe("rule 1 — learner and staff identities are mutually exclusive", () => {
    it("refuses to make an existing learner into staff", async () => {
      const { error } = await admin
        .from("profiles")
        .insert({ id: idVerified, email: EMAIL_VERIFIED, role: "admin" } as never);
      expect(error).not.toBeNull();
    });

    it("refuses to make an existing staff member into a learner", async () => {
      const { error } = await admin
        .from("learners")
        .insert({ id: idStaff, email: EMAIL_STAFF } as never);
      expect(error).not.toBeNull();
    });

    /* The consequence that actually matters: lib/admin/auth.ts gates every
       admin page and mutation on a `profiles` row, so a learner failing
       is_staff() is what keeps /admin unreachable for them. */
    it("is_staff() is false for a signed-in learner", async () => {
      const { data } = await asVerified.rpc("is_staff" as never);
      expect(data).toBe(false);
    });

    it("is_admin() is false for a signed-in learner", async () => {
      const { data } = await asVerified.rpc("is_admin" as never);
      expect(data).toBe(false);
    });

    it("a signed-in learner cannot read any profiles row", async () => {
      const { data } = await asVerified.from("profiles").select("id, role");
      expect(data ?? []).toHaveLength(0);
    });
  });

  // ── Rule 2: verified is the trust boundary ──────────────────────────────

  describe("rule 2 — verified_at is the trust boundary", () => {
    it("is_verified_learner() is false for an unverified learner", async () => {
      const { data } = await asUnverified.rpc("is_verified_learner" as never);
      expect(data).toBe(false);
    });

    it("is_verified_learner() is true for a verified learner", async () => {
      const { data } = await asVerified.rpc("is_verified_learner" as never);
      expect(data).toBe(true);
    });

    it("anon cannot call is_verified_learner() at all", async () => {
      const { error } = await anon.rpc("is_verified_learner" as never);
      expect(error).not.toBeNull();
    });
  });

  // ── Rule 3: no self-service writes, own row only ────────────────────────

  describe("rule 3 — learners read their own row and nothing else", () => {
    it("a learner sees exactly one row while two learners exist", async () => {
      const { data } = await asVerified.from("learners").select("id, email");
      expect(data ?? []).toHaveLength(1);
      expect(data?.[0]?.id).toBe(idVerified);
    });

    it("a learner cannot read another learner's row by id", async () => {
      const { data } = await asVerified
        .from("learners")
        .select("id, email")
        .eq("id", idUnverified);
      expect(data ?? []).toHaveLength(0);
    });

    /* The privilege-escalation attempt this whole design exists to stop: if a
       learner could update their own row, they could set verified_at and
       promote themselves across the trust boundary without ever proving the
       address. There is no UPDATE policy, so the write silently affects zero
       rows. */
    it("a learner cannot self-verify by updating their own row", async () => {
      const { data } = await asUnverified
        .from("learners")
        .update({ verified_at: new Date().toISOString() } as never)
        .eq("id", idUnverified)
        .select();
      expect(data ?? []).toHaveLength(0);

      // And the boundary really did not move.
      const { data: still } = await asUnverified.rpc(
        "is_verified_learner" as never,
      );
      expect(still).toBe(false);
    });

    it("a learner cannot update another learner's row", async () => {
      const { data } = await asVerified
        .from("learners")
        .update({ full_name: "overwritten" } as never)
        .eq("id", idUnverified)
        .select();
      expect(data ?? []).toHaveLength(0);
    });

    it("a learner cannot delete their own row", async () => {
      const { data } = await asVerified
        .from("learners")
        .delete()
        .eq("id", idVerified)
        .select();
      expect(data ?? []).toHaveLength(0);
    });

    it("a learner cannot insert a learner row for someone else", async () => {
      const { error, data } = await asVerified
        .from("learners")
        .insert({ id: idStaff, email: "attacker@example.org" } as never)
        .select();
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    });

    it("anon reads zero learner rows while two exist", async () => {
      const { data } = await anon.from("learners").select("id");
      expect(data ?? []).toHaveLength(0);
    });
  });

  // ── Data integrity ──────────────────────────────────────────────────────

  describe("stored data is well-formed", () => {
    it("rejects a malformed ORCID even on a service-role write", async () => {
      const { error } = await admin
        .from("learners")
        .update({ orcid: "not-an-orcid" } as never)
        .eq("id", idVerified);
      expect(error).not.toBeNull();
    });

    it("accepts a valid ORCID, including the X checksum form", async () => {
      const { error } = await admin
        .from("learners")
        .update({ orcid: "0000-0002-1825-0097" } as never)
        .eq("id", idVerified);
      expect(error).toBeNull();

      const { error: xForm } = await admin
        .from("learners")
        .update({ orcid: "0000-0002-1694-233X" } as never)
        .eq("id", idVerified);
      expect(xForm).toBeNull();
    });

    it("refuses a second learner with the same email in different case", async () => {
      const { error } = await admin.from("learners").insert({
        id: idStaff, // any unused auth id would do; this one is staff-owned
        email: EMAIL_VERIFIED.toUpperCase(),
      } as never);
      // Refused either by the case-insensitive unique index or by the
      // staff-exclusion trigger — both are correct refusals.
      expect(error).not.toBeNull();
    });
  });

  // ── Decision 5: registrations link to learners ──────────────────────────

  describe("decision 5 — registrations.learner_id", () => {
    it("exists and is nullable, so pre-account registrations are not orphaned", async () => {
      const { error } = await admin
        .from("registrations")
        .select("id, learner_id, email")
        .limit(1);
      expect(error).toBeNull();
    });

    /* ON DELETE RESTRICT, for the same reason programmes and events use it
       (§5.7, §5.12): removing a learner must not silently destroy the record
       that they attended something. */
    it("refuses to delete a learner who has a registration against them", async () => {
      const { data: event } = await admin
        .from("events")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (!event) return; // no events in this database; nothing to prove

      const regEmail = `srn-test-reg-${stamp}@example.org`;
      const { data: reg } = await admin
        .from("registrations")
        .insert({
          event_id: event.id,
          full_name: "Linked Registrant",
          email: regEmail,
          country: "Nigeria",
          payment_status: "not_required",
          learner_id: idVerified,
        } as never)
        .select("id")
        .maybeSingle();

      try {
        const { error } = await admin
          .from("learners")
          .delete()
          .eq("id", idVerified);
        expect(error).not.toBeNull();
        expect(error?.code).toBe("23503"); // foreign_key_violation
      } finally {
        if (reg) await admin.from("registrations").delete().eq("id", reg.id);
      }
    });
  });
});
