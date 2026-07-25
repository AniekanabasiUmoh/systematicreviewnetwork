import type { z } from "zod";
import { adminSchemas } from "@/lib/actions/admin-schemas";
import { PROGRAMME_ICON_OPTIONS } from "@/lib/admin/programme-icons";

export type AdminFieldKind =
  | "text"
  | "textarea"
  | "slug"
  | "richtext"
  | "select"
  | "datetime"
  | "number"
  | "image"
  | "url"
  | "email"
  | "checkbox";

export type AdminField = {
  name: string;
  label: string;
  kind: AdminFieldKind;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  options?: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  slugFrom?: string;
  wide?: boolean;
};

/* Sprint 5.9a — admin manages CONTENT, not site design (Design.md §8).
 * `homepage`, `pages`, `impact`, and `reach` were removed: they describe the
 * website rather than describing SRN, and editing them from an admin panel
 * turns it into a page builder. The tables still exist and the public site
 * still reads them; they are simply no longer admin-editable. */
export type AdminResourceKey =
  | "events"
  | "news"
  | "resources"
  | "programmes"
  | "team"
  | "testimonials"
  | "partners";

export type AdminResource = {
  key: AdminResourceKey;
  table:
    | "events"
    | "news"
    | "resources"
    | "programmes"
    | "team_members"
    | "testimonials"
    | "partners";
  labelSingular: string;
  labelPlural: string;
  singleton?: boolean;
  listColumns: ReadonlyArray<string>;
  /* Sprint 5.9b — how to render a listColumns cell. Additive and optional:
     any column not named here falls back to the old String(value) behaviour,
     so existing resources keep working untouched. */
  listColumnKinds?: Record<string, "text" | "datetime" | "status" | "thumbnail">;
  searchColumns: ReadonlyArray<string>;
  orderBy: { column: string; ascending?: boolean };
  fields: ReadonlyArray<AdminField>;
  publishable?: boolean;
  slugColumn?: string;
  sortColumn?: string;
  schema: z.ZodType;
  revalidate: ReadonlyArray<string>;
  adminOnly?: boolean;
};

const contentStatus = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
] as const;

const resourceDefinitions = {
  events: {
    key: "events",
    table: "events",
    labelSingular: "Event",
    labelPlural: "Events",
    listColumns: ["title", "type", "starts_at", "status"],
    listColumnKinds: { starts_at: "datetime", status: "status" },
    searchColumns: ["title"],
    orderBy: { column: "starts_at", ascending: false },
    publishable: true,
    slugColumn: "slug",
    schema: adminSchemas.events,
    revalidate: ["/", "/news", "/news/events"],
    fields: [
      {
        name: "title",
        label: "Title",
        kind: "text",
        required: true,
        maxLength: 180,
        slugFrom: "title",
        wide: true,
      },
      {
        name: "slug",
        label: "URL slug",
        kind: "slug",
        required: true,
        hint: "Lowercase words separated by hyphens.",
      },
      {
        name: "type",
        label: "Event type",
        kind: "select",
        required: true,
        options: [
          { value: "webinar", label: "Webinar" },
          { value: "course", label: "Course" },
          { value: "mentorship", label: "Mentorship" },
          { value: "workshop", label: "Workshop" },
        ],
      },
      { name: "starts_at", label: "Starts", kind: "datetime", required: true },
      { name: "ends_at", label: "Ends", kind: "datetime" },
      {
        name: "location_type",
        label: "Format",
        kind: "select",
        required: true,
        options: [
          { value: "online", label: "Online" },
          { value: "in_person", label: "In person" },
        ],
      },
      {
        name: "location_or_link",
        label: "Location or joining link",
        kind: "url",
        wide: true,
      },
      {
        name: "registration_opens",
        label: "Registration opens",
        kind: "datetime",
      },
      {
        name: "registration_closes",
        label: "Registration closes",
        kind: "datetime",
      },
      { name: "capacity", label: "Capacity", kind: "number" },
      {
        name: "price_kobo",
        label: "Price (kobo/cents)",
        kind: "number",
        hint: "Leave blank or enter 0 for a free event.",
      },
      {
        name: "currency",
        label: "Currency",
        kind: "select",
        defaultValue: "NGN",
        options: [
          { value: "NGN", label: "Nigerian naira" },
          { value: "USD", label: "US dollars" },
        ],
      },
      { name: "banner_url", label: "Banner image", kind: "image", wide: true },
      {
        name: "recording_url",
        label: "Recording URL",
        kind: "url",
        wide: true,
      },
      {
        name: "description_rich",
        label: "Description",
        kind: "richtext",
        wide: true,
      },
    ],
  },
  news: {
    key: "news",
    table: "news",
    labelSingular: "Article",
    labelPlural: "News",
    listColumns: ["title", "author", "published_at", "status"],
    listColumnKinds: { published_at: "datetime", status: "status" },
    searchColumns: ["title", "author"],
    orderBy: { column: "published_at", ascending: false },
    publishable: true,
    slugColumn: "slug",
    schema: adminSchemas.news,
    revalidate: ["/", "/news"],
    fields: [
      {
        name: "title",
        label: "Title",
        kind: "text",
        required: true,
        maxLength: 180,
        slugFrom: "title",
        wide: true,
      },
      { name: "slug", label: "URL slug", kind: "slug", required: true },
      { name: "author", label: "Author", kind: "text", maxLength: 160 },
      { name: "published_at", label: "Published at", kind: "datetime" },
      {
        name: "featured_image_url",
        label: "Featured image",
        kind: "image",
        wide: true,
      },
      {
        name: "excerpt",
        label: "Excerpt",
        kind: "textarea",
        maxLength: 500,
        wide: true,
      },
      { name: "body_rich", label: "Article", kind: "richtext", wide: true },
    ],
  },
  resources: {
    key: "resources",
    table: "resources",
    labelSingular: "Resource",
    labelPlural: "Resources",
    listColumns: ["title", "category", "status"],
    listColumnKinds: { status: "status" },
    searchColumns: ["title", "description"],
    orderBy: { column: "created_at", ascending: false },
    publishable: true,
    slugColumn: "slug",
    schema: adminSchemas.resources,
    revalidate: ["/", "/resources"],
    fields: [
      {
        name: "title",
        label: "Title",
        kind: "text",
        required: true,
        maxLength: 180,
        slugFrom: "title",
        wide: true,
      },
      { name: "slug", label: "URL slug", kind: "slug", required: true },
      {
        name: "category",
        label: "Category",
        kind: "select",
        required: true,
        options: [
          { value: "guide", label: "Guide" },
          { value: "template", label: "Template" },
          { value: "webinar", label: "Webinar" },
          { value: "tool", label: "Tool" },
          { value: "publication", label: "Publication" },
        ],
      },
      {
        name: "thumbnail_url",
        label: "Thumbnail image",
        kind: "image",
        wide: true,
      },
      { name: "file_url", label: "File URL", kind: "url", wide: true },
      { name: "external_url", label: "External URL", kind: "url", wide: true },
      {
        name: "description",
        label: "Description",
        kind: "textarea",
        maxLength: 600,
        wide: true,
      },
      {
        name: "body_rich",
        label: "Resource content",
        kind: "richtext",
        wide: true,
      },
    ],
  },
  /* Sprint 5.7. Note a deliberate deviation from §8's "drag-reorder only for
     team_members and partners": §5.7 explicitly grants programmes reorder, and
     the later, more specific statement wins — the order programmes appear on
     the hub is an editorial decision, not incidental insert order. */
  programmes: {
    key: "programmes",
    table: "programmes",
    labelSingular: "Programme",
    labelPlural: "Programmes",
    listColumns: ["title", "audience", "status"],
    listColumnKinds: { status: "status" },
    searchColumns: ["title", "tagline", "audience"],
    orderBy: { column: "sort_order" },
    sortColumn: "sort_order",
    publishable: true,
    slugColumn: "slug",
    schema: adminSchemas.programmes,
    revalidate: ["/", "/programmes"],
    fields: [
      {
        name: "title",
        label: "Title",
        kind: "text",
        required: true,
        maxLength: 180,
        slugFrom: "title",
        wide: true,
      },
      {
        name: "slug",
        label: "URL slug",
        kind: "slug",
        required: true,
        hint: "Changing this changes the public URL and breaks existing links.",
      },
      {
        name: "icon_name",
        label: "Icon",
        kind: "select",
        required: true,
        defaultValue: "GraduationCap",
        options: PROGRAMME_ICON_OPTIONS,
      },
      {
        name: "tagline",
        label: "Tagline",
        kind: "text",
        maxLength: 240,
        hint: "One line, shown on cards and the programmes hub.",
        wide: true,
      },
      { name: "audience", label: "Audience", kind: "text", maxLength: 160 },
      { name: "format", label: "Format", kind: "text", maxLength: 160 },
      { name: "duration", label: "Duration", kind: "text", maxLength: 160 },
      {
        name: "cta_kind",
        label: "Call to action",
        kind: "select",
        required: true,
        defaultValue: "apply",
        options: [
          { value: "apply", label: "Apply — routes to the application form" },
          {
            value: "interest",
            label: "Register interest — routes to the application form",
          },
          { value: "partner", label: "Partner — routes to the partner page" },
        ],
      },
      {
        name: "cta_label",
        label: "Button label",
        kind: "text",
        maxLength: 80,
      },
      {
        name: "feature_image_url",
        label: "Feature image",
        kind: "image",
        wide: true,
      },
      {
        name: "intro",
        label: "Introduction",
        kind: "textarea",
        maxLength: 2000,
        hint: "The lead paragraph on the programme's own page.",
        wide: true,
      },
      {
        name: "covers",
        label: "What it covers",
        kind: "textarea",
        hint: "One point per line.",
        wide: true,
      },
      {
        name: "for_who",
        label: "Who it is for",
        kind: "textarea",
        hint: "One point per line.",
        wide: true,
      },
      {
        name: "body_rich",
        label: "Additional detail",
        kind: "richtext",
        wide: true,
      },
    ],
  },
  team: {
    key: "team",
    table: "team_members",
    labelSingular: "Team member",
    labelPlural: "Team",
    listColumns: ["photo_url", "name", "role", "group"],
    listColumnKinds: { photo_url: "thumbnail" },
    searchColumns: ["name", "role", "affiliation"],
    orderBy: { column: "sort_order" },
    sortColumn: "sort_order",
    schema: adminSchemas.team,
    revalidate: ["/team", "/"],
    fields: [
      {
        name: "name",
        label: "Name",
        kind: "text",
        required: true,
        maxLength: 160,
      },
      { name: "role", label: "Role", kind: "text", maxLength: 160 },
      {
        name: "group",
        label: "Team group",
        kind: "select",
        required: true,
        options: [
          { value: "executive", label: "Executive" },
          { value: "scientific", label: "Scientific" },
          { value: "country_lead", label: "Country lead" },
          { value: "mentor", label: "Mentor" },
        ],
      },
      { name: "photo_url", label: "Photo", kind: "image", wide: true },
      {
        name: "affiliation",
        label: "Affiliation",
        kind: "text",
        maxLength: 240,
        wide: true,
      },
      { name: "linkedin_url", label: "LinkedIn URL", kind: "url", wide: true },
      { name: "orcid_url", label: "ORCID URL", kind: "url", wide: true },
      {
        name: "bio",
        label: "Biography",
        kind: "textarea",
        maxLength: 4000,
        wide: true,
      },
    ],
  },
  testimonials: {
    key: "testimonials",
    table: "testimonials",
    labelSingular: "Testimonial",
    labelPlural: "Testimonials",
    listColumns: ["photo_url", "name", "role"],
    listColumnKinds: { photo_url: "thumbnail" },
    searchColumns: ["name", "role", "quote"],
    orderBy: { column: "sort_order" },
    /* No sortColumn: §8 keeps drag-reorder to team_members and partners only.
       The sort_order column still orders the list, it just isn't draggable. */
    schema: adminSchemas.testimonials,
    revalidate: ["/"],
    fields: [
      {
        name: "name",
        label: "Name",
        kind: "text",
        required: true,
        maxLength: 160,
      },
      { name: "role", label: "Role", kind: "text", maxLength: 160 },
      { name: "photo_url", label: "Photo", kind: "image", wide: true },
      {
        name: "quote",
        label: "Quote",
        kind: "textarea",
        required: true,
        maxLength: 2000,
        wide: true,
      },
    ],
  },
  partners: {
    key: "partners",
    table: "partners",
    labelSingular: "Partner",
    labelPlural: "Partners",
    listColumns: ["logo_url", "name", "url"],
    listColumnKinds: { logo_url: "thumbnail" },
    searchColumns: ["name"],
    orderBy: { column: "sort_order" },
    sortColumn: "sort_order",
    schema: adminSchemas.partners,
    revalidate: ["/"],
    fields: [
      {
        name: "name",
        label: "Name",
        kind: "text",
        required: true,
        maxLength: 160,
      },
      { name: "logo_url", label: "Logo", kind: "image", wide: true },
      { name: "url", label: "Website URL", kind: "url", wide: true },
    ],
  },
} as const satisfies Record<string, AdminResource>;

export const ADMIN_RESOURCES: Record<AdminResourceKey, AdminResource> =
  resourceDefinitions;

export function getResource(
  key: string | null | undefined,
): AdminResource | null {
  /* Object.hasOwn, not `in`: the key arrives from FormData, and `in` walks the
     prototype chain — getResource("constructor") would otherwise return
     Object and the caller would read .table off it. */
  return key && Object.hasOwn(ADMIN_RESOURCES, key)
    ? ADMIN_RESOURCES[key as AdminResourceKey]
    : null;
}

/** Client-safe portion of a descriptor. Zod schemas stay on the server. */
export function formResource(resource: AdminResource) {
  return {
    key: resource.key,
    labelSingular: resource.labelSingular,
    fields: resource.fields,
  };
}

export const PUBLISH_STATUSES = contentStatus;
