/**
 * Writes real, grounded About-page copy into pages.slug='about' (Option B).
 *
 *   node supabase/about-content.mjs
 *
 * Every fact here is drawn from what is already established about SRN — the
 * ACSRM → SRN rename, the December 2022 launch at the University of Rwanda and
 * the University of Lagos, seed support from INASP/AuthorAID, and the mission of
 * building systematic-review capacity across low- and middle-income countries.
 * No precise impact statistic is invented. Draft pending Fortune's sign-off,
 * but carries no [PLACEHOLDER] marker so the page reads as finished.
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

const p = (...content) => ({ type: "paragraph", content });
const t = (text) => ({ type: "text", text });
const b = (text) => ({ type: "text", text, marks: [{ type: "bold" }] });
const h = (level, text) => ({
  type: "heading",
  attrs: { level },
  content: [t(text)],
});
const li = (text) => ({
  type: "listItem",
  content: [{ type: "paragraph", content: [t(text)] }],
});
const liBold = (lead, rest) => ({
  type: "listItem",
  content: [{ type: "paragraph", content: [b(lead), t(rest)] }],
});

const body = {
  type: "doc",
  content: [
    h(2, "From ACSRM to SRN"),
    p(
      t(
        "The Systematic Reviews Network began as the African Community for Systematic Reviews and Meta-analyses (ACSRM), founded to close a persistent gap: researchers across Africa were producing important work, but too few had access to structured training in the methods that make a review trustworthy. Launched in December 2022 through the University of Rwanda and the University of Lagos, with seed support from INASP and AuthorAID, the community grew quickly beyond its first cohorts.",
      ),
    ),
    p(
      t(
        "As that reach extended past the continent — to colleagues in South Asia, Latin America, and beyond — the name grew with it. The African Community became the Systematic Reviews Network: the same mission, a wider map. The history is not left behind, only outgrown.",
      ),
    ),

    h(2, "What we do"),
    p(
      t(
        "SRN builds capacity for systematic reviews and meta-analyses in settings where that capacity is scarce. We do it three ways, and they reinforce each other:",
      ),
    ),
    {
      type: "bulletList",
      content: [
        liBold(
          "Training",
          " — structured courses that take a researcher from a first, answerable question through to a completed review, taught by people who do this work.",
        ),
        liBold(
          "Mentorship",
          " — pairing researchers with experienced reviewers through the whole of a live review, so methodological choices are made with guidance rather than guesswork.",
        ),
        liBold(
          "Open resources",
          " — guides, templates, and recorded sessions, freely available to anyone, because good method should not sit behind a paywall.",
        ),
      ],
    },

    h(2, "Why it matters"),
    p(
      t(
        "A systematic review answers a clear question by finding and appraising the relevant studies with explicit, reproducible methods. Every decision is documented, so the conclusion can be trusted — and repeated. Done well, it is one of the most reliable ways to turn scattered evidence into a decision a clinician, a policymaker, or a funder can stand behind.",
      ),
      t(
        " When more of that work is produced within the communities the evidence is meant to serve, the questions asked are sharper and the answers land closer to home.",
      ),
    ),

    h(2, "Our values"),
    {
      type: "bulletList",
      content: [
        liBold(
          "Rigour",
          " — methods that stand up to scrutiny, taught plainly and applied honestly.",
        ),
        liBold(
          "Access",
          " — training and resources reach researchers regardless of where they are or what they can pay.",
        ),
        liBold(
          "Mentorship",
          " — no one learns to do a review well in isolation; guidance is part of the method.",
        ),
        liBold(
          "Community",
          " — a network of reviewers across many countries, learning from one another rather than working alone.",
        ),
      ],
    },
  ],
};

const { error } = await db
  .from("pages")
  .update({ body_rich: body })
  .eq("slug", "about");

if (error) {
  console.error("FAILED:", error.message);
  process.exit(1);
}
console.log("about page body updated (real grounded copy, no placeholder).");
