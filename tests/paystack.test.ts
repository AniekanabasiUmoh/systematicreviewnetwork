import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "@/lib/paystack";
import { buildEventIcs } from "@/lib/ics";

/* §13.4 — the webhook signature check is the single gate between the public
 * internet and "this payment is real". It gets adversarial tests of its own.
 *
 * verifyWebhookSignature keys on PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET_KEY.
 * Both are empty in .env today, so the function must FAIL CLOSED — which is
 * itself the most important property to assert. When keys are configured the
 * signing tests below run against the real HMAC path. */

const secret =
  process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || "";
const configured = secret.length > 0;

const body = JSON.stringify({
  event: "charge.success",
  data: { id: 123, reference: "srn_test_ref", status: "success" },
});

describe("webhook signature verification", () => {
  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it("rejects a garbage signature", () => {
    expect(verifyWebhookSignature(body, "not-a-signature")).toBe(false);
  });

  it("rejects a wrong-length signature (no timingSafeEqual throw)", () => {
    expect(verifyWebhookSignature(body, "abcd")).toBe(false);
  });

  it("rejects a signature computed with the wrong key", () => {
    const forged = createHmac("sha512", "attacker-key")
      .update(body, "utf8")
      .digest("hex");
    expect(verifyWebhookSignature(body, forged)).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    if (configured) return; // covered by the accept-test below instead
    const anySig = createHmac("sha512", "x").update(body).digest("hex");
    expect(verifyWebhookSignature(body, anySig)).toBe(false);
  });

  it.skipIf(!configured)("accepts a correctly signed body", () => {
    const valid = createHmac("sha512", secret).update(body, "utf8").digest("hex");
    expect(verifyWebhookSignature(body, valid)).toBe(true);
  });

  it.skipIf(!configured)("rejects a tampered body with a valid old signature", () => {
    const valid = createHmac("sha512", secret).update(body, "utf8").digest("hex");
    const tampered = body.replace("srn_test_ref", "srn_other_ref");
    expect(verifyWebhookSignature(tampered, valid)).toBe(false);
  });
});

describe("ics builder", () => {
  const ics = buildEventIcs({
    uid: "abc@systematicreviewsnetwork.org",
    title: "Evidence Synthesis Webinar; July",
    location: "Online, via Zoom",
    startsAt: "2026-08-01T09:00:00.000Z",
    endsAt: "2026-08-01T11:00:00.000Z",
    url: "https://example.org/e",
  });

  it("emits a well-formed VCALENDAR with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("formats UTC timestamps per RFC 5545", () => {
    expect(ics).toContain("DTSTART:20260801T090000Z");
    expect(ics).toContain("DTEND:20260801T110000Z");
  });

  it("escapes commas and semicolons in text values", () => {
    expect(ics).toContain("SUMMARY:Evidence Synthesis Webinar\\; July");
    expect(ics).toContain("LOCATION:Online\\, via Zoom");
  });

  it("defaults a missing end time to two hours after the start", () => {
    const noEnd = buildEventIcs({
      uid: "x",
      title: "T",
      startsAt: "2026-08-01T09:00:00.000Z",
    });
    expect(noEnd).toContain("DTEND:20260801T110000Z");
  });
});
