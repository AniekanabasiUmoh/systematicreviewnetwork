# Archived seed scripts — do not run against production

These two scripts built the site's content during Phases 1–4, when the database
held nothing but placeholder rows. The database is now **production**: it holds
content SRN staff have edited through the admin, real registrants, real
applications and real donations.

Both scripts delete rows without a key and re-insert their own hardcoded
versions. Running either one today destroys staff edits silently — the row
counts afterwards look correct, so nothing surfaces as an error.

## What each one would do

**`real-content.mjs`** — three unqualified deletes:

| Line | Statement | Destroys |
|---|---|---|
| 60 | `impact_stats.delete().neq("label","")` | every impact stat |
| 69 | `testimonials.delete().neq("name","")` | every testimonial, including real ones |
| 283 | `team_members.delete().neq("name","")` | the whole team roster, and resets every `bio` to a generic template sentence |

**`seed.mjs`** — hard-deletes `team_members`, `impact_stats`, `testimonials` and
`partners` on *every* run (not only under `--reset`), and re-injects copy
prefixed `[PLACEHOLDER]`. Its `--reset` flag additionally wipes 15 tables
including `registrations`, `applications`, `newsletter_signups`,
`contact_messages` and `donations` — real user data and paid registrations.

The `db:seed` and `db:seed:reset` npm scripts were removed alongside this move,
so neither is reachable by muscle memory.

## Changing content now

Write a migration in `supabase/migrations/` and run `npm run db:migrate`. The
runner records each file in `_migrations` and wraps it in a transaction, so a
migration applies exactly once and cannot half-apply.

Use `update ... where <natural key>` and, where a row genuinely must go,
`delete ... where <that row>`. Never an unqualified delete.

`20260818000001_client_corrections.sql` is the worked example.

## Still safe to run

The other scripts in `supabase/` scope their deletes by id and are fine:
`seed-demo-course.mjs`, `seed-demo-accounts.mjs`, `seed-programmes.mjs`,
`migrate.mjs`, `gen-types.mjs`, `invite-admin.mjs`, `import-wordpress.mjs`.
