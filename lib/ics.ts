/* Minimal RFC 5545 calendar builder for the "add to calendar" attachment
 * (§4.1). Timestamps are emitted in UTC ("Z"), which every calendar app
 * localises correctly — so no VTIMEZONE block is needed. Returns the raw .ics
 * text; the caller base64-encodes it for Resend's attachment field.
 *
 * Kept dependency-free: an .ics file is a handful of CRLF-delimited lines. */

function toIcsUtc(iso: string): string {
  // 2026-08-01T09:00:00.000Z -> 20260801T090000Z
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/* RFC 5545 requires CRLF line endings and folding of long lines, plus escaping
   of commas, semicolons, and newlines in text values. */
function escapeText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildEventIcs(opts: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string | null;
  url?: string;
}): string {
  const now = toIcsUtc(new Date().toISOString());
  // Default a missing end to +2h so calendars render a block, not a point.
  const end =
    opts.endsAt ??
    new Date(new Date(opts.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Systematic Reviews Network//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsUtc(opts.startsAt)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(opts.title)}`,
    opts.description ? `DESCRIPTION:${escapeText(opts.description)}` : null,
    opts.location ? `LOCATION:${escapeText(opts.location)}` : null,
    opts.url ? `URL:${escapeText(opts.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  return lines.join("\r\n");
}
