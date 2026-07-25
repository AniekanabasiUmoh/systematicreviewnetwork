import "server-only";

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Abuse protection shared by every public form action (§3.2):
 *   - honeypot: a filled hidden field means a bot; drop silently.
 *   - per-IP rate limit: 5 submissions / hour / form, Postgres-backed.
 *   - suspicious-burst logging: anything at/over the cap is logged.
 *
 * The service-role client is used because rate_limits has no anon policy. */

const LIMIT_PER_HOUR = 5;
export const HONEYPOT_FIELD = "website";

/** True when the honeypot was filled — caller should feign success. */
export function isHoneypotTripped(form: FormData): boolean {
  const v = form.get(HONEYPOT_FIELD);
  return typeof v === "string" && v.trim().length > 0;
}

/** Best-effort client IP from the proxy chain. Falls back to a constant so the
 *  limiter still degrades to a shared bucket rather than failing open. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export type RateResult = { ok: true } | { ok: false };

/** Bump and check the per-IP/hour counter for a form. Fails OPEN on a limiter
 *  error: a legitimate submitter must not be blocked by our own infra hiccup —
 *  the honeypot and validation still stand. */
export async function checkRateLimit(
  form: string,
  ip: string,
): Promise<RateResult> {
  try {
    /* The types generator (supabase/gen-types.mjs) doesn't introspect stored
       functions — it emits `Functions: never` — so .rpc() names don't
       typecheck. Cast the client to a plain rpc signature for these two known
       helpers rather than hand-editing generated types on every regen. */
    const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
      fn: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    const { data, error } = await rpc("bump_rate_limit", {
      p_form: form,
      p_ip: ip,
    });
    if (error || typeof data !== "number") return { ok: true };

    // Opportunistic housekeeping, ~1 call in 20, non-blocking.
    if (Math.random() < 0.05) {
      void rpc("prune_rate_limits");
    }

    if (data > LIMIT_PER_HOUR) {
      console.warn(
        `[abuse] rate limit exceeded: form=${form} ip=${ip} count=${data}`,
      );
      return { ok: false };
    }
    if (data === LIMIT_PER_HOUR) {
      console.warn(`[abuse] burst near cap: form=${form} ip=${ip}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("[abuse] rate limiter unavailable, failing open:", err);
    return { ok: true };
  }
}

export const RATE_LIMITED_MESSAGE =
  "You've sent a few messages in a short time. Please wait a little while and try again, or email us directly.";
