import type { EventsRow } from "@/lib/database.types";

/* §2.6 — the registration state machine, and §13 pricing helpers.
   Kept out of the components so the same logic drives the card, the event
   detail page, and the registration server action in Phase 4. */

export type RegistrationState =
  "open" | "not_yet_open" | "closed" | "full" | "past";

type EventLike = Pick<
  EventsRow,
  | "starts_at"
  | "ends_at"
  | "registration_opens"
  | "registration_closes"
  | "capacity"
  | "registration_closed_manually"
>;

/**
 * Resolves the registration state.
 *
 * `paidCount` is the number of seats actually held — for paid events that is
 * confirmed payments only (§13.2), so abandoned checkouts never consume
 * capacity. Timestamps are UTC in the database and compared as instants;
 * display formatting is a separate concern (§2.6: display in Africa/Lagos).
 */
export function registrationState(
  event: EventLike,
  paidCount = 0,
  now: Date = new Date(),
): RegistrationState {
  const t = now.getTime();
  const ends = event.ends_at ?? event.starts_at;

  if (new Date(ends).getTime() < t) return "past";
  if (event.registration_closed_manually) return "closed";

  if (
    event.registration_opens &&
    new Date(event.registration_opens).getTime() > t
  ) {
    return "not_yet_open";
  }
  if (
    event.registration_closes &&
    new Date(event.registration_closes).getTime() < t
  ) {
    return "closed";
  }
  if (event.capacity !== null && paidCount >= event.capacity) return "full";

  return "open";
}

/** Plain-language label per the §4 writing rules. Never vague, never an apology. */
export const registrationLabel: Record<RegistrationState, string> = {
  open: "Registration open",
  not_yet_open: "Registration opens soon",
  closed: "Registration closed",
  full: "Fully booked",
  past: "This event has passed",
};

/** §13.1 — null or 0 means free. Amounts are stored in minor units. */
export function isFree(price_kobo: number | null): boolean {
  return price_kobo === null || price_kobo === 0;
}

export function formatPrice(
  price_kobo: number | null,
  currency: "NGN" | "USD" = "NGN",
): string {
  if (isFree(price_kobo)) return "Free";
  const major = (price_kobo as number) / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

/** §2.6 — store UTC, display Africa/Lagos. */
export function formatEventDate(
  starts_at: string,
  ends_at?: string | null,
): string {
  const tz = "Africa/Lagos";
  const start = new Date(starts_at);
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  if (!ends_at) return start.toLocaleDateString("en-GB", opts);

  const end = new Date(ends_at);
  const sameDay =
    start.toLocaleDateString("en-GB", { timeZone: tz }) ===
    end.toLocaleDateString("en-GB", { timeZone: tz });

  if (sameDay) return start.toLocaleDateString("en-GB", opts);

  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth) {
    const d1 = start.toLocaleDateString("en-GB", {
      timeZone: tz,
      day: "numeric",
    });
    return `${d1}–${end.toLocaleDateString("en-GB", opts)}`;
  }

  return `${start.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "long" })} – ${end.toLocaleDateString("en-GB", opts)}`;
}

/** Day + month block for the card's date chip. */
export function dateBlock(starts_at: string): { day: string; month: string } {
  const d = new Date(starts_at);
  return {
    day: d.toLocaleDateString("en-GB", {
      timeZone: "Africa/Lagos",
      day: "numeric",
    }),
    month: d
      .toLocaleDateString("en-GB", { timeZone: "Africa/Lagos", month: "short" })
      .toUpperCase(),
  };
}
