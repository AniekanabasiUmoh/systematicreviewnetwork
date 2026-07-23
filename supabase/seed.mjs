/**
 * Seeds realistic development data (Design.md §0.4).
 *
 *   node supabase/seed.mjs          upsert all seed rows
 *   node supabase/seed.mjs --reset  delete seed rows first, then re-seed
 *
 * Idempotent: every row is upserted on a natural key, so re-running does not
 * duplicate. Every human-visible string is prefixed [PLACEHOLDER] so the
 * §6.1 launch gate (`grep -r PLACEHOLDER` returns zero) catches anything that
 * survives to production.
 *
 * Images are deliberately NOT stock photos — §7 forbids them. Image fields are
 * left null so components render their placeholder blocks.
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
  // .env wins over the ambient shell (see migrate.mjs).
  return { ...process.env, ...env };
}

const env = loadEnv();
const projectRef = (env.NEXT_PUBLIC_SUPABASE_URL || "").match(
  /https:\/\/([a-z0-9]+)\.supabase\.co/,
)?.[1];

const client = new pg.Client({
  host: `aws-0-${env.SUPABASE_REGION || "eu-west-1"}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${projectRef}`,
  password: env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

const P = "[PLACEHOLDER]";

/** Days from now, as an ISO timestamp. */
const days = (n) => new Date(Date.now() + n * 864e5).toISOString();

/* ---------------------------------------------------------------------------
   Events — crafted so every §2.6 registration state is reachable locally:
   open · not_yet_open · closed · full · past. Two are paid (§13) so the
   payment path has something to run against.
   ------------------------------------------------------------------------ */
const events = [
  {
    slug: "beginner-academy-cohort-4",
    title: `${P} Beginner Academy — Cohort 4`,
    type: "course",
    starts_at: days(30),
    ends_at: days(34),
    location_type: "online",
    location_or_link: `${P} Zoom link issued on registration`,
    registration_opens: days(-10),
    registration_closes: days(25),
    capacity: 40,
    status: "published",
    price_kobo: 2500000, // ₦25,000 — state: OPEN, PAID
    currency: "NGN",
    description_rich: null,
    note: "state: open + paid",
  },
  {
    slug: "evidence-synthesis-webinar-july",
    title: `${P} Introduction to Evidence Synthesis`,
    type: "webinar",
    starts_at: days(12),
    ends_at: days(12),
    location_type: "online",
    location_or_link: `${P} Zoom link issued on registration`,
    registration_opens: days(-20),
    registration_closes: days(11),
    capacity: null, // uncapped
    status: "published",
    price_kobo: null, // FREE — proves the free path still works
    currency: "NGN",
    note: "state: open + free + uncapped",
  },
  {
    slug: "practical-course-lagos",
    title: `${P} Practical Systematic Review Course — Lagos`,
    type: "workshop",
    starts_at: days(60),
    ends_at: days(62),
    location_type: "in_person",
    location_or_link: `${P} Venue to be confirmed, Lagos`,
    registration_opens: days(14), // opens later — state: NOT_YET_OPEN
    registration_closes: days(55),
    capacity: 25,
    status: "published",
    price_kobo: 7500000, // ₦75,000
    currency: "NGN",
    note: "state: not_yet_open",
  },
  {
    slug: "mentorship-programme-intake-2",
    title: `${P} Mentorship Programme — Intake 2`,
    type: "mentorship",
    starts_at: days(21),
    ends_at: days(180),
    location_type: "online",
    location_or_link: `${P} Paired online sessions`,
    registration_opens: days(-30),
    registration_closes: days(-2), // already closed — state: CLOSED
    capacity: 15,
    status: "published",
    price_kobo: null,
    currency: "NGN",
    note: "state: closed (window passed)",
  },
  {
    slug: "advanced-meta-analysis-workshop",
    title: `${P} Advanced Meta-Analysis Workshop`,
    type: "workshop",
    starts_at: days(45),
    ends_at: days(46),
    location_type: "online",
    location_or_link: `${P} Zoom link issued on registration`,
    registration_opens: days(-15),
    registration_closes: days(40),
    capacity: 3, // deliberately tiny; seeded full below — state: FULL
    status: "published",
    price_kobo: 5000000,
    currency: "NGN",
    note: "state: full (capacity 3, 3 paid registrations seeded)",
  },
  {
    slug: "systematic-reviews-rwanda-2025",
    title: `${P} Systematic Reviews Training — Rwanda`,
    type: "workshop",
    starts_at: days(-120),
    ends_at: days(-118),
    location_type: "in_person",
    location_or_link: `${P} Kigali, Rwanda`,
    registration_opens: days(-160),
    registration_closes: days(-125),
    capacity: 30,
    status: "published",
    price_kobo: null,
    currency: "NGN",
    recording_url: `${P} https://example.org/recording`,
    note: "state: past (with recording)",
  },
  {
    slug: "draft-institutional-training",
    title: `${P} Institutional Training — Draft, should not be public`,
    type: "course",
    starts_at: days(90),
    location_type: "in_person",
    status: "draft", // proves published-only filtering works
    price_kobo: null,
    currency: "NGN",
    note: "draft — must never appear on the public site",
  },
];

const news = [
  {
    slug: "srn-trains-200-researchers",
    title: `${P} SRN trains 200 researchers across six countries`,
    excerpt: `${P} A short summary of the news item, roughly two lines long, as it appears in the news listing.`,
    author: `${P} SRN Communications`,
    published_at: days(-5),
    status: "published",
  },
  {
    slug: "new-mentorship-intake-open",
    title: `${P} Applications open for the second mentorship intake`,
    excerpt: `${P} A short summary of the news item, roughly two lines long, as it appears in the news listing.`,
    author: `${P} SRN Communications`,
    published_at: days(-18),
    status: "published",
  },
  {
    slug: "partnership-with-university",
    title: `${P} SRN partners with a West African university`,
    excerpt: `${P} A short summary of the news item, roughly two lines long, as it appears in the news listing.`,
    author: `${P} SRN Communications`,
    published_at: days(-40),
    status: "published",
  },
  {
    slug: "draft-news-item",
    title: `${P} Unpublished news item — should not be public`,
    excerpt: `${P} Draft.`,
    author: `${P} SRN Communications`,
    published_at: null,
    status: "draft",
  },
];

const team = [
  ["executive", 1, "Executive Director"],
  ["executive", 2, "Programmes Lead"],
  ["executive", 3, "Communications Lead"],
  ["scientific", 1, "Chair, Scientific Committee"],
  ["scientific", 2, "Methodologist"],
  ["scientific", 3, "Statistician"],
  ["country_lead", 1, "Country Lead — Nigeria"],
  ["country_lead", 2, "Country Lead — Rwanda"],
  ["country_lead", 3, "Country Lead — Ghana"],
  ["mentor", 1, "Mentor"],
  ["mentor", 2, "Mentor"],
  ["mentor", 3, "Facilitator"],
].map(([group, i, role], idx) => ({
  name: `${P} Team Member ${idx + 1}`,
  role: `${P} ${role}`,
  affiliation: `${P} Institution name`,
  bio: `${P} A two- or three-sentence biography describing this person's background, their role at SRN, and their research interests. Long enough to show how the card wraps.`,
  group,
  sort_order: i,
}));

const resources = [
  {
    slug: "what-is-a-systematic-review",
    category: "guide",
    title: `${P} What is a systematic review?`,
    body: true,
  },
  {
    slug: "writing-a-review-protocol",
    category: "guide",
    title: `${P} How to write a review protocol`,
    body: true,
  },
  {
    slug: "prisma-flow-template",
    category: "template",
    title: `${P} PRISMA flow diagram template`,
  },
  {
    slug: "data-extraction-template",
    category: "template",
    title: `${P} Data extraction template`,
  },
  {
    slug: "search-strategy-template",
    category: "template",
    title: `${P} Search strategy template`,
  },
  {
    slug: "webinar-intro-evidence",
    category: "webinar",
    title: `${P} Recorded webinar: introduction to evidence synthesis`,
  },
  {
    slug: "webinar-screening-studies",
    category: "webinar",
    title: `${P} Recorded webinar: screening studies`,
  },
  {
    slug: "using-covidence",
    category: "tool",
    title: `${P} Getting started with Covidence`,
  },
  {
    slug: "using-revman",
    category: "tool",
    title: `${P} Getting started with RevMan`,
  },
  {
    slug: "annual-report-2025",
    category: "publication",
    title: `${P} Annual report`,
  },
];

const impactStats = [
  ["Researchers trained", `${P} 200+`, 1],
  ["Workshops delivered", `${P} 24`, 2],
  ["Countries reached", `${P} 6`, 3],
  ["Partner institutions", `${P} 12`, 4],
  ["Reviews supported", `${P} 45`, 5],
  ["Community members", `${P} 1,500+`, 6],
];

const countries = [
  ["NG", "Nigeria"],
  ["RW", "Rwanda"],
  ["GH", "Ghana"],
  ["CM", "Cameroon"],
  ["PK", "Pakistan"],
  ["BR", "Brazil"],
  ["KE", "Kenya"],
  ["UG", "Uganda"],
];

const testimonials = [
  [`${P} Participant One`, `${P} PhD Candidate, Institution`, 1],
  [`${P} Participant Two`, `${P} Lecturer, Institution`, 2],
  [`${P} Participant Three`, `${P} Research Fellow, Institution`, 3],
];

const partners = [
  [`${P} Partner Organisation One`, 1],
  [`${P} Partner Organisation Two`, 2],
  [`${P} Partner Organisation Three`, 3],
  [`${P} Partner Organisation Four`, 4],
  [`${P} Partner Organisation Five`, 5],
];

const pages = [
  ["about", `${P} About SRN`],
  ["faq", `${P} Frequently asked questions`],
  ["privacy", `${P} Privacy policy`],
  ["terms", `${P} Terms of use`],
  ["impact-story-1", `${P} Impact story: a review that changed practice`],
  ["impact-story-2", `${P} Impact story: building capacity in Rwanda`],
];

/** Minimal Tiptap-compatible rich text, long enough to exercise Prose styles. */
const richText = (heading) => ({
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: `${P} ${heading}` }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `${P} An opening paragraph of body copy, long enough to show how the prose column wraps at its 68-character measure and how the line height reads at real length. It should run to several lines on a desktop screen.`,
        },
      ],
    },
    {
      type: "bulletList",
      content: ["First point", "Second point", "Third point"].map((t) => ({
        type: "listItem",
        content: [
          { type: "paragraph", content: [{ type: "text", text: `${P} ${t}` }] },
        ],
      })),
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `${P} A closing paragraph following the list, so spacing between block types is visible.`,
        },
      ],
    },
  ],
});

async function main() {
  await client.connect();
  const reset = process.argv.includes("--reset");

  if (reset) {
    // Order matters: registrations reference events.
    for (const t of [
      "registrations",
      "applications",
      "newsletter_signups",
      "contact_messages",
      "donations",
      "events",
      "news",
      "team_members",
      "resources",
      "impact_stats",
      "reach_countries",
      "testimonials",
      "partners",
      "pages",
      "media",
    ]) {
      await client.query(`delete from ${t}`);
    }
    await client.query("delete from homepage");
    console.log("reset: cleared all seed tables");
  }

  // --- events -------------------------------------------------------------
  for (const e of events) {
    await client.query(
      `insert into events (title, slug, type, starts_at, ends_at, location_type,
         location_or_link, registration_opens, registration_closes, capacity,
         status, price_kobo, currency, recording_url, description_rich)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       on conflict (slug) do update set
         title = excluded.title, type = excluded.type,
         starts_at = excluded.starts_at, ends_at = excluded.ends_at,
         location_type = excluded.location_type,
         location_or_link = excluded.location_or_link,
         registration_opens = excluded.registration_opens,
         registration_closes = excluded.registration_closes,
         capacity = excluded.capacity, status = excluded.status,
         price_kobo = excluded.price_kobo, currency = excluded.currency,
         recording_url = excluded.recording_url,
         description_rich = excluded.description_rich`,
      [
        e.title,
        e.slug,
        e.type,
        e.starts_at,
        e.ends_at ?? null,
        e.location_type,
        e.location_or_link ?? null,
        e.registration_opens ?? null,
        e.registration_closes ?? null,
        e.capacity ?? null,
        e.status,
        e.price_kobo ?? null,
        e.currency,
        e.recording_url ?? null,
        JSON.stringify(richText("About this event")),
      ],
    );
  }
  console.log(`events: ${events.length}`);

  // Fill the "full" event to capacity so the FULL state is real, not implied.
  const { rows: fullRows } = await client.query(
    "select id, capacity from events where slug = 'advanced-meta-analysis-workshop'",
  );
  if (fullRows[0]) {
    const { id, capacity } = fullRows[0];
    for (let i = 1; i <= capacity; i++) {
      await client.query(
        `insert into registrations (event_id, full_name, email, institution,
           country, payment_status, amount_kobo, currency, paid_at, paystack_reference)
         values ($1,$2,$3,$4,$5,'paid',5000000,'NGN',now(),$6)
         on conflict (event_id, lower(email)) do nothing`,
        [
          id,
          `${P} Registrant ${i}`,
          `seed-full-${i}@example.test`,
          `${P} Institution`,
          "Nigeria",
          `seed-ref-full-${i}`,
        ],
      );
    }
    console.log(
      `registrations: filled '${P} Advanced Meta-Analysis' to capacity (${capacity})`,
    );
  }

  // A handful of registrations on the open free webinar.
  const { rows: openRows } = await client.query(
    "select id from events where slug = 'evidence-synthesis-webinar-july'",
  );
  if (openRows[0]) {
    for (let i = 1; i <= 7; i++) {
      await client.query(
        `insert into registrations (event_id, full_name, email, institution,
           country, payment_status)
         values ($1,$2,$3,$4,$5,'not_required')
         on conflict (event_id, lower(email)) do nothing`,
        [
          openRows[0].id,
          `${P} Registrant ${i}`,
          `seed-open-${i}@example.test`,
          `${P} Institution`,
          ["Nigeria", "Ghana", "Rwanda"][i % 3],
        ],
      );
    }
    console.log("registrations: 7 on the open free webinar");
  }

  // --- news ---------------------------------------------------------------
  for (const n of news) {
    await client.query(
      `insert into news (title, slug, excerpt, author, published_at, status, body_rich)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (slug) do update set
         title = excluded.title, excerpt = excluded.excerpt,
         author = excluded.author, published_at = excluded.published_at,
         status = excluded.status, body_rich = excluded.body_rich`,
      [
        n.title,
        n.slug,
        n.excerpt,
        n.author,
        n.published_at,
        n.status,
        JSON.stringify(richText("Article heading")),
      ],
    );
  }
  console.log(`news: ${news.length}`);

  // --- team ---------------------------------------------------------------
  // No natural unique key, so clear and reinsert to stay idempotent.
  await client.query("delete from team_members");
  for (const t of team) {
    await client.query(
      `insert into team_members (name, role, affiliation, bio, "group", sort_order)
       values ($1,$2,$3,$4,$5,$6)`,
      [t.name, t.role, t.affiliation, t.bio, t.group, t.sort_order],
    );
  }
  console.log(`team_members: ${team.length}`);

  // --- resources ----------------------------------------------------------
  for (const r of resources) {
    await client.query(
      `insert into resources (title, slug, description, category, status, body_rich, file_url)
       values ($1,$2,$3,$4,'published',$5,$6)
       on conflict (slug) do update set
         title = excluded.title, description = excluded.description,
         category = excluded.category, body_rich = excluded.body_rich,
         file_url = excluded.file_url`,
      [
        r.title,
        r.slug,
        `${P} A one- or two-sentence description of this resource, as shown on the resource card.`,
        r.category,
        r.body ? JSON.stringify(richText("Guide heading")) : null,
        r.body ? null : `${P} https://example.org/file.pdf`,
      ],
    );
  }
  console.log(`resources: ${resources.length} (2 as on-site articles)`);

  // --- small content tables ----------------------------------------------
  await client.query("delete from impact_stats");
  for (const [label, value, sort] of impactStats) {
    await client.query(
      "insert into impact_stats (label, value, sort_order) values ($1,$2,$3)",
      [`${P} ${label}`, value, sort],
    );
  }
  console.log(`impact_stats: ${impactStats.length}`);

  for (const [code, name] of countries) {
    await client.query(
      `insert into reach_countries (country_code, country_name, note)
       values ($1,$2,$3) on conflict (country_code) do update set
         country_name = excluded.country_name, note = excluded.note`,
      [code, name, `${P} Activity note`],
    );
  }
  console.log(`reach_countries: ${countries.length}`);

  await client.query("delete from testimonials");
  for (const [name, role, sort] of testimonials) {
    await client.query(
      "insert into testimonials (name, role, quote, sort_order) values ($1,$2,$3,$4)",
      [
        name,
        role,
        `${P} A quote of two or three sentences from someone who took part in SRN training, specific enough to be credible and long enough to show how the quote block wraps.`,
        sort,
      ],
    );
  }
  console.log(`testimonials: ${testimonials.length}`);

  await client.query("delete from partners");
  for (const [name, sort] of partners) {
    await client.query(
      "insert into partners (name, url, sort_order) values ($1,$2,$3)",
      [name, "https://example.org", sort],
    );
  }
  console.log(`partners: ${partners.length}`);

  for (const [slug, title] of pages) {
    await client.query(
      `insert into pages (slug, title, body_rich) values ($1,$2,$3)
       on conflict (slug) do update set
         title = excluded.title, body_rich = excluded.body_rich`,
      [slug, title, JSON.stringify(richText("Section heading"))],
    );
  }
  console.log(`pages: ${pages.length}`);

  // --- homepage singleton -------------------------------------------------
  await client.query(
    `insert into homepage (id, hero_eyebrow, hero_heading, hero_subheading,
       about_paragraph, explainer_heading, explainer_body, cta_heading,
       cta_button_label, cta_button_href)
     values (true,$1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (id) do update set
       hero_eyebrow = excluded.hero_eyebrow, hero_heading = excluded.hero_heading,
       hero_subheading = excluded.hero_subheading,
       about_paragraph = excluded.about_paragraph,
       explainer_heading = excluded.explainer_heading,
       explainer_body = excluded.explainer_body,
       cta_heading = excluded.cta_heading,
       cta_button_label = excluded.cta_button_label,
       cta_button_href = excluded.cta_button_href`,
    [
      "Systematic Reviews Network",
      "Better evidence. Smarter decisions.",
      `${P} The capacity-building sentence describing what SRN does, who it serves, and where — roughly two lines on desktop.`,
      `${P} A single paragraph about SRN, as it appears on the homepage: what it is, when it started, and what it exists to do. Around four sentences.`,
      "New to systematic reviews?",
      `${P} A three-sentence plain-language explanation of what a systematic review is and why it matters, aimed at someone encountering the idea for the first time.`,
      `${P} Bring evidence synthesis training to your institution.`,
      "Partner with SRN",
      "/partner",
    ],
  );
  console.log("homepage: 1 (singleton)");

  // --- a few submissions so admin views are never empty --------------------
  await client.query("delete from applications where email like 'seed-app-%'");
  for (let i = 1; i <= 5; i++) {
    await client.query(
      `insert into applications (programme, full_name, email, institution, country, motivation, status)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`,
      [
        `${P} Beginner Academy`,
        `${P} Applicant ${i}`,
        `seed-app-${i}@example.test`,
        `${P} Institution`,
        ["Nigeria", "Ghana", "Kenya"][i % 3],
        `${P} A paragraph explaining why this person wants to join the programme, long enough to show how the admin detail view renders it.`,
        ["received", "under_review", "accepted", "waitlisted", "rejected"][
          i - 1
        ],
      ],
    );
  }
  for (let i = 1; i <= 6; i++) {
    await client.query(
      "insert into newsletter_signups (email) values ($1) on conflict do nothing",
      [`seed-news-${i}@example.test`],
    );
  }
  await client.query(
    "delete from contact_messages where email like 'seed-contact-%'",
  );
  for (let i = 1; i <= 4; i++) {
    await client.query(
      `insert into contact_messages (name, email, subject, message, type)
       values ($1,$2,$3,$4,$5) on conflict do nothing`,
      [
        `${P} Sender ${i}`,
        `seed-contact-${i}@example.test`,
        `${P} Subject line`,
        `${P} The body of a contact message, a few sentences long.`,
        i % 2 ? "general" : "partnership",
      ],
    );
  }
  console.log("submissions: 5 applications, 6 signups, 4 messages");

  console.log("\nSeed complete.");
  await client.end();
}

main().catch(async (e) => {
  console.error(`\nSeed failed: ${e.message}`);
  await client.end().catch(() => {});
  process.exit(1);
});
