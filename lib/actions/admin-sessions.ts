"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import { lagosDateTime } from "@/lib/actions/admin-schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { sanitizeRichText } from "@/lib/admin/richtext";
import { getCohortRow } from "@/lib/admin/academy";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.5 — live sessions and announcements.
 *
 * The join URL is validated but NOT put through parseEmbedUrl: that function
 * decides how to render a link, and a join URL is never rendered — it is a
 * redirect target behind an enrolment check. What matters here is that it is an
 * https link, so a stored `javascript:` URL can never become a redirect. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

const httpsUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || /^https:\/\//i.test(value),
    "The joining link must start with https://",
  );

const sessionSchema = z.object({
  cohort_id: z.string().trim().min(1),
  title: z.string().trim().min(1, "Give this session a name.").max(180),
  starts_at: lagosDateTime,
  duration_minutes: z.coerce
    .number()
    .int()
    .min(1, "A session must last at least a minute.")
    .max(1440, "Use a shorter session — this is longer than a day."),
  join_url: httpsUrl,
});

export async function saveSession(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = sessionSchema.safeParse({
    cohort_id: formValue(form, "cohort_id"),
    title: formValue(form, "title"),
    starts_at: formValue(form, "starts_at"),
    duration_minutes: formValue(form, "duration_minutes") || 60,
    join_url: formValue(form, "join_url"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const cohort = await getCohortRow(parsed.data.cohort_id);
  if (!cohort)
    return { status: "error", formError: "That cohort no longer exists." };

  /* Decision 1: a self-paced cohort has no shared timetable, so a live session
     on one would be an event nobody is expected to attend. Refuse it here
     rather than letting it sit invisible in the database. */
  if (cohort.pacing === "self_paced") {
    return {
      status: "error",
      formError:
        "This cohort is self-paced, so it has no scheduled sessions. Learners start at different times and would not all be able to attend.",
    };
  }

  const id = formValue(form, "id") || undefined;
  const payload = {
    cohort_id: cohort.id,
    title: parsed.data.title,
    starts_at: parsed.data.starts_at,
    duration_minutes: parsed.data.duration_minutes,
    join_url: parsed.data.join_url ?? null,
  };

  const table = supabaseAdmin.from("live_sessions");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table.insert(payload as never).select("id").single();

  if (result.error)
    return { status: "error", formError: "We could not save that session." };

  revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  revalidatePath("/academy/learn", "layout");
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "live_sessions",
    String(result.data.id),
    `${parsed.data.title} (${cohort.label})`,
  );
  return { status: "success", message: "Session saved." };
}

export async function deleteSession(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: session } = await supabaseAdmin
    .from("live_sessions")
    .select("id, title, cohort_id")
    .eq("id", id)
    .maybeSingle();
  if (!session)
    return { status: "error", formError: "That session no longer exists." };

  const { count } = await supabaseAdmin
    .from("session_attendance")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id);

  if ((count ?? 0) > 0) {
    return {
      status: "error",
      formError: `${count} ${count === 1 ? "learner" : "learners"} attended this session, and deleting it would erase that record. Clear the joining link instead if it should no longer be reachable.`,
    };
  }

  const { error } = await supabaseAdmin
    .from("live_sessions")
    .delete()
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not delete that session." };

  const cohort = await getCohortRow(session.cohort_id);
  if (cohort)
    revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  void recordAudit(auth.user, "delete", "live_sessions", id, session.title);
  return { status: "success", message: "Session deleted." };
}

/* -------------------------------------------------------------------------- */
/* Announcements                                                               */
/* -------------------------------------------------------------------------- */

const announcementSchema = z.object({
  cohort_id: z.string().trim().min(1),
  title: z.string().trim().min(1, "Give this announcement a heading.").max(180),
});

export async function saveAnnouncement(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = announcementSchema.safeParse({
    cohort_id: formValue(form, "cohort_id"),
    title: formValue(form, "title"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const cohort = await getCohortRow(parsed.data.cohort_id);
  if (!cohort)
    return { status: "error", formError: "That cohort no longer exists." };

  const rawBody = formValue(form, "body_rich");
  let body: unknown = null;
  if (rawBody) {
    try {
      const safe = sanitizeRichText(JSON.parse(rawBody));
      if (!safe)
        return {
          status: "error",
          fieldErrors: {
            body_rich: "This content contains unsupported items.",
          },
        };
      body = safe;
    } catch {
      return {
        status: "error",
        fieldErrors: { body_rich: "The editor content is invalid." },
      };
    }
  }

  // Publishing is explicit: an announcement staff are still drafting must not
  // appear in a learner's feed the moment it is saved.
  const publish = formValue(form, "publish") === "true";

  const { data, error } = await supabaseAdmin
    .from("cohort_announcements")
    .insert({
      cohort_id: cohort.id,
      title: parsed.data.title,
      body_rich: body,
      published_at: publish ? new Date().toISOString() : null,
      author_email: auth.user.email,
    } as never)
    .select("id")
    .single();

  if (error)
    return {
      status: "error",
      formError: "We could not save that announcement.",
    };

  revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  revalidatePath("/academy/learn", "layout");
  void recordAudit(
    auth.user,
    publish ? "publish" : "create",
    "cohort_announcements",
    String(data.id),
    parsed.data.title,
  );
  return {
    status: "success",
    message: publish
      ? "Posted. Learners on this cohort can see it now."
      : "Saved as a draft. Nobody can see it until you post it.",
  };
}

export async function publishAnnouncement(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: note } = await supabaseAdmin
    .from("cohort_announcements")
    .select("id, title, cohort_id, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!note)
    return { status: "error", formError: "That announcement no longer exists." };

  const publishing = note.published_at === null;
  const { error } = await supabaseAdmin
    .from("cohort_announcements")
    .update({
      published_at: publishing ? new Date().toISOString() : null,
    } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change that." };

  const cohort = await getCohortRow(note.cohort_id);
  if (cohort)
    revalidatePath(`/admin/courses/${cohort.course_id}/cohorts/${cohort.id}`);
  revalidatePath("/academy/learn", "layout");
  void recordAudit(
    auth.user,
    publishing ? "publish" : "unpublish",
    "cohort_announcements",
    id,
    note.title,
  );
  return {
    status: "success",
    message: publishing
      ? "Posted to the cohort."
      : "Taken down. Learners can no longer see it.",
  };
}
