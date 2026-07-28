import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Section, Container } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { ProfileForm } from "@/components/academy/ProfileForm";
import { SignOutButton } from "@/components/academy/SignOutButton";
import { requireLearner } from "@/lib/academy/auth";
import { listMyCourses } from "@/lib/academy/curriculum";
import { getLearnerRegistrations } from "@/lib/academy/queries";
import { formatEventDateTime } from "@/lib/events";

/* Sprint 6.1 — the learner's account page.
 *
 * requireLearner(), not requireVerifiedLearner(): an unverified learner must be
 * able to reach this page, because it is where they are told to confirm their
 * address and can ask for the link again. Nothing on it grants course access. */

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const learner = await requireLearner();
  const registrations = learner.verified_at
    ? await getLearnerRegistrations(learner.id)
    : [];
  const courses = learner.verified_at ? await listMyCourses(learner.id) : [];

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={learner.full_name ? `Hello, ${learner.full_name}.` : "Your account."}
        lede="Your details, your courses, and the events you have registered for."
      />

      {!learner.verified_at ? (
        <Section surface="paper">
          <Container>
            <div className="border-hairline max-w-2xl border p-6">
              <h2 className="text-ink font-semibold">Confirm your email</h2>
              <p className="text-slate mt-2 leading-relaxed">
                We sent a link to {learner.email}. You need to follow it before
                you can enrol in a course.
              </p>
              <div className="mt-5">
                <ButtonLink href="/academy/verify">
                  Confirm your email
                </ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {learner.verified_at ? (
        <Section surface="paper">
          <Container>
            <Eyebrow>Your courses</Eyebrow>
            <h2 className="text-display text-ink mt-3 mb-6 text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.1]">
              {courses.length === 0 ? "Nothing yet" : "Continue where you left off"}
            </h2>
            {courses.length === 0 ? (
              <p className="text-slate max-w-2xl leading-relaxed">
                You are not enrolled in a course yet. The{" "}
                <Link
                  href="/academy"
                  className="text-ink underline underline-offset-2"
                >
                  Academy catalogue
                </Link>{" "}
                lists everything currently open.
              </p>
            ) : (
              <ul className="grid max-w-4xl gap-5 sm:grid-cols-2">
                {courses.map((course) => (
                  <li
                    key={`${course.courseSlug}-${course.cohortSlug}`}
                    className="border-hairline group flex flex-col overflow-hidden border"
                  >
                    <Link
                      href={`/academy/learn/${course.courseSlug}/${course.cohortSlug}`}
                      className="flex h-full flex-col"
                    >
                      {course.imageUrl ? (
                        <div className="bg-mist relative aspect-[16/9] w-full overflow-hidden">
                          <Image
                            src={course.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 640px) 20rem, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-ink font-semibold group-hover:underline">
                          {course.courseTitle}
                        </p>
                        <p className="text-slate mt-1 text-[0.8125rem]">
                          {course.cohortLabel}
                          {course.state === "completed" ? " · completed" : ""}
                        </p>

                        <div className="mt-auto pt-5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate text-[0.8125rem]">
                              {course.totalCount === 0
                                ? "Not started"
                                : `${course.completedCount} of ${course.totalCount} done`}
                            </span>
                            <span className="text-ink text-[0.8125rem] font-semibold tabular-nums">
                              {course.percent}%
                            </span>
                          </div>
                          <div
                            className="bg-mist mt-2 h-[3px] w-full"
                            aria-hidden="true"
                          >
                            <div
                              className="bg-evidence h-full"
                              style={{ width: `${course.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Container>
        </Section>
      ) : null}

      <Section surface="paper">
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1fr_20rem] lg:gap-20">
            <div className="max-w-xl">
              <Eyebrow>Your details</Eyebrow>
              <h2 className="text-display text-ink mt-3 mb-6 text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.1]">
                Profile
              </h2>
              <ProfileForm learner={learner} />
            </div>

            <aside className="border-hairline border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <h2 className="text-ink text-small font-semibold">
                Events you have registered for
              </h2>
              {registrations.length > 0 ? (
                <ul className="mt-4 space-y-4">
                  {registrations.map((row) => (
                    <li key={row.id} className="border-hairline border-b pb-4 last:border-b-0">
                      <Link
                        href={`/news/events/${row.event_slug}`}
                        className="text-ink text-small font-semibold underline underline-offset-2"
                      >
                        {row.event_title}
                      </Link>
                      <p className="text-slate mt-1 text-small">
                        {formatEventDateTime(row.starts_at, row.ends_at)}
                      </p>
                      {row.cancelled_at ? (
                        <p className="text-slate mt-1 text-small">Cancelled</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate text-small mt-4 leading-relaxed">
                  {learner.verified_at
                    ? "You haven't registered for any events yet. When you do, they'll appear here — including any you registered for with this address before you created an account."
                    : "Confirm your email address and any events you have already registered for with it will appear here."}
                </p>
              )}

              <div className="border-hairline mt-8 border-t pt-6">
                <SignOutButton />
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
