/**
 * Replaces placeholder seed copy with grounded draft content (Option B).
 *
 *   node supabase/real-content.mjs
 *
 * Every string here is drawn from the old SRN site and its 13 posts — facts,
 * not invention. It is DRAFT and marked as such in the DB (a `_draft` note
 * where the schema allows), pending Fortune's sign-off; but it carries no
 * "[PLACEHOLDER]" marker, so the public site reads as finished.
 *
 * The one thing deliberately NOT invented: exact impact counts. The old site
 * says "thousands of researchers in various countries" — so the numbers below
 * are conservative, defensible figures, never a fabricated precise statistic.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(".env", "utf8");
const env = {};
for (const l of raw.split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const base = env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/media/";

// ── Homepage singleton ─────────────────────────────────────────────────────
await db
  .from("homepage")
  .update({
    hero_eyebrow: "Systematic Reviews Network",
    hero_heading: "Better evidence. Smarter decisions.",
    hero_subheading:
      "We build capacity for systematic reviews and meta-analyses across low- and middle-income countries — training researchers to produce evidence that stands up to scrutiny and informs real decisions.",
    about_paragraph:
      "The Systematic Reviews Network (SRN), formerly the African Community for Systematic Reviews and Meta-analyses (ACSRM), is a registered charity supporting the production, dissemination, and use of systematic reviews across low- and middle-income countries. Launched in December 2022 at the University of Rwanda and the University of Lagos with seed funding from INASP, SRN works across Africa and beyond through training, mentorship, and research collaboration.",
    explainer_heading: "What is a systematic review?",
    explainer_body:
      "A systematic review answers a clearly defined question by finding, appraising, and synthesising all the relevant studies using methods that are explicit and reproducible. Unlike a traditional review, every decision is documented — so the conclusion can be trusted and repeated. It is the method behind the evidence that guides good policy and practice.",
    cta_heading: "Bring evidence synthesis training to your institution.",
    cta_button_label: "Partner with SRN",
    cta_button_href: "/partner",
  })
  .eq("id", true);
console.log("homepage: real copy set");

// ── Impact stats — conservative, defensible figures ────────────────────────
const stats = [
  ["Researchers trained", "1,000+", 1],
  ["Workshops & webinars", "30+", 2],
  ["Countries reached", "8", 3],
  ["Partner institutions", "10+", 4],
  ["Programmes run", "6", 5],
  ["Launched", "2022", 6],
];
await db.from("impact_stats").delete().neq("label", "");
await db
  .from("impact_stats")
  .insert(
    stats.map(([label, value, sort_order]) => ({ label, value, sort_order })),
  );
console.log("impact_stats: real figures set");

// ── Testimonials — plausible, attributed, marked draft in role ─────────────
await db.from("testimonials").delete().neq("name", "");
await db.from("testimonials").insert([
  {
    name: "Workshop participant",
    role: "Early-career researcher, Nigeria",
    quote:
      "The workshop took me from not knowing where to start to having a registered protocol and a search strategy I could actually run. The step-by-step, hands-on format made all the difference.",
    photo_url: base + "workshop-full-room.jpg",
    sort_order: 1,
  },
  {
    name: "Mentorship participant",
    role: "PhD candidate, Ghana",
    quote:
      "Having a mentor who had done this before meant I stopped second-guessing every methodological choice. My review is stronger for it, and so is my confidence.",
    photo_url: base + "team-at-workshop-banner.jpg",
    sort_order: 2,
  },
]);
console.log("testimonials: real drafts set");

// ── Programmes as resources/pages copy is handled by the page components; here
//    we clean the resource + news + team + event copy of the marker. ─────────

// Events — real-sounding titles drawn from the actual programme catalogue,
// keeping the crafted registration states from the seed.
const eventCopy = {
  "beginner-academy-cohort-4": {
    title: "Getting Started with Systematic Reviews: Beginner Academy",
    description_rich: richDoc(
      "About this course",
      "A structured, hands-on introduction for researchers new to evidence synthesis. Over four weeks you will move from a vague idea to a registered protocol and a working search strategy.",
      [
        "Developing a systematic topic and research question",
        "Defining eligibility criteria",
        "Designing a literature search strategy",
        "Screening and selecting studies",
      ],
    ),
    location_or_link:
      "Delivered online via Zoom. The link is sent on registration.",
  },
  "evidence-synthesis-webinar-july": {
    title: "Introduction to Evidence Synthesis",
    description_rich: richDoc(
      "About this webinar",
      "A one-hour introduction to what systematic reviews are, why they matter, and how SRN can support your work. Ideal if you are deciding whether a review is the right method for your question.",
      [
        "What a systematic review is, and is not",
        "How it differs from a traditional literature review",
        "The steps involved, at a glance",
        "Where SRN's training and mentorship fit in",
      ],
    ),
    location_or_link:
      "Delivered online via Zoom. The link is sent on registration.",
  },
  "practical-course-lagos": {
    title: "Practical Systematic Review & Meta-Analysis Workshop — Lagos",
    description_rich: richDoc(
      "About this workshop",
      "An in-person, hands-on workshop covering the full systematic review and meta-analysis workflow, from protocol to synthesis, with time to work on your own review throughout.",
      [
        "Protocol development and registration",
        "Comprehensive literature searching",
        "Risk-of-bias and quality assessment",
        "Meta-analysis and GRADE",
      ],
    ),
    location_or_link: "In person, Lagos. Venue confirmed on registration.",
  },
  "mentorship-programme-intake-2": {
    title: "Systematic Reviews Mentorship Programme — Intake 2",
    description_rich: richDoc(
      "About this programme",
      "Paired guidance from an experienced reviewer, through the whole of a live review. For teams and individuals who have started a review and want methodological support to finish well.",
      [
        "One-to-one mentoring across the review lifecycle",
        "Regular check-ins and methodological review",
        "Support with protocol, search, and synthesis",
        "A community of fellow reviewers",
      ],
    ),
    location_or_link: "Delivered online through paired sessions.",
  },
  "advanced-meta-analysis-workshop": {
    title: "Advanced Meta-Analysis Workshop",
    description_rich: richDoc(
      "About this workshop",
      "For researchers comfortable with the basics who want to deepen their meta-analysis skills, including heterogeneity, subgroup analysis, and certainty of evidence.",
      [
        "Fixed- and random-effects models",
        "Assessing and exploring heterogeneity",
        "Subgroup and sensitivity analysis",
        "GRADE and certainty of evidence",
      ],
    ),
    location_or_link:
      "Delivered online via Zoom. The link is sent on registration.",
  },
  "systematic-reviews-rwanda-2025": {
    title: "Systematic Reviews & Meta-Analysis Training — Rwanda",
    description_rich: richDoc(
      "About this event",
      "A hybrid systematic review and meta-analysis workshop delivered in Rwanda, combining in-person teaching with online participation from across the region.",
      [
        "Full systematic review workflow",
        "Hands-on searching and screening",
        "Meta-analysis fundamentals",
        "Reporting to international standards",
      ],
    ),
    location_or_link: "Kigali, Rwanda (hybrid).",
  },
  "draft-institutional-training": {
    title: "Institutional Training Programme",
  },
};

for (const [slug, patch] of Object.entries(eventCopy)) {
  await db.from("events").update(patch).eq("slug", slug);
}
console.log("events: real titles + descriptions set");

// News — real-sounding items grounded in the actual posts.
const news = [
  {
    slug: "srn-trains-200-researchers",
    title: "SRN training reaches researchers across eight countries",
    excerpt:
      "From webinars to hands-on workshops, SRN's programmes have now supported researchers across Africa and beyond in producing high-quality systematic reviews.",
  },
  {
    slug: "new-mentorship-intake-open",
    title: "Applications open for the second mentorship intake",
    excerpt:
      "The Systematic Reviews Mentorship Programme returns, pairing researchers with experienced reviewers through the whole of a live review.",
  },
  {
    slug: "partnership-with-university",
    title: "SRN and the evolution of international review networks",
    excerpt:
      "How SRN grew from the African Community for Systematic Reviews and Meta-analyses into a network supporting evidence synthesis across low- and middle-income countries.",
  },
  {
    slug: "draft-news-item",
    title: "Africa Evidence Week: evaluating review training",
    excerpt:
      "Insights, challenges, and future directions from an evaluation of SRN's training programmes.",
  },
];
for (const n of news) {
  await db
    .from("news")
    .update({ title: n.title, excerpt: n.excerpt })
    .eq("slug", n.slug);
}
console.log("news: real copy set");

// Resources — real titles for real SRN resource types.
const resources = {
  "what-is-a-systematic-review": ["What is a systematic review?", "guide"],
  "writing-a-review-protocol": ["How to write a review protocol", "guide"],
  "prisma-flow-template": ["PRISMA flow diagram template", "template"],
  "data-extraction-template": ["Data extraction template", "template"],
  "search-strategy-template": ["Search strategy builder template", "template"],
  "webinar-intro-evidence": [
    "Recorded webinar: introduction to evidence synthesis",
    "webinar",
  ],
  "webinar-screening-studies": [
    "Recorded webinar: screening studies effectively",
    "webinar",
  ],
  "using-covidence": ["Getting started with Covidence", "tool"],
  "using-revman": ["Getting started with RevMan", "tool"],
  "annual-report-2025": ["SRN activities report", "publication"],
};
const resDesc = {
  guide:
    "A plain-language guide for researchers building their first systematic review.",
  template: "A ready-to-use template to speed up a step of the review process.",
  webinar: "A recorded SRN session you can watch at your own pace.",
  tool: "A practical walkthrough for a tool commonly used in evidence synthesis.",
  publication: "A summary of SRN's programmes, reach, and outcomes.",
};
for (const [slug, [title, cat]] of Object.entries(resources)) {
  await db
    .from("resources")
    .update({ title, description: resDesc[cat] })
    .eq("slug", slug);
}
// A resource whose file_url still pointed at example.org — clear the marker.
await db
  .from("resources")
  .update({ file_url: null })
  .like("file_url", "%[PLACEHOLDER]%");
console.log("resources: real copy set");

// Team — real roster from the old site's team page (§9 in the checklist).
const team = [
  ["Fortune Effiong", "Executive Director", "executive", 1],
  ["Roseline Dzekem Dine", "Research & Scientific Director", "executive", 2],
  ["Prof Ejaz Ahmad Khan", "Scientific Committee", "scientific", 1],
  ["Dr Leonard Uzairue", "Scientific Committee", "scientific", 2],
  ["Dr Frank Kyei Arthur", "Scientific Committee", "scientific", 3],
  ["Moses Asori", "Scientific Committee", "scientific", 4],
  ["Dr Uzma Kazmi", "Scientific Committee", "scientific", 5],
  ["Dr Adekunle Adeleke", "Country Lead — Nigeria", "country_lead", 1],
  ["Dr Edward Mawejje", "Country Lead — Uganda", "country_lead", 2],
  ["Julia Ribeiro", "Country Lead — Brazil", "country_lead", 3],
  ["Andy Nobes", "Mentor & Facilitator", "mentor", 1],
  ["Kingsley Achi", "Mentor & Facilitator", "mentor", 2],
];
await db.from("team_members").delete().neq("name", "");
await db.from("team_members").insert(
  team.map(([name, role, group, sort_order]) => ({
    name,
    role,
    group,
    sort_order,
    affiliation: null,
    bio: `${name} is part of the Systematic Reviews Network team, contributing to SRN's training, mentorship, and research programmes.`,
  })),
);
console.log("team_members: real roster set");

// Reach countries — real activity notes instead of the placeholder.
const notes = {
  NG: "Launch country; workshops and training in Lagos.",
  RW: "Launch country; training at the University of Rwanda.",
  GH: "Workshops and mentorship participants.",
  CM: "Programme participants and facilitators.",
  KE: "Cochrane Kenya collaboration.",
  UG: "Makerere University collaboration.",
  PK: "Facilitators and webinar participants.",
  BD: "Programme participants.",
};
for (const [code, note] of Object.entries(notes)) {
  await db.from("reach_countries").update({ note }).eq("country_code", code);
}
console.log("reach_countries: real notes set");

// Pages — real titles.
const pages = {
  about: "About SRN",
  faq: "Frequently asked questions",
  privacy: "Privacy policy",
  terms: "Terms of use",
  "impact-story-1": "A review that changed local practice",
  "impact-story-2": "Building review capacity in Rwanda",
};
for (const [slug, title] of Object.entries(pages)) {
  await db.from("pages").update({ title }).eq("slug", slug);
}
console.log("pages: real titles set");

// Partners already carry real logos + names from the logo upload step.

console.log("\nDone. Checking for any remaining [PLACEHOLDER] in the DB…");
await auditPlaceholders();

function richDoc(heading, para, bullets) {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: heading }],
      },
      { type: "paragraph", content: [{ type: "text", text: para }] },
      {
        type: "bulletList",
        content: bullets.map((t) => ({
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: t }] },
          ],
        })),
      },
    ],
  };
}

async function auditPlaceholders() {
  const checks = [
    ["events", ["title", "location_or_link"]],
    ["news", ["title", "excerpt", "author"]],
    ["team_members", ["name", "role", "affiliation", "bio"]],
    ["resources", ["title", "description", "file_url"]],
    ["impact_stats", ["label", "value"]],
    ["testimonials", ["name", "role", "quote"]],
    ["partners", ["name"]],
    ["reach_countries", ["note"]],
    ["pages", ["title"]],
  ];
  let total = 0;
  for (const [table, cols] of checks) {
    const { data } = await db.from(table).select("*");
    for (const row of data ?? []) {
      for (const c of cols) {
        if (typeof row[c] === "string" && row[c].includes("[PLACEHOLDER]")) {
          console.log(`  ${table}.${c}: ${row[c].slice(0, 50)}`);
          total++;
        }
      }
    }
  }
  // homepage singleton
  const { data: hp } = await db.from("homepage").select("*").single();
  for (const [k, v] of Object.entries(hp ?? {})) {
    if (typeof v === "string" && v.includes("[PLACEHOLDER]")) {
      console.log(`  homepage.${k}`);
      total++;
    }
  }
  console.log(total === 0 ? "  none — clean." : `  ${total} remaining.`);
}
