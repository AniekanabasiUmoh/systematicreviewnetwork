# SRN feature test checklist for Fortune

https://systematicreviewnetworkwebsite2.vercel.app. 


customer@test.com / 12345
admin@test.com / 12345

## Direct test links

- [Public homepage](https://systematicreviewnetworkwebsite2.vercel.app)
- [Academy catalogue](https://systematicreviewnetworkwebsite2.vercel.app/academy)
- [Learner sign-up](https://systematicreviewnetworkwebsite2.vercel.app/academy/sign-up)
- [Learner sign-in](https://systematicreviewnetworkwebsite2.vercel.app/academy/sign-in)
- [Learner account](https://systematicreviewnetworkwebsite2.vercel.app/account)
- [Admin sign-in](https://systematicreviewnetworkwebsite2.vercel.app/admin/login)
- [Admin dashboard](https://systematicreviewnetworkwebsite2.vercel.app/admin)
- [Admin courses](https://systematicreviewnetworkwebsite2.vercel.app/admin/courses)
- [Admin operations](https://systematicreviewnetworkwebsite2.vercel.app/admin/operations)

## 1. Visitor-facing website

- [ ] **Home and navigation:** Open the site on desktop and mobile. Every header/footer link should open the correct page; the mobile menu should open, close, and not cover the page unexpectedly.
- [ ] **About, Team and Impact:** Read each page, open an impact story, and confirm images, links and back navigation work.
- [ ] **Programmes:** Open the programme list and each programme. Check the details, calls to action and the mentorship page.
- [ ] **Programme application:** Submit a clearly marked test application. You should receive a confirmation and the application should appear in Admin > Registrations & submissions > Applications.
- [ ] **Academy discovery:** Open Academy from the header and footer, view the course card, and open the course detail page.
- [ ] **Resources:** Search/filter the library, open a resource, download or follow its source link where provided, and check pagination/filter reset behaviour.
- [ ] **News and events:** Filter the listing, open an article and an upcoming event, and confirm closed events are labelled closed and cannot be registered for.
- [ ] **Event registration:** Register for a free event with a test email. You should see a confirmation and the record should appear in Admin > Operations > Registrations. For paid events, only test the Paystack payment path with an approved test transaction.
- [ ] **Contact:** Send a clearly labelled test message. Confirm the thank-you state and that it reaches Admin > Operations > Contact.
- [ ] **Newsletter:** Subscribe a test address, confirm the verification email/link, then test unsubscribe. Check the record in Admin > Operations > Newsletter.
- [ ] **Partner and donation flow:** Check the partnership form and thank-you page. Do not make a real donation/payment unless intentionally approved.
- [ ] **Legal and error states:** Open Privacy, Terms and FAQ. Also try a deliberately invalid URL: it should show the helpful 404 page, not a technical error.

## 2. Learner Academy

- [ ] **Sign up:** Create a new learner account with a real inbox. The site should request email verification; the verification link should activate the account.
- [ ] **Sign in and out:** Sign in with the verified account, sign out, and sign in again. A protected Academy link should return the learner to the intended page after sign-in.
- [ ] **Password recovery:** Request a reset, use the email link, set a new password, then sign in with it.
- [ ] **Account:** Check profile details, update a non-sensitive field, save, refresh and confirm the change remains.
- [ ] **Course enrolment:** Enrol in a free cohort. The enrolment confirmation should take the learner to the course player and the course should appear in their account.
- [ ] **Course player:** Open a lesson, use the next/previous controls, mark it complete, refresh, and confirm progress persists.
- [ ] **Learning gates:** Confirm later modules/lessons remain locked until the prerequisite material is complete, and that the learner sees a clear explanation.
- [ ] **Assessment:** Complete an available quiz/assignment as a test learner. Check submission, feedback/result, and the grading view for staff.
- [ ] **Completion and certificate:** Complete a testable course path, obtain the completion/certificate outcome, and use the public certificate-verification page with its code.
- [ ] **Application documents:** Where an Academy programme requests documents, upload a non-sensitive test file, check it appears in the learner account and is visible to staff.

## 3. Administrator workspace

- [ ] **Admin sign-in:** Sign in at `https://systematicreviewnetworkwebsite2.vercel.app/admin/login` with an authorised staff account. The dashboard must load and show the correct role/name. Sign out afterwards.
- [ ] **Dashboard and search:** Open the dashboard shortcuts and search for existing content. Results should lead to the correct editor.
- [ ] **Programmes:** Create a draft programme, edit it, confirm it remains hidden while draft, then archive/delete the test record.
- [ ] **Courses:** Create a draft course, edit its title/summary/learning outcomes, save, refresh, and confirm the change persists. Add a test cohort only if you intend to test dates/pricing; delete an empty test course or archive a course that has cohorts.
- [ ] **Curriculum:** In a test course, add/edit/reorder a module and lesson, preview it as a learner, then remove the test content.
- [ ] **Cohorts:** Check cohort dates, enrolment opening/closing, capacity, free/paid price, publish/draft state, duplication and archive controls. Never delete a cohort with learners; archive it instead.
- [ ] **Marking and certificates:** Open the grading queue, a learner submission, certificate issuance and reporting. Verify filters/exports before using them with real records.
- [ ] **Events, news and resources:** For each type, create a draft, edit rich text/image/link fields, preview it publicly after publishing, then archive/delete the test record.
- [ ] **Team, partners and testimonials:** Add/edit one draft/test record for each. Confirm logo/image selection and public display only after intentional publication.
- [ ] **Media library:** Upload a disposable test asset, copy/use its URL in a draft item, then delete the test asset if it is no longer referenced.
- [ ] **Operations:** Review registrations, applications, contact messages, newsletter subscribers and donations. Test filters and CSV exports using safe data; do not alter a real applicant’s status during QA.
- [ ] **People and permissions:** In Staff access, invite or create a temporary test editor, confirm editor access is limited appropriately, then remove the test staff account.
- [ ] **Translations and newsletter sync:** Check the status screens, validation messages and a non-production/test sync only. Do not overwrite a live campaign or translation without review.
- [ ] **Admin account and recovery:** Update a non-sensitive profile field, sign out/in, and test the password-recovery journey with an account you control.


## Test-result note

Record any issue with: page URL, account role, exact steps, expected result, actual result, screenshot and time. This makes it possible to reproduce and fix quickly.
