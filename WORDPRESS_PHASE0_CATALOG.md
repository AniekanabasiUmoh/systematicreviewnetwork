# WordPress Migration — Phase 0 Catalog

Generated: 2 September 2026  
Sources: `cgi-bin.zip`, `localhost.sql`  
Purpose: non-sensitive recovery manifest and routing decisions

## Source verification

| Source | Size | SHA-256 | Git status |
| --- | ---: | --- | --- |
| `cgi-bin.zip` | 307,894,275 bytes | `A15157435469861C074618E64C807063E78DD7D492A08928D12D89FC6AC29D94` | Ignored |
| `localhost.sql` | 57,185,830 bytes | `B6F33200D7C28EF8DC2D600CC69148170BC17D32EB4633428FE91ADB3FE85275` | Ignored |

The raw sources remain untouched. Neither is suitable for deployment or Git: the ZIP contains `wp-config.php`, plugin/runtime files, logs, and personal documents; the SQL contains credentials/configuration, password hashes, IP addresses, form records, quiz results, users, and security data.

## ZIP inventory

| Category | Count | Routing |
| --- | ---: | --- |
| Archive entries | 24,903 | Classified before extraction/import |
| PNG | 928 | Media candidates after duplicate/demo review |
| JPG | 399 | Media candidates after duplicate/demo review |
| JPEG | 84 | Media candidates after duplicate/demo review |
| WebP | 16 | Media candidates after duplicate/demo review |
| PDF | 183 | All preserved; restricted until individually cleared |

The upload-only hash pass found 565 media/PDF entries (173,110,473 bytes): 529 original candidates, 36 filename-marked WordPress variants, and 12 exact duplicate hash groups covering 36 entries. The complete aggregate and small duplicate samples are recorded in `wordpress-export/phase0-media-manifest.json`; raw media was not extracted.

Upload-year entry counts (including WordPress-generated variants): 2023: 157; 2024: 121; 2025: 82; 2026: 35.

High-value media classes are named team portraits, workshop/conference photographs, programme/event artwork, partner marks, and historical site imagery. WordPress thumbnail variants, theme/plugin demo assets, stock images, caches, and runtime files are not import candidates by default.

## PDF routing

All 183 PDFs are included in the migration inventory. Current path/content evidence routes them as follows:

| PDF class | Count | Action |
| --- | ---: | --- |
| QSM certificate files under `wp-content/uploads/qsm-certificates/` | 181 | Preserve in private authenticated document storage; match to QSM result/learner when possible. |
| `Head-Shot-Wambui-Njonge-.pdf` | 1 | Preserve privately pending identity, rights, and intended use review. |
| `Passport_Danladi-NP.pdf` | 1 | Preserve privately; never expose publicly without a separately documented, lawful publication purpose. |

No PDF is currently classified as a public website resource from filename/path evidence alone. A later content review may promote a file only when ownership, intended audience, accessibility, and publication basis are recorded. No file is being deleted or silently omitted.

## SQL schema inventory

The SQL is a phpMyAdmin export from MySQL 8.0.46 containing 112 tables. It includes:

- Core WordPress content: posts, post metadata, pages/attachments, users, user metadata, comments, terms, and options.
- WPS Team records and team-group relationships.
- The Events Calendar records, occurrences, sessions, and event metadata.
- Forminator entries and metadata.
- Quiz Master Next quizzes, questions, results, result metadata, and audit trails.
- WooCommerce/order-related tables.
- Wordfence/security, login, file-change, and traffic tables.
- Mail and plugin task/log tables.

The dump has 206 `wprg_posts` insert statements, 527 `wprg_postmeta` insert statements, and one WPS Team table insert statement. The redacted extraction at `wordpress-export/phase0-database-manifest.json` contains 417 public/editorial routing records: 327 attachments, 10 pages, 15 posts, 4 products, 4 product variants, 7 quizzes, 14 events, 5 organizers, 1 venue, and 30 team members. It excludes 1,275 revisions, quiz logs, RSVP attendees, form/plugin records, and other non-editorial rows. The SQL must not be imported wholesale: runtime settings, credentials, security logs, user accounts, form submissions, and plugin internals have different retention and access requirements.

## Phase 0 routing matrix

| Source material | Initial destination | Current status |
| --- | --- | --- |
| Current team portraits and verified biographies | New Media + Team records | Ready for Phase 1/2 review |
| Workshop/conference photographs | New Media, Events, News, Impact | Ready for deduplication/context review |
| Public posts/pages/events from SQL | Draft News, Events, Pages | Ready for structured extraction |
| Team groups and biographies from SQL | Draft Team records | Ready for reconciliation with current team |
| Public guides/templates/reports, if identified | Draft Resources | None confirmed from PDF path evidence yet |
| Certificates and named personal PDFs | Private authenticated document library | All 183 included; public access prohibited |
| Forms, quiz results, users, IPs, security records | Restricted administrative archive | Inventory only; no public route |
| WordPress core/theme/plugins/cache/log runtime | Offline preservation only | Never import into new application |

## Phase 0 acceptance checks

- [x] ZIP checksum recorded.
- [x] SQL checksum recorded.
- [x] ZIP and SQL added to `.gitignore`.
- [x] Archive file counts and media extensions recorded.
- [x] Every PDF accounted for and routed.
- [x] SQL table families identified without copying sensitive row data into the repository.
- [x] Build a redacted SQL content manifest (posts/pages/team/events/attachments) with proposed destinations.
- [x] Hash and deduplicate original media candidates.
- [ ] Generate the human review sheet for selected media and rights/identity status.
- [ ] Define the private document schema, storage bucket, access policy, and audit trail.

## Next action

Proceed with Phase 2 editorial review: confirm the twelve held historical team
records, complete missing current-member bios and portraits, and perform Julia
Ribeiro's requested content check. Keep names, emails, IPs, form values, quiz
answers, password data, and private document filenames out of tracked reports
unless the field is required for an authenticated migration record.

## Complaint intake recorded for later phases

The following user-reported defects are now mapped in the main migration plan under “Complaint-driven findings and phase assignments.” They are not being fixed during Phase 0:

- Admin Media page/upload failure blocks event image selection.
- Header SRN logo is stretched; Rising Scholars partner logo can render broken.
- Impact publications are labelled as activities/reports.
- Supplied YouTube webinar URL does not complete the admin-to-public embed journey.
- Testimonial cards show placeholders despite supplied Joy (Uganda) and Joseph (Uganda) quote evidence.
- Google Drive selected-photo folder is the Phase 1 media source handoff.
- Ambiguous “2,022 Launched” metric should be removed.
- Both current Impact story links should become Coming soon until evidence/copy is approved.

## Phase 1 progress

- [x] Imported and linked Nafisa Elehamer's reviewed portrait (`headshot-nafisa-elehamer.jpg`).
- [x] Imported and linked Moses Asori's reviewed portrait (`headshot-moses-asori.jpg`).
- [x] Imported three curated workshop photographs as unassigned Media assets: `workshop-group-historical.jpg`, `workshop-classroom-historical.jpg`, and `workshop-discussion-historical.jpg`.
- [x] Optimized all five uploads with dimensions and descriptive alt text; each public object returned HTTP 200 during verification.
- [ ] Review and import additional selected photos from the supplied Google Drive folder.
- [ ] Decide whether held Kingsley/Edward portraits are acceptable or request replacements.
- [ ] Assign workshop assets to approved event/news/impact records.

## Phase 2 progress

- [x] Extended the live `team_group` enum with `programmes` and `communications`.
- [x] Added both groups to the public Team page and admin Team editor.
- [x] Corrected Nafisa Elehamer's group to Programmes Committee.
- [x] Imported seven recovered public biographies without overwriting current roles, affiliations, links, portraits, or ordering.
- [x] Published twelve additional historical team rows because their WordPress group membership is explicit: six Programme Committee and six Communications Team (`wordpress-export/phase2-team-bios-audit.json`).
- [ ] Confirm current roles and membership for the twelve recovered additions with Fortune and correct any stale records.
- [ ] Complete missing current-member bios, portraits, LinkedIn/ORCID links, and Julia Ribeiro's requested editorial update.

## Phase 3 progress

- [x] Reconciled the supplied Joy (Uganda) and Joseph (Uganda) quotes with the canonical live rows.
- [x] Removed duplicate import rows created during reconciliation; retained the existing canonical records.
- [x] Confirmed all 13 published testimonials are text-only with no broken or placeholder image URLs.
- [x] Recorded source evidence and cleanup policy in `wordpress-export/phase3-testimonials-audit.json`.
- [ ] Match and clear participant portraits before attaching any testimonial image.
- [ ] Confirm permission/publication basis for each remaining testimonial record.

## Phase 4 progress

- [x] Imported 13 published legacy WordPress posts as unpublished News drafts with original dates and cleaned body text.
- [x] Imported 14 published legacy Events Calendar records as unpublished Event drafts with source start/end metadata and conservative type/location classification.
- [x] Used legacy-prefixed slugs to avoid collisions with current content and make review provenance obvious.
- [x] Confirmed all 27 imported archive rows remain `draft`; no expired registration or stale announcement is public.
- [x] Confirmed the importer is idempotent (a second run inserted 0 additional rows).
- [x] Recorded source IDs and imported row IDs in `wordpress-export/phase4-archive-audit.json`.
- [ ] Review each draft for accuracy, media rights, event venue, and current links before publishing.
- [ ] Attach approved workshop/conference photos and recordings after the Media workflow is hardened.
