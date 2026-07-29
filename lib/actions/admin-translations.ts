"use server";

import { revalidatePath } from "next/cache";

import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isLocale, mergeTranslation, DEFAULT_LOCALE } from "@/lib/i18n/locale";

/* Sprint 7.4 — saving a translation.
 *
 * One action for every table, because the shape is identical: read the existing
 * blob, merge one locale's fields into it, write it back. A per-table action
 * would be six copies of the same eight lines.
 *
 * The table name comes from a form field, which would normally be a red flag —
 * so it is checked against a fixed allowlist before it reaches a query. Without
 * that, this action would be an arbitrary-table update endpoint. */

const TRANSLATABLE = new Set([
  "news",
  "events",
  "programmes",
  "resources",
  "pages",
  "courses",
]);

/* Which fields may be translated, per table. Anything not listed is ignored,
   so a crafted form cannot write `status` or `slug` into the jsonb and confuse
   a later reader. Slugs are deliberately absent: a URL stays English across
   locales so inbound links never break. */
const FIELDS: Record<string, string[]> = {
  news: ["title", "excerpt", "body"],
  events: ["title", "summary", "description"],
  programmes: ["title", "summary", "description"],
  resources: ["title", "description"],
  pages: ["title", "body"],
  courses: ["title", "summary"],
};

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function saveTranslation(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const table = formValue(form, "table");
  const id = formValue(form, "id");
  const locale = formValue(form, "locale");

  if (!TRANSLATABLE.has(table))
    return { status: "error", formError: "That is not something we translate." };
  if (!isLocale(locale) || locale === DEFAULT_LOCALE)
    return { status: "error", formError: "That is not a language we support." };
  if (!id) return { status: "error", formError: "Nothing to translate." };

  const allowed = FIELDS[table] ?? [];
  const fields: Record<string, string> = {};
  for (const name of allowed) {
    fields[name] = formValue(form, name);
  }

  const { data: row } = await supabaseAdmin
    .from(table as "news")
    .select("translations, title")
    .eq("id", id)
    .maybeSingle();

  if (!row)
    return { status: "error", formError: "That item no longer exists." };

  const merged = mergeTranslation(
    (row as { translations: unknown }).translations,
    locale,
    fields,
  );

  const { error } = await supabaseAdmin
    .from(table as "news")
    .update({ translations: merged } as never)
    .eq("id", id);

  if (error) {
    console.error("[translations] save failed:", error.message);
    return { status: "error", formError: "We could not save that translation." };
  }

  const filled = Object.keys(
    (merged[locale] as Record<string, unknown>) ?? {},
  ).length;

  revalidatePath(`/admin/${table}`);
  revalidatePath("/admin/translations");
  void recordAudit(
    auth.user,
    "update",
    table,
    id,
    `Saved ${locale} translation for "${(row as { title: string }).title}" (${filled} fields)`,
  );

  return {
    status: "success",
    message:
      filled === 0
        ? "Translation cleared. This item falls back to English everywhere."
        : `Saved. ${filled} ${filled === 1 ? "field" : "fields"} translated; anything blank falls back to the English.`,
  };
}
