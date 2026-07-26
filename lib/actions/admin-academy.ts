"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { courseSchema, cohortSchema } from "@/lib/actions/admin-schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { sanitizeRichText } from "@/lib/admin/richtext";
import {
  courseFields,
  cohortFields,
  courseSlugTaken,
  cohortSlugTaken,
  getCourseRow,
  getCohortRow,
  nextCohortSlug,
} from "@/lib/admin/academy";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.2 — write path for courses and cohorts.
 *
 * Same step order as saveResource (§1's rule): resolve the descriptor, check
 * the role, parse against a schema, check slug uniqueness, sanitize rich text,
 * build the payload FIELD BY FIELD from parsed output, write with the service
 * role, revalidate, audit. FormData is never spread into a payload — that is
 * what stops a crafted extra input from setting `status` or `archived_at`. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateCourse(slug?: string | null) {
  revalidatePath("/academy");
  if (slug) revalidatePath(`/academy/${slug}`);
}

/* -------------------------------------------------------------------------- */
/* Courses                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveCourse(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  // The field list is the allowlist. Anything not named here is not read.
  const names = courseFields([]).map((field) => field.name);
  const raw = Object.fromEntries(
    names.map((name) => [name, formValue(form, name)]),
  );
  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const id = formValue(form, "id") || undefined;
  if (await courseSlugTaken(parsed.data.slug, id)) {
    return {
      status: "error",
      fieldErrors: { slug: "That URL slug is already in use." },
    };
  }

  const data = parsed.data;
  let body: unknown = undefined;
  if (data.body_rich) {
    const safe = sanitizeRichText(data.body_rich);
    if (!safe)
      return {
        status: "error",
        fieldErrors: {
          body_rich: "This editor content contains unsupported items.",
        },
      };
    body = safe;
  }

  const payload = {
    title: data.title,
    slug: data.slug,
    programme_id: data.programme_id ?? null,
    summary: data.summary ?? null,
    level: data.level,
    delivery: data.delivery,
    duration_label: data.duration_label ?? null,
    learning_outcomes: data.learning_outcomes,
    prerequisites: data.prerequisites,
    featured_image_url: data.featured_image_url ?? null,
    body_rich: body ?? null,
  };

  const previous = id ? await getCourseRow(id) : null;
  const table = supabaseAdmin.from("courses");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table.insert(payload as never).select("id").single();

  if (result.error)
    return {
      status: "error",
      formError:
        "We could not save this course. Please check the values and try again.",
    };

  revalidateCourse(previous?.slug);
  revalidateCourse(data.slug);
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "courses",
    String(result.data.id),
    data.title,
  );
  return { status: "success", message: "Course saved." };
}

export async function setCourseStatus(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const status = formValue(form, "status");
  if (!id || (status !== "draft" && status !== "published"))
    return { status: "error", formError: "That change is not available." };

  const previous = await getCourseRow(id);

  /* A course cannot be published while archived: the two states contradict, and
     an archived-but-published row would satisfy neither the public policy nor a
     staffer's expectation. Publishing un-archives, deliberately and visibly. */
  const { error } = await supabaseAdmin
    .from("courses")
    .update(
      (status === "published"
        ? { status, archived_at: null }
        : { status }) as never,
    )
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change the status." };

  revalidateCourse(previous?.slug);
  void recordAudit(
    auth.user,
    status === "published" ? "publish" : "unpublish",
    "courses",
    id,
    `${status === "published" ? "Published" : "Unpublished"} ${previous?.title ?? "course"}`,
  );
  return {
    status: "success",
    message:
      status === "published"
        ? "Course published."
        : "Course unpublished. It is no longer on the public site.",
  };
}

/**
 * Archive, not delete.
 *
 * §6.2 decision 3: access is granted by enrolment and outlives the cohort, so a
 * course with runs against it must never be destroyed. `deleteCourse` below
 * refuses in exactly that case and points here.
 */
export async function archiveCourse(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id) return { status: "error", formError: "That course could not be found." };

  const previous = await getCourseRow(id);
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ archived_at: new Date().toISOString(), status: "draft" } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not archive this course." };

  revalidateCourse(previous?.slug);
  void recordAudit(
    auth.user,
    "status_change",
    "courses",
    id,
    `Archived ${previous?.title ?? "course"}`,
  );
  return {
    status: "success",
    message:
      "Course archived. It is off the public site; its cohorts and their learners are kept.",
  };
}

export async function deleteCourse(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id) return { status: "error", formError: "That course could not be found." };

  /* The FK is ON DELETE RESTRICT, so the database refuses regardless. This
     pre-check exists to say so in plain language, with a count, rather than
     surfacing a constraint error — the same shape as §5.7 and §5.12. */
  const { count } = await supabaseAdmin
    .from("cohorts")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id);
  if ((count ?? 0) > 0) {
    return {
      status: "error",
      formError: `This course has ${count} cohort${count === 1 ? "" : "s"} against it, so it cannot be deleted. Archive it instead — it will disappear from the public site and the cohorts will be kept.`,
    };
  }

  const previous = await getCourseRow(id);
  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
  if (error) {
    // Backstop: the count and the delete are not in one transaction, so a
    // cohort could land in the gap. 23503 = foreign_key_violation.
    if (error.code === "23503")
      return {
        status: "error",
        formError:
          "This course now has a cohort against it, so it cannot be deleted. Archive it instead.",
      };
    return { status: "error", formError: "We could not delete this course." };
  }

  revalidateCourse(previous?.slug);
  void recordAudit(
    auth.user,
    "delete",
    "courses",
    id,
    `Deleted ${previous?.title ?? "course"}`,
  );
  return { status: "success", message: "Course deleted." };
}

/* -------------------------------------------------------------------------- */
/* Cohorts                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveCohort(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const names = cohortFields([]).map((field) => field.name);
  const raw = Object.fromEntries(
    names.map((name) => [name, formValue(form, name)]),
  );
  const parsed = cohortSchema.safeParse(raw);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const data = parsed.data;
  const id = formValue(form, "id") || undefined;

  // Uniqueness is scoped to the course, matching the unique index.
  if (await cohortSlugTaken(data.course_id, data.slug, id)) {
    return {
      status: "error",
      fieldErrors: {
        slug: "Another cohort of this course already uses that slug.",
      },
    };
  }

  const payload = {
    course_id: data.course_id,
    label: data.label,
    slug: data.slug,
    starts_on: data.starts_on ?? null,
    ends_on: data.ends_on ?? null,
    enrolment_opens: data.enrolment_opens ?? null,
    enrolment_closes: data.enrolment_closes ?? null,
    capacity: data.capacity ?? null,
    price_kobo: data.price_kobo,
    currency: data.currency,
    pacing: data.pacing,
  };

  const table = supabaseAdmin.from("cohorts");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table.insert(payload as never).select("id").single();

  if (result.error)
    return {
      status: "error",
      formError:
        "We could not save this cohort. Please check the values and try again.",
    };

  const course = await getCourseRow(data.course_id);
  revalidateCourse(course?.slug);
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "cohorts",
    String(result.data.id),
    `${course?.title ?? "Course"} — ${data.label}`,
  );
  return { status: "success", message: "Cohort saved." };
}

export async function setCohortStatus(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const status = formValue(form, "status");
  if (!id || (status !== "draft" && status !== "published"))
    return { status: "error", formError: "That change is not available." };

  const previous = await getCohortRow(id);
  const { error } = await supabaseAdmin
    .from("cohorts")
    .update(
      (status === "published"
        ? { status, archived_at: null }
        : { status }) as never,
    )
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change the status." };

  const course = previous ? await getCourseRow(previous.course_id) : null;
  revalidateCourse(course?.slug);
  void recordAudit(
    auth.user,
    status === "published" ? "publish" : "unpublish",
    "cohorts",
    id,
    `${status === "published" ? "Published" : "Unpublished"} ${previous?.label ?? "cohort"}`,
  );
  return {
    status: "success",
    message:
      status === "published" ? "Cohort published." : "Cohort unpublished.",
  };
}

/**
 * Close or reopen enrolment by hand.
 *
 * Mirrors `events.registration_closed_manually`, and `cohortState` checks it
 * before any date or capacity branch — a manual close must beat an open window,
 * or "stop taking enrolments now" would not work.
 */
export async function setCohortEnrolmentClosed(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const closed = formValue(form, "closed") === "1";
  if (!id) return { status: "error", formError: "That cohort could not be found." };

  const previous = await getCohortRow(id);
  const { error } = await supabaseAdmin
    .from("cohorts")
    .update({ enrolment_closed_manually: closed } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change enrolment." };

  const course = previous ? await getCourseRow(previous.course_id) : null;
  revalidateCourse(course?.slug);
  void recordAudit(
    auth.user,
    "status_change",
    "cohorts",
    id,
    `${closed ? "Closed" : "Reopened"} enrolment for ${previous?.label ?? "cohort"}`,
  );
  return {
    status: "success",
    message: closed
      ? "Enrolment closed. The cohort stays on the public site, marked closed."
      : "Enrolment reopened.",
  };
}

export async function archiveCohort(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id) return { status: "error", formError: "That cohort could not be found." };

  const previous = await getCohortRow(id);
  const { error } = await supabaseAdmin
    .from("cohorts")
    .update({ archived_at: new Date().toISOString(), status: "draft" } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not archive this cohort." };

  const course = previous ? await getCourseRow(previous.course_id) : null;
  revalidateCourse(course?.slug);
  void recordAudit(
    auth.user,
    "status_change",
    "cohorts",
    id,
    `Archived ${previous?.label ?? "cohort"}`,
  );
  return {
    status: "success",
    message: "Cohort archived. Its learners keep their access.",
  };
}

export async function deleteCohort(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id) return { status: "error", formError: "That cohort could not be found." };

  const previous = await getCohortRow(id);
  const { error } = await supabaseAdmin.from("cohorts").delete().eq("id", id);
  if (error) {
    /* 6.4 adds enrolments with ON DELETE RESTRICT. There is nothing to count
       yet, so this catch is the whole guard for now — and it is the one that
       matters, because it is the database's answer rather than ours. */
    if (error.code === "23503")
      return {
        status: "error",
        formError:
          "This cohort has learners enrolled on it, so it cannot be deleted. Archive it instead — their access is kept.",
      };
    return { status: "error", formError: "We could not delete this cohort." };
  }

  const course = previous ? await getCourseRow(previous.course_id) : null;
  revalidateCourse(course?.slug);
  void recordAudit(
    auth.user,
    "delete",
    "cohorts",
    id,
    `Deleted ${previous?.label ?? "cohort"}`,
  );
  return { status: "success", message: "Cohort deleted." };
}

/**
 * §6.2 — "Duplicate a cohort. SRN runs the same course every term and must not
 * retype a syllabus."
 *
 * Copies the shape (pacing, price, capacity, currency) and deliberately NOT the
 * dates, the status or the manual close. Carrying last term's dates over would
 * produce a new cohort that is already in the past, and carrying `published`
 * over would put an unfinished run on the public site the instant the button is
 * pressed. A duplicate always lands as a draft for someone to fill in.
 */
export async function duplicateCohort(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  if (!id) return { status: "error", formError: "That cohort could not be found." };

  const source = await getCohortRow(id);
  if (!source)
    return { status: "error", formError: "That cohort could not be found." };

  const slug = await nextCohortSlug(source.course_id, source.slug);
  const { data, error } = await supabaseAdmin
    .from("cohorts")
    .insert({
      course_id: source.course_id,
      label: `${source.label} (copy)`,
      slug,
      pacing: source.pacing,
      capacity: source.capacity,
      price_kobo: source.price_kobo,
      currency: source.currency,
      status: "draft",
    } as never)
    .select("id")
    .single();

  if (error || !data)
    return { status: "error", formError: "We could not duplicate this cohort." };

  void recordAudit(
    auth.user,
    "create",
    "cohorts",
    String(data.id),
    `Duplicated ${source.label}`,
  );
  return {
    status: "success",
    message: "Cohort duplicated as a draft. Set its dates and publish when ready.",
  };
}
