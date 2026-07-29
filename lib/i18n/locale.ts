/* Sprint 7.4 — locales, and the fallback that makes a half-translated site
 * usable rather than broken.
 *
 * No `server-only`: pure functions, imported by client components and unit
 * tested directly.
 *
 * THE HONEST CONSTRAINT, restated from §7.4 because it governs everything here:
 * "Machine translation of methodological training material will produce errors
 * that damage credibility. Do not ship it without a human translator
 * committed." SRN has none today, so this module exists and is wired up, and
 * French is NOT offered to visitors — see FRENCH_ENABLED below.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * Whether French is offered to visitors.
 *
 * Deliberately a constant rather than an env var: turning this on is an
 * editorial decision that needs a person to have written the copy, not a
 * deployment toggle someone flips to see what happens. Flip it in one commit,
 * on the day a translator has worked through the backlog.
 *
 * While false: /fr still renders (falling back to English throughout) so the
 * machinery can be tested, but no switcher is shown, no hreflang is emitted,
 * and nothing links to it.
 */
export const FRENCH_ENABLED = false;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** The locale a path is asking for, and the path with the prefix removed. */
export function splitLocale(pathname: string): {
  locale: Locale;
  rest: string;
} {
  const [, first, ...others] = pathname.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, rest: "/" + others.join("/") };
  }
  return { locale: DEFAULT_LOCALE, rest: pathname };
}

/**
 * The same path in another locale.
 *
 * English is unprefixed — /programmes, not /en/programmes — because it is the
 * default and a prefix on the majority language buys nothing but longer URLs
 * and a redirect for every existing inbound link.
 */
export function localePath(pathname: string, locale: Locale): string {
  const { rest } = splitLocale(pathname);
  if (locale === DEFAULT_LOCALE) return rest || "/";
  return `/${locale}${rest === "/" ? "" : rest}`;
}

type Translated = { translations?: unknown };

/**
 * A field in the requested locale, falling back to the English column.
 *
 * The fallback is the point. A visitor reading French should see French where
 * it exists and English where it does not, rather than a blank or a 404 — a
 * half-translated site is normal for months, and it has to stay usable
 * throughout.
 */
export function t<T extends Translated, K extends keyof T & string>(
  row: T,
  field: K,
  locale: Locale,
): T[K] {
  if (locale === DEFAULT_LOCALE) return row[field];

  const translations = row.translations;
  if (!translations || typeof translations !== "object") return row[field];

  const forLocale = (translations as Record<string, unknown>)[locale];
  if (!forLocale || typeof forLocale !== "object") return row[field];

  const value = (forLocale as Record<string, unknown>)[field];
  /* An empty string is a missing translation, not a translation that says
     nothing. Without this check a half-filled form would blank the English. */
  if (value === undefined || value === null || value === "") return row[field];

  return value as T[K];
}

/** True when this row has any French at all — for the admin's status list. */
export function hasTranslation(row: Translated, locale: Locale): boolean {
  const translations = row.translations;
  if (!translations || typeof translations !== "object") return false;
  const forLocale = (translations as Record<string, unknown>)[locale];
  if (!forLocale || typeof forLocale !== "object") return false;
  return Object.values(forLocale as Record<string, unknown>).some(
    (v) => typeof v === "string" && v.trim() !== "",
  );
}

/**
 * Merges an edited translation into an existing blob.
 *
 * Blank fields are REMOVED rather than stored as "", so a staffer clearing a
 * box restores the English fallback instead of blanking the page. Other locales
 * are left untouched — editing French must never disturb a future Portuguese.
 */
export function mergeTranslation(
  existing: unknown,
  locale: Locale,
  fields: Record<string, string>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object"
      ? { ...(existing as Record<string, unknown>) }
      : {};

  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const trimmed = (value ?? "").trim();
    if (trimmed) cleaned[key] = trimmed;
  }

  if (Object.keys(cleaned).length === 0) {
    delete base[locale];
    return base;
  }

  base[locale] = cleaned;
  return base;
}

/** Locale-aware date formatting. Africa/Lagos throughout, per §2.6. */
export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Locale-aware money. Naira stays ₦ in both; the separators differ. */
export function formatMoney(
  kobo: number,
  currency: "NGN" | "USD",
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
