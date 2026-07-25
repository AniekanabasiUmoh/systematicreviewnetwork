import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { ADMIN_RESOURCES } from "@/lib/admin/resources";
import { escapePostgrestSearch } from "@/lib/admin/queries";

export type SearchResult = {
  resourceKey: string;
  labelSingular: string;
  id: string;
  title: string;
};

/**
 * §5.10 — one search box across the narrowed content registry, using each
 * resource's own declared searchColumns and the shared escaper so results
 * match exactly what that resource's own list-page search would find.
 */
export async function searchAllContent(term: string): Promise<SearchResult[]> {
  const escaped = escapePostgrestSearch(term);
  if (!escaped) return [];

  /* Every content table has either `title` or `name` as its human label, but
     not both — selecting a column that doesn't exist on that table errors, so
     the display column is picked from the resource's own field list rather
     than guessed. */
  const queries = Object.values(ADMIN_RESOURCES)
    .filter((resource) => !resource.singleton && resource.searchColumns.length)
    .map(async (resource) => {
      const labelColumn = resource.fields.some((f) => f.name === "title")
        ? "title"
        : "name";
      /* The generated types cannot verify a templated column list across a
         union of tables — that's a real, useful check for a fixed select, but
         this select is deliberately per-resource-dynamic, so it is cast past
         here rather than silenced with a broader escape hatch. */
      const { data } = (await supabaseAdmin
        .from(resource.table)
        .select(`id, ${labelColumn}`)
        .or(
          resource.searchColumns
            .map((column) => `${column}.ilike.%${escaped}%`)
            .join(","),
        )
        .limit(5)) as { data: Array<Record<string, unknown>> | null };
      return (data ?? []).map(
        (row): SearchResult => ({
          resourceKey: resource.key,
          labelSingular: resource.labelSingular,
          id: String(row.id),
          title: String(row[labelColumn] ?? resource.labelSingular),
        }),
      );
    });

  const results = await Promise.all(queries);
  return results.flat();
}
