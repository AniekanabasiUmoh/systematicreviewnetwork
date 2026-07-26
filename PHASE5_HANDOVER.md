# Phase 5 handover — for Codex to continue

Written because the previous session ran out of tokens mid-build. **Sprint 5.1 is complete, verified, and working.** Sprints 5.2–5.4 are not started. This doc plus the full plan file is everything needed to continue without re-deriving context.

**Read the full plan first**: `C:\Users\umoha\.claude\plans\fancy-cooking-narwhal.md` — it has exact file contents, SQL, capability matrices, and gotchas for all four sprints. This handover is a status report + pointers into that plan, not a replacement for it.

---

## What's done (Sprint 5.1 — Auth & gating)

All built, typechecked, linted, built, and **click-through verified live** with Playwright against a running dev server (signed-out gating, sign-in, session survives hard refresh, `/admin/login` while signed in bounces to `/admin`, sign-out clears the cookie and re-gates, open-redirect guard on `next=` holds). Test suite still 85 pass / 2 skip (no regressions).

### Files created
- `supabase/migrations/20260726000001_admin_auth.sql` — **applied to the remote DB already**. Adds `profiles.email`, `profiles.updated_at` + trigger, `is_admin()`, `admin_audit` table + RLS (no policies, service-role only), and an "admins read all profiles" policy.
- `lib/database.types.ts` — **regenerated already** (`npm run gen:types`), includes `admin_audit` and the new `profiles` columns.
- `lib/supabase/ssr.ts` — `createSessionClient()`, cookie-bound anon client for Server Components/Actions. Read-only identity, never writes.
- `lib/supabase/middleware-client.ts` — `updateSession(request)` for the edge runtime. Uses `getUser()` not `getSession()` (verifies the JWT).
- `middleware.ts` (repo root) — gates `/admin/*`. Redirects signed-out → `/admin/login?next=...`; signed-in-at-login → `/admin`. Copies refreshed cookies onto redirects.
- `lib/admin/auth.ts` — `getSessionUser()`, `requireStaff()`, `requireAdmin()`, `requireStaffAction()`, `requireAdminAction()`. **This is the real authorization boundary** — role is always read from `profiles` via the service-role client using the JWT-verified id, never trusted from a cookie/token.
- `lib/admin/audit.ts` — `recordAudit(actor, action, resource, id, summary)`, fire-and-forget.
- `lib/admin/invite.ts` — shared invite logic (`inviteStaffUser`), used by the CLI script; will also back the in-app Users page in 5.2.
- `lib/actions/admin-auth.ts` — `signIn` / `signOut` server actions. Honeypot → zod → rate limit (`checkRateLimit("admin-login", ip)`, reused verbatim from `lib/actions/guard.ts`) → `signInWithPassword` → verify a `profiles` row exists → redirect. One generic error for both wrong-email and wrong-password (no account enumeration). `next` param validated to start with `/admin` and not `//`.
- `components/admin/LoginForm.tsx`, `components/admin/AdminSidebar.tsx`, `components/admin/AdminShell.tsx` — on-brand (ink sidebar, green only as the active-item left rule and button fill, sharp corners, plain white login card).
- `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/(shell)/layout.tsx`, `app/admin/(shell)/page.tsx` — routes. The `(shell)` route group is deliberate: login sits outside the sidebar chrome. **The dashboard page (`app/admin/(shell)/page.tsx`) is currently a placeholder** — just a welcome message. Sprint 5.2 replaces it with the real `StatCard` dashboard (§5.2.8 in the plan).
- `supabase/invite-admin.mjs` + `"admin:invite"` npm script — CLI to create staff accounts. **Already used** to create the first admin: `thorpegroup01@gmail.com` (role admin, password was printed once to the terminal and is not saved anywhere — if it's lost, re-run `npm run admin:invite -- thorpegroup01@gmail.com --role admin` to reset it, since the script is idempotent and will just update the profile; note this does NOT reset the password on a reused account — use Supabase Studio's "reset password" if the password itself is lost).

### Shared primitives exported for reuse in later sprints
- `lib/actions/schemas.ts` — `email` and `optionalText` are now exported (were private), plus a new `adminLoginSchema`. **5.2 will add more schemas here or in a new `lib/actions/admin-schemas.ts` per the plan** — reuse `email`/`optionalText`, don't redefine them.

### Known non-issues (do not "fix" these)
- `npm run build` prints `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.` — this is a Next 16.2.11 naming-convention warning, not an error. Left as-is; renaming to `proxy.ts` is optional cleanup, not required by the plan.
- Pre-existing lint errors in `app/(site)/programmes/[slug]/page.tsx`, `app/(site)/programmes/page.tsx` (unescaped apostrophes) and warnings in `app/(site)/page.tsx`, `supabase/about-content.mjs` — these predate this session, not introduced by Phase 5 work, not in scope.
- 12 high-severity `npm audit` findings — all in devDependency/build-tool transitive deps (eslint, postcss, sharp, next's own deps), pre-existing, unrelated to the new packages installed this session.

---

## What's NOT done — Sprints 5.2, 5.3, 5.4

**Nothing has been built for these yet.** No files exist beyond what's listed above. Follow the plan file exactly — it has full code sketches, exact SQL, and a capability matrix already verified against the live schema (e.g. confirmed live: `RichText.tsx` has no `image` case yet, `homepage.id` is a boolean singleton PK, `pages` has no `status` column but `resources` does, `set_updated_at()` already exists and should be reused not redefined).

### Sprint 5.2 — Content CRUD + media library (plan §"Sprint 5.2")
The big one. Build, in order:
1. `lib/admin/resources.ts` — the `AdminResource`/`AdminField` registry, one descriptor per table, per the capability matrix in the plan.
2. `lib/actions/admin-schemas.ts` — per-resource zod schemas, plus `slug`, `richTextJson`, and **`lagosDateTime`** (the highest-risk correctness item — Nigeria is UTC+01:00 fixed, no DST; unit-test the conversion).
3. `lib/admin/queries.ts` — draft-inclusive reads via `supabaseAdmin`. **Do not touch `lib/queries.ts`** — it's the public site's safety net (published-only filters).
4. `lib/admin/richtext.ts` — `sanitizeRichText()`. Required because `RichText.tsx` passes `href` straight into `<a href>` unfiltered.
5. `lib/actions/admin-content.ts` — `saveResource`, `deleteResource`, `setPublishStatus`, `reorderResource`. Field allowlisting from the descriptor is the mass-assignment defence — never iterate `form.entries()` into the payload.
6. Shared components in `components/admin/`: `ResourceList`, `ResourceForm`, `SlugField`, `RichTextField`, `EditorToolbar`, `ImageField`, `MediaPicker`, `MediaUploadForm`, `SortableList` (HTML5 DnD + keyboard up/down as the *primary* control, not decoration), `ConfirmDialog`, `DeleteButton`, `StatCard`, `EmptyState`, `ForbiddenNotice`.
7. Routes: `app/admin/(shell)/[resource]/{page,new/page,[id]/page}.tsx` (generic), plus bespoke `media/`, `users/`, `homepage/` pages. **Every admin route needs `export const dynamic = "force-dynamic"`.**
8. **`components/ui/RichText.tsx` needs a `case "image"` added** — verified in this session it doesn't have one. Without it, editor-inserted images render as nothing on the public site.
9. Media upload: reject SVG in v1, verify MIME by magic bytes not `file.type`, never use the raw filename as the storage path, delete the storage object if the DB insert fails.
10. Replace the placeholder dashboard at `app/admin/(shell)/page.tsx` with the real `StatCard` version.
11. **Gate**: full click-through in the plan's §5.2.9 — publish an event with an inline image, confirm the public page 404s while draft and renders within 60s once published, confirm slug changes revalidate both old and new paths, confirm editor role is blocked from `/admin/users` at the page level.

### Sprint 5.3 — Registrations & submissions (plan §"Sprint 5.3")
- `lib/admin/csv.ts` — RFC 4180 quoting, UTF-8 BOM, **CSV-injection neutralization** (`= + - @` prefix guard — this is a real RCE vector if skipped, not paranoia).
- `app/api/admin/export/[table]/route.ts` — allowlisted table export, never `select("*")`.
- Reuse `getSeatCounts` from `lib/queries.ts` and `registrationState` from `lib/events.ts` for the progress bar — do not reimplement seat counting.
- Submissions views are **read-only** — no edit/delete anywhere.

### Sprint 5.4 — Application workflow (plan §"Sprint 5.4")
- New migration `supabase/migrations/20260726000002_application_notes.sql` — `append_application_note()` RPC for atomic append-only notes (avoids a read-modify-write race between two staff). **Remember to `revoke execute from anon, authenticated`** — this project already got bitten once by forgetting that (`20260725000003`), and the RLS test suite's RPC loop is the regression guard, so add the new function name to it.
- `lib/actions/admin-applications.ts` — status transition map is explicit and asymmetric (accepted/rejected are reversible, `received`→terminal states skip nothing). No applicant email on status change in v1 — out of scope per the doc, don't add it.

---

## Test additions still needed (plan §"Test additions")
- Extend `tests/rls.test.ts`: add `"admin_audit"` to `SUBMISSION_TABLES`, add `is_admin` and `append_application_note` to the RPC-rejection loop, add a storage-bucket-write-rejection block.
- New `tests/admin-auth.test.ts` — adversarial: a real editor account (created/torn down via service role) must not be able to read other profiles, call `is_admin()` truthily, escalate their own role, or read submission tables.
- New `tests/admin-csv.test.ts` — pure unit tests on the CSV util (BOM, diacritics, injection neutralization, quoting).
- New `tests/admin-content.test.ts` — pure unit tests on `sanitizeRichText`, `slugify`, `lagosDateTime`, the date-range boundary, the transition map.

Baseline is 85 pass / 2 skip. Expect roughly 130+ pass / 2 skip once Phase 5's tests are added.

---

## Environment / operational notes
- **No local Docker.** Migrations apply directly to the remote Supabase project via `npm run db:migrate` (session pooler). There is no throwaway environment — review SQL before running it. Always follow with `npm run gen:types` before `npm run typecheck`, or new columns/tables won't exist in `Database` and the build fails somewhere confusing.
- Dev server: `npm run dev`. Port 3000 may already be in use by another process in this environment (it was during this session) — Next will silently pick 3001 instead; check the terminal output for the actual port before testing.
- Standing gate after every sprint: `npm run lint && npm run typecheck && npm run build && npm test`.
- First admin login: `thorpegroup01@gmail.com`, password was generated by `npm run admin:invite` and shown once in the terminal during this session — if not saved by the user, reset via Supabase Studio.

## Constraints that still apply (unchanged from the whole project)
No gold. No green text anywhere (green = button/icon fills and focus rings only). Plain white paper, not warm. Sharp corners (`--radius-card: 0`). No placeholder text/copy/images — real sentences even in empty states. No local Docker. ESI is the design north star.
