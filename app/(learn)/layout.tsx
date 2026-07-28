/* Sprint 6.10 — the learner route group.
 *
 * Deliberately NOT inside (site): no marketing header, no footer, no skip-link
 * to a nav that is not there. CourseShell supplies this group's chrome.
 *
 * The reasoning is the same one that gives /admin its own layout. Someone
 * signed in and part-way through a lesson is using a tool; a nav bar offering
 * "Partner with SRN" and a four-column footer beneath a paragraph of teaching
 * are noise with nowhere useful to go, and they were what made the first
 * Academy build read as a brochure with a course glued to it.
 *
 * The public Academy — the catalogue at /academy and each course's sales page —
 * stays in (site) and keeps the site chrome, because those pages ARE marketing
 * and the site look is right for them. */

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
