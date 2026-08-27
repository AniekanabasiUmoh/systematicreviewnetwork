# Systematic Reviews Network website audit

**Target reviewed:** `https://systematicreviewnetworkwebsite2.vercel.app`  
**Date:** 29 July 2026  
**Scope:** read-only customer, learner, public-content, design, and staff-admin review. No production records, payments, enquiries, registrations, accounts, or settings were changed.

## Executive summary

This is a visually strong, unusually coherent institutional site. The public experience has a clear visual system, good real photography, readable type hierarchy, accessible semantic structure, and a mobile menu that works correctly. Core public routes and every currently published programme, event, news, and resource detail route sampled in this audit returned `200`.

However, it is **not ready to rely on for organic acquisition**. The deployment tells search engines not to index or follow *every page*, and it has neither `robots.txt` nor a sitemap. The Academy is also effectively hidden from a prospective learner: it is absent from the main navigation and homepage pathways even though a live course and enrolment flow exist. Finally, event availability can present contradictory information at the key decision point.

## Remediation update - 29 July 2026

The critical and high-priority application defects in this report were fixed and deployed after the audit:

- Public pages are now indexable; `/robots.txt` and `/sitemap.xml` are live. Private admin, account, enrolment and learner routes remain excluded.
- `Academy` is now in the header, footer and homepage journey. The published course and cohort use professional public slugs, with permanent redirects from the old demo URLs.
- Closed event capacity is no longer displayed, and closed future events are excluded from the default homepage and upcoming-events lists.
- University of Lagos now has its official partner URL in the live partner record.
- The staff mobile route rail has been replaced with a grouped, scrollable menu drawer.

The remaining content recommendation is intentionally not automated: SRN should replace the anonymous testimonial with named, permissioned learner evidence when that consented material is available.

## Findings requiring action

| Priority | Finding | Why it matters | Recommended action |
|---|---|---|---|
| **Critical** | All pages are emitted with `noindex, nofollow`; `/robots.txt` and `/sitemap.xml` each return 404. | Google and other search engines are instructed not to index the public site or follow its links. The missing sitemap further reduces discoverability. | Remove the root-level noindex rule for launch/public pages; retain noindex only for admin, account, enrolment, verification, thank-you, and styleguide routes. Add `app/robots.ts` and `app/sitemap.ts`, submit the sitemap in Search Console, and verify the rendered production meta tags after deployment. |
| **High** | SRN Academy and learner account are not discoverable from the public header/footer or homepage. | A user cannot reasonably find the course catalogue, sign in, or return to learning unless they already have a direct URL. This wastes the live Academy and leaves the enrolment funnel dependent on an external link. | Add a prominent, restrained `Academy` route in the public navigation and footer; add an account/sign-in state once signed in; link relevant programme cards and course CTAs to the appropriate Academy offer. Keep the distinction clear: programme marketing vs. the learning workspace. |
| **High** | “Systematic Reviews Mentorship Programme — Intake 2” displays `Registration closed` while also showing `15 of 15 places left`. | The maths is accurate but the message is contradictory to a customer. It implies a person can take one of 15 seats, then blocks them. The live data confirms registration closed on 22 July while capacity is 15 and no seat is taken. | When a registration window is closed/not yet open, suppress the vacancy meter and show a reason plus next action: “Registration closed on 22 July. Join the newsletter for the next intake.” Add a waitlist only if staff intend to use one. |
| **Medium** | Mobile staff navigation is a single horizontal strip containing more than a dozen destinations. | On a phone, non-technical staff must horizontally scroll to find content, courses, marking, reporting, events, operations, etc. It is harder to scan than the well-grouped desktop sidebar. | Replace the horizontal strip with a menu/drawer or expandable grouped sections matching desktop. Keep Overview and the current section visible; place account/sign-out at the bottom. |
| **Medium** | The Academy’s course catalogue contains one obviously demo-named course and cohort (`demo-systematic-review-methodology`, `demo-cohort`). | It is publicly visible and enrolment is open. “Demo” undermines institutional trust and can make a real learner wonder whether the course/certificate is genuine. | Before promotion, rename and replace demo seed data, or make it draft/private. Do a complete learner run-through with a disposable account. |
| **Medium** | The homepage and news listing promote events that may be closed/full without a clear status in the homepage index. | The homepage lists the mentorship intake as an “Upcoming event” with no closed-state signal. A user only learns the bad news after opening it. | Include status in homepage event rows, or exclude closed/full events from the default “Upcoming” selection and link to them only as past/closed items. |
| **Low** | The public experience is polished, but credibility content is still thin in places. The homepage testimonial is anonymous (“Workshop participant”), and partner presentation is inconsistent (two linked partners, University of Lagos as an unlinked logo). | For a research/training organisation, named, permissioned outcomes and consistently verifiable partners are stronger trust evidence than generic claims. | Add 2–3 attributed testimonials/case studies with role, country, programme and consent; link each partner logo only where a verified relevant destination exists, otherwise present all consistently as non-links. |
| **Low** | `npm run lint` succeeds with 66 warnings (mostly unused variables, including learner/course code). | This does not break the site, but it masks future useful warnings and signals unfinished cleanup in a high-growth codebase. | Resolve or intentionally suppress the warnings, then make CI treat new warnings as regressions. |

## Design and ease-of-use assessment

### What is working well

- The visual direction feels credible and deliberate: the restrained ink/white/slate palette, Archivo display type, real workshop photography, hairline rules, and sharp-card treatment fit an international evidence organisation.
- The homepage has a good narrative order: mission, proof, explanation, programmes, events, resources, then conversion. It does not feel like a generic template or an overcrowded card catalogue.
- Content hierarchy is strong. Page titles, section headings, short explanatory copy, and clear calls to action make the subject approachable for beginners without diluting the organisation’s authority.
- The site uses meaningful image alt text, one visible page H1, a skip link, labelled form fields, and a real dialog for the mobile menu. The 360px mobile header/menu opened, trapped attention appropriately, and closed with Escape.
- Registration and payment copy is reassuring: users are told whether an event is free, whether payment is required, and that Paystack handles card details.
- The admin desktop navigation is thoughtfully grouped, with clear separation among content, people/community, library, operations, and staff access.

### Design improvements worth planning

1. Surface the Academy as a first-class customer journey without turning the header into a crowded product menu.
2. Replace anonymous proof with specific, consented proof: a learner name/role/country, a before-and-after outcome, and a link to an impact story.
3. Treat state as design: closed, opening soon, full, paid, free, and waitlist states need as much visual/editorial care as the open-registration state.
4. Give staff the same calm, low-friction navigation experience on mobile as on desktop; a wide horizontal route rail is an implementation convenience rather than an operationally good interface.

## Page-by-page review

| Area | Result | Notes |
|---|---|---|
| Home | Pass with improvements | Strong storytelling and conversion hierarchy. Newsletter UI, programme/event/resource links, partner links, and mobile menu render. Add Academy discovery and event state labels. |
| About | Pass | Clear history, mission, values and leadership preview. It reads credibly and uses real imagery. |
| Programmes + all 5 programme details | Pass | All routes returned 200. The hub is easy to scan. Connect each marketing programme more explicitly to the appropriate available event/course/application action. |
| Resources + 10 listed resource details | Pass | Category filters are clearly labelled and route-based; sampled filter links and all listed detail routes returned 200. Replace generic “Details” labels with “Read”, “Download”, or “Watch” where the destination type is known. |
| Impact | Pass (visual/content review) | Clear high-level proof approach. Add deeper attributed stories/downloadable evidence as content becomes available. |
| Team | Pass (visual/content review) | Consistent person-card presentation. Complete affiliations and verified professional links where appropriate. |
| News & Events + 6 published event details + 3 news details | Pass with high-priority state correction | Filters, past/upcoming concept, detail routes, free and paid registration forms are present. The closed-with-empty-capacity message is misleading. |
| Contact | Pass, negative-path tested | Required fields receive native validation and no invalid request was made. A valid send was intentionally not performed to avoid sending a production enquiry. |
| Partner + donation | Pass, non-destructive review | Partnership enquiry and donation forms are clear and well-labelled. A live payment/enquiry was intentionally not initiated. Add a short donation transparency link/report when available. |
| FAQ, Privacy, Terms | Route pass | Each route returned 200. They should remain reviewed whenever processes, payments, cookies, or data retention change. |
| Academy catalogue/course | Functionally reachable but poorly discoverable | Catalogue and course detail returned 200; the protected enrol route correctly redirected a signed-out learner to sign-in and preserved `next`. Public promotion/navigation needs fixing, and demo content must not look live. |
| Learner account | Gate pass | Signed-out `/account` redirected correctly to learner sign-in with a return URL. Authenticated profile, enrolment, lessons, assessment, certificate, and recovery completion were not exercised without a dedicated test learner. |
| Admin sign-in | Gate/UI pass | Login and password-recovery entrypoint render. Admin dashboard, content CRUD, media, exports, operations, user roles, teaching and grading were assessed from the protected code and automated tests, not changed in production. |

## Functional evidence

- Core public routes tested live: Home, About, Programmes, Resources, Impact, Team, News, Contact, Partner, FAQ, Privacy, Terms and Academy — all returned `200`.
- Detail routes tested live: 5 programme pages, 10 resource pages, 6 published event pages, and 3 news pages — all returned `200`.
- Public route protections tested: `/admin` redirects to staff login; `/account` and protected Academy enrolment redirect to learner sign-in with the intended return URL.
- Mobile test at 360px: public menu opens as a labelled dialog and closes using Escape.
- Browser console: no error-level messages during the audited public journeys.
- Contact form empty-submit: browser focuses the first required input; no invalid network submission was made.
- Code quality: TypeScript typecheck passed. ESLint completed with warnings but no errors. The Vitest suite was started against the live configured backend; the available output showed its RLS/security checks running successfully, but the runner did not provide a final summary in this environment, so it is not recorded as a complete green suite.

## Staff/admin review boundary

The environment provided operational configuration but no authorised staff test account. I did **not** create an account, alter roles, submit content, upload media, issue certificates, send campaign email, process payments, or change any production data. The code review shows server-side staff role checks, admin-only checks for staff access, whitelisted form fields, rich-text sanitisation, audit logging, and safeguards against deleting programmes/events that have applications/registrations. These are positive implementation signals, not a substitute for a separate authenticated acceptance test.

## Recommended order of work

1. Fix indexability and ship `robots.txt` + sitemap; verify production metadata and Search Console.
2. Correct event-state messaging and decide the closed-intake/waitlist policy.
3. Make Academy/account discovery intentional, replace demo content, and test the complete learner path with a disposable learner.
4. Redesign staff mobile navigation and conduct an authenticated acceptance test for every staff role.
5. Tighten trust content and clean lint warnings.

## Authenticated acceptance-test update — 29 July 2026

Temporary QA accounts and clearly labelled draft courses were used in production, then removed. No QA course, cohort, learner or staff account remains.

- **Learner Academy:** sign-up, verification state, sign-in, preserved return URL, free enrolment, learner course player, progress view and initial lesson gating all passed.
- **Admin:** staff sign-in, admin role gating, dashboard, course creation, save, edit and deletion all passed.
- **Admin deletion UX:** an empty course originally deleted correctly but left staff on a 404 URL. This was corrected with a server-side redirect to `/admin/courses`, deployed, and retested live successfully.
- **Not represented as complete:** paid checkout, live email delivery, password-reset email delivery, document upload, every assessment type, certificate issuance, all content CRUD types, exports, third-party newsletter sync and staff-editor permissions still need the deliberate one-by-one acceptance checks in `FORTUNE_TEST_CHECKLIST.md`.
