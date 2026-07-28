import Link from "next/link";
import Image from "next/image";
import { BookOpen, Layers, Clock, Play, Lock, Check } from "lucide-react";

import { Icon } from "@/components/ui/Icon";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { MonoLabel, type ShellModule } from "./CourseShell";

/* Sprint 6.10 — the course overview.
 *
 * The old version was a heading, a button, and a wall of white. This is the
 * shape a course landing needs: what the course is, how big it is, one obvious
 * action, then the whole syllabus with each lesson's length and a line on what
 * it covers — so the work is legible before it is started.
 *
 * Body copy is text-sm/7 throughout, matching the shell. */

export function CourseOverview({
  courseTitle,
  summary,
  imageUrl,
  bodyRich,
  cohortLine,
  modules,
  basePath,
  resume,
  totalLessons,
  totalMinutes,
}: {
  courseTitle: string;
  summary: string | null;
  imageUrl: string | null;
  bodyRich: unknown;
  cohortLine: string;
  modules: ShellModule[];
  basePath: string;
  resume: { id: string; title: string; started: boolean } | null;
  totalLessons: number;
  totalMinutes: number;
}) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const duration =
    totalMinutes === 0
      ? null
      : hours > 0
        ? `${hours} hr${mins ? ` ${mins} min` : ""}`
        : `${mins} min`;

  const stats = [
    {
      icon: BookOpen,
      label: `${modules.length} ${modules.length === 1 ? "part" : "parts"}`,
    },
    {
      icon: Layers,
      label: `${totalLessons} ${totalLessons === 1 ? "lesson" : "lessons"}`,
    },
    ...(duration ? [{ icon: Clock, label: duration }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {imageUrl ? (
        /* The course's own photograph, above the title. Empty alt because the
           heading directly beneath says the same thing — announcing it twice
           to a screen reader is noise, not access. */
        <div className="bg-mist relative mb-10 aspect-[21/9] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 48rem, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <header>
        <h1 className="text-display-tight text-ink text-[clamp(1.875rem,4vw,2.75rem)] leading-[1.05] text-pretty">
          {courseTitle}
        </h1>
        {summary ? (
          <p className="text-slate mt-5 max-w-2xl text-sm/7 text-pretty">
            {summary}
          </p>
        ) : null}

        <div className="text-ink mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
          {stats.map((stat) => (
            <span key={stat.label} className="flex items-center gap-2">
              <Icon icon={stat.icon} size="sm" className="text-slate/70" />
              {stat.label}
            </span>
          ))}
        </div>

        {resume ? (
          <div className="mt-8">
            <Link
              href={`${basePath}/${resume.id}`}
              className="bg-ink hover:bg-ink/90 text-paper inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Icon icon={Play} size="sm" color="paper" className="h-3.5 w-3.5" />
              {resume.started ? "Continue the course" : "Start the course"}
            </Link>
            {resume.started ? (
              <p className="text-slate mt-3 text-[0.8125rem]/6">
                Next up: {resume.title}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-slate mt-8 text-sm/7">
            You have finished everything that is open so far.
          </p>
        )}

        <p className="text-slate/80 mt-6 text-[0.8125rem]/6">{cohortLine}</p>
      </header>

      {!richTextIsEmpty(bodyRich) ? (
        <section className="border-hairline mt-14 border-t pt-12">
          <div className="max-w-2xl">
            <RichText body={bodyRich} />
          </div>
        </section>
      ) : null}

      {modules.length > 0 ? (
        <section className="mt-16">
          {modules.map((module, index) => (
            <div
              key={module.id}
              className="border-hairline border-t py-12 first:border-t-0 first:pt-0"
            >
              <div className="grid gap-5 sm:grid-cols-[6rem_1fr] sm:gap-10">
                <MonoLabel className="text-slate/70 sm:pt-1.5">
                  Part {index + 1}
                </MonoLabel>
                <div className="min-w-0">
                  <h2 className="text-display text-ink text-[1.375rem] leading-snug text-pretty">
                    {module.title}
                  </h2>

                  {!module.released ? (
                    <p className="text-slate mt-4 flex items-start gap-2.5 text-sm/7">
                      <Icon icon={Lock} size="sm" className="mt-1 shrink-0" />
                      {module.lockedReason}
                    </p>
                  ) : module.lessons.length === 0 ? (
                    <p className="text-slate mt-4 text-sm/7">
                      Nothing in this part yet.
                    </p>
                  ) : (
                    <ul className="mt-6 space-y-5">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id} className="flex gap-3">
                          <Icon
                            icon={lesson.done ? Check : Play}
                            size="sm"
                            className={`mt-[5px] h-3.5 w-3.5 shrink-0 ${
                              lesson.done ? "text-evidence" : "text-slate/60"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm/6">
                              <Link
                                href={`${basePath}/${lesson.id}`}
                                className="text-ink font-semibold hover:underline"
                              >
                                {lesson.title}
                              </Link>
                              {lesson.minutes ? (
                                <span className="text-slate/70">
                                  {" · "}
                                  {lesson.minutes} min
                                </span>
                              ) : null}
                            </p>
                            {lesson.summary ? (
                              <p className="text-slate mt-1 text-sm/6 text-pretty">
                                {lesson.summary}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
