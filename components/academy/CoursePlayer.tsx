"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FormMessage } from "@/components/ui/FormField";
import { idle } from "@/lib/actions/types";
import { setLessonComplete } from "@/lib/actions/progress";

/* Sprint 6.5 — the course player's shared pieces.
 *
 * Responsive in both directions, not mobile-only:
 *
 *   Phone   — the contents list collapses behind a summary line, so a lesson
 *             starts at the top of the screen instead of below a long index.
 *   Desktop — the same list becomes a sticky column beside the lesson, which is
 *             what makes a long course navigable with a mouse.
 *
 * Both come from the same markup. The disclosure is a real <details>, so it
 * works before hydration and with a keyboard; `lg:open` styling forces it open
 * on wide screens rather than duplicating the tree. */

export type PlayerLesson = {
  id: string;
  title: string;
  estimated_minutes: number | null;
  done: boolean;
};

export type PlayerModule = {
  id: string;
  title: string;
  released: boolean;
  lockedReason: string | null;
  lessons: PlayerLesson[];
};

export function ProgressBar({
  completed,
  total,
  percent,
}: {
  completed: number;
  total: number;
  percent: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-ink text-small font-semibold">
          {total === 0
            ? "Nothing to do yet"
            : completed === total
              ? "You're up to date"
              : `${completed} of ${total} lessons done`}
        </p>
        <p className="text-slate text-small tabular-nums">{percent}%</p>
      </div>
      {/* The bar is decoration; the sentence above carries the meaning, so it
          is hidden from screen readers rather than announced as a number. */}
      <div className="bg-mist mt-2 h-1.5 w-full" aria-hidden="true">
        <div
          className="bg-evidence h-full transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function CourseContents({
  modules,
  basePath,
  currentLessonId,
}: {
  modules: PlayerModule[];
  basePath: string;
  currentLessonId?: string;
}) {
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);
  const done = modules.reduce(
    (n, m) => n + m.lessons.filter((l) => l.done).length,
    0,
  );

  return (
    <details
      className="border-hairline group border lg:border-0 [&[open]>summary_.chev]:rotate-180"
      /* Open by default so desktop shows the full list; on a phone the learner
         can fold it away. `lg:hidden` on the summary keeps the control off wide
         screens where it has nothing to do. */
      open
    >
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold lg:hidden">
        <span>
          Course contents{" "}
          <span className="text-slate font-normal">
            ({done} of {total} done)
          </span>
        </span>
        <Icon icon={ChevronDown} size="sm" className="chev transition-transform" />
      </summary>

      <nav className="p-4 pt-0 lg:p-0" aria-label="Course contents">
        <ol className="space-y-5">
          {modules.map((module, index) => (
            <li key={module.id}>
              <p className="text-slate text-small">Module {index + 1}</p>
              <p className="text-ink text-small font-semibold">{module.title}</p>

              {!module.released ? (
                <p className="text-slate mt-2 flex items-start gap-2 text-[0.8125rem] leading-relaxed">
                  <Icon icon={Lock} size="sm" className="mt-0.5 shrink-0" />
                  {module.lockedReason}
                </p>
              ) : module.lessons.length === 0 ? (
                <p className="text-slate mt-2 text-[0.8125rem]">
                  No lessons yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {module.lessons.map((lesson) => {
                    const current = lesson.id === currentLessonId;
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`${basePath}/${lesson.id}`}
                          aria-current={current ? "page" : undefined}
                          className={`flex items-start gap-2 py-1.5 text-[0.9375rem] leading-snug ${
                            current
                              ? "text-ink font-semibold"
                              : "text-slate hover:text-ink"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                              lesson.done
                                ? "bg-evidence border-evidence"
                                : "border-hairline"
                            }`}
                            aria-hidden="true"
                          >
                            {lesson.done ? (
                              <Icon
                                icon={Check}
                                size="sm"
                                color="paper"
                                className="h-3 w-3"
                              />
                            ) : null}
                          </span>
                          <span>
                            {lesson.title}
                            {lesson.done ? (
                              <span className="sr-only"> (done)</span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

export function MarkCompleteButton({
  courseSlug,
  cohortSlug,
  lessonId,
  done,
  nextHref,
}: {
  courseSlug: string;
  cohortSlug: string;
  lessonId: string;
  done: boolean;
  nextHref: string | null;
}) {
  const [state, formAction, pending] = useActionState(setLessonComplete, idle);
  /* Optimistic only in the label. The server is still the truth — a failure
     shows the error and the page reload puts the real state back. */
  const [marked, setMarked] = useState(done);

  return (
    <div className="border-hairline mt-10 border-t pt-6">
      {state.status === "error" && state.formError ? (
        <div className="mb-4">
          <FormMessage tone="error">{state.formError}</FormMessage>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <form
          action={formAction}
          onSubmit={() => setMarked((value) => !value)}
        >
          <input type="hidden" name="course" value={courseSlug} />
          <input type="hidden" name="cohort" value={cohortSlug} />
          <input type="hidden" name="lesson" value={lessonId} />
          <input type="hidden" name="done" value={marked ? "false" : "true"} />
          <Button variant={marked ? "secondary" : "primary"} disabled={pending}>
            {pending
              ? "Saving…"
              : marked
                ? "Mark as not done"
                : "Mark as done"}
          </Button>
        </form>

        {nextHref ? (
          <Link
            href={nextHref}
            className="text-ink text-small underline underline-offset-2"
          >
            Next lesson
          </Link>
        ) : null}
      </div>
    </div>
  );
}
