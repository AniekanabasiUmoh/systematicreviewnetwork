"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeft, X, Check, Lock } from "lucide-react";

import { Icon } from "@/components/ui/Icon";

/* Sprint 6.10 — the course shell.
 *
 * The first Academy build was fairly judged as basic: it was the SRN marketing
 * site with a course dropped into it, so a lesson sat between a full-screen
 * navy hero and a footer, and the contents were a flat list of bare titles.
 *
 * Rebuilt around what actually makes a course player feel considered, which
 * turned out to be typographic rather than structural. The reference was
 * Tailwind's Compass template; its code is licensed and was NOT copied, but the
 * rendered CSS is instructive and the lesson is simpler than it looks:
 *
 *   - body copy is SMALL with a lot of air — 14px on 28px leading, not 17px on
 *     26px. Text that whispers reads as expensive; text that shouts does not.
 *   - two greys and nothing else. Emphasis comes from weight, never from size
 *     or colour.
 *   - small labels are tracked monospace, which reads as a deliberate detail
 *     rather than a heading that lost its hierarchy.
 *
 * Structure: a persistent left rail of parts and lessons, a slim breadcrumb bar
 * instead of a hero, content filling the rest. The site header and footer are
 * deliberately absent — someone signed in and studying is using a tool, and
 * marketing nav beside a lesson is a distraction with nowhere useful to go.
 *
 * LIGHT ONLY for now, by decision. Every colour below is a token rather than a
 * literal, so a dark variant later is a token swap and not a rewrite. */

export type ShellLesson = {
  id: string;
  title: string;
  summary?: string | null;
  minutes?: number | null;
  done: boolean;
};

export type ShellModule = {
  id: string;
  title: string;
  released: boolean;
  lockedReason: string | null;
  lessons: ShellLesson[];
};

/** Tracked monospace, used for every small label in the Academy. */
export function MonoLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[0.6875rem] tracking-[0.14em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function CourseShell({
  courseTitle,
  crumb,
  basePath,
  modules,
  currentLessonId,
  percent,
  completedCount,
  totalCount,
  children,
}: {
  courseTitle: string;
  /** Second breadcrumb segment — "Overview", or the lesson title. */
  crumb: string;
  basePath: string;
  modules: ShellModule[];
  currentLessonId?: string;
  percent: number;
  completedCount: number;
  totalCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-paper text-ink min-h-screen">
      {/* Fixed rather than sticky: the rail must never scroll away mid-lesson,
          which is the entire reason it exists. */}
      <aside
        /* h-screen + its own scroll: the rail is as tall as the VIEWPORT, not
           the document, so a long syllabus scrolls inside the rail rather than
           running off the bottom of a fixed element.
         *
           `data-open` drives the slide rather than a conditional utility class.
           Mixing `-translate-x-full` with `lg:translate-x-0` looked correct and
           was not: Tailwind v4 orders utilities by specificity rather than by
           the order they are written, so below `lg` the desktop variant could
           still win — leaving the rail on screen, the content with no offset
           sliding underneath it, and the close button unreachable. A data
           attribute has no such collision. */
        data-open={open ? "true" : undefined}
        className="border-hairline bg-paper fixed top-0 left-0 z-40 h-screen w-[19rem] -translate-x-full overflow-y-auto overscroll-contain border-r transition-transform duration-200 data-[open]:translate-x-0 lg:!translate-x-0"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 lg:hidden">
          <MonoLabel className="text-slate">Contents</MonoLabel>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close contents"
            className="text-slate hover:text-ink"
          >
            <Icon icon={X} size="sm" />
          </button>
        </div>

        <div className="px-6 pt-7 pb-6 max-lg:pt-0">
          <Link
            href={basePath}
            className="text-ink block text-[0.9375rem] leading-snug font-semibold"
          >
            {courseTitle}
          </Link>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-slate text-[0.8125rem]">
                {completedCount} of {totalCount} done
              </span>
              <span className="text-ink text-[0.8125rem] font-semibold tabular-nums">
                {percent}%
              </span>
            </div>
            <div className="bg-mist mt-2 h-[3px] w-full" aria-hidden="true">
              <div
                className="bg-evidence h-full transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="px-6 pb-12" aria-label="Course contents">
          {modules.map((module, index) => (
            <div key={module.id} className="mb-8">
              <MonoLabel className="text-slate/70">Part {index + 1}</MonoLabel>
              <p className="text-ink mt-2 text-sm/6 font-semibold">
                {module.title}
              </p>

              {!module.released ? (
                <p className="text-slate mt-2.5 flex items-start gap-2 text-[0.8125rem]/6">
                  <Icon icon={Lock} size="sm" className="mt-0.5 shrink-0" />
                  {module.lockedReason}
                </p>
              ) : module.lessons.length === 0 ? (
                <p className="text-slate mt-2.5 text-[0.8125rem]/6">
                  Nothing here yet.
                </p>
              ) : (
                /* The rule down the group is what turns a flat list into a
                   hierarchy: lessons visibly belong to their part. */
                <ul className="border-hairline mt-3 border-l">
                  {module.lessons.map((lesson) => {
                    const current = lesson.id === currentLessonId;
                    return (
                      <li key={lesson.id} className="relative">
                        {current ? (
                          <span
                            aria-hidden="true"
                            className="bg-evidence absolute top-1 -left-px h-[calc(100%-0.5rem)] w-[2px]"
                          />
                        ) : null}
                        <Link
                          href={`${basePath}/${lesson.id}`}
                          aria-current={current ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={`flex items-start gap-2.5 py-1.5 pr-2 pl-4 text-sm/6 transition-colors ${
                            current
                              ? "text-ink font-semibold"
                              : "text-slate hover:text-ink"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-[5px] flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${
                              lesson.done
                                ? "bg-evidence border-evidence"
                                : "border-hairline"
                            }`}
                          >
                            {lesson.done ? (
                              <Icon
                                icon={Check}
                                size="sm"
                                color="paper"
                                className="h-2.5 w-2.5"
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
            </div>
          ))}
        </nav>
      </aside>

      {open ? (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="bg-ink/25 fixed inset-0 z-30 lg:hidden"
        />
      ) : null}

      <div className="lg:pl-[19rem]">
        <header className="border-hairline bg-paper/90 sticky top-0 z-20 border-b backdrop-blur-sm">
          <div className="flex items-center gap-3 px-5 py-3 sm:px-10">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open contents"
              className="text-slate hover:text-ink lg:hidden"
            >
              <Icon icon={PanelLeft} size="sm" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <Link
                href={basePath}
                className="text-ink shrink-0 font-medium hover:underline"
              >
                {courseTitle}
              </Link>
              <span className="text-slate/40" aria-hidden="true">
                /
              </span>
              <span className="text-slate truncate">{crumb}</span>
            </nav>
            <Link
              href="/account"
              className="text-slate hover:text-ink ml-auto shrink-0 text-sm"
            >
              Your courses
            </Link>
          </div>
        </header>

        <main className="px-5 py-10 sm:px-10 sm:py-14">{children}</main>
      </div>
    </div>
  );
}
