/**
 * One-time data migration: lib/programmes.ts → the `programmes` table
 * (Sprint 5.7).
 *
 *   node supabase/seed-programmes.mjs
 *
 * Idempotent via `on conflict (slug) do nothing`, so re-running never
 * duplicates and never overwrites staff edits made after the first run.
 *
 * This is REAL published content, not [PLACEHOLDER] seed data — it is the copy
 * currently live on the site. The five slugs are reproduced verbatim: they are
 * live public URLs, and changing one breaks every inbound link to it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(here, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall through */
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/,
)?.[1];

if (!projectRef || !env.SUPABASE_DB_PASSWORD) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}

const client = new pg.Client({
  host: `aws-0-${env.SUPABASE_REGION || "eu-west-1"}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${projectRef}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

const PROGRAMMES = [
  {
    slug: "beginner-academy",
    icon_name: "GraduationCap",
    title: "Beginner Academy",
    tagline: "For researchers taking on their first systematic review.",
    audience: "Students & early-career researchers",
    format: "Online, cohort-based",
    duration: "4 weeks",
    intro:
      "The Beginner Academy takes you from a first, answerable question to a clear plan for a systematic review — the foundations, taught plainly, by people who do this work. No prior review experience is assumed.",
    covers: [
      "Framing a clear, answerable review question (PICO and its cousins)",
      "Writing a protocol and why pre-registration matters",
      "Building and running a reproducible literature search",
      "Screening studies against explicit inclusion criteria",
      "What critical appraisal is, and where bias hides",
      "How the pieces fit into a review you can finish",
    ],
    for_who: [
      "Postgraduate students starting a review as part of their work",
      "Early-career researchers new to evidence synthesis",
      "Anyone who wants the foundations before joining a live review",
    ],
    cta_kind: "interest",
    cta_label: "Register your interest",
  },
  {
    slug: "practical-course",
    icon_name: "BookOpen",
    title: "Practical Course",
    tagline: "Hands-on methods for teams with a review underway.",
    audience: "Active review teams",
    format: "In person or hybrid",
    duration: "3 days, intensive",
    intro:
      "The Practical Course is for researchers who are past the basics and into the work. Three intensive days on the methods that decide whether a review holds up — worked on your own question, with facilitators alongside.",
    covers: [
      "Search strategy design and peer review of searches",
      "Screening at scale and managing reviewer agreement",
      "Risk-of-bias assessment with standard tools",
      "Data extraction that survives scrutiny",
      "The principles of meta-analysis and when not to pool",
      "Reporting to PRISMA and preparing for submission",
    ],
    for_who: [
      "Teams with a protocol and a review in progress",
      "Researchers who have completed the Beginner Academy",
      "Groups wanting facilitated time on their own review",
    ],
    cta_kind: "apply",
    cta_label: "Apply for the next course",
  },
  {
    slug: "mentorship",
    icon_name: "Users",
    title: "Mentorship Programme",
    tagline:
      "Paired guidance from an experienced reviewer, through a live review.",
    audience: "Researchers running a review",
    format: "Online, one-to-one",
    duration: "Up to 6 months",
    intro:
      "The Mentorship Programme pairs you with an experienced reviewer for the length of a live review — so the methodological choices that usually cause second-guessing are made with someone who has made them before.",
    covers: [
      "A mentor matched to your topic and method",
      "Regular one-to-one sessions across the review",
      "Review of your protocol, search, and screening decisions",
      "Guidance through synthesis and, where relevant, meta-analysis",
      "Support preparing the manuscript for submission",
    ],
    for_who: [
      "Researchers with a review underway and a clear question",
      "Teams who want continuity of guidance, not one-off advice",
      "Graduates of the Practical Course ready to go it (nearly) alone",
    ],
    cta_kind: "apply",
    cta_label: "Apply for mentorship",
  },
  {
    slug: "webinar-series",
    icon_name: "Presentation",
    title: "Webinar Series",
    tagline: "Open sessions on method and evidence, free to attend.",
    audience: "Open to everyone",
    format: "Online, live + recorded",
    duration: "Ongoing",
    intro:
      "The Webinar Series brings method and evidence into the open — short, focused live sessions on the questions reviewers actually face, free to attend and recorded for anyone who misses them.",
    covers: [
      "Focused sessions on specific methods and tools",
      "Practical clinics on common review problems",
      "Guest speakers from the wider evidence community",
      "Recordings added to the open resources library",
    ],
    for_who: [
      "Anyone curious about systematic reviews",
      "Researchers wanting to keep methods current",
      "Past participants staying connected to the network",
    ],
    cta_kind: "interest",
    cta_label: "Hear about upcoming webinars",
  },
  {
    slug: "institutional-training",
    icon_name: "Building2",
    title: "Institutional Training",
    tagline: "Review capacity built across a department or faculty.",
    audience: "Institutions & funders",
    format: "Bespoke, on-site or online",
    duration: "Scoped to your needs",
    intro:
      "Institutional Training brings SRN to your department, faculty, or programme — a curriculum scoped to your people and their work, delivered where it's needed and designed to leave lasting capacity behind.",
    covers: [
      "A curriculum scoped to your researchers and their questions",
      "Delivery on-site, online, or hybrid",
      "Train-the-trainer options so capacity stays after we leave",
      "Cohorts sized to your department or programme",
      "Ongoing mentorship pathways for participants",
    ],
    for_who: [
      "Universities and research institutes",
      "Programmes and funders building synthesis capacity",
      "Departments wanting a cohort trained together",
    ],
    cta_kind: "partner",
    cta_label: "Request training for your institution",
  },
];

try {
  await client.connect();
  let inserted = 0;
  for (const [i, p] of PROGRAMMES.entries()) {
    const result = await client.query(
      `insert into programmes
         (slug, title, tagline, audience, format, duration, intro,
          covers, for_who, cta_kind, cta_label, icon_name, sort_order, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,'published')
       on conflict (slug) do nothing`,
      [
        p.slug,
        p.title,
        p.tagline,
        p.audience,
        p.format,
        p.duration,
        p.intro,
        JSON.stringify(p.covers),
        JSON.stringify(p.for_who),
        p.cta_kind,
        p.cta_label,
        p.icon_name,
        i,
      ],
    );
    if (result.rowCount > 0) inserted += 1;
  }
  console.log(
    `Programmes: ${inserted} inserted, ${PROGRAMMES.length - inserted} already present.`,
  );
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
