import Link from "next/link";

import { requireStaff } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  FRENCH_ENABLED,
  LOCALE_LABELS,
  hasTranslation,
} from "@/lib/i18n/locale";
import { translationCoverage } from "@/lib/i18n/messages";

/* Sprint 7.4 — what still needs translating.
 *
 * §7.4: "Admin must let a staffer author both locales side by side and see
 * which entries are missing a translation." This is the second half — the
 * side-by-side fields live on each resource's own edit form.
 *
 * The page states plainly that French is not live yet and why. A translation
 * backlog with no explanation invites someone to assume the feature is broken;
 * saying "no translator is committed" is the honest reason and points at what
 * would change it. */

export const dynamic = "force-dynamic";

const RESOURCE_PATHS: Record<string, string> = {
  news: "/admin/news",
  events: "/admin/events",
  programmes: "/admin/programmes",
  resources: "/admin/resources",
  pages: "/admin/pages",
  courses: "/admin/courses",
};

export default async function TranslationsPage() {
  await requireStaff();

  /* The migration ships a `translation_status` view, but gen-types only emits
     BASE TABLEs, so querying it through the typed client would need a cast that
     defeats the point of having types. Six small reads are cheaper than a
     generator change, and each one keeps its real row type. */
  type Row = { resource: string; id: string; label: string; has_fr: boolean };

  type Raw = { id: string; title: string; translations: unknown };

  const shape = (resource: string, data: Raw[] | null): Row[] =>
    (data ?? []).map((row) => ({
      resource,
      id: row.id,
      label: row.title,
      has_fr: hasTranslation(row, "fr"),
    }));

  /* `pages` is queried apart from the rest because it has no status column —
     the standing pages (privacy, terms, FAQ) are always live. Listing it in the
     same loop would need a cast that hides that difference. */
  const [news, events, programmes, resources, pages, courses] =
    await Promise.all([
      supabaseAdmin
        .from("news")
        .select("id, title, translations")
        .eq("status", "published")
        .order("title"),
      supabaseAdmin
        .from("events")
        .select("id, title, translations")
        .eq("status", "published")
        .is("archived_at", null)
        .order("title"),
      supabaseAdmin
        .from("programmes")
        .select("id, title, translations")
        .eq("status", "published")
        .is("archived_at", null)
        .order("title"),
      supabaseAdmin
        .from("resources")
        .select("id, title, translations")
        .eq("status", "published")
        .order("title"),
      supabaseAdmin.from("pages").select("id, title, translations").order("title"),
      supabaseAdmin
        .from("courses")
        .select("id, title, translations")
        .eq("status", "published")
        .is("archived_at", null)
        .order("title"),
    ]);

  const rows: Row[] = [
    ...shape("news", news.data as Raw[] | null),
    ...shape("events", events.data as Raw[] | null),
    ...shape("programmes", programmes.data as Raw[] | null),
    ...shape("resources", resources.data as Raw[] | null),
    ...shape("pages", pages.data as Raw[] | null),
    ...shape("courses", courses.data as Raw[] | null),
  ];

  const translated = rows.filter((r) => r.has_fr).length;
  const ui = translationCoverage("fr");

  const byResource = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byResource.get(row.resource) ?? [];
    list.push(row);
    byResource.set(row.resource, list);
  }

  return (
    <>
      <AdminPageHeader
        title="Translations"
        description="What exists in French, and what does not. Published content only — a draft nobody can read in English does not need a translation yet."
      />

      {!FRENCH_ENABLED ? (
        <div className="border-hairline bg-mist/60 mb-6 border p-5">
          <p className="text-ink text-small font-semibold">
            French is not live on the public site.
          </p>
          <p className="text-slate text-small mt-2 max-w-2xl leading-relaxed">
            The machinery is built and everything below can be filled in, but
            the French site is not offered to visitors and no language switcher
            is shown. Machine-translated methodology would carry errors nobody
            has checked, so it waits for a person. When SRN has a French speaker
            who can write and maintain the copy, one line of code turns it on.
          </p>
        </div>
      ) : null}

      <div className="border-hairline bg-paper mb-8 border p-5">
        <p className="text-ink text-small font-semibold">Where things stand</p>
        <p className="text-slate text-small mt-2">
          {translated} of {rows.length} published items have French ·{" "}
          {ui.done} of {ui.total} interface strings ({ui.percent}%)
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="border-hairline bg-paper border px-6 py-8">
          <p className="text-slate text-small">
            Nothing published yet, so there is nothing to translate.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...byResource.entries()].map(([resource, items]) => {
            const done = items.filter((i) => i.has_fr).length;
            return (
              <section key={resource}>
                <h2 className="text-ink text-small mb-1 font-semibold capitalize">
                  {resource}
                </h2>
                <p className="text-slate text-small mb-3">
                  {done} of {items.length} translated
                </p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="border-hairline bg-paper flex flex-wrap items-center justify-between gap-3 border p-4"
                    >
                      <p className="text-ink text-small min-w-0">{item.label}</p>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-small ${
                            item.has_fr ? "text-evidence" : "text-slate"
                          }`}
                        >
                          {item.has_fr
                            ? `${LOCALE_LABELS.fr} ✓`
                            : `No ${LOCALE_LABELS.fr}`}
                        </span>
                        <Link
                          href={`${RESOURCE_PATHS[resource] ?? "/admin"}/${item.id}`}
                          className="text-ink text-small underline underline-offset-2"
                        >
                          {item.has_fr ? "Edit" : "Add it"}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
