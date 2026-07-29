# SRN — manual test checklist

Every page, every action, in the order a real person meets them. Tick as you go.

Built from the actual route tree and action exports on 29 July 2026 — not from
memory — so if something is missing here it is missing from the code too.

**Local:** `http://localhost:3000` · **Live:** `https://systematicreviewnetworkwebsite2.vercel.app`

## Test accounts

Password for all three: `SrnDemo2026!`

| Role | Email | Starts at |
|---|---|---|
| Learner | `demo.learner@srn.test` | `/academy/sign-in` |
| Instructor | `demo.instructor@srn.test` | `/admin/login` → `/admin/teaching` |
| Editor (staff) | `demo.editor@srn.test` | `/admin/login` → `/admin` |
| Admin | `thorpegroup01@gmail.com` | your own password |

The demo learner is enrolled on the demonstration course, part-way through, and
has two programme applications. Delete these accounts before launch.

## Known gaps — do not raise these as bugs

| What | Why |
|---|---|
| Paid enrolment / paid events | Paystack keys are empty. Free paths work; paid is written but never verified. |
| French site | Built and switched off. `FRENCH_ENABLED = false` — no translator committed (§7.4). |
| Newsletter → Brevo sync | Built and switched off. No Brevo account. Signups still record normally. |
| Emails may not arrive | Resend domain unverified until Sprint 8.3. |

## The demonstration course is published — read this before it goes live

`Systematic Review Methodology` is **published and enrollable** so the Academy
demonstrates properly. §6.9 asked for it to stay a draft, and that instruction
has been deliberately overridden for the review build.

The reason §6.9 gave still stands: the content was drafted to exercise the
platform, not reviewed by SRN's academics, and **a certificate from it carries
SRN's name**. That is fine while the site is a preview nobody outside SRN can
find — no domain is connected, and the deployment is not indexed.

**Before the real domain is connected, one of these must happen:**

- SRN reviews the content and adopts it, or
- the course is unpublished, or
- it is deleted (`supabase/seed-demo-course.mjs` recreates it in seconds).

Leaving it published on a public domain would mean issuing SRN-branded
credentials for material nobody at SRN has checked.


---

# PART 1 — PUBLIC SITE (no account needed)

## 1. Home and navigation

- [ ] 1a — `/` loads
- [ ] 1b — Every header link goes somewhere: About · Programmes · Resources · Impact · Team · News & Events · Contact
- [ ] 1c — "Partner with SRN" button → `/partner`
- [ ] 1d — Footer links all work (Explore, Get involved, legal row)
- [ ] 1e — Logo returns to `/`
- [ ] 1f — Mobile: burger menu opens, closes, and every link works
- [ ] 1g — Skip-to-content link appears on first Tab press

## 2. Standing pages

- [ ] 2a — `/about`
- [ ] 2b — `/team` — photos load, no broken images
- [ ] 2c — `/impact`
- [ ] 2d — `/impact/[slug]` — open a story from `/impact`
- [ ] 2e — `/faq`
- [ ] 2f — `/privacy`
- [ ] 2g — `/terms`
- [ ] 2h — `/styleguide` and `/styleguide/components` (internal reference)

## 3. Programmes

- [ ] 3a — `/programmes` lists all five
- [ ] 3b — `/programmes/[slug]` — open each one
- [ ] 3c — `/programmes/mentorship` — bespoke page, differs from the others
- [ ] 3d — "Apply" leads to `/programmes/apply`

## 4. Applying to a programme  ← *no login needed*

- [ ] 4a — `/programmes/apply` loads signed out
- [ ] 4b — Submit with everything blank → errors name every missing field
- [ ] 4c — Bad email format → refused
- [ ] 4d — Valid application → thank-you message
- [ ] 4e — Check `/admin/operations/applications` — it arrived
- [ ] 4f — **Signed in as the learner, apply with `demo.learner@srn.test`** → appears at `/account/applications` straight away
- [ ] 4g — Signed in but applying with a *different* email → NOT linked to your account (correct)
- [ ] 4h — Submit six times in an hour → rate limited on the sixth

## 5. Resources

- [ ] 5a — `/resources` lists everything
- [ ] 5b — Category filter works
- [ ] 5c — `/resources/[slug]` — open one
- [ ] 5d — Download / external link works
- [ ] 5e — An embedded video plays (5.8 safe embeds)

## 6. News and events

- [ ] 6a — `/news` lists articles
- [ ] 6b — `/news/[slug]` — read one
- [ ] 6c — Events list shows upcoming and past separately
- [ ] 6d — `/news/events/[slug]` — open an event
- [ ] 6e — A past event shows no register button
- [ ] 6f — A full event says "Fully booked"
- [ ] 6g — Capacity is honest ("38 of 60 places taken")

## 7. Registering for an event

- [ ] 7a — Register form appears on an open event
- [ ] 7b — Blank submit → field errors
- [ ] 7c — Valid registration → confirmation
- [ ] 7d — Register twice with the same email → friendly "already registered"
- [ ] 7e — `/news/events/[slug]/registered` — the confirmation page
- [ ] 7f — **Custom questions** (7.2): all four types render — short answer, long answer, choose-one, yes/no
- [ ] 7g — Leave a required question blank → refused, naming it
- [ ] 7h — Answers appear in the CSV export as their own columns

## 8. Contact, partnership, donations

- [ ] 8a — `/contact` — form submits
- [ ] 8b — Message lands in `/admin/operations/contact`
- [ ] 8c — `/partner` — form submits
- [ ] 8d — `/partner/thank-you` shows
- [ ] 8e — Donation form submits *(Paystack keys empty — expect the enquiry path)*

## 9. Newsletter

- [ ] 9a — Footer signup accepts an address
- [ ] 9b — Same address twice → still says success (no leak that you're on the list)
- [ ] 9c — Row appears in `/admin/operations/newsletter`
- [ ] 9d — `/unsubscribe?t=<token>` — one click, no confirmation form
- [ ] 9e — Unsubscribed row still visible in admin, badged
- [ ] 9f — CSV export **excludes** unsubscribed people
- [ ] 9g — A junk token shows the same page (no confirmation it was real)

## 10. Certificate verification  ← *public, no login*

- [ ] 10a — `/verify` — the code entry form
- [ ] 10b — A real code → "This certificate is genuine"
- [ ] 10c — Lower case, no hyphens, extra spaces → all still work
- [ ] 10d — A made-up code → "We did not issue this certificate"
- [ ] 10e — A revoked code → says **withdrawn**, with the reason (not "unknown")
- [ ] 10f — "View the certificate" downloads a PDF
- [ ] 10g — An **event** certificate says Event / Held / Attended
- [ ] 10h — A **course** certificate says Course / Cohort / Completed

---

# PART 2 — LEARNER ACCOUNT

## 11. Sign up and sign in

- [ ] 11a — `/academy/sign-up` — create an account
- [ ] 11b — Weak password → refused with a reason
- [ ] 11c — Existing email → sensible message
- [ ] 11d — Verification email arrives *(if Resend is configured)*
- [ ] 11e — `/academy/verify` — the "check your email" page
- [ ] 11f — Resend verification works
- [ ] 11g — `/academy/sign-in` — sign in
- [ ] 11h — Wrong password → refused
- [ ] 11i — `/academy/forgot` → reset email
- [ ] 11j — `/academy/reset` → set a new password, sign in with it
- [ ] 11k — Sign out
- [ ] 11l — Nine failed sign-ins → rate limited

## 12. Your account

- [ ] 12a — `/account` loads when signed in
- [ ] 12b — Signed out → redirected to sign-in
- [ ] 12c — **Course card** shows image, progress bar and percentage
- [ ] 12d — Card links into the course
- [ ] 12e — Edit name, institution, country, ORCID → saves
- [ ] 12f — Registered events listed
- [ ] 12g — Unverified account → prompted to confirm email

## 13. Your applications *(Sprint 7.1)*

- [ ] 13a — `/account/applications` lists both demo applications
- [ ] 13b — Stepper fills correctly: Received → Being reviewed → Decision
- [ ] 13c — Statuses are plain English ("Being reviewed", not `under_review`)
- [ ] 13d — Each says what happens next
- [ ] 13e — **Upload a CV** → appears in the list
- [ ] 13f — Upload a `.exe` → refused, naming acceptable types
- [ ] 13g — Upload over 10 MB → refused
- [ ] 13h — Download your own document
- [ ] 13i — Remove a document
- [ ] 13j — A **decided** application shows NO upload form
- [ ] 13k — Unverified account → told to confirm email first
- [ ] 13l — **Security:** signed in as someone else, open the document URL → 404

## 14. Course catalogue

- [ ] 14a — `/academy` — empty state points at programmes and events
- [ ] 14b — Draft course does **not** appear
- [ ] 14c — `/academy/[course]` 404s while the course is a draft
- [ ] 14d — *(After publishing a course)* it appears with cohorts, level, delivery, duration

## 15. Enrolling

- [ ] 15a — `/academy/enrol/[course]/[cohort]` — signed out redirects to sign-in
- [ ] 15b — Unverified → told to confirm email
- [ ] 15c — Free cohort → enrol works, access immediate
- [ ] 15d — Full cohort → "Fully booked" plus a waiting-list button
- [ ] 15e — Join the waiting list
- [ ] 15f — Closed enrolment → refused
- [ ] 15g — Paid cohort *(cannot be tested — no Paystack keys)*

## 16. The course player

- [ ] 16a — `/academy/learn/[course]/[cohort]` — the overview
- [ ] 16b — Course image, title, summary, stat row (parts · lessons · duration)
- [ ] 16c — "Continue the course" names the next lesson
- [ ] 16d — Full syllabus: every part, lesson durations, one-line summaries
- [ ] 16e — Locked parts say why ("Finish the previous module")
- [ ] 16f — **Sidebar is fixed** — does not scroll away
- [ ] 16g — Current lesson marked in green
- [ ] 16h — Ticks on finished lessons
- [ ] 16i — Progress bar and percentage agree with the ticks
- [ ] 16j — **Mobile:** contents collapse to one line; lesson starts at the top
- [ ] 16k — **Mobile:** open contents, tap a lesson, panel closes
- [ ] 16l — **No site header or footer** in the player
- [ ] 16m — Breadcrumb returns to the overview

## 17. Lessons

- [ ] 17a — Open a lesson — prose, headings, quotes, bullets all styled
- [ ] 17b — **Images render** with captions
- [ ] 17c — Video embed plays where present
- [ ] 17d — Estimated time shown
- [ ] 17e — "Mark as done" → tick appears, progress moves
- [ ] 17f — "Mark as not done" → reverses it
- [ ] 17g — "Next lesson" goes to the *following* lesson, not the next unfinished one
- [ ] 17h — Download a lesson file
- [ ] 17i — **Sign out, sign in again → progress survived**
- [ ] 17j — A locked lesson by direct URL → explains when it opens
- [ ] 17k — **Security:** not enrolled → 404, not "access denied"

## 18. Quizzes and assignments

- [ ] 18a — Open the quiz from the course overview
- [ ] 18b — Pass mark and attempts shown before starting
- [ ] 18c — Submit with nothing chosen → refused
- [ ] 18d — Submit answers → score immediately
- [ ] 18e — Below pass mark → says so plainly, retry offered
- [ ] 18f — At or above → passed
- [ ] 18g — **View source: the correct answers are NOT in the HTML**
- [ ] 18h — Assignment: submit text
- [ ] 18i — Assignment: submit a file
- [ ] 18j — Wrong file type → refused
- [ ] 18k — Attempts left counted down
- [ ] 18l — Out of attempts → refused with a reason
- [ ] 18m — After passing → no further attempts offered
- [ ] 18n — Earlier feedback survives a resubmission

## 19. Live sessions

- [ ] 19a — Upcoming sessions listed with date and duration
- [ ] 19b — More than 15 min before → "link appears fifteen minutes before"
- [ ] 19c — Within the window → Join button
- [ ] 19d — **Security:** enrolled on a *different* cohort → cannot get the link

## 20. Your certificate

- [ ] 20a — Unfinished → says what remains, distinguishing open work from locked
- [ ] 20b — Finish everything → "Claim your certificate"
- [ ] 20c — Claim → code issued, email sent
- [ ] 20d — Download the PDF
- [ ] 20e — **A Yoruba or accented name renders correctly** (e.g. Adébáyọ̀ Ọlámidé)
- [ ] 20f — "See what an employer sees" → the verify page
- [ ] 20g — Claim twice → same code, not a second one

---

# PART 3 — STAFF ADMIN

## 21. Access and accounts

- [ ] 21a — `/admin/login` — sign in as editor
- [ ] 21b — Wrong password → refused
- [ ] 21c — `/admin/login/forgot` → reset email
- [ ] 21d — `/admin/reset` → set a new password
- [ ] 21e — `/admin/account` → change your own password
- [ ] 21f — Wrong current password → refused
- [ ] 21g — **Editor** opening `/admin/users` → refused
- [ ] 21h — **Learner** opening `/admin` → refused
- [ ] 21i — Sign out
- [ ] 21j — `/admin` dashboard — counts and recent changes
- [ ] 21k — `/admin/search` — search across content

## 22. Content — every resource

Repeat for **events · news · team · resources · testimonials · partners · programmes**:

- [ ] 22a — `/admin/[resource]` — list loads
- [ ] 22b — Search filters the list
- [ ] 22c — Pagination works past 25 rows
- [ ] 22d — `/admin/[resource]/new` — create one
- [ ] 22e — Blank required field → refused
- [ ] 22f — Duplicate slug → refused
- [ ] 22g — `/admin/[resource]/[id]` — edit and save
- [ ] 22h — Publish → appears on the public site
- [ ] 22i — Unpublish → gone from the public site
- [ ] 22j — Delete → gone
- [ ] 22k — Rich text: bold, italic, link, list, heading, quote
- [ ] 22l — Insert an image from the media library
- [ ] 22m — Insert a video embed
- [ ] 22n — Paste a raw `<iframe>` → refused
- [ ] 22o — Paste a Zoom link with a password → refused
- [ ] 22p — Drag-reorder (team and partners only)
- [ ] 22q — "History" shows who changed what
- [ ] 22r — **Mobile 360px:** no horizontal scroll anywhere in admin

## 23. Media library

- [ ] 23a — `/admin/media` — grid loads
- [ ] 23b — Upload a JPEG/PNG/WebP
- [ ] 23c — Upload without alt text → refused
- [ ] 23d — Upload an SVG → refused
- [ ] 23e — Over 8 MB → refused
- [ ] 23f — Delete an unused image
- [ ] 23g — Delete an image in use → refused, counted

## 24. Events — extras

- [ ] 24a — Set capacity, price, registration window
- [ ] 24b — **Questions** (7.2): add all four types
- [ ] 24c — A choose-one with fewer than two options → refused
- [ ] 24d — Reorder questions
- [ ] 24e — Mark one required
- [ ] 24f — Delete an unanswered question → gone
- [ ] 24g — Delete an **answered** question → archived instead, with the count
- [ ] 24h — **Attendance certificates** (7.3): mark attendance, then issue
- [ ] 24i — Issue to one person
- [ ] 24j — Issue to everyone who attended, count named before the click
- [ ] 24k — A no-show cannot be issued one
- [ ] 24l — A cancelled registration cannot be issued one

## 25. Operations

- [ ] 25a — `/admin/operations` — the five tabs
- [ ] 25b — `/admin/operations/registrations`
- [ ] 25c — Filter by date — a 22:00 Lagos registration is inside "to today"
- [ ] 25d — Search by name or email
- [ ] 25e — Export CSV → opens in Excel with accents intact
- [ ] 25f — A name starting `=` is literal, not a formula
- [ ] 25g — Mark attendance
- [ ] 25h — Cancel a registration → seat freed, public count drops
- [ ] 25i — Copy all attendee emails
- [ ] 25j — Message registrants — one email each, never a shared To:
- [ ] 25k — `/admin/operations/applications` — the queue
- [ ] 25l — `/admin/operations/applications/[id]` — one application
- [ ] 25m — Move through: received → under review → accepted
- [ ] 25n — An invalid jump → refused with a sentence
- [ ] 25o — Add an internal note
- [ ] 25p — **Applicant documents visible** (7.1), downloadable
- [ ] 25q — Send an outcome email — editable before sending
- [ ] 25r — `/admin/operations/contact` · `/newsletter` · `/donations`
- [ ] 25s — Signed-out export URL → 401, not an HTML page

## 26. Academy — courses

- [ ] 26a — `/admin/courses` — list
- [ ] 26b — `/admin/courses/new` — create
- [ ] 26c — `/admin/courses/[id]` — edit, publish
- [ ] 26d — **Add a course image**
- [ ] 26e — Learning outcomes, one per line
- [ ] 26f — Duration label ("Six weeks, three hours a week")
- [ ] 26g — Level and delivery
- [ ] 26h — Add a cohort with dates, capacity, price, pacing
- [ ] 26i — End date before start → refused
- [ ] 26j — Capacity 0 → refused (blank means unlimited)
- [ ] 26k — Duplicate a cohort → copies price and pacing, **not** dates
- [ ] 26l — Delete a course with cohorts → refused, counted
- [ ] 26m — Archive instead

## 27. Academy — curriculum

- [ ] 27a — `/admin/courses/[id]/curriculum`
- [ ] 27b — Add a module
- [ ] 27c — Release rule: immediately / on a date / after the previous
- [ ] 27d — "On a date" with no date → refused
- [ ] 27e — Reorder modules
- [ ] 27f — Add a lesson
- [ ] 27g — **Set estimated minutes**
- [ ] 27h — Lesson body with images
- [ ] 27i — Attach a video link
- [ ] 27j — A Zoom *join* link on a lesson → refused
- [ ] 27k — Upload a lesson file
- [ ] 27l — Wrong file type → refused
- [ ] 27m — Publish module and lesson
- [ ] 27n — Delete a module with lessons → refused
- [ ] 27o — Delete a module with enrolled learners → refused, counted

## 28. Academy — cohort management

- [ ] 28a — `/admin/courses/[id]/cohorts/[cohortId]`
- [ ] 28b — Roster: who is on it, what they paid
- [ ] 28c — Labels are plain ("Paid by invoice", not `not_required`)
- [ ] 28d — Add someone manually
- [ ] 28e — Add someone with no account → refused, explaining why
- [ ] 28f — Remove someone → seat freed
- [ ] 28g — Log a refund → says clearly it moves no money
- [ ] 28h — Export the roster
- [ ] 28i — Waiting list in order
- [ ] 28j — Mark someone as offered
- [ ] 28k — Schedule a live session
- [ ] 28l — A join link not starting `https://` → refused
- [ ] 28m — A live session on a *self-paced* cohort → refused
- [ ] 28n — Post an announcement
- [ ] 28o — Save an announcement as a draft → learners cannot see it
- [ ] 28p — **Assign an instructor**
- [ ] 28q — Assign someone who is not an instructor → refused
- [ ] 28r — Unassign

## 29. Marking

- [ ] 29a — `/admin/grading` — oldest first
- [ ] 29b — Quizzes do **not** appear (they mark themselves)
- [ ] 29c — Read a submission
- [ ] 29d — Download a submitted file
- [ ] 29e — Mark with feedback
- [ ] 29f — Mark with no feedback → refused
- [ ] 29g — Score over 100 → refused
- [ ] 29h — Pass/fail derives from the score — no separate tickbox
- [ ] 29i — Learner sees the mark and feedback
- [ ] 29j — Recently returned list

## 30. Certificates

- [ ] 30a — `/admin/certificates` — the register
- [ ] 30b — Withdraw one → reason required
- [ ] 30c — Withdrawn shows publicly as withdrawn, with the reason
- [ ] 30d — Restore → verifies again
- [ ] 30e — Both course and event certificates listed

## 31. Reporting

- [ ] 31a — `/admin/reporting`
- [ ] 31b — Enrolled / finished / completion rate per cohort
- [ ] 31c — Average score
- [ ] 31d — Dropout point named as a lesson
- [ ] 31e — Certificates issued per month
- [ ] 31f — A cancelled enrolment stops counting as reach

## 32. Translations *(7.4 — built, switched off)*

- [ ] 32a — `/admin/translations`
- [ ] 32b — Says plainly that French is not live, and why
- [ ] 32c — Every published item listed, grouped by type
- [ ] 32d — Counts are honest (0 of 30)
- [ ] 32e — "Add it" opens the right editor
- [ ] 32f — French fields appear beside the English
- [ ] 32g — Save a partial translation → allowed
- [ ] 32h — Clear every field → falls back to English

## 33. Newsletter sync *(7.5 — built, switched off)*

- [ ] 33a — `/admin/newsletter-sync`
- [ ] 33b — Says plainly no campaign tool is connected
- [ ] 33c — Subscriber counts correct
- [ ] 33d — Sync button hidden while unconfigured
- [ ] 33e — Editor cannot reach this page (admin only)

## 34. Users *(admin only)*

- [ ] 34a — `/admin/users`
- [ ] 34b — Invite a staff member
- [ ] 34c — Change a role
- [ ] 34d — Remove someone
- [ ] 34e — You cannot demote or remove yourself

---

# PART 4 — INSTRUCTOR

## 35. Instructor workspace

- [ ] 35a — Sign in as `demo.instructor@srn.test`
- [ ] 35b — `/admin/teaching` loads
- [ ] 35c — Only their assigned cohorts appear
- [ ] 35d — Work waiting to be marked, oldest first
- [ ] 35e — Mark a submission
- [ ] 35f — Cohort figures for their cohorts
- [ ] 35g — No assignments → an honest empty state
- [ ] 35h — **`/admin` → refused**
- [ ] 35i — **`/admin/courses` → refused**
- [ ] 35j — **`/admin/certificates` → refused**
- [ ] 35k — **Cannot mark work from a cohort they do not teach**

---

# PART 5 — CROSS-CUTTING

## 36. Responsive — check at 360 / 768 / 1440

- [ ] 36a — No horizontal scroll on any page
- [ ] 36b — Course player readable on a phone
- [ ] 36c — Admin tables usable on a phone
- [ ] 36d — Forms usable on a phone
- [ ] 36e — Images scale, none overflow

## 37. Keyboard and screen reader

- [ ] 37a — Tab reaches every control
- [ ] 37b — Focus is always visible
- [ ] 37c — Forms submit on Enter
- [ ] 37d — Skip link works
- [ ] 37e — Every image has alt text or is decorative
- [ ] 37f — One `<h1>` per page

## 38. Design consistency

- [ ] 38a — **No gold anywhere**
- [ ] 38b — **Green only on buttons, icons and focus rings — never on text**
- [ ] 38c — Sharp corners (only `Tag` is rounded)
- [ ] 38d — Plain white, not cream
- [ ] 38e — Same fonts throughout
- [ ] 38f — **No `[PLACEHOLDER]` anywhere**
- [ ] 38g — **No `href="#"` anywhere**
- [ ] 38h — Every empty state is a real sentence

## 39. Errors and edge cases

- [ ] 39a — A made-up URL → 404 page
- [ ] 39b — 404 offers a way back
- [ ] 39c — Slow network → no broken layout
- [ ] 39d — Back button behaves after a form submit
- [ ] 39e — Refresh after submitting → no duplicate

## 40. Security — the ones worth trying to break

- [ ] 40a — Signed out, open any `/admin` URL → refused
- [ ] 40b — Signed out, open `/account` → refused
- [ ] 40c — Learner opens an admin URL → refused
- [ ] 40d — Editor opens `/admin/users` → refused
- [ ] 40e — Instructor opens another cohort's roster → refused
- [ ] 40f — Open a lesson file URL while not enrolled → 404
- [ ] 40g — Open someone else's application document → 404
- [ ] 40h — Quiz answers not in the page source
- [ ] 40i — A live session join link not in the source before the window
- [ ] 40j — A draft course invisible to the public
- [ ] 40k — A draft event's custom questions invisible to the public

---

# APPENDIX — every route

## Public

`/` · `/about` · `/team` · `/impact` · `/impact/[slug]` · `/faq` · `/privacy` ·
`/terms` · `/contact` · `/partner` · `/partner/thank-you` · `/programmes` ·
`/programmes/[slug]` · `/programmes/mentorship` · `/programmes/apply` ·
`/resources` · `/resources/[slug]` · `/news` · `/news/[slug]` ·
`/news/events/[slug]` · `/news/events/[slug]/registered` · `/academy` ·
`/academy/[course]` · `/verify` · `/verify/[code]` · `/unsubscribe` ·
`/styleguide` · `/styleguide/components`

## Learner

`/academy/sign-up` · `/academy/sign-in` · `/academy/verify` · `/academy/forgot` ·
`/academy/reset` · `/account` · `/account/applications` ·
`/account/applications/documents/[id]` · `/academy/enrol/[course]/[cohort]` ·
`/academy/enrol/[course]/[cohort]/complete` ·
`/academy/learn/[course]/[cohort]` · `/academy/learn/[course]/[cohort]/[lesson]` ·
`/academy/learn/[course]/[cohort]/[lesson]/files/[material]` ·
`/academy/learn/[course]/[cohort]/assessments/[assessment]` ·
`/academy/learn/[course]/[cohort]/sessions/[session]/join`

## Staff

`/admin/login` · `/admin/login/forgot` · `/admin/reset` · `/admin` ·
`/admin/account` · `/admin/search` · `/admin/[resource]` ·
`/admin/[resource]/new` · `/admin/[resource]/[id]` · `/admin/media` ·
`/admin/operations` (+ `/registrations` `/applications` `/applications/[id]`
`/newsletter` `/contact` `/donations`) · `/admin/courses` · `/admin/courses/new` ·
`/admin/courses/[id]` · `/admin/courses/[id]/cohorts/[cohortId]` ·
`/admin/courses/[id]/curriculum` (+ `/modules/[moduleId]`
`/modules/[moduleId]/lessons/new` `/lessons/[lessonId]`) · `/admin/grading` ·
`/admin/certificates` · `/admin/reporting` · `/admin/translations` ·
`/admin/newsletter-sync` · `/admin/users`

`[resource]` = events · news · team · resources · testimonials · partners · programmes

## Instructor

`/admin/teaching`

## API and background

`/api/academy/certificate/[code]` · `/api/admin/export/[table]` ·
`/api/admin/media` · `/api/admin/roster/[cohortId]` ·
`/api/admin/submission/[id]` · `/api/admin/application-document/[id]` ·
`/api/paystack/webhook` · `/api/webhooks/campaign` ·
`/api/cron/event-reminders` · `/api/cron/expire-registrations`

---

**Totals:** 68 pages · 86 server actions · 14 API routes · ~400 checks above.
