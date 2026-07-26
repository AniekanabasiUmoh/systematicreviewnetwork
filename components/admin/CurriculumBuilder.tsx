"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import {
  saveModule,
  saveLesson,
  setModuleStatus,
  setLessonStatus,
  deleteModule,
  deleteLesson,
  archiveModule,
  reorderModules,
  reorderLessons,
  uploadMaterial,
  deleteMaterial,
} from "@/lib/actions/admin-curriculum";
import type { AdminField } from "@/lib/admin/resources";
import type { ModuleWithLessonRows } from "@/lib/admin/academy";
import { AcademyForm } from "./CourseForm";
import { ActionForm } from "./AcademyActions";
import { AdminFormField } from "./FormFields";

/* Sprint 6.3 — the curriculum builder.
 *
 * A nested outline rather than three flat lists, for the same reason §6.2 gave
 * for courses and cohorts: a syllabus is a shape, and staff edit it by seeing
 * that shape. Modules contain lessons; lessons carry files.
 *
 * Reorder is a pair of move buttons submitting the whole new order, not a drag
 * library. It works on a phone, works with a keyboard, works without
 * JavaScript's pointer events, and the server takes the full list so a
 * half-applied reorder is not possible. */

export function ModuleForm({
  fields,
  initial,
  courseId,
  cohortId,
}: {
  fields: ReadonlyArray<AdminField>;
  initial?: (Record<string, unknown> & { id?: string }) | null;
  courseId?: string;
  cohortId?: string;
}) {
  const hidden: Record<string, string> = {};
  if (courseId) hidden.course_id = courseId;
  if (cohortId) hidden.cohort_id = cohortId;
  return (
    <AcademyForm
      action={saveModule}
      fields={fields}
      initial={initial ?? { release_rule: "immediate" }}
      label="module"
      hidden={hidden}
    />
  );
}

export function LessonForm({
  fields,
  initial,
  moduleId,
}: {
  fields: ReadonlyArray<AdminField>;
  initial?: (Record<string, unknown> & { id?: string }) | null;
  moduleId: string;
}) {
  const [state, formAction, pending] = useActionState(saveLesson, idle);
  const embed = initial?.video_embed as
    | { url?: string; title?: string }
    | null
    | undefined;

  return (
    <form action={formAction} className="border-hairline bg-paper border p-6">
      {initial?.id ? (
        <input type="hidden" name="id" value={String(initial.id)} />
      ) : null}
      <input type="hidden" name="module_id" value={moduleId} />

      {state.status === "error" && state.formError ? (
        <div className="mb-5">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-5">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <AdminFormField
            key={field.name}
            field={field}
            value={initial?.[field.name]}
            error={
              state.status === "error"
                ? state.fieldErrors?.[field.name]
                : undefined
            }
          />
        ))}

        {/* The video is entered as a plain link. The server parses it through
            the 5.8 allowlist and stores only a normalised triple — pasting an
            <iframe> here is refused with a sentence saying why. */}
        <div className="md:col-span-2">
          <TextField
            id="video_url"
            name="video_url"
            type="url"
            label="Video link"
            hint="A YouTube, Vimeo or Zoom recording link. Paste the plain link, not the embed code."
            defaultValue={embed?.url ?? ""}
            error={
              state.status === "error" ? state.fieldErrors?.video_url : undefined
            }
          />
        </div>
        <div className="md:col-span-2">
          <TextField
            id="video_title"
            name="video_title"
            type="text"
            maxLength={200}
            label="Video title"
            hint="Screen-reader users hear this in place of the video. Defaults to the lesson title."
            defaultValue={embed?.title ?? ""}
          />
        </div>
      </div>

      <div className="mt-7 flex justify-end">
        <Button disabled={pending}>{pending ? "Saving…" : "Save lesson"}</Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Material upload                                                             */
/* -------------------------------------------------------------------------- */

export function MaterialUpload({ lessonId }: { lessonId: string }) {
  const [state, formAction, pending] = useActionState(uploadMaterial, idle);
  return (
    <form action={formAction} className="border-hairline mt-3 border p-4">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <p className="text-slate mb-3 text-sm leading-relaxed">
        Files here are private. Learners get a link that works for five minutes
        and only after we have checked they are enrolled.
      </p>
      {state.status === "error" && state.formError ? (
        <div className="mb-3">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="mb-3">
          <FormMessage tone="success">{state.message}</FormMessage>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="material_title"
          name="title"
          type="text"
          maxLength={200}
          required
          label="What learners will see"
          error={state.status === "error" ? state.fieldErrors?.title : undefined}
        />
        <TextField
          id="material_file"
          name="file"
          type="file"
          required
          label="File"
          hint="PDF, Word, PowerPoint, Excel, CSV, text or zip. Up to 50 MB."
          error={state.status === "error" ? state.fieldErrors?.file : undefined}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Add file"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* The outline                                                                 */
/* -------------------------------------------------------------------------- */

function ReorderButtons({
  ids,
  index,
  action,
}: {
  ids: string[];
  index: number;
  action: typeof reorderModules;
}) {
  const move = (to: number) => {
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    return next.join(",");
  };
  return (
    <div className="flex gap-1">
      {index > 0 ? (
        <ActionForm
          action={action}
          fields={{ order: move(index - 1) }}
          label="Move up"
          pendingLabel="Moving…"
        />
      ) : null}
      {index < ids.length - 1 ? (
        <ActionForm
          action={action}
          fields={{ order: move(index + 1) }}
          label="Move down"
          pendingLabel="Moving…"
        />
      ) : null}
    </div>
  );
}

export function CurriculumOutline({
  modules,
  basePath,
  pacing,
}: {
  modules: ModuleWithLessonRows[];
  /** e.g. /admin/courses/<id>/curriculum */
  basePath: string;
  pacing?: string;
}) {
  const moduleIds = modules.map((m) => m.id);

  if (modules.length === 0) {
    return (
      <p className="text-slate leading-relaxed">
        This course has no modules yet. Add the first one and it becomes the
        opening section of the syllabus every cohort inherits.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {pacing === "self_paced" ? (
        <p className="text-slate border-hairline border p-4 text-sm leading-relaxed">
          This cohort is self-paced, so release rules are ignored — every
          published module is open to a learner from the moment they enrol.
        </p>
      ) : null}

      {modules.map((module, index) => (
        <ModuleCard
          key={module.id}
          module={module}
          index={index}
          moduleIds={moduleIds}
          basePath={basePath}
        />
      ))}
    </div>
  );
}

function ModuleCard({
  module,
  index,
  moduleIds,
  basePath,
}: {
  module: ModuleWithLessonRows;
  index: number;
  moduleIds: string[];
  basePath: string;
}) {
  const [open, setOpen] = useState(true);
  const lessonIds = module.lessons.map((l) => l.id);

  return (
    <div className="border-hairline border">
      <div className="border-hairline flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="text-ink text-left font-semibold"
              aria-expanded={open}
            >
              {module.title}
            </button>
            <StatusPill status={module.status} />
            {module.archived_at ? <StatusPill status="archived" /> : null}
          </div>
          <p className="text-slate mt-1 text-sm">
            {module.lessons.length}{" "}
            {module.lessons.length === 1 ? "lesson" : "lessons"} ·{" "}
            {releaseSentence(module)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReorderButtons ids={moduleIds} index={index} action={reorderModules} />
          <Link
            href={`${basePath}/modules/${module.id}`}
            className="text-ink text-sm underline underline-offset-2"
          >
            Edit
          </Link>
        </div>
      </div>

      {open ? (
        <div className="p-4">
          {module.lessons.length === 0 ? (
            <p className="text-slate text-sm leading-relaxed">
              No lessons in this module yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {module.lessons.map((lesson, lessonIndex) => (
                <li
                  key={lesson.id}
                  className="border-hairline flex flex-wrap items-center justify-between gap-3 border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`${basePath}/lessons/${lesson.id}`}
                        className="text-ink font-medium underline underline-offset-2"
                      >
                        {lesson.title}
                      </Link>
                      <StatusPill status={lesson.status} />
                    </div>
                    <p className="text-slate mt-1 text-sm">
                      {lesson.estimated_minutes
                        ? `${lesson.estimated_minutes} min`
                        : "No time set"}
                      {lesson.video_embed ? " · video" : ""}
                      {lesson.materials.length
                        ? ` · ${lesson.materials.length} file${lesson.materials.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <ReorderButtons
                    ids={lessonIds}
                    index={lessonIndex}
                    action={reorderLessons}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`${basePath}/modules/${module.id}/lessons/new`}
              className="text-ink text-sm underline underline-offset-2"
            >
              Add a lesson
            </Link>
          </div>

          <div className="border-hairline mt-4 flex flex-wrap gap-2 border-t pt-4">
            <ActionForm
              action={setModuleStatus}
              fields={{
                id: module.id,
                status: module.status === "published" ? "draft" : "published",
              }}
              label={module.status === "published" ? "Unpublish" : "Publish"}
              pendingLabel="Saving…"
            />
            <ActionForm
              action={archiveModule}
              fields={{ id: module.id }}
              label="Archive"
              pendingLabel="Archiving…"
              confirm={`Archive “${module.title}”? Learners who already have it keep it; it disappears for everyone else.`}
            />
            <ActionForm
              action={deleteModule}
              fields={{ id: module.id }}
              label="Delete"
              pendingLabel="Deleting…"
              confirm={`Delete “${module.title}” permanently? This cannot be undone.`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function releaseSentence(module: ModuleWithLessonRows): string {
  if (module.release_rule === "on_date" && module.release_on) {
    return `opens ${new Date(module.release_on).toLocaleDateString("en-GB", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }
  if (module.release_rule === "after_previous")
    return "opens after the previous module";
  return "open from enrolment";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="border-hairline text-slate border px-2 py-0.5 text-xs uppercase tracking-wide">
      {status}
    </span>
  );
}

/* Controls for one lesson's own page — publish, delete, and its files. */
export function LessonControls({
  lesson,
  materials,
}: {
  lesson: { id: string; title: string; status: string };
  materials: Array<{ id: string; title: string; file_name: string }>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-ink mb-3 font-semibold">Files</h2>
        {materials.length === 0 ? (
          <p className="text-slate text-sm leading-relaxed">
            No files attached yet. Readings and slides you add here are private
            to enrolled learners.
          </p>
        ) : (
          <ul className="space-y-2">
            {materials.map((material) => (
              <li
                key={material.id}
                className="border-hairline flex flex-wrap items-center justify-between gap-3 border p-3"
              >
                <div className="min-w-0">
                  <p className="text-ink font-medium">{material.title}</p>
                  <p className="text-slate text-sm">{material.file_name}</p>
                </div>
                <ActionForm
                  action={deleteMaterial}
                  fields={{ id: material.id }}
                  label="Remove"
                  pendingLabel="Removing…"
                  confirm={`Remove “${material.title}”? Learners will no longer be able to download it.`}
                />
              </li>
            ))}
          </ul>
        )}
        <MaterialUpload lessonId={lesson.id} />
      </div>

      <div className="border-hairline flex flex-wrap gap-2 border-t pt-5">
        <ActionForm
          action={setLessonStatus}
          fields={{
            id: lesson.id,
            status: lesson.status === "published" ? "draft" : "published",
          }}
          label={lesson.status === "published" ? "Unpublish" : "Publish"}
          pendingLabel="Saving…"
        />
        <ActionForm
          action={deleteLesson}
          fields={{ id: lesson.id }}
          label="Delete lesson"
          pendingLabel="Deleting…"
          confirm={`Delete “${lesson.title}” permanently? This cannot be undone.`}
        />
      </div>
    </div>
  );
}
