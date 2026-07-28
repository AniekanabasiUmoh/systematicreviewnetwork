/* Sprint 6.9 — test accounts for clicking through the Academy.
 *
 * Creates one of each kind of user so every view can be seen:
 *   learner    — enrolled on the demo cohort, mid-course
 *   instructor — assigned to the demo cohort, sees only it
 *   editor     — staff, content but no user management
 *
 * Idempotent. Prints the credentials at the end.
 *
 * These are DEMO accounts on a draft cohort. They are not a way to hand out
 * real access, and the passwords are printed precisely because they are meant
 * to be disposable — delete them before the site is public.
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

const PASSWORD = "SrnDemo2026!";

const ACCOUNTS = [
  { email: "demo.learner@srn.test", name: "Amara Okeke", kind: "learner" },
  { email: "demo.instructor@srn.test", name: "Dr Tunde Bakare", kind: "instructor" },
  { email: "demo.editor@srn.test", name: "Demo Editor", kind: "editor" },
];

/** Create or reuse an auth user, returning its id. */
async function ensureUser(email) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = (list?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (found) {
    await db.auth.admin.updateUserById(found.id, { password: PASSWORD });
    return found.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

const { data: course } = await db
  .from("courses")
  .select("id, title")
  .eq("slug", "demo-systematic-review-methodology")
  .maybeSingle();

if (!course) {
  console.error("Run seed-demo-course.mjs first.");
  process.exit(1);
}

const { data: cohort } = await db
  .from("cohorts")
  .select("id, slug")
  .eq("course_id", course.id)
  .maybeSingle();

for (const account of ACCOUNTS) {
  const id = await ensureUser(account.email);

  if (account.kind === "learner") {
    /* A learner is a `learners` row, never a `profiles` row — the database
       refuses to give one account both identities (20260727000001). */
    await db.from("learners").upsert({
      id,
      email: account.email,
      full_name: account.name,
      country: "Nigeria",
      institution: "University of Lagos",
      verified_at: new Date().toISOString(),
    });

    const { data: enrolment } = await db
      .from("enrolments")
      .upsert(
        {
          learner_id: id,
          cohort_id: cohort.id,
          state: "active",
          payment_status: "not_required",
          learner_email_at_enrolment: account.email,
          learner_name_at_enrolment: account.name,
        },
        { onConflict: "learner_id,cohort_id" },
      )
      .select("id")
      .single();

    /* Part-way through, so the player has something to show: progress bar,
       "pick up where you left off", and a released second module. */
    const { data: modules } = await db
      .from("modules")
      .select("id, sort_order")
      .eq("course_id", course.id)
      .order("sort_order");
    const firstModule = (modules ?? [])[0];
    if (firstModule && enrolment) {
      const { data: lessons } = await db
        .from("lessons")
        .select("id")
        .eq("module_id", firstModule.id)
        .order("sort_order");
      for (const lesson of lessons ?? []) {
        await db.from("lesson_progress").upsert(
          { enrolment_id: enrolment.id, lesson_id: lesson.id },
          { onConflict: "enrolment_id,lesson_id", ignoreDuplicates: true },
        );
      }
    }
    console.log(`✓ learner   ${account.email} — enrolled, module 1 complete`);
    continue;
  }

  // Staff and instructors live in `profiles`.
  await db.from("profiles").upsert({
    id,
    email: account.email,
    full_name: account.name,
    role: account.kind === "instructor" ? "instructor" : "editor",
  });

  if (account.kind === "instructor" && cohort) {
    await db.from("cohort_instructors").upsert(
      { instructor_id: id, cohort_id: cohort.id },
      { onConflict: "instructor_id,cohort_id", ignoreDuplicates: true },
    );
    console.log(`✓ instructor ${account.email} — assigned to the demo cohort`);
  } else {
    console.log(`✓ editor    ${account.email}`);
  }
}

console.log(`\nPassword for all three: ${PASSWORD}\n`);
console.log("Learner    → /academy/sign-in  then  /academy/learn/demo-systematic-review-methodology/demo-cohort");
console.log("Instructor → /admin/login      then  /admin/teaching");
console.log("Editor     → /admin/login      then  /admin");
console.log("\nDelete these before the site goes public.");
