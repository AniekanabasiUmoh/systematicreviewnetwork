import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { RichText } from "@/components/ui/RichText";
import { Tag } from "@/components/ui/Tag";
import { getCourse, getCourseSlugs, getCohortSeatCounts } from "@/lib/academy/courses";
import {
  cohortState,
  cohortLabel,
  canEnrol,
  formatCohortDates,
  LEVEL_LABELS,
  DELIVERY_LABELS,
} from "@/lib/academy/cohorts";
import { formatPrice, isFree } from "@/lib/events";

/* Sprint 6.2 — a public course page showing the open cohort.
 *
 * The §6.2 done-when is "it appears publicly with a working enrol route; last
 * term's cohort remains as history". Both are visible here: open cohorts get a
 * live enrol link, and past ones stay listed under a heading that says what
 * they are, rather than silently vanishing. */

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getCourseSlugs();
  return slugs.map((course) => ({ course }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course: slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.summary ?? undefined,
  };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();

  const seats = await getCohortSeatCounts(course.cohorts.map((row) => row.id));
  const withState = course.cohorts.map((cohort) => ({
    cohort,
    state: cohortState(cohort, seats[cohort.id] ?? 0),
  }));
  const current = withState.filter((row) => row.state !== "past");
  const past = withState.filter((row) => row.state === "past");

  const outcomes = stringList(course.learning_outcomes);
  const prerequisites = stringList(course.prerequisites);

  return (
    <>
      <PageHeader
        eyebrow="SRN Academy"
        title={course.title}
        lede={course.summary ?? undefined}
        imageUrl={course.featured_image_url}
        imageAlt=""
      />

      <Section surface="paper">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
            <div className="max-w-[68ch]">
              <div className="flex flex-wrap gap-2">
                <Tag>{LEVEL_LABELS[course.level] ?? course.level}</Tag>
                <Tag>{DELIVERY_LABELS[course.delivery] ?? course.delivery}</Tag>
                {course.duration_label ? <Tag>{course.duration_label}</Tag> : null}
              </div>

              {course.body_rich ? (
                <div className="mt-8">
                  <RichText body={course.body_rich} />
                </div>
              ) : null}

              {outcomes.length > 0 ? (
                <div className="mt-10">
                  <Eyebrow>What you will be able to do</Eyebrow>
                  <ul className="mt-4 space-y-3">
                    {outcomes.map((item) => (
                      <li
                        key={item}
                        className="text-slate border-hairline border-b pb-3 leading-relaxed last:border-b-0"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {prerequisites.length > 0 ? (
                <div className="mt-10">
                  <Eyebrow>Before you start</Eyebrow>
                  <ul className="mt-4 space-y-3">
                    {prerequisites.map((item) => (
                      <li key={item} className="text-slate leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {course.programme ? (
                <p className="text-slate text-small mt-10">
                  Part of{" "}
                  <Link
                    href={`/programmes/${course.programme.slug}`}
                    className="text-ink underline underline-offset-2"
                  >
                    {course.programme.title}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <aside className="border-hairline border-t pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <h2 className="text-ink text-small font-semibold">
                Upcoming cohorts
              </h2>

              {current.length === 0 ? (
                <p className="text-slate text-small mt-4 leading-relaxed">
                  No cohort of this course is open right now. Tell us
                  you&rsquo;re interested and we&rsquo;ll let you know when the
                  next one opens — we run this course regularly.
                </p>
              ) : (
                <ul className="mt-4 space-y-6">
                  {current.map(({ cohort, state }) => (
                    <li key={cohort.id} className="border-hairline border-b pb-6 last:border-b-0">
                      <p className="text-ink text-small font-semibold">
                        {cohort.label}
                      </p>
                      <p className="text-slate text-small mt-1">
                        {formatCohortDates(
                          cohort.starts_on,
                          cohort.ends_on,
                          cohort.pacing,
                        )}
                      </p>
                      <p className="text-slate text-small mt-1">
                        {isFree(cohort.price_kobo)
                          ? "Free — you'll still need an SRN account"
                          : formatPrice(
                              cohort.price_kobo,
                              cohort.currency as "NGN" | "USD",
                            )}
                      </p>
                      <p className="text-slate text-small mt-1">
                        {cohortLabel[state]}
                        {state === "open" &&
                        cohort.capacity !== null &&
                        seats[cohort.id] !== undefined
                          ? ` · ${cohort.capacity - (seats[cohort.id] ?? 0)} of ${cohort.capacity} seats left`
                          : ""}
                      </p>
                      {canEnrol(state) ? (
                        <div className="mt-4">
                          <ButtonLink
                            href={`/academy/enrol/${course.slug}/${cohort.slug}`}
                          >
                            Enrol
                          </ButtonLink>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              {past.length > 0 ? (
                <div className="border-hairline mt-8 border-t pt-6">
                  <h2 className="text-ink text-small font-semibold">
                    Previous cohorts
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {past.map(({ cohort }) => (
                      <li key={cohort.id} className="text-slate text-small">
                        {cohort.label} ·{" "}
                        {formatCohortDates(
                          cohort.starts_on,
                          cohort.ends_on,
                          cohort.pacing,
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="border-hairline mt-8 border-t pt-6">
                <p className="text-slate text-small leading-relaxed">
                  Questions about whether this course is right for you?{" "}
                  <Link href="/contact" className="text-ink underline underline-offset-2">
                    Ask us
                  </Link>
                  .
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
