/* Sprint 6.10 — put real images into the demonstration course.
 *
 * §6.9 asks for a course that "reads and looks like the real thing — no
 * [PLACEHOLDER], no lorem, no grey boxes where an image belongs". The first
 * pass shipped prose with no imagery at all, which is a grey box by another
 * name: the catalogue card, the account card and every lesson had nothing to
 * show.
 *
 * Every image here is one of SRN's OWN photographs, already in the media
 * bucket with real alt text — no stock, nothing hotlinked. Phase 6's image
 * decision permits licensed stock where SRN's own photos do not fit; they fit
 * here, so none is used.
 *
 * Idempotent: re-running replaces the images rather than appending them.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(join(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const publicUrl = (path) =>
  `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`;

/* Which photograph belongs with which lesson. Chosen so the picture has
   something to do with the words beside it rather than being decoration:
   a room full of people working goes with screening, a facilitator at a
   podium goes with the lesson on asking a question. */
const LESSON_IMAGES = {
  "What a systematic review is, and is not": {
    file: "hero-facilitator-presenting.jpg",
    alt: "An SRN facilitator presenting a session on systematic review methods",
    caption:
      "An SRN facilitator opening a workshop on review methodology, Lagos.",
  },
  "Choosing databases": {
    file: "workshop-session.jpg",
    alt: "A working session during an SRN systematic review training",
    caption:
      "Participants comparing database coverage during an SRN training session.",
  },
  "Two screeners, and what to do when they disagree": {
    file: "workshop-full-room.jpg",
    alt: "Researchers working on laptops during an SRN systematic review workshop",
    caption:
      "Screening in pairs at an SRN workshop — two people, one set of criteria.",
  },
  "Risk of bias in randomised trials": {
    file: "workshop-participants.jpg",
    alt: "Participants at an SRN systematic review workshop",
    caption: "Appraisal practice on real trials, working in small groups.",
  },
  "Should you pool at all?": {
    file: "hero-cohort-steps.jpg",
    alt: "Participants of an SRN systematic review and meta-analysis workshop",
    caption:
      "A cohort at the end of an SRN meta-analysis workshop, Abuja.",
  },
};

/** A Tiptap image node. The sanitizer only permits our own bucket (5.8). */
const imageNode = (file, alt) => ({
  type: "image",
  attrs: { src: publicUrl(file), alt },
});

const caption = (text) => ({
  type: "paragraph",
  content: [{ type: "text", text, marks: [{ type: "italic" }] }],
});

const { data: course } = await db
  .from("courses")
  .select("id, title")
  .eq("slug", "demo-systematic-review-methodology")
  .maybeSingle();

if (!course) {
  console.error("Run seed-demo-course.mjs first.");
  process.exit(1);
}

/* Course cover. Used by the catalogue card, the account card, and the course
   page — the three places that previously had nothing to show. */
const { error: coverError } = await db
  .from("courses")
  .update({ featured_image_url: publicUrl("hero-cohort-steps.jpg") })
  .eq("id", course.id);
if (coverError) {
  console.error("cover:", coverError.message);
  process.exit(1);
}
console.log("✓ course cover set");

const { data: modules } = await db
  .from("modules")
  .select("id")
  .eq("course_id", course.id);

const { data: lessons } = await db
  .from("lessons")
  .select("id, title, body_rich")
  .in(
    "module_id",
    (modules ?? []).map((m) => m.id),
  );

let placed = 0;

for (const lesson of lessons ?? []) {
  const image = LESSON_IMAGES[lesson.title];
  if (!image) continue;

  const body = lesson.body_rich;
  if (!body || !Array.isArray(body.content)) continue;

  /* Idempotent: strip any image and its caption from a previous run before
     inserting, so re-running does not stack pictures. */
  const clean = body.content.filter(
    (node) =>
      node.type !== "image" &&
      !(
        node.type === "paragraph" &&
        node.content?.[0]?.marks?.some((m) => m.type === "italic")
      ),
  );

  /* After the opening paragraph, not at the very top: the lesson should begin
     with its own words, and a picture above the first sentence pushes the
     writing below the fold for no gain. */
  const at = Math.min(1, clean.length);
  const content = [
    ...clean.slice(0, at),
    imageNode(image.file, image.alt),
    caption(image.caption),
    ...clean.slice(at),
  ];

  const { error } = await db
    .from("lessons")
    .update({ body_rich: { ...body, content } })
    .eq("id", lesson.id);

  if (error) {
    console.error(`  ${lesson.title}: ${error.message}`);
    continue;
  }
  console.log(`✓ ${lesson.title}`);
  placed += 1;
}

console.log(`\nDone. Cover plus ${placed} lesson images, all SRN's own photos.`);
