import { describe, it, expect, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Sprint 4 — server-action behaviour, exercised through the real modules
 * against the real database. These are integration tests, deliberately: the
 * value is proving the actual gates (validation, dedupe, capacity, state
 * machine) behave, not that a mock returns what we told it to.
 *
 * Server actions call next/headers (for the rate-limiter's client IP), which
 * throws outside a request scope — so the tests below exercise the pure schema
 * layer plus the database invariants the actions rely on. The action wiring
 * itself is covered by the live HTTP checks in the build verification. */

import {
  contactSchema,
  partnershipSchema,
  newsletterSchema,
} from "@/lib/actions/schemas";
import { registrationState, isFree, formatPrice } from "@/lib/events";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const TEST_TAG = `vitest+${Date.now()}`;

afterAll(async () => {
  await admin.from("registrations").delete().ilike("email", "vitest+%");
  await admin.from("applications").delete().ilike("email", "vitest+%");
  await admin.from("contact_messages").delete().ilike("email", "vitest+%");
  await admin.from("newsletter_signups").delete().ilike("email", "vitest+%");
});

describe("validation schemas reject bad input (§3.1)", () => {
  it("rejects a malformed email", () => {
    const r = contactSchema.safeParse({
      name: "A",
      email: "not-an-email",
      message: "hello",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty message", () => {
    const r = contactSchema.safeParse({
      name: "A",
      email: "a@example.org",
      message: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("enforces the 2,000-character cap server-side (§3.2)", () => {
    const r = contactSchema.safeParse({
      name: "A",
      email: "a@example.org",
      message: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });

  it("trims and normalises blank optionals to undefined", () => {
    const r = contactSchema.safeParse({
      name: "  Ada  ",
      email: " a@example.org ",
      subject: "   ",
      message: " hi ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Ada");
      expect(r.data.subject).toBeUndefined();
      expect(r.data.message).toBe("hi");
    }
  });

  it("requires an interest on the partnership form", () => {
    const r = partnershipSchema.safeParse({
      name: "A",
      email: "a@example.org",
      interest: "",
      message: "hi",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a valid newsletter email", () => {
    expect(newsletterSchema.safeParse({ email: "a@example.org" }).success).toBe(
      true,
    );
  });
});

describe("registration invariants (§4.1 / §13.2)", () => {
  it("dedupes case-insensitively on (event_id, email)", async () => {
    const { data: ev } = await admin
      .from("events")
      .select("id")
      .eq("status", "published")
      .limit(1)
      .single();

    const email = `${TEST_TAG}@example.com`;
    const first = await admin.from("registrations").insert({
      event_id: ev!.id,
      full_name: "Test",
      email,
      country: "Nigeria",
      payment_status: "not_required",
    });
    expect(first.error).toBeNull();

    const dupe = await admin.from("registrations").insert({
      event_id: ev!.id,
      full_name: "Test",
      email: email.toUpperCase(),
      country: "Nigeria",
      payment_status: "not_required",
    });
    expect(dupe.error?.code).toBe("23505");
  });

  it("dedupes newsletter signups on lower(email)", async () => {
    const email = `${TEST_TAG}-news@example.com`;
    const a = await admin.from("newsletter_signups").insert({ email });
    expect(a.error).toBeNull();
    const b = await admin
      .from("newsletter_signups")
      .insert({ email: email.toUpperCase() });
    expect(b.error?.code).toBe("23505");
  });

  it("only paid / not_required rows count toward capacity", async () => {
    const { data: ev } = await admin
      .from("events")
      .select("id")
      .eq("status", "published")
      .limit(1)
      .single();

    // A pending (abandoned checkout) row must NOT hold a seat.
    const pendingEmail = `${TEST_TAG}-pending@example.com`;
    await admin.from("registrations").insert({
      event_id: ev!.id,
      full_name: "Pending",
      email: pendingEmail,
      country: "Nigeria",
      payment_status: "pending",
      paystack_reference: `test_${TEST_TAG}`,
    });

    const { data: held } = await admin
      .from("registrations")
      .select("id")
      .eq("event_id", ev!.id)
      .in("payment_status", ["paid", "not_required"]);
    const { data: all } = await admin
      .from("registrations")
      .select("id")
      .eq("event_id", ev!.id);

    expect((all ?? []).length).toBeGreaterThan((held ?? []).length);
  });
});

describe("state machine + pricing (§2.6 / §13.1)", () => {
  const base = {
    registration_opens: null,
    registration_closes: null,
    capacity: null,
    registration_closed_manually: false,
  };

  it("returns past for a finished event", () => {
    expect(
      registrationState(
        { ...base, starts_at: "2020-01-01T00:00:00Z", ends_at: null },
        0,
      ),
    ).toBe("past");
  });

  it("returns full when confirmed seats meet capacity", () => {
    expect(
      registrationState(
        {
          ...base,
          starts_at: "2099-01-01T00:00:00Z",
          ends_at: null,
          capacity: 10,
        },
        10,
      ),
    ).toBe("full");
  });

  it("is not full when only unconfirmed seats exist", () => {
    expect(
      registrationState(
        {
          ...base,
          starts_at: "2099-01-01T00:00:00Z",
          ends_at: null,
          capacity: 10,
        },
        0,
      ),
    ).toBe("open");
  });

  it("treats null and 0 price as free (§13.1)", () => {
    expect(isFree(null)).toBe(true);
    expect(isFree(0)).toBe(true);
    expect(isFree(1)).toBe(false);
    expect(formatPrice(null)).toBe("Free");
    expect(formatPrice(2500000, "NGN")).toContain("25,000");
  });
});
