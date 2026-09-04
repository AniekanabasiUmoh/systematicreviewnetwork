# SRN website complaints intake

Drop screenshots, screen recordings, URLs, and notes below. One issue per
entry is easiest to trace and test.

## How to report an issue

For each complaint, include whatever is available:

- **Page or URL:**
- **What you expected:**
- **What happened instead:**
- **Steps to reproduce:**
- **Device/browser:**
- **Screenshot or recording:** paste the file path or link
- **Priority:** blocker / high / normal / polish

## Complaints

<!-- Add new entries below this line. Do not delete original evidence. -->

### 1. <!-- short title -->

- **Page or URL:**
- **What you expected:**
- **What happened instead:**
- **Steps to reproduce:**
- **Device/browser:**
- **Screenshot or recording:**
- **Priority:**

**Triage:** Needs clarification. The original entry contains no page, expected
result, actual result, reproduction steps, or attachment. It is retained as an
open intake item rather than being interpreted as a defect.

**Proposed resolution:** supply the missing context (URL, expected behaviour,
what happened, and a screenshot or recording). If “.” was submitted by mistake,
mark this item closed as a duplicate/empty report.

**Acceptance check:** the report can be reproduced by another person, or the
report is explicitly closed as having no actionable information.

### 2. Vercel triangle still appears as the browser/site icon

- **Page or URL:** site-wide browser tab/favicon (the supplied screenshot shows
  the white Vercel triangle rather than SRN branding).
- **What was expected:** the SRN mark should appear in the browser tab, bookmark,
  and installed/mobile shortcut icon.
- **What happened instead:** a Vercel default icon is still displayed.
- **Evidence inspected:** `app/favicon.ico` is a 256x256 white Vercel triangle
  on black. The repository already contains the branded
  `public/srn-logo-icon.png`; `app/layout.tsx` has no explicit `metadata.icons`
  declaration.
- **Status:** Fixed in the working tree; production deployment pending.
- **Priority:** normal/high branding polish.

**Problem:** the shipped favicon is still the starter Vercel asset. Browsers
cache favicons aggressively, so replacing only one file may leave the old icon
visible until the icon URL changes or the cache is refreshed.

**Detailed solution:** replace the default icon with a padded SRN icon and add an
explicit icon set in the root metadata (favicon plus Apple/touch and Android
sizes). Keep the pinwheel aspect ratio; do not stretch the full horizontal
wordmark into a square. Version the icon URL or use the framework's generated
`app/icon` files so a production deployment cannot continue resolving the old
asset. Do not expose a private source image or alter the header wordmark while
fixing the favicon.

**Acceptance checks:** inspect the tab on desktop, a bookmark, private/incognito
window, and a mobile home-screen shortcut after a production deploy; verify the
network request resolves to the SRN icon (not a Vercel asset); confirm the icon
remains square and undistorted at 16, 32, 48, 180, 192, and 512px sizes.

**Recommended phase:** branding/release-hardening pass (after the content and
media intake), with a short browser-cache regression check.

**Resolution applied:** branded `app/favicon.ico`, `app/icon.png`, and
`app/apple-icon.png` now use the SRN icon, and root metadata points at the
versioned icon URLs. The header wordmark now uses explicit width plus automatic
height at both breakpoints.

### 3. Empty report (`.`)

- **Page or URL:** not supplied.
- **What was expected:** not supplied.
- **What happened instead:** not supplied.
- **Evidence:** the message consists only of a period; no distinct problem can
  be inferred safely.
- **Status:** Open — clarification required.
- **Priority:** unassigned.

**Detailed solution:** do not create or remove a feature based on this entry.
Ask for the affected URL/page, expected result, actual result, reproduction
steps, and device/browser. If it is a duplicate of another screenshot or was
sent accidentally, close it with that reference.

**Acceptance check:** either a reproducible defect is added with evidence or the
item is marked “no actionable complaint.”

### 4. Selected photos in Google Drive

- **Source folder:** [selected site photos](https://drive.google.com/drive/folders/1feMqTRnLaQONuhKws1ttio2gRz8YylFf?usp=sharing)
- **What was expected:** appropriate conference, team, programme, and impact
  images should be available in the site media library and used in the correct
  editorial locations.
- **What happened instead:** the folder is a handoff only; no per-image review,
  rights decision, alt text, or placement mapping has been recorded yet.
- **Status:** Imported to the production Media bucket; editorial placement is
  still a staff choice.
- **Priority:** normal (high for launch pages that still use placeholders).

**Problem:** importing an entire shared folder would risk duplicates, unsuitable
crop/orientation, missing attribution/permission, and images being published in
the wrong context. A Drive link alone does not establish that every file is
cleared for public use.

**Detailed solution:** create a media review sheet for the folder. For each
candidate, preserve the original filename and source path, deduplicate it,
record intended page/slot, check rights/permission and people-identification
requirements, write human alt text, and record dimensions/crop needs. Copy only
approved originals into the site's media workflow, optimise responsive variants,
and attach them to the relevant team/event/programme/story record. Keep
unreviewed or uncleared files out of the public bucket; do not silently replace
existing assets.

**Acceptance checks:** every adopted image has a source reference, rights status,
placement, alt text, dimensions, and a successful public-page render check;
no duplicate or placeholder image remains where an approved image was assigned;
rejected/uncleared images are not publicly reachable.

**Recommended phase:** Phase 1 media/editorial migration, followed by the
admin-media regression pass. The Drive folder itself has not been modified.

**Resolution applied:** all 15 supplied JPEGs were resized, given descriptive
alt text, and upserted into `media` under `drive-selected/2026-09/`. Selected
photos are now assigned to distinct editorial slots on the homepage, About,
Academy, Programmes, Resources, Impact, News & Events, and Mentorship pages.
The original ZIP remains untouched. Event/news records that have no approved
published banner were not overwritten; staff can choose from the imported
media in the admin picker.

**Placement map:** homepage CTA `ghana6.jpg`, impact band `ghana7.jpg`,
mentorship band `nigeriaph3.jpg`, homepage About band `nigeriaph2.jpg`, About
header `ghana1.jpg`, Academy header `ghanavirtual2.jpg`, Programmes header
`nigeriaphoto.jpg`, Resources header `ghana8.jpg`, Impact header `srnrwanda.jpg`,
News & Events header `ghana3.jpg`, and Mentorship header `ug3.jpg`.

### 5. Unwanted `zz` test course visible in the Academy

- **Page or URL:** `/academy` and the course route generated from the course slug.
- **What was expected:** only the real Beginner Academy offering should appear
  in the public catalogue.
- **What happened instead:** the published test course `zz-test-6-5-course`
  (title `zz-test-6-5 course`) is eligible for the public course query.
- **Evidence inspected:** the live database contains that published, unarchived
  course plus test cohorts `zz-test-6-5-a`, `zz-test-6-5-b`, and
  `zz-test-6-5-self`, and test modules/lessons with the same prefix. The public
  course query intentionally returns every `status = 'published'` row whose
  `archived_at` is null.
- **Likely root cause:** `tests/learning-access.test.ts` seeds rows with the
  `zz-test-6-5` prefix and cleans them in `afterAll`. An interrupted/hung test
  run can leave those service-role fixtures behind; the timestamps and naming
  match that fixture. This is evidence-based but should be confirmed against
  the test-run log before deleting data.
- **Status:** Fixed in production by exact-prefix cleanup; no real learner data
  was in scope.
- **Priority:** high (public catalogue contamination).

**Detailed solution:** archive a real course through Admin because the course /
cohort relationship is protected and historical learner access must survive.
For this incident, the exact prefix, timestamps, learner emails, and all three
enrolments were verified as disposable test fixtures, so a controlled cleanup
was appropriate: progress/attendance, enrolments, sessions, lessons, modules,
cohorts, the course, learners, and auth users were removed in dependency order.
The learning-access test should still be hardened with `try/finally` cleanup and
a narrowly scoped cleanup command so an interrupted run cannot publish fixtures
again.

**Acceptance checks:** `/academy` contains only intended published courses;
`/academy/zz-test-6-5-course` returns not found; no public course query returns a
`zz-test-6-5` row; no real enrolments are changed; rerunning the learning-access
tests leaves zero rows with that prefix.

**Academy login and course-taking route (current implementation):**

1. Open `/academy` and choose **Beginner Academy: Systematic Review
   Methodology**.
2. Choose an open cohort and select **Enrol**. The current real course slug is
   `systematic-review-methodology`.
3. New learners use `/academy/sign-up`; existing learners use
   `/academy/sign-in`. Complete Supabase email verification (or use the resend
   control at `/academy/verify`).
4. Return to the cohort enrolment route
   `/academy/enrol/systematic-review-methodology/<cohort-slug>`. Free cohorts
   enrol directly; paid cohorts continue through Paystack.
5. After enrolment, open `/account`, select the course card, and continue at
   `/academy/learn/systematic-review-methodology/<cohort-slug>`. Lessons and
   certificates remain subject to enrolment and release/completion rules.

The public catalogue and routes are implemented, but an authenticated learner
click-through was not performed in this investigation. The current browser
session was signed out of SRN Admin; a signed-in Vercel CLI account is not an
SRN learner/admin session.

**Recommended phase:** Academy data hygiene and admin-content hardening.

**Resolution applied:** the exact `zz-test-6-5-course` record is now
removed after verifying that all three enrolments and both learner accounts
were test-prefixed fixtures. Its cohorts, modules, lessons, progress records,
and test auth users were removed in dependency order. No real Academy course or
learner record was touched. The migration still archives this exact slug in a
fresh environment as a safe backstop before any later controlled cleanup.

### Cross-cutting fixes from the earlier screenshot backlog

- **Admin Media:** the page now surfaces a readable query/configuration error,
  keeps working upload controls visible, sanitises missing dimensions, and
  isolates a broken object to one card. The picker has loading, empty, retry,
  session-error, and request-cancellation states instead of a silent failure.
- **Rising Scholars:** the official logo is bundled locally, its existing
  partner link is preserved, and a client-side name fallback prevents a broken
  remote image from becoming an unlabeled icon.
- **Recorded webinar:** the supplied YouTube URL is covered by a regression
  test and now renders as a privacy-enhanced inline player on its resource page,
  with an explicit YouTube fallback link.
- **Impact information architecture:** DOI publications now point visitors to
  the Resources publication library; the Impact page no longer calls them
  activity reports. The ambiguous `Launched / 2022` metric was removed from the
  database and filtered defensively in public reads.

## Triage notes

This file is an intake register. After review, each item can be assigned to an
implementation phase, linked to a test, and marked resolved without removing
the original complaint or evidence.

## Investigation boundary

This update records source/database/deployment evidence and the fixes applied.
The empty report still needs clarification. The photo archive and test-course
changes were intentionally narrow; no other Drive files, private PDFs, or
unrelated content were modified. Items marked deployment-pending should be
closed after the production deployment and cache/device checks pass.
