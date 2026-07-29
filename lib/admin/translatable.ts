/* Sprint 7.4 — which fields a translator sees, per resource.
 *
 * Deliberately shorter than the full field list. A translator needs the prose:
 * the title, the summary, the body. They do not need the slug (it stays English
 * so URLs are stable), the image URL, the price, or the dates — translating any
 * of those would either break something or be meaningless.
 *
 * Kept beside the write-side allowlist in lib/actions/admin-translations.ts on
 * purpose: this decides what is SHOWN, that decides what is SAVED, and a field
 * present here but missing there would silently discard a translator's work.
 * If you add a row here, add it there.
 */

export type TranslatableFieldSpec = {
  name: string;
  label: string;
  multiline?: boolean;
};

export const TRANSLATABLE_FIELDS: Record<string, TranslatableFieldSpec[]> = {
  news: [
    { name: "title", label: "Title" },
    { name: "excerpt", label: "Excerpt", multiline: true },
  ],
  events: [
    { name: "title", label: "Title" },
    { name: "summary", label: "Summary", multiline: true },
  ],
  programmes: [
    { name: "title", label: "Title" },
    { name: "summary", label: "Summary", multiline: true },
  ],
  resources: [
    { name: "title", label: "Title" },
    { name: "description", label: "Description", multiline: true },
  ],
  pages: [{ name: "title", label: "Title" }],
  courses: [
    { name: "title", label: "Title" },
    { name: "summary", label: "Summary", multiline: true },
  ],
};

/** The French values already stored, as a plain map for the form. */
export function frTranslation(translations: unknown): Record<string, string> {
  if (!translations || typeof translations !== "object") return {};
  const fr = (translations as Record<string, unknown>).fr;
  if (!fr || typeof fr !== "object") return {};

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fr as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
