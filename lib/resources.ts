/* Resource categories — labels and display order for the library filter.
   The DB stores the short enum value (guide|template|webinar|tool|publication);
   the site shows the human label. Kept in one place so the filter chips, the
   page headings, and any future admin all agree. */

export const RESOURCE_CATEGORIES = [
  { value: "guide", label: "Beginner guides" },
  { value: "template", label: "Templates" },
  { value: "webinar", label: "Recorded webinars" },
  { value: "tool", label: "Tool guides" },
  { value: "publication", label: "Publications" },
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return (
    RESOURCE_CATEGORIES.find((c) => c.value === value)?.label ?? value
  );
}

export function isResourceCategory(value: string): value is ResourceCategory {
  return RESOURCE_CATEGORIES.some((c) => c.value === value);
}

/** Where a resource's card/CTA should point.
   - an on-site article when it has body_rich
   - the file or external URL when present
   - otherwise its own detail page (which shows an honest "coming soon" state)
   so nothing ever links to a dead `#`. */
export function resourceHref(r: {
  slug: string;
  body_rich: unknown;
  file_url: string | null;
  external_url: string | null;
}): string {
  if (r.body_rich) return `/resources/${r.slug}`;
  if (r.file_url) return r.file_url;
  if (r.external_url) return r.external_url;
  return `/resources/${r.slug}`;
}

export function resourceKind(r: {
  body_rich: unknown;
  file_url: string | null;
  external_url: string | null;
}): "article" | "download" | "external" | "pending" {
  if (r.body_rich) return "article";
  if (r.file_url) return "download";
  if (r.external_url) return "external";
  return "pending";
}
