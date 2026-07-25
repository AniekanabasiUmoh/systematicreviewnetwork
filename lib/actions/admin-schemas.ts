import { z } from "zod";
import { optionalText } from "@/lib/actions/schemas";

/** A URL is optional in the editor, but blank values are stored as null. */
const optionalUrl = z
  .string()
  .trim()
  .max(2_000, "Please use a shorter URL.")
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || /^https?:\/\//i.test(value) || value.startsWith("/"),
    "Enter a valid http(s) URL or site path.",
  );

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .union([z.number(), z.nan(), z.undefined()])
    .transform((value) => (Number.isFinite(value) ? value : undefined)),
);

export const slug = z
  .string()
  .trim()
  .min(1, "Enter a URL slug.")
  .max(120, "Keep the slug under 120 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens only.",
  );

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * `datetime-local` represents wall time. SRN operates in Nigeria, which is
 * UTC+01:00 all year and has no daylight-saving transition to infer.
 */
export const lagosDateTime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time.")
  .transform((value) => new Date(`${value}:00+01:00`).toISOString());

const optionalLagosDateTime = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? lagosDateTime.parse(value) : undefined));

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

export const richTextJson = z
  .union([jsonValue, z.string()])
  .optional()
  .transform((value) => {
    if (!value || value === "") return undefined;
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new z.ZodError([
        { code: "custom", path: [], message: "The editor content is invalid." },
      ]);
    }
  });

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Enter an event title.").max(180),
    slug,
    description_rich: richTextJson,
    type: z.enum(["webinar", "course", "mentorship", "workshop"]),
    starts_at: lagosDateTime,
    ends_at: optionalLagosDateTime,
    location_type: z.enum(["online", "in_person"]),
    location_or_link: optionalText(500),
    registration_opens: optionalLagosDateTime,
    registration_closes: optionalLagosDateTime,
    capacity: optionalNumber.refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Capacity must be a whole number greater than zero.",
    ),
    banner_url: optionalUrl,
    recording_url: optionalUrl,
    price_kobo: optionalNumber.refine(
      (value) => value === undefined || (Number.isInteger(value) && value >= 0),
      "Price must be a whole number of kobo.",
    ),
    currency: z.enum(["NGN", "USD"]).default("NGN"),
  })
  .refine((value) => !value.ends_at || value.ends_at >= value.starts_at, {
    path: ["ends_at"],
    message: "The end time must be after the start time.",
  });

export const newsSchema = z.object({
  title: z.string().trim().min(1, "Enter a news title.").max(180),
  slug,
  body_rich: richTextJson,
  excerpt: optionalText(500),
  featured_image_url: optionalUrl,
  author: optionalText(160),
  published_at: optionalLagosDateTime,
});

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Enter a resource title.").max(180),
  slug,
  description: optionalText(600),
  category: z.enum(["guide", "template", "webinar", "tool", "publication"]),
  body_rich: richTextJson,
  file_url: optionalUrl,
  external_url: optionalUrl,
  thumbnail_url: optionalUrl,
});

/* Sprint 5.7 — `covers` and `for_who` are jsonb string arrays edited as
   one-item-per-line textareas. Splitting here (rather than shipping a repeater
   widget) keeps the editing model obvious; blank lines are dropped so a
   trailing newline never becomes an empty bullet on the public page. */
const linesToArray = z
  .string()
  .trim()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

export const programmeSchema = z.object({
  title: z.string().trim().min(1, "Enter a programme title.").max(180),
  slug,
  tagline: optionalText(240),
  audience: optionalText(160),
  format: optionalText(160),
  duration: optionalText(160),
  intro: optionalText(2_000),
  covers: linesToArray,
  for_who: linesToArray,
  cta_kind: z.enum(["apply", "interest", "partner"]),
  cta_label: optionalText(80),
  icon_name: z.string().trim().min(1).max(60),
  feature_image_url: optionalUrl,
  body_rich: richTextJson,
});

export const teamSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(160),
  role: optionalText(160),
  photo_url: optionalUrl,
  bio: optionalText(4_000),
  affiliation: optionalText(240),
  linkedin_url: optionalUrl,
  orcid_url: optionalUrl,
  group: z.enum(["executive", "scientific", "country_lead", "mentor"]),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(160),
  role: optionalText(160),
  photo_url: optionalUrl,
  quote: z.string().trim().min(1, "Enter a quote.").max(2_000),
});

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Enter a partner name.").max(160),
  logo_url: optionalUrl,
  url: optionalUrl,
});

/* Schemas for homepage, pages, impact_stats and reach_countries were removed
   in Sprint 5.9a along with their admin screens — those tables describe the
   website rather than SRN, and are no longer admin-editable (Design.md §8). */

export const adminSchemas = {
  events: eventSchema,
  news: newsSchema,
  resources: resourceSchema,
  programmes: programmeSchema,
  team: teamSchema,
  testimonials: testimonialSchema,
  partners: partnerSchema,
} as const;
