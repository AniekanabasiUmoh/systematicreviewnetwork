/**
 * Writes real, grounded article bodies for the two on-site guide resources
 * (Option B). node supabase/guides-content.mjs
 *
 * These are genuine plain-language explainers of established method — a
 * systematic review, and a review protocol. Every claim is standard,
 * uncontroversial methodology (PICO, PRISMA, PROSPERO, risk-of-bias). No SRN
 * statistic is invented. Draft pending sign-off; no [PLACEHOLDER] marker.
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

const t = (text) => ({ type: "text", text });
const b = (text) => ({ type: "text", text, marks: [{ type: "bold" }] });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const p = (...content) => ({ type: "paragraph", content });
const li = (...content) => ({
  type: "listItem",
  content: [{ type: "paragraph", content }],
});
const ul = (...items) => ({ type: "bulletList", content: items });
const ol = (...items) => ({ type: "orderedList", content: items });

const whatIsASystematicReview = {
  type: "doc",
  content: [
    p(
      t(
        "A systematic review answers a clearly defined question by finding, appraising, and bringing together all the studies relevant to it — using methods that are explicit, planned in advance, and reproducible. That last word is the point: another team following your stated methods should be able to arrive at the same set of studies and the same conclusion.",
      ),
    ),

    h(2, "How it differs from an ordinary literature review"),
    p(
      t(
        "A traditional narrative review reflects what its author happened to read and found convincing. A systematic review removes that discretion. Before looking at any results, you fix the question, the criteria for including a study, the databases to search, and how each study will be assessed. Because the process is set down first and reported in full, the reader can see exactly how the conclusion was reached — and where it might be fragile.",
      ),
    ),

    h(2, "The main stages"),
    ol(
      li(b("Ask a clear question. "), t("A well-scoped question usually names the population, the intervention or exposure, any comparison, and the outcome — the PICO frame is the common shorthand.")),
      li(b("Write a protocol. "), t("Set out the methods in advance and, ideally, register them publicly (for example on PROSPERO) so the plan is on record before results can influence it.")),
      li(b("Search systematically. "), t("Search several databases with a documented strategy, so the search can be rerun and checked rather than taken on trust.")),
      li(b("Screen against your criteria. "), t("Two reviewers independently screen titles, abstracts, and then full texts, resolving disagreements by discussion — a guard against one person's blind spots.")),
      li(b("Appraise the studies. "), t("Assess each included study for risk of bias with a recognised tool, so the quality of the evidence is weighed, not just its quantity.")),
      li(b("Synthesise and report. "), t("Bring the findings together — narratively, or with a meta-analysis where the data allow — and report the whole process transparently, following the PRISMA guideline.")),
    ),

    h(2, "When a meta-analysis fits"),
    p(
      t(
        "A meta-analysis is the statistical step that combines results across studies into a single estimate. It is part of some systematic reviews, not all of them: it is only appropriate when the studies are similar enough in question, design, and outcome that pooling them is meaningful. When they are not, combining them produces a precise-looking number that means very little. A good review knows when not to pool.",
      ),
    ),

    h(2, "Why it matters"),
    p(
      t(
        "Done well, a systematic review is one of the most reliable ways to turn a scattered, sometimes contradictory literature into something a clinician, a policymaker, or a funder can act on. Done carelessly, it lends false authority to a weak conclusion. The methods exist to keep the first from becoming the second — and they can be learned.",
      ),
    ),
  ],
};

const writingAReviewProtocol = {
  type: "doc",
  content: [
    p(
      t(
        "A protocol is the plan for your systematic review, written before you begin. It states the question, the methods, and the decisions you will make — so those decisions are made on principle, in advance, rather than shaped by results you have already seen. A clear protocol is the difference between a review that can be trusted and one that merely looks thorough.",
      ),
    ),

    h(2, "Why write one first"),
    p(
      t(
        "Every review involves judgement calls: which studies count, how to handle a borderline case, which outcomes matter. Made after you have seen the data, those calls are open to bias — conscious or not. Made and recorded beforehand, they are simply method. Registering the protocol publicly (PROSPERO is the usual home for health reviews) puts the plan on record and lets others see that it came first.",
      ),
    ),

    h(2, "What a protocol should contain"),
    ul(
      li(b("Background and rationale "), t("— why the review is needed and what gap it addresses.")),
      li(b("The question "), t("— stated precisely, usually via PICO (population, intervention, comparison, outcome).")),
      li(b("Eligibility criteria "), t("— exactly what makes a study includable: designs, populations, dates, languages.")),
      li(b("Search strategy "), t("— which databases, which terms, and any limits, in enough detail to be rerun.")),
      li(b("Screening and selection "), t("— how many reviewers, working independently, and how disagreements are resolved.")),
      li(b("Data extraction "), t("— what will be pulled from each study, and on what form.")),
      li(b("Risk-of-bias assessment "), t("— which tool, applied by whom.")),
      li(b("Synthesis plan "), t("— narrative or meta-analysis, and the conditions under which you would pool results.")),
    ),

    h(2, "A note on changes"),
    p(
      t(
        "A protocol is a commitment, not a cage. Reviews sometimes have to depart from the plan — a database is unavailable, a definition proves unworkable. That is allowed. What is required is that you say so: record what changed, when, and why, so the reader can judge whether the change was reasonable. An undisclosed deviation is what damages a review; a disclosed one rarely does.",
      ),
    ),

    h(2, "Where to start"),
    p(
      t(
        "If this is your first review, you do not have to write the protocol alone. SRN's Beginner Academy walks through each section in turn, and the Mentorship Programme pairs you with someone who has written several. The templates in this library give you a structure to fill in.",
      ),
    ),
  ],
};

for (const [slug, body] of [
  ["what-is-a-systematic-review", whatIsASystematicReview],
  ["writing-a-review-protocol", writingAReviewProtocol],
]) {
  const { error } = await db
    .from("resources")
    .update({ body_rich: body })
    .eq("slug", slug);
  console.log(error ? `FAILED ${slug}: ${error.message}` : `updated ${slug}`);
}
