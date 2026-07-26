"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/actions/schemas";
import {
  moduleSchema,
  lessonSchema,
  slugify,
} from "@/lib/actions/admin-schemas";
import { idle, type ActionState } from "@/lib/actions/types";
import { requireStaffAction } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { sanitizeRichText } from "@/lib/admin/richtext";
import { parseEmbedUrl } from "@/lib/admin/embeds";
import {
  moduleFields,
  lessonFields,
  getModuleRow,
  getLessonRow,
  moduleEnrolmentCount,
  nextSortOrder,
} from "@/lib/admin/academy";
import { supabaseAdmin } from "@/lib/supabase/server";

/* Sprint 6.3 — write path for modules, lessons and materials.
 *
 * Same step order as saveResource and saveCourse: role, parse, sanitize, build
 * the payload FIELD BY FIELD from parsed output, write on the service role,
 * revalidate, audit. FormData is never spread.
 *
 * The one genuinely new thing here is material upload, which targets a PRIVATE
 * bucket. It is deliberately not a variant of uploadMedia(): that function ends
 * by calling getPublicUrl() and storing a link, which is exactly the posture
 * course materials must not have. Sharing the code would put a "public?" flag
 * one boolean away from publishing a paid course's slides. */

function formValue(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Materials and lessons live behind the learner routes, not the catalogue. */
function revalidateCurriculum() {
  revalidatePath("/admin/courses");
  revalidatePath("/academy/learn", "layout");
}

/* -------------------------------------------------------------------------- */
/* Modules                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveModule(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const names = moduleFields().map((field) => field.name);
  const raw: Record<string, string> = Object.fromEntries(
    names.map((name) => [name, formValue(form, name)]),
  );
  // The parent comes from the screen the form was opened on, not the field list.
  raw.course_id = formValue(form, "course_id");
  raw.cohort_id = formValue(form, "cohort_id");

  const parsed = moduleSchema.safeParse(raw);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const data = parsed.data;
  const id = formValue(form, "id") || undefined;

  const payload = {
    course_id: data.course_id ?? null,
    cohort_id: data.cohort_id ?? null,
    title: data.title,
    summary: data.summary ?? null,
    release_rule: data.release_rule,
    /* Clearing the date when the rule is not `on_date` keeps a stale date from
       reappearing if a staffer switches the rule back later. */
    release_on: data.release_rule === "on_date" ? (data.release_on ?? null) : null,
  };

  const table = supabaseAdmin.from("modules");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table
        .insert({
          ...payload,
          sort_order: await nextSortOrder(
            "modules",
            data.course_id ? "course_id" : "cohort_id",
            (data.course_id ?? data.cohort_id)!,
          ),
        } as never)
        .select("id")
        .single();

  if (result.error)
    return { status: "error", formError: "We could not save this module." };

  revalidateCurriculum();
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "modules",
    String(result.data.id),
    data.title,
  );
  return { status: "success", message: "Module saved." };
}

export async function setModuleStatus(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const status = formValue(form, "status");
  if (status !== "draft" && status !== "published")
    return { status: "error", formError: "That is not a status we recognise." };

  const mod = await getModuleRow(id);
  if (!mod)
    return { status: "error", formError: "That module no longer exists." };

  const { error } = await supabaseAdmin
    .from("modules")
    .update({ status } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change that module." };

  revalidateCurriculum();
  void recordAudit(
    auth.user,
    status === "published" ? "publish" : "unpublish",
    "modules",
    id,
    mod.title,
  );
  return {
    status: "success",
    message: status === "published" ? "Module published." : "Module unpublished.",
  };
}

export async function deleteModule(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const mod = await getModuleRow(id);
  if (!mod)
    return { status: "error", formError: "That module no longer exists." };

  /* §6.3: materials for a cohort with enrolments cannot be hard-deleted. The
     counted, plain-language refusal is the §5.7/§5.12 pattern — say how many
     people it affects and name the alternative. */
  const enrolled = await moduleEnrolmentCount(mod);
  if (enrolled > 0) {
    return {
      status: "error",
      formError: `${enrolled} ${enrolled === 1 ? "learner is" : "learners are"} enrolled on this course and may still be using this module. Archive it instead — it disappears for new learners and stays available to the people who already have it.`,
    };
  }

  const { count: lessonCount } = await supabaseAdmin
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", id);
  if ((lessonCount ?? 0) > 0) {
    return {
      status: "error",
      formError: `This module still has ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}. Delete or move them first.`,
    };
  }

  const { error } = await supabaseAdmin.from("modules").delete().eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation. The count above and this delete are not in
    // one transaction, so the database stays the last word.
    if ((error as { code?: string }).code === "23503")
      return {
        status: "error",
        formError:
          "Something still refers to this module, so it cannot be deleted. Archive it instead.",
      };
    return { status: "error", formError: "We could not delete that module." };
  }

  revalidateCurriculum();
  void recordAudit(auth.user, "delete", "modules", id, mod.title);
  return { status: "success", message: "Module deleted." };
}

export async function archiveModule(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const mod = await getModuleRow(id);
  if (!mod)
    return { status: "error", formError: "That module no longer exists." };

  const { error } = await supabaseAdmin
    .from("modules")
    .update({ archived_at: new Date().toISOString(), status: "draft" } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not archive that module." };

  revalidateCurriculum();
  void recordAudit(auth.user, "update", "modules", id, `Archived ${mod.title}`);
  return { status: "success", message: "Module archived." };
}

export async function reorderModules(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const ids = String(form.get("order") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (ids.length === 0)
    return { status: "error", formError: "Nothing to reorder." };

  for (const [index, id] of ids.entries()) {
    await supabaseAdmin
      .from("modules")
      .update({ sort_order: index } as never)
      .eq("id", id);
  }

  revalidateCurriculum();
  void recordAudit(auth.user, "reorder", "modules", null, `Reordered ${ids.length} modules`);
  return { status: "success", message: "Order saved." };
}

/* -------------------------------------------------------------------------- */
/* Lessons                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveLesson(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const names = lessonFields().map((field) => field.name);
  const raw: Record<string, string> = Object.fromEntries(
    names.map((name) => [name, formValue(form, name)]),
  );
  raw.module_id = formValue(form, "module_id");

  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const data = parsed.data;
  const id = formValue(form, "id") || undefined;

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

  /* The video is a plain URL the staffer pastes; the SERVER turns it into the
     5.8 {provider, id, title, url} triple. The client never constructs it, so a
     crafted provider value cannot reach the database. */
  const videoUrl = formValue(form, "video_url").trim();
  const videoTitle = formValue(form, "video_title").trim();
  let video: unknown = null;
  if (videoUrl) {
    const embed = parseEmbedUrl(videoUrl, videoTitle || data.title);
    if (!embed.ok)
      return { status: "error", fieldErrors: { video_url: embed.error } };
    if (embed.provider === "zoom_live")
      return {
        status: "error",
        fieldErrors: {
          video_url:
            "That is a Zoom join link, not a recording. Live sessions are scheduled on the cohort, not embedded in a lesson.",
        },
      };
    video = {
      provider: embed.provider,
      id: embed.id,
      title: embed.title,
      url: embed.url,
      inline: embed.inline,
    };
  }

  const payload = {
    module_id: data.module_id,
    title: data.title,
    summary: data.summary ?? null,
    body_rich: body ?? null,
    video_embed: video,
    estimated_minutes: data.estimated_minutes ?? null,
  };

  const table = supabaseAdmin.from("lessons");
  const result = id
    ? await table.update(payload as never).eq("id", id).select("id").single()
    : await table
        .insert({
          ...payload,
          sort_order: await nextSortOrder("lessons", "module_id", data.module_id),
        } as never)
        .select("id")
        .single();

  if (result.error)
    return { status: "error", formError: "We could not save this lesson." };

  revalidateCurriculum();
  void recordAudit(
    auth.user,
    id ? "update" : "create",
    "lessons",
    String(result.data.id),
    data.title,
  );
  return { status: "success", message: "Lesson saved." };
}

export async function setLessonStatus(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const status = formValue(form, "status");
  if (status !== "draft" && status !== "published")
    return { status: "error", formError: "That is not a status we recognise." };

  const lesson = await getLessonRow(id);
  if (!lesson)
    return { status: "error", formError: "That lesson no longer exists." };

  const { error } = await supabaseAdmin
    .from("lessons")
    .update({ status } as never)
    .eq("id", id);
  if (error)
    return { status: "error", formError: "We could not change that lesson." };

  revalidateCurriculum();
  void recordAudit(
    auth.user,
    status === "published" ? "publish" : "unpublish",
    "lessons",
    id,
    lesson.title,
  );
  return {
    status: "success",
    message: status === "published" ? "Lesson published." : "Lesson unpublished.",
  };
}

export async function deleteLesson(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const lesson = await getLessonRow(id);
  if (!lesson)
    return { status: "error", formError: "That lesson no longer exists." };

  const { data: materials } = await supabaseAdmin
    .from("lesson_materials")
    .select("id, storage_path")
    .eq("lesson_id", id);

  if ((materials ?? []).length > 0) {
    const n = (materials ?? []).length;
    return {
      status: "error",
      formError: `This lesson has ${n} attached file${n === 1 ? "" : "s"}. Remove ${n === 1 ? "it" : "them"} first.`,
    };
  }

  const { error } = await supabaseAdmin.from("lessons").delete().eq("id", id);
  if (error)
    return { status: "error", formError: "We could not delete that lesson." };

  revalidateCurriculum();
  void recordAudit(auth.user, "delete", "lessons", id, lesson.title);
  return { status: "success", message: "Lesson deleted." };
}

export async function reorderLessons(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const ids = String(form.get("order") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (ids.length === 0)
    return { status: "error", formError: "Nothing to reorder." };

  for (const [index, id] of ids.entries()) {
    await supabaseAdmin
      .from("lessons")
      .update({ sort_order: index } as never)
      .eq("id", id);
  }

  revalidateCurriculum();
  void recordAudit(auth.user, "reorder", "lessons", null, `Reordered ${ids.length} lessons`);
  return { status: "success", message: "Order saved." };
}

/* -------------------------------------------------------------------------- */
/* Materials — private bucket                                                  */
/* -------------------------------------------------------------------------- */

const MAX_MATERIAL_BYTES = 50 * 1024 * 1024;

/* An allowlist, not a blocklist. Course materials are readings and slides; a
   staffer has no reason to attach an executable, and a learner has no reason to
   trust one that arrived from a course page. */
const ALLOWED_MATERIAL_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  ris: "application/x-research-info-systems",
  bib: "application/x-bibtex",
};

const materialSchema = z.object({
  lesson_id: z.string().trim().min(1, "Choose a lesson."),
  title: z
    .string()
    .trim()
    .min(1, "Give this file a name learners will understand.")
    .max(200),
});

export async function uploadMaterial(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const parsed = materialSchema.safeParse({
    lesson_id: formValue(form, "lesson_id"),
    title: formValue(form, "title"),
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { status: "error", fieldErrors: { file: "Choose a file to upload." } };
  if (file.size > MAX_MATERIAL_BYTES)
    return {
      status: "error",
      fieldErrors: { file: "Choose a file smaller than 50 MB." },
    };

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mime = ALLOWED_MATERIAL_TYPES[ext];
  if (!mime)
    return {
      status: "error",
      fieldErrors: {
        file: `We cannot accept .${ext || "that"} files. Use a PDF, Word, PowerPoint, Excel, CSV, text, or zip file.`,
      },
    };

  const lesson = await getLessonRow(parsed.data.lesson_id);
  if (!lesson)
    return { status: "error", formError: "That lesson no longer exists." };

  /* A random path segment, so knowing a course and a filename is not enough to
     guess an object key. Belt and braces: the bucket is private anyway, but
     a private bucket plus an unguessable key means a future misconfiguration
     is not instantly exploitable. */
  const base = slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 80) || "file";
  const path = `${lesson.module_id}/${lesson.id}/${base}-${randomUUID().slice(0, 8)}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from("course-materials")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError)
    return { status: "error", formError: "We could not upload that file." };

  const { data, error: insertError } = await supabaseAdmin
    .from("lesson_materials")
    .insert({
      lesson_id: lesson.id,
      storage_path: path,
      file_name: file.name.slice(0, 255),
      mime_type: mime,
      size_bytes: file.size,
      title: parsed.data.title,
      sort_order: await nextSortOrder("lesson_materials", "lesson_id", lesson.id),
    } as never)
    .select("id")
    .single();

  if (insertError) {
    // Leave no orphan in the bucket that nothing points at.
    await supabaseAdmin.storage.from("course-materials").remove([path]);
    return {
      status: "error",
      formError: "We could not record that file, so the upload was removed.",
    };
  }

  revalidateCurriculum();
  void recordAudit(
    auth.user,
    "create",
    "lesson_materials",
    String(data.id),
    `Uploaded ${file.name} to ${lesson.title}`,
  );
  return { status: "success", message: "File uploaded." };
}

export async function deleteMaterial(
  _prev: ActionState = idle,
  form: FormData,
): Promise<ActionState> {
  const auth = await requireStaffAction();
  if (!auth.ok) return auth.state;

  const id = formValue(form, "id");
  const { data: material } = await supabaseAdmin
    .from("lesson_materials")
    .select("id, storage_path, title, lesson_id")
    .eq("id", id)
    .maybeSingle();
  if (!material)
    return { status: "error", formError: "That file no longer exists." };

  const { error: storageError } = await supabaseAdmin.storage
    .from("course-materials")
    .remove([material.storage_path]);
  if (storageError)
    return { status: "error", formError: "We could not remove that file." };

  const { error } = await supabaseAdmin
    .from("lesson_materials")
    .delete()
    .eq("id", id);
  if (error)
    return {
      status: "error",
      formError:
        "The file was removed but its record could not be deleted. Please contact support.",
    };

  revalidateCurriculum();
  void recordAudit(auth.user, "delete", "lesson_materials", id, material.title);
  return { status: "success", message: "File deleted." };
}
