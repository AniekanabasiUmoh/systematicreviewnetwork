/* Structural self-check for srn-academy-content.mjs, run before seeding.
 * Catches the mistakes that are easy to make transcribing by hand: a quiz
 * question with no correct option (or more than one), a doc node that isn't
 * actually a valid TipTap tree, a heading outside level 2/3, an assignment
 * missing instructions. Does not touch the database.
 *
 *   node --env-file=.env supabase/_validate-academy-content.mjs
 */
import {
  MODULE_1,
  MODULE_2,
  MODULE_3,
  MODULE_4,
  MODULE_5,
  MODULE_6,
  MODULE_7,
  COURSE,
} from "./srn-academy-content.mjs";

const ALLOWED_NODES = new Set([
  "doc", "paragraph", "heading", "bulletList", "orderedList", "listItem",
  "blockquote", "text", "image", "embed",
]);
const ALLOWED_MARKS = new Set(["bold", "italic", "link"]);

let errors = 0;
const fail = (where, msg) => {
  console.error(`✗ ${where}: ${msg}`);
  errors += 1;
};

function checkNode(node, where) {
  if (node == null || typeof node !== "object") {
    fail(where, `node is not an object: ${JSON.stringify(node)}`);
    return;
  }
  if (!ALLOWED_NODES.has(node.type)) {
    fail(where, `disallowed node type "${node.type}"`);
    return;
  }
  if (node.type === "heading") {
    const level = node.attrs?.level;
    if (level !== 2 && level !== 3) fail(where, `heading level ${level} not in {2,3}`);
  }
  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) {
      fail(where, `text node has empty/missing text`);
    }
    for (const m of node.marks ?? []) {
      if (!ALLOWED_MARKS.has(m.type)) fail(where, `disallowed mark "${m.type}"`);
    }
  }
  for (const child of node.content ?? []) checkNode(child, where);
}

function checkDoc(docNode, where) {
  if (!docNode || docNode.type !== "doc") {
    fail(where, "not a doc node");
    return;
  }
  checkNode(docNode, where);
}

function checkModule(mod, label) {
  if (!mod) return fail(label, "module is undefined — did you export it?");
  if (!mod.title) fail(label, "missing title");
  if (!Array.isArray(mod.lessons) || mod.lessons.length === 0)
    fail(label, "no lessons");

  for (const lesson of mod.lessons ?? []) {
    const where = `${label} > lesson "${lesson.title}"`;
    if (!lesson.title) fail(where, "missing title");
    if (typeof lesson.estimated_minutes !== "number" || lesson.estimated_minutes <= 0)
      fail(where, `bad estimated_minutes: ${lesson.estimated_minutes}`);
    checkDoc(lesson.body, where);
  }

  if (mod.quiz) {
    const where = `${label} > quiz "${mod.quiz.title}"`;
    if (!Array.isArray(mod.quiz.questions) || mod.quiz.questions.length === 0)
      fail(where, "no questions");
    for (const [idx, q] of (mod.quiz.questions ?? []).entries()) {
      const qWhere = `${where} > Q${idx + 1}`;
      if (!q.prompt) fail(qWhere, "missing prompt");
      if (!Array.isArray(q.options) || q.options.length < 2)
        fail(qWhere, "fewer than 2 options");
      const correctCount = (q.options ?? []).filter((o) => o.correct).length;
      if (correctCount !== 1)
        fail(qWhere, `expected exactly 1 correct option, found ${correctCount}`);
      for (const o of q.options ?? []) {
        if (!o.label) fail(qWhere, "an option has no label");
      }
    }
  }

  if (mod.assignment) {
    const where = `${label} > assignment "${mod.assignment.title}"`;
    if (!mod.assignment.title) fail(where, "missing title");
    checkDoc(mod.assignment.instructions, where);
    if (!["text", "file", "either"].includes(mod.assignment.submission_type))
      fail(where, `bad submission_type: ${mod.assignment.submission_type}`);
  }
}

if (!COURSE?.slug) fail("COURSE", "missing slug");
if (!COURSE?.body_rich) fail("COURSE", "missing body_rich");
else checkDoc(COURSE.body_rich, "COURSE.body_rich");

const modules = { MODULE_1, MODULE_2, MODULE_3, MODULE_4, MODULE_5, MODULE_6, MODULE_7 };
for (const [label, mod] of Object.entries(modules)) checkModule(mod, label);

const lessonCount = Object.values(modules)
  .filter(Boolean)
  .reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);
const quizCount = Object.values(modules).filter((m) => m?.quiz).length;
const assignmentCount = Object.values(modules).filter((m) => m?.assignment).length;

console.log(
  `\n${Object.values(modules).filter(Boolean).length} module(s) defined, ${lessonCount} lesson(s), ${quizCount} quiz(zes), ${assignmentCount} assignment(s).`,
);

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  process.exit(1);
} else {
  console.log("No structural errors found.");
}
