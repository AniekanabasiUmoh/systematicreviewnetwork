# Legacy WordPress Content Migration Plan

Date: 1 September 2026  
Sources: `cgi-bin.zip` and `localhost.sql` (local only; never commit or deploy)  
Status: Phases 0–7 implemented and verified; Phase 8 complaint backlog remains for a separate hardening sprint

Source integrity:

- `cgi-bin.zip` SHA-256: `A15157435469861C074618E64C807063E78DD7D492A08928D12D89FC6AC29D94`
- `localhost.sql` SHA-256: `B6F33200D7C28EF8DC2D600CC69148170BC17D32EB4633428FE91ADB3FE85275`

## Executive conclusion

The recovery is now substantially complete. `cgi-bin.zip` supplies the WordPress filesystem—about 24,900 files and 587 MB uncompressed—while the 57 MB `localhost.sql` dump supplies the structured database content that was previously missing.

Together they provide images, documents, pages, posts, complete team biographies, team-group relationships, events, attachments, taxonomies, comments, forms, quiz content/results, users, and plugin records. `wordpress-export/inventory.json` remains useful as an independent snapshot of what was publicly visible.

This should be a complete, classified migration rather than a wholesale WordPress restoration. Public editorial material should move through the new admin; administrative and learner records should move into access-controlled storage; WordPress runtime code, credentials, caches, and security logs should be preserved only in the offline source backup. Public-facing imported records should begin as drafts.

## Evidence reviewed

- 24,903 archive entries; approximately 294 MB compressed and 587 MB uncompressed.
- 928 PNG, 399 JPG, 84 JPEG, 16 WebP, and 183 PDF files, mainly from 2023–2026.
- WordPress core, Hestia, Elementor, Events Calendar, Event Tickets, QSM, WPS Team, Wordfence, UpdraftPlus, and other plugins.
- `wp-config.php` contains secrets and points to a local database host; it cannot recover the database remotely.
- `localhost.sql` is a phpMyAdmin export generated on 1 September 2026 from MySQL 8.0.46. It includes core WordPress tables plus WPS Team, The Events Calendar, Forminator, QSM quiz/results, WooCommerce, user, comment, and security/plugin tables.
- The dump contains personal data, password hashes, IP addresses, form entries, quiz results, and security records. It must remain Git-ignored and must be parsed only into deliberately scoped destinations.
- The prior repository inventory identifies 191 usable non-stock images, including 29 hero, 5 event-photo, and 74 portrait/headshot candidates.
- The new admin already manages media, team, testimonials, news, events, resources, programmes, and pages.

## High-value recovered material

### Team portraits

Clearly named portraits exist for Fortune Effiong, Julia Ribeiro, Roseline Dzekem Dine, Prof. Ejaz Ahmad Khan, Adekunle Adeleke, Frank Kyei Arthur, Kingsley Achi, Edward Mawejje, Nafisa Elehamer, Moses Asori, Ngozi Osadebe, Jamila Atata, Md Atiqur Rahman Mollick, Emmanuella Adebayo, Precious Nengak, Ify Obim, Chukwuagoziem Iloanusi, Wazhi Binlak, Aladejana Abdulrahman, Gaspard Junior Ayissi, and others. Several were visually checked and are good professional portraits. Each still needs identity, current-membership, and publication review.

### Workshops, conferences, and programmes

Large sets of `DSC_*`, `IMG_20221208_*`, `photo_*`, and 2026 `Workshop-*` images provide authentic alternatives to stock photography. Event artwork covers webinar series, practical courses, mentorship, beginner training, recruitment, and workshops.

Some photos contain historic ACSRM or AuthorAid branding. Keep that context where historically accurate; crop only for composition and never misleadingly erase an old partnership. Current partner sections must continue to use Rising Scholars.

### Testimonials

Files whose names include `testimonial`, `client`, or `quote` did not prove to contain testimonials during visual inspection; several are blank assets or logos. A photograph is not evidence of a quote. Only publish a testimonial after its exact text, identity, role, image match, and publication basis are verified. Existing provisional testimonials should be replaced once authentic records are ready.

### Public and restricted PDFs

All 183 PDFs are included in scope. Public SRN guides, templates, reports, and teaching material belong in Resources after review. QSM-generated participant certificates should also be preserved and migrated, but into a private administrative/learner document library with authenticated access and auditability. They must not be committed to Git or placed in a public storage bucket.

## Content mapping

| Legacy material | New destination | Rule |
| --- | --- | --- |
| Named portraits | Media + Team | Deduplicate, optimize, add alt text, and link only after identity review. |
| Team names/roles/text | Team | Import current people; preserve accurate roles and groups. |
| Programmes and Communications committees | Team groups | Extend the group model instead of forcing inaccurate categories. |
| Workshop/conference photos | Media, Impact, News, Events | Group by event and select representative images, not every near-duplicate. |
| Flyers and announcements | Events or News | Preserve original dates and remove expired registration actions. |
| Old posts | News | Import as drafts with original dates, excerpts, bodies, and suitable images. |
| Old page copy | Pages/About/Impact | Reconcile with newer approved copy; never overwrite automatically. |
| Course/mentorship material | Programmes/Academy | Enrich content while retaining current canonical enrolment journeys. |
| Public guides/templates/reports | Resources | Confirm ownership, version, accessibility, and metadata. |
| Webinar media | Events/News/Resources | Upcoming sessions use Events; recordings become resources. |
| Authentic quotes | Testimonials | Require traceable text, identity, photograph, and permission basis. |
| Certificates | Private documents | Preserve every file, match it to the database result/learner where possible, and store behind authenticated access. |
| Forms, quiz results, and user records | Private administration/learner archive | Migrate the useful record and provenance under least-privilege access; do not expose it publicly. |
| WordPress core/theme/plugins/logs/cache | None | Do not migrate. |

## Source-of-truth order

1. Current explicit SRN instruction or approved content.
2. Current structured site content and correction register.
3. Recovered public old-site text and dated media.
4. Filename or visual inference, clearly marked unverified.

Older material must not regress the canonical Beginner Academy enrolment journey, webinar discovery through Events, Rising Scholars identity, or the planned “Building research capacity in Africa” impact entry.

## Phased delivery

### Phase 0 — Secure and catalogue

#### Sprint 0.1: Quarantine and manifest

- Keep the ZIP local and Git-ignored.
- Record a SHA-256 checksum and archive statistics without copying secrets.
- Inventory the complete database and every PDF. Route public content to the website, restricted records to private storage, and obsolete runtime/security material to the preserved offline backup.
- Never extract the whole archive or SQL dump into the repository or a public storage bucket.

**Done when:** both sources are reproducibly identified and every category has an explicit public, restricted, offline-preservation, or discard-after-verified-backup destination.

#### Sprint 0.2: Media inventory and deduplication

- Separate original uploads from generated thumbnails.
- Hash exact duplicates and review near-duplicates by dimensions/content.
- Classify team, event, workshop, partner, resource, testimonial-candidate, stock/demo, certificate, and restricted files.
- Produce a review sheet with thumbnail, date, proposed use, rights state, and decision.

**Done when:** every candidate has a category and selected/rejected state.

#### Sprint 0.3: Text manifest

- Extract authoritative posts, pages, team members, team groups, events, attachments, and relevant metadata from `localhost.sql`.
- Reconcile those records against the 13 posts and 7 pages in `wordpress-export/inventory.json`.
- Record original IDs/URLs, titles, dates, bodies, relationships, media, status, and proposed destination.

**Done when:** every relevant structured record has a destination, preservation rule, or documented rejection reason.

### Phase 1 — Authentic media library

Progress as of 2 September 2026: Sprint 1.1 has imported and linked two reviewed portraits (Nafisa Elehamer and Moses Asori). Sprint 1.2 has imported three reviewed workshop photographs as unassigned Media assets. Kingsley's illustrated avatar and Edward Mawejje's low-quality selfie are held for review; no matching named portraits were found for Leonard Uzairue or Uzma Kazmi. See `wordpress-export/phase1-selected-media.json`.

#### Sprint 1.1: Team portraits

- Select the best original per current member.
- Confirm mapping and current status.
- Make consistent non-destructive crops, optimize, and write useful alt text.
- Upload through Media and connect to team records.

**Done when:** every confirmed member with a recovered portrait has a correctly labelled image.

#### Sprint 1.2: Workshop and conference media

- Group files by event using dates, sequences, visible banners, and post context.
- Select hero/gallery images and reject blurred or redundant frames.
- Replace stock only where a stronger authentic SRN image exists.

**Done when:** public sections have a coherent, performant, rights-reviewed SRN image set.

### Phase 2 — Reconstruct the team

Progress as of 2 September 2026: Sprint 2.1 is implemented live. The team
enum includes Programmes Committee and Communications Team, the admin editor
offers both groups, the public Team page renders them, and Nafisa Elehamer is
correctly classified under Programmes.

Sprint 2.2 first recovered seven biographies for people already present in the
current roster, then published twelve additional records because the export
explicitly assigned six to Programme Committee and six to Communications Team.
Those twelve have recovered biographies and portraits wherever a matching
asset existed; Chukwuagoziem Iloanusi still needs a portrait. All are now
editable on the live site for Fortune's membership and role corrections. The
source IDs, mappings, and photo decisions are recorded in
`wordpress-export/phase2-team-bios-audit.json`.

#### Sprint 2.1: Structure

- Add accurate groups for Programmes Committee and Communications Team alongside Executive, Scientific, Country Leads, and Mentors/Facilitators.
- Define ordering and multiple memberships. If needed, use a membership relation rather than duplicate people.

**Done when:** admin and public pages represent the organisation without misclassification.

#### Sprint 2.2: Profiles

- Reconcile recovered names, roles, affiliations, and descriptions with current records.
- Add missing confirmed people; remove nobody solely because one source omits them.
- Populate verified bios, LinkedIn/ORCID links, and portraits.
- Give Julia Ribeiro's requested update a specific editorial check.

**Done when:** all confirmed profiles pass person-by-person review.

### Phase 3 — Authentic testimonials

Progress as of 2 September 2026: the supplied Joy (Uganda) and Joseph
(Uganda) quotes were reconciled against the live structured testimonial rows.
Both canonical records were already present, so duplicate import rows were
removed. The testimonial renderer now has no placeholder-image records: all 13
published testimonials are deliberately text-only until a participant portrait
is explicitly matched and cleared. Evidence and the cleanup decision are
recorded in `wordpress-export/phase3-testimonials-audit.json`.

#### Sprint 3.1: Recover and verify

- Use OCR and manual review to find exact quotes, names, roles, and faces in artwork.
- Cross-reference database post/meta records, recovered artwork, and public SRN social posts.
- Record the source and permission/publication basis.
- Never infer a quote from a participant photo.(Actually you can, and should if it allows for it)

#### Sprint 3.2: Publish structurally

- Import verified records as drafts.
- Reuse structured testimonials across homepage, Impact, and Mentorship.
- Remove provisional invented records as authentic replacements become ready.

**Done when:** every visible quote is traceable and no placeholder represents a real person.

### Phase 4 — News and events archive

Progress as of 2 September 2026: Sprint 4.1 and the first pass of Sprint 4.2
are complete as a controlled draft import. Thirteen published WordPress posts
and fourteen published Events Calendar records were parsed into the current
`news` and `events` tables with legacy-prefixed slugs, source dates, cleaned
rich-text bodies, and event start/end metadata. All 27 imported rows remain
`draft`; no expired registration action, legacy image, or uncertain recording
was exposed publicly. The import is idempotent and audited in
`wordpress-export/phase4-archive-audit.json`.

#### Sprint 4.1: Import old posts

- Classify event announcements, programme updates, recruitment, history, and evergreen news.
- Import original dates and suitable recovered artwork.
- Edit only for clarity, expired-state safety, and broken links; preserve meaning.

#### Sprint 4.2: Past events

- Create records where date, place, description, and media are reliable.
- Connect announcements, event pages, galleries, and recordings.
- Prevent past events from showing misleading Apply/Enroll/Register actions.

**Done when:** the archive is browsable and upcoming Events remain the live webinar source.

### Phase 5 — Resources, publications, and webinars

Progress as of 2 September 2026: all 183 recovered PDFs are accounted for in a
private `private_documents` catalogue (181 QSM certificates and two other
restricted PDFs). The original ZIP was not extracted or uploaded. A private
`wordpress-private-documents` bucket now exists for deliberate, authenticated
future uploads. The four verified DOI publications were reconciled without
duplicates, and the supplied Beginner webinar is published as an external
YouTube resource. See `wordpress-export/phase5-private-documents-audit.json`.

#### Sprint 5.1: Safe resource triage

- Separate public educational files from certificates and other restricted records without dropping either category.
- Match certificates to QSM result IDs, learner identity, quiz/course, and issuance date where the database permits.
- Store restricted files in a private bucket with signed/authenticated delivery, admin access controls, and an access log.
- Check ownership, author, date, accessibility, and newer versions.
- Import approved files with meaningful metadata.

#### Sprint 5.2: Publications and DOI reconciliation

- Compare recovered material with existing DOI/publication records.
- Add only missing verified records and prefer authoritative DOI/publisher links.

#### Sprint 5.3: Webinar library

- Match webinar posts/artwork to confirmed recordings.
- Add the strongest three to five first, then expand.
- Keep future webinars in Events and recordings in Resources.

**Done when:** public resources are useful and non-duplicative, and all restricted PDFs are preserved, matched where possible, and accessible only to authorized users.

### Phase 6 — Evidence-led impact stories

Progress as of 2 September 2026: the two recovered impact-story bodies and the
planned “Building research capacity in Africa” entry are visible only as
non-clickable Coming soon items. Direct story URLs return 404 and the sitemap
contains no unpublished impact entries. This keeps evidence-thin copy out of
the public narrative while preserving it for editorial review in Admin. See
`wordpress-export/phase6-impact-audit.json`.

#### Sprint 6.1: Workshop and country stories

- Combine verified post text, event facts, and selected photography.
- Cover network history, the Ghana workshop, mentorship, practical courses, and other supported work.
- State numbers only when their source is recorded.

#### Sprint 6.2: Malaria and research-capacity stories

- Use recovered material only when it supports the story directly.
- Where evidence is thin, publish a short general description or retain “Coming soon”; do not invent outcomes.
- Keep “Building research capacity in Africa” planned until sufficient material is approved.

**Done when:** every impact claim has a clear evidence trail.

### Phase 7 — Redirects, accessibility, QA, and handover

Progress as of 2 September 2026: permanent redirects cover legacy Events,
single-event, WPS Team, QSM quiz, and category paths. The public route sweep
passed, the webinar link resolves from Resources, drafts remain absent from
public News, all rendered images in the homepage have alt text, and responsive
smoke checks passed from 360px through 1440px. See
`wordpress-export/phase7-verification.json` and
`FORTUNE_MAINTENANCE_CHECKLIST.md`.

#### Sprint 7.1: URLs and SEO

- Map useful legacy URLs to new destinations and add permanent redirects.
- Preserve sensible dates, titles, descriptions, and social images.
- Include only public canonical pages in the sitemap.

#### Sprint 7.2: Accessibility and performance

- Write human alt text, not filenames.
- Check contrast, focus, headings, keyboard access, responsive sizing, and gallery performance.

#### Sprint 7.3: System-wide verification

- Test admin create/edit/publish flows for every imported content type.
- Test desktop/mobile pages, media, filters, downloads, redirects, expired CTAs, and broken links.
- Verify drafts remain private and restricted storage cannot be accessed anonymously.
- Give Fortune a short maintenance checklist for team, news, events, resources, programmes, and testimonials.

**Done when:** acceptance checks pass, public and restricted content are both accounted for, restricted content is not publicly exposed, and Fortune can maintain the migrated system.

## Complaint-driven findings and phase assignments (2 September 2026)

These items were investigated against the current local build and the supplied screenshots. They are recorded for implementation after the complaint intake is complete; no fixes are being applied in this pause.

| Finding | Evidence | Phase / sprint |
| --- | --- | --- |
| Admin Media page/upload can fail with “This page didn’t load” | Screenshot shows `/admin/media` generic error while trying to add an event image. The page currently ignores the media query error and the upload action has several failure paths that need visible diagnostics. | Phase 8, Sprint 8.1 — Admin media reliability; final regression in Phase 7.3. |
| Event creation depends on a working Media library | Screenshot shows event image selection blocked until Media succeeds. | Phase 8, Sprint 8.1; Phase 4, Sprint 4.2 acceptance test. |
| SRN logo is stretched | Screenshot shows the header logo rendered with an elongated aspect ratio. | Phase 8, Sprint 8.2 — Branding and responsive asset constraints. |
| Rising Scholars logo is broken/missing | Screenshot shows a broken-image placeholder in “Supported by / Working with.” Local data points to the external Rising Scholars logo and the local browser request currently returns 200, so deployment, cache, optimizer, and fallback behavior must be tested together. | Phase 8, Sprint 8.2; Phase 7.2 accessibility/performance. |
| Impact publications are presented as activities/reports | Live `/impact` renders “Our activities, in full” while listing four DOI publications plus an activities report. | Phase 5, Sprint 5.2 and Phase 8, Sprint 8.3 — Impact information architecture. |
| Recorded YouTube webinar does not save or play after admin entry | Supplied URL `https://youtu.be/_InxC5t8KMk?si=4djtYpB5Ax0ePBvz` is a valid 11-character YouTube short-link ID and the parser accepts that shape. Test the entire dialog → server action → stored rich-text/event field → public `youtube-nocookie` frame path, including title validation and deployment. | Phase 5, Sprint 5.3 and Phase 8, Sprint 8.4 — Video embeds. |
| Testimonial cards show placeholder images | Supplied screenshot shows `[PLACEHOLDER]` image blocks next to genuine-looking Joy (Uganda) and Joseph (Uganda) quotes. The current local `TestimonialBlock` omits the image when `photo_url` is empty, so the screenshot indicates stale/deployed UI or another testimonial renderer that must be traced. | Phase 3, Sprints 3.1–3.2 and Phase 8, Sprint 8.4. |
| Selected photos are available in Google Drive | Source folder supplied: `https://drive.google.com/drive/folders/1feMqTRnLaQONuhKws1ttio2gRz8YylFf?usp=sharing`. Treat as a source handoff for Phase 1 media review; do not assume every file is cleared for publication without matching/rights review. | Phase 1, Sprint 1.2 — Workshop and conference media. |
| “2,022 Launched” statistic is unclear and should be removed | Live `/impact` currently renders `2022` with label `Launched`. Screenshot asks for total removal because the meaning is unclear. | Phase 8, Sprint 8.5 — Metrics and publishing-state cleanup. |
| Two Impact stories should be Coming soon | Live `/impact` still links “A review that changed local practice” and “Improving evidence-informed malaria policy-making in Nigeria and Ghana”; only the third “Building research capacity in Africa” is non-clickable Coming soon. | Phase 6, Sprint 6.2 and Phase 8, Sprint 8.3. |

### Phase 8 — Complaint-driven release hardening

#### Sprint 8.1: Admin media and dependent workflows

- Reproduce the Media failure while authenticated, capturing the server error, Supabase response, storage bucket state, and browser network request.
- Make Media query/upload errors visible and actionable; ensure a failed image insert cannot leave an orphaned storage object or a misleading empty page.
- Verify the event image picker/creation flow from upload through banner assignment.
- Test file type, size, dimensions, alt text, duplicate names, retry, and mobile upload behavior.

#### Sprint 8.2: Branding and asset resilience

- Constrain the SRN logo by intrinsic aspect ratio and test all header breakpoints.
- Verify Rising Scholars logo delivery in local, preview, and production environments, including Next Image optimization, remote allowlists, caching, and a graceful labelled fallback.
- Check partner logo dimensions, alt text, links, and high-density/mobile rendering.

#### Sprint 8.3: Impact and publication information architecture

- Remove or relabel the publication list from the Impact “activities” treatment; route DOI records to a clear Publications/Resources presentation.
- Change both reported story rows to non-clickable “Coming soon” entries until their evidence and copy are approved.
- Keep “Building research capacity in Africa” as the named planned story and ensure no stale detail route or sitemap entry exposes unpublished stories.
- Remove the ambiguous “2022 Launched” metric and recheck every homepage/Impact stat for a source and plain-language label.

#### Sprint 8.4: Video and testimonial rendering

- Add an automated acceptance case for the supplied YouTube URL, including admin insertion, persistence, public rendering, iframe load, and playback-link fallback.
- Trace the screenshot’s placeholder testimonial renderer versus the current local conditional rendering.
- Replace verified placeholder blocks with supplied participant images where identity and publication basis are established; if no image is cleared, show a deliberate text-only testimonial rather than a broken-looking placeholder.
- Preserve the Joy and Joseph quotes with their country/event context and source evidence.

#### Sprint 8.5: Complaint regression and release gate

- Run the complete complaint checklist on desktop and mobile in preview and production.
- Confirm all affected pages return 200, all media requests load, and no generic Next error screen appears.
- Verify Impact links, Coming soon states, publications, stats, logos, event image selection, testimonial cards, and YouTube playback after a clean-cache reload.

**Done when:** every complaint has a reproducible test, an owner phase, an explicit expected result, and a passing preview/production check.

## Recommended order

Complete Phase 0 first. Then deliver team media and profiles (Phases 1–2), since they are high-confidence and fill visible gaps. Follow with authentic testimonials and the news/events archive (Phases 3–4). Triage resources and webinars next (Phase 5), use that verified evidence for impact stories (Phase 6), and finish with redirects and full-system QA (Phase 7).

The SQL dump removes the earlier database blocker. It should be treated as the authoritative legacy structured source, reconciled with the filesystem and public-site inventory rather than imported wholesale into Supabase.

## Non-negotiable safeguards

- Never commit or deploy the ZIP, SQL dump, credentials, salts, logs, backups, or extracted WordPress tree.
- Preserve certificates, participant records, submissions, and useful learner data in access-controlled storage; never expose them on public routes.
- Never treat plugin demo/stock imagery as SRN people or beneficiaries.
- Never invent a testimonial or attach a portrait to an unverified quote.
- Never overwrite newer approved corrections automatically with old copy.
- Import as draft first; publication is a deliberate editorial action.
- Keep historic partner branding only where it accurately documents an event; use current identity in current sections.
