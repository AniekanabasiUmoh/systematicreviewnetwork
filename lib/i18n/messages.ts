import type { Locale } from "./locale";

/* Sprint 7.4 — interface strings.
 *
 * Database content is translated in the `translations` column; this file covers
 * everything that is not content — nav labels, button text, form errors.
 *
 * A flat object rather than a library. next-intl and its cousins bring routing,
 * pluralisation rules and a compiler for a site with two locales and roughly
 * eighty strings; the dependency would be larger than the problem. If a third
 * locale with real plural rules arrives, revisit — that is the point where a
 * library starts earning its place.
 *
 * FRENCH IS DELIBERATELY ABSENT below. §7.4: "Do not ship it without a human
 * translator committed." Writing plausible French here would make the site
 * look translated while carrying errors nobody has checked, which is the exact
 * failure the constraint names. The keys exist; a translator fills them.
 */

export type MessageKey =
  | "nav.about"
  | "nav.programmes"
  | "nav.resources"
  | "nav.impact"
  | "nav.team"
  | "nav.events"
  | "nav.contact"
  | "nav.partner"
  | "common.readMore"
  | "common.register"
  | "common.apply"
  | "common.back"
  | "common.loading"
  | "common.required"
  | "common.optional"
  | "footer.explore"
  | "footer.getInvolved"
  | "footer.newsletter"
  | "footer.newsletterBlurb"
  | "footer.subscribe"
  | "locale.switchTo";

type Dictionary = Record<MessageKey, string>;

const en: Dictionary = {
  "nav.about": "About",
  "nav.programmes": "Programmes",
  "nav.resources": "Resources",
  "nav.impact": "Impact",
  "nav.team": "Team",
  "nav.events": "News & Events",
  "nav.contact": "Contact",
  "nav.partner": "Partner with SRN",
  "common.readMore": "Read more",
  "common.register": "Register",
  "common.apply": "Apply",
  "common.back": "Back",
  "common.loading": "Loading",
  "common.required": "required",
  "common.optional": "optional",
  "footer.explore": "Explore",
  "footer.getInvolved": "Get involved",
  "footer.newsletter": "Newsletter",
  "footer.newsletterBlurb":
    "Occasional updates on training, resources, and opportunities.",
  "footer.subscribe": "Subscribe",
  "locale.switchTo": "Switch language",
};

/* Empty until a translator fills it. Every lookup falls back to English, so an
   empty dictionary renders an entirely English site rather than a broken one —
   which is the correct state while there is no translator. */
const fr: Partial<Dictionary> = {};

const DICTIONARIES: Record<Locale, Partial<Dictionary>> = { en, fr };

/** A message in the requested locale, falling back to English. */
export function m(key: MessageKey, locale: Locale = "en"): string {
  return DICTIONARIES[locale]?.[key] ?? en[key] ?? key;
}

/** How much of the interface exists in this locale — for the admin. */
export function translationCoverage(locale: Locale): {
  done: number;
  total: number;
  percent: number;
} {
  const total = Object.keys(en).length;
  const dict = DICTIONARIES[locale] ?? {};
  const done = Object.keys(en).filter((k) => {
    const value = dict[k as MessageKey];
    return typeof value === "string" && value.trim() !== "";
  }).length;
  return { done, total, percent: Math.round((done / total) * 100) };
}
