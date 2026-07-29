import { describe, it, expect } from "vitest";
import {
  t,
  hasTranslation,
  mergeTranslation,
  localePath,
  splitLocale,
  isLocale,
  formatDate,
  formatMoney,
  FRENCH_ENABLED,
} from "@/lib/i18n/locale";
import { m, translationCoverage } from "@/lib/i18n/messages";

/* Sprint 7.4 — the localisation machinery.
 *
 * The behaviour that matters is the FALLBACK. A half-translated site is the
 * normal state for months, and it has to stay usable throughout: French where
 * it exists, English where it does not, never a blank and never a 404. */

const row = {
  title: "Systematic Reviews",
  summary: "How to do them properly",
  translations: { fr: { title: "Revues systématiques" } },
};

describe("t — the fallback", () => {
  it("returns the translation when there is one", () => {
    expect(t(row, "title", "fr")).toBe("Revues systématiques");
  });

  it("falls back to English when a field is untranslated", () => {
    expect(t(row, "summary", "fr")).toBe("How to do them properly");
  });

  it("returns English directly for the default locale", () => {
    expect(t(row, "title", "en")).toBe("Systematic Reviews");
  });

  it("falls back when the row has no translations at all", () => {
    const bare: { title: string; translations?: unknown } = {
      title: "Only English",
    };
    expect(t(bare, "title", "fr")).toBe("Only English");
  });

  it("falls back when translations is junk from a hand-edited row", () => {
    for (const junk of [null, "nope", 42, []]) {
      const bad: { title: string; translations?: unknown } = {
        title: "Safe",
        translations: junk,
      };
      expect(t(bad, "title", "fr")).toBe("Safe");
    }
  });

  it("treats an EMPTY translation as missing, not as a translation", () => {
    /* Without this, a half-filled form would blank the English rather than
       leaving it in place — worse than not translating at all. */
    const empty = { title: "English", translations: { fr: { title: "" } } };
    expect(t(empty, "title", "fr")).toBe("English");
  });
});

describe("hasTranslation", () => {
  it("is true when any field is filled", () => {
    expect(hasTranslation(row, "fr")).toBe(true);
  });

  it("is false for an empty or absent locale", () => {
    expect(hasTranslation({ translations: {} }, "fr")).toBe(false);
    expect(hasTranslation({ translations: { fr: {} } }, "fr")).toBe(false);
    expect(hasTranslation({ translations: { fr: { title: "  " } } }, "fr")).toBe(
      false,
    );
  });
});

describe("mergeTranslation", () => {
  it("keeps filled fields and drops blank ones", () => {
    const merged = mergeTranslation(row.translations, "fr", {
      title: "Revues",
      summary: "",
    });
    expect(merged.fr).toEqual({ title: "Revues" });
  });

  it("removes the locale entirely when everything is cleared", () => {
    /* Clearing every box must restore the English fallback, not store an empty
       object that reads as "translated into nothing". */
    const merged = mergeTranslation(row.translations, "fr", {
      title: "",
      summary: "",
    });
    expect(merged.fr).toBeUndefined();
  });

  it("leaves other locales untouched", () => {
    const existing = { fr: { title: "Revues" }, pt: { title: "Revisões" } };
    const merged = mergeTranslation(existing, "fr", { title: "Nouveau" });
    expect(merged.pt).toEqual({ title: "Revisões" });
  });

  it("trims whitespace rather than storing it", () => {
    const merged = mergeTranslation({}, "fr", { title: "  Revues  " });
    expect((merged.fr as Record<string, string>).title).toBe("Revues");
  });

  it("survives junk in the existing column", () => {
    expect(mergeTranslation("nope", "fr", { title: "Revues" }).fr).toEqual({
      title: "Revues",
    });
  });
});

describe("locale paths", () => {
  it("prefixes a non-default locale", () => {
    expect(localePath("/programmes", "fr")).toBe("/fr/programmes");
  });

  it("leaves English unprefixed — a prefix on the default buys nothing", () => {
    expect(localePath("/fr/programmes", "en")).toBe("/programmes");
    expect(localePath("/programmes", "en")).toBe("/programmes");
  });

  it("handles the root in both directions", () => {
    expect(localePath("/", "fr")).toBe("/fr");
    expect(localePath("/fr", "en")).toBe("/");
  });

  it("splits a prefixed path", () => {
    expect(splitLocale("/fr/news/thing")).toEqual({
      locale: "fr",
      rest: "/news/thing",
    });
  });

  it("treats an unprefixed path as English", () => {
    expect(splitLocale("/news/thing")).toEqual({
      locale: "en",
      rest: "/news/thing",
    });
  });

  it("does not mistake a slug for a locale", () => {
    expect(splitLocale("/frozen-methods").locale).toBe("en");
  });

  it("only recognises locales it actually has", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});

describe("messages", () => {
  it("returns English for a known key", () => {
    expect(m("nav.about", "en")).toBe("About");
  });

  it("falls back to English when French is missing", () => {
    /* The French dictionary is deliberately empty until a translator fills it,
       so every lookup should render English rather than a key. */
    expect(m("nav.about", "fr")).toBe("About");
  });

  it("never leaks a raw key to a reader", () => {
    for (const key of [
      "nav.about",
      "nav.programmes",
      "footer.subscribe",
      "common.readMore",
    ] as const) {
      expect(m(key, "fr")).not.toContain(".");
    }
  });

  it("reports honest coverage rather than claiming completeness", () => {
    const fr = translationCoverage("fr");
    expect(fr.done).toBe(0);
    expect(fr.total).toBeGreaterThan(0);
    expect(fr.percent).toBe(0);

    const en = translationCoverage("en");
    expect(en.percent).toBe(100);
  });
});

describe("locale-aware formatting", () => {
  it("formats a date in each locale", () => {
    const date = "2026-03-06T12:00:00Z";
    expect(formatDate(date, "en")).toContain("March");
    expect(formatDate(date, "fr")).toContain("mars");
  });

  it("does not shift a date across the timezone boundary", () => {
    expect(formatDate("2026-03-06T12:00:00Z", "en")).toContain("6");
  });

  it("formats money in both locales", () => {
    expect(formatMoney(1_500_000, "NGN", "en")).toContain("15,000");
    // French uses a narrow no-break space as the thousands separator.
    expect(formatMoney(1_500_000, "NGN", "fr")).toMatch(/15\s?000/);
  });
});

describe("the French switch", () => {
  it("is OFF, because no translator is committed", () => {
    /* §7.4: "Do not ship it without a human translator committed." This test
       exists so turning it on is a deliberate act with a failing test to
       explain itself, rather than something that drifts on unnoticed. */
    expect(FRENCH_ENABLED).toBe(false);
  });
});
