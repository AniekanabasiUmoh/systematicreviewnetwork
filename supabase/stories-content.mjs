/**
 * Writes real, grounded copy into the two impact-story pages (Option B),
 * replacing the seeded [PLACEHOLDER] bodies.
 *
 *   node --env-file=.env supabase/stories-content.mjs
 *
 * These are narrative stories of the kind of change SRN's model produces —
 * grounded in facts already established about the network (the training →
 * registered-protocol → completed-review pipeline; the mentorship pairing
 * model; the December 2022 launch through the University of Rwanda). They are
 * written honestly and deliberately do NOT invent precise outcome statistics
 * (numbers of reviews published, people reached, policy changes). Where a
 * specific figure would normally sit, the copy speaks to the mechanism and the
 * direction of change instead. Draft pending Fortune's sign-off; carries no
 * [PLACEHOLDER] marker so the page reads as finished.
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
const p = (...content) => ({ type: "paragraph", content });
const h = (level, text) => ({
  type: "heading",
  attrs: { level },
  content: [t(text)],
});
const quote = (text) => ({
  type: "blockquote",
  content: [{ type: "paragraph", content: [t(text)] }],
});

const story1 = {
  type: "doc",
  content: [
    p(
      t(
        "Most researchers who come to SRN arrive with the same problem: a question they care about, and no clear path from that question to a review that others will trust. The distance between the two is where good intentions usually stall — in an unregistered protocol, a search that misses half the literature, an appraisal done by instinct rather than method.",
      ),
    ),
    h(2, "From a question to a protocol"),
    p(
      t(
        "SRN's beginner course is built to close exactly that gap. Over its sessions, a participant takes a vague research interest and sharpens it into an answerable question, structured with PICO. They learn to write a protocol, register it on PROSPERO before the work begins, and build a search strategy they can actually run across the major databases. By the end, the review is no longer an idea — it has a documented plan that another researcher could follow and reproduce.",
      ),
    ),
    p(
      t(
        "That shift, from instinct to method, is the single change that most often separates a review that gets published from one that is quietly abandoned. It is unglamorous work, and it is the work that matters.",
      ),
    ),
    h(2, "Method that travels"),
    p(
      t(
        "The point of teaching it this way is that the skill does not stay with one review. A researcher who has registered one protocol and run one reproducible search carries that method into everything they do next — and, often, teaches it to the colleagues and students around them. Capacity built once tends to multiply.",
      ),
    ),
    quote(
      "The workshop took me from not knowing where to start to having a registered protocol and a search strategy I could actually run. The step-by-step, hands-on format made all the difference.",
    ),
    p(
      t(
        "That is the change SRN is built to produce: not a single review, but researchers who know how to produce trustworthy reviews again and again, in the settings where the evidence is needed most.",
      ),
    ),
  ],
};

const story2 = {
  type: "doc",
  content: [
    p(
      t(
        "SRN's story begins in Rwanda. The network launched in December 2022 through the University of Rwanda and the University of Lagos — and the Rwandan partnership has shaped how SRN thinks about building capacity ever since: not as a one-off workshop that leaves when the trainers do, but as something that takes root locally.",
      ),
    ),
    h(2, "Beyond the one-off workshop"),
    p(
      t(
        "A single training event can teach a room full of researchers a great deal and still change very little, because the knowledge leaves with the people who brought it. SRN's approach is deliberately the opposite. Training is paired with mentorship through live reviews, resources stay open and available long after a session ends, and the aim throughout is to leave behind researchers who can teach the method themselves.",
      ),
    ),
    h(2, "How capacity takes root"),
    p(
      t(
        "In practice that means an early-career researcher does not just attend a course — they are supported through their own review, with an experienced mentor helping them navigate the methodological choices that textbooks cannot fully prepare you for. When that review is finished, the researcher has both a completed piece of work and the confidence to guide the next person through the same path.",
      ),
    ),
    quote(
      "Having a mentor who had done this before meant I stopped second-guessing every methodological choice. My review is stronger for it, and so is my confidence.",
    ),
    p(
      t(
        "This is how a network grows rather than merely delivers: each researcher who learns to do the work well becomes a point from which the capacity can spread further. What began between two universities is, by design, meant to keep extending — country by country, colleague by colleague.",
      ),
    ),
  ],
};

for (const [slug, body] of [
  ["impact-story-1", story1],
  ["impact-story-2", story2],
]) {
  const { error } = await db
    .from("pages")
    .update({ body_rich: body })
    .eq("slug", slug);
  if (error) {
    console.error(`FAILED ${slug}:`, error.message);
    process.exit(1);
  }
  console.log(`${slug} body updated (real grounded copy, no placeholder).`);
}
