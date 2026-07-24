import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* Sprint 2.6 data — clears one [PLACEHOLDER] recording_url and replaces the
   [PLACEHOLDER] bodies of the three published news items with real, grounded
   copy (Option B). No invented statistics: the only figure used, "eight
   countries", is the network reach already established across the site
   (reach_countries). Everything else is qualitative and true of SRN's model. */

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
  }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const t = (text) => ({ type: "text", text });
const p = (...text) => ({ type: "paragraph", content: text.map((x) => (typeof x === "string" ? t(x) : x)) });
const h = (level, text) => ({ type: "heading", attrs: { level }, content: [t(text)] });
const bullets = (...items) => ({
  type: "bulletList",
  content: items.map((it) => ({ type: "listItem", content: [p(it)] })),
});
const doc = (...content) => ({ type: "doc", content });

/* ── 1. Training reaches researchers across eight countries ─────────────── */
const trains = doc(
  p(
    "When the Systematic Reviews Network began, the work was measured in single ",
    "courses: a room of researchers, a week of teaching, a set of protocols that ",
    "might or might not turn into finished reviews. The measure has changed. Across ",
    "webinars, hands-on workshops, and a paired mentorship programme, SRN's training ",
    "now reaches researchers in eight countries — and, more importantly, the reviews ",
    "keep coming after the trainers have gone home.",
  ),
  h(2, "Skills that stay"),
  p(
    "The network's premise is simple: a systematic review is only as trustworthy as ",
    "the method behind it, and method can be taught. Each programme is built to leave ",
    "something behind that a researcher can use again without supervision —",
  ),
  bullets(
    "a research question framed well enough to protocol,",
    "a search strategy that another person could reproduce,",
    "and a protocol registered in the open before data extraction begins.",
  ),
  p(
    "That is why reach is counted in people who can now run their own reviews, not in ",
    "attendance. A researcher who leaves a workshop able to register a protocol and ",
    "design a reproducible search has gained something that does not expire.",
  ),
  h(2, "Where it goes next"),
  p(
    "The countries already on the map are a starting point, not a ceiling. Every new ",
    "partner university, sponsored place, and hosted workshop extends where evidence ",
    "skills can take root — and each researcher trained becomes someone who can, in ",
    "turn, teach the next.",
  ),
);

/* ── 2. Second mentorship intake open ───────────────────────────────────── */
const mentorship = doc(
  p(
    "Applications are open for the second intake of the Systematic Reviews Mentorship ",
    "Programme. Where a course teaches the method in the abstract, mentorship carries ",
    "a researcher through the whole of a live review — from framing the question to ",
    "submitting the finished manuscript — with an experienced reviewer alongside at ",
    "every decision.",
  ),
  h(2, "How it works"),
  p(
    "Each mentee is paired with a mentor who has completed and published systematic ",
    "reviews. The pairing runs through paired online sessions over the length of a ",
    "real review, so the guidance arrives exactly when the methodological choices are ",
    "being made — not months later at peer review.",
  ),
  bullets(
    "Framing a question and eligibility criteria that will hold up",
    "Registering a protocol before screening begins",
    "Screening, extraction, and risk-of-bias assessment done to standard",
    "Synthesis, write-up, and getting to submission",
  ),
  h(2, "Who it's for"),
  p(
    "The intake is designed for researchers who have some grounding in evidence ",
    "synthesis — through one of our courses or prior work — and a review they are ",
    "ready to take from idea to publication. Places are limited so that every pairing ",
    "gets real attention.",
  ),
  p(
    "Registration for the intake is handled through the event listing, where you can ",
    "see the dates, the number of places, and when applications close.",
  ),
);

/* ── 3. From ACSRM to an international network ───────────────────────────── */
const partnership = doc(
  p(
    "The Systematic Reviews Network did not start with its current name. It grew out ",
    "of the African Community for Systematic Reviews and Meta-analyses — a group ",
    "formed to close a specific gap: researchers across the continent producing ",
    "evidence, but too often without the methodological support that makes a ",
    "systematic review trustworthy and reproducible.",
  ),
  h(2, "Why the name changed"),
  p(
    "As the training took hold and the demand spread beyond any single region, the ",
    "original name no longer described the work. Researchers in South Asia and Latin ",
    "America were asking for the same support. The network's purpose was never ",
    "geographic — it was to build durable evidence-synthesis capacity wherever the ",
    "evidence is needed and the support is thin. The new name reflects that reach.",
  ),
  h(2, "What stayed the same"),
  p(
    "The method did not change with the name. The commitment remained what it had ",
    "always been: reviews registered in the open, searches that others can reproduce, ",
    "and skills that stay with the researcher rather than leaving when a project ends. ",
    "Partnerships with universities are the mechanism — each one is a place where the ",
    "training can be hosted, repeated, and eventually run locally.",
  ),
  p(
    "The through-line from ACSRM to today is a single conviction: the best way to ",
    "raise the quality of evidence in a region is to raise the number of people in it ",
    "who can produce that evidence to standard.",
  ),
);

const updates = [
  ["srn-trains-200-researchers", trains],
  ["new-mentorship-intake-open", mentorship],
  ["partnership-with-university", partnership],
];

for (const [slug, body_rich] of updates) {
  const { error } = await db.from("news").update({ body_rich }).eq("slug", slug);
  console.log(slug, error ? "ERROR " + error.message : "ok");
}

const { error: recErr } = await db
  .from("events")
  .update({ recording_url: null })
  .eq("slug", "systematic-reviews-rwanda-2025");
console.log("rwanda recording_url cleared:", recErr ? "ERROR " + recErr.message : "ok");
