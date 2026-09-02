# Monarch Admin — Project Status

**Phase:** 1 · Backend foundation (data persistence + multi-user sharing) — **complete, builds green**
**Branch:** `claude/monarch-shared-construction-gcvtx0`
**Plan:** [`docs/MONARCH-ADMIN-PLAN.md`](docs/MONARCH-ADMIN-PLAN.md) (the 15-section architecture plan this phase implements)
**Last updated:** 2026-09-02

---

## 1. What this phase delivers

The Agromex quote sheet is now **Monarch Admin**: the same estimator, same visual system, but every
piece of business information lives in a central Supabase database behind sign-in, roles and
row-level security. Change a project on one computer and every other signed-in device sees it;
upload a photo from a phone and the team sees it on the project.

| Requirement | Status | Where |
|---|---|---|
| 1. Secure Supabase authentication | ✅ | `proxy.ts`, `app/(auth)/*`, `app/auth/callback`, `lib/data/server.ts` |
| 2. Database-backed projects | ✅ | `projects` table, `lib/data/projects.ts`, Sheet 02 |
| 3. Database-backed estimates | ✅ | `estimates` table + `apply_estimate_changes()` RPC, `lib/data/use-project.ts` |
| 4. Database-backed estimate items | ✅ | `estimate_sections` / `estimate_items` / `estimate_item_options` |
| 5. Database-backed budgets and budget items | ✅ | `budgets` / `budget_lines`, `components/project/BudgetPanel.tsx` |
| 6. Database-backed project notes | ✅ | `notes` (author + timestamp), `NotesPanel.tsx` |
| 7. Database-backed tasks and checklists | ✅ | `task_lists` / `tasks`, `TasksPanel.tsx` |
| 8. Database-backed project progress | ✅ | `projects.progress_pct` maintained by triggers from tasks + checked estimate items |
| 9. Supabase Storage for plans, files, photos | ✅ | buckets `plans`, `photos`; `files` table; `FilesPanel.tsx`, `lib/data/files.ts` |
| 10. User / profile system | ✅ | `profiles` (auto-created from `auth.users`), Team sheet, "Your profile" |
| 11. Role foundation | ✅ | `role_key` enum, `memberships`, `role_permissions` capability matrix seeded per company |
| 12. created_at / updated_at / created_by | ✅ | on every table via `touch_row()` trigger |
| 13. Audit / activity history | ✅ | `audit_log` + trigger with old/new values and plain-English summaries; Activity tab |
| 14. Protected application routes | ✅ | `proxy.ts` (Next 16) + server layout gate; public: `/login`, `/auth/*` |
| 15. Row Level Security policies | ✅ | every table; tested by `supabase/tests/policies.sql` |

Also delivered: loading / saving / error / empty states on every database-backed screen,
duplicate-safe saves (client UUIDs + upserts + idempotent RPCs), a one-click importer for the old
browser-only data, Monarch branding (config-driven), CI, and this document.

---

## 2. What is now database-backed

Everything below is stored in Supabase Postgres and visible on any authenticated device according
to the user's role. Nothing in this list is read from or written to the browser as a source of truth.

- **Company, users, roles**: `companies`, `profiles`, `memberships` (role, active), `invitations`,
  `role_permissions` (the Owner-editable capability matrix; Owner always has everything).
- **Projects**: name, number, type, status, client contact, address, dates, notes, plan notes,
  progress %, soft-delete, `project_members` (who is assigned).
- **Estimates**: the full quote sheet — estimate settings (tax / waste / labor / contingency %, house
  figures), sections, line items (qty, unit, done/checklist, note, active option), product options
  (label, link, unit price, note). Totals are computed in SQL (`project_summary` view) with the same
  formulas as `lib/format.ts:computeTotals`.
- **Budgets**: one active budget per project, budget lines (category, budgeted, committed, spent).
- **Tasks & checklists**: task lists, tasks (title, status, assignee, due date, completed by/at).
- **Project progress**: `projects.progress_pct` = (done tasks + checked estimate items) / (all).
- **Notes**: body, author, timestamp, pinned, edited.
- **Files**: metadata rows for plans, documents and photos; bytes in Storage buckets `plans` and
  `photos` at `{company}/{project}/{file-id}.ext`, thumbnails generated on the device.
- **Audit / activity**: field-level old → new for projects, estimates, items, prices, budgets,
  tasks, notes, files, memberships, permissions — with actor, project and a summary such as
  *"Budget for Electrical (budgeted) changed from $26,000.00 to $28,500.00"*.

## 3. What still lives in the browser (and why that is fine)

| Item | Kind | Notes |
|---|---|---|
| Supabase session cookie | auth | Standard; managed by `@supabase/ssr`. |
| Which tab is open, collapsed estimate sections, open option drawers | UI preference | Harmless; resets on reload. |
| `agromex.quotes.v1` (the OLD estimator's data) | legacy | Read-only. The Projects sheet offers *"Import N projects from this browser"*; after import it is marked imported and never written again. Safe to clear once imported. |
| Bob's chat history per project (`monarch.bob.chat.*`) | temporary | Conversation memory only; no business data. Moves to the database in the Bob phase. |
| **Bob's AI provider key (`monarch.bob.v1`)** | ⚠ temporary | Bob still runs the estimator tool loop in the browser with a key the user pastes (as before). Bob's edits now persist through the shared database like any other edit. The key moves server-side in the Bob phase (see plan §8); until then, use a low-limit key. |

There is **no** business record whose only copy is in a browser.

---

## 4. Architecture decisions (this phase)

1. **Supabase as the central backend** (Postgres + RLS, Auth, Storage, Realtime). Chosen because
   the security boundary — who may read or change which row — belongs next to the data, and
   Supabase gives auth, files and live updates on the same Postgres without extra services.
2. **Static export dropped; Next.js runs as a server app.** Route protection (`proxy.ts`), the auth
   callback and the invitation API need a server. Target host: Vercel (any Node host works).
3. **Keep the estimator's in-memory `Project` shape as the view model.** `SheetTable`, `TotalsPanel`,
   `EstimatorPanel`, `PrintSheet` and Bob's tool executor are untouched. A **diff writer**
   (`lib/data/estimate-view.ts`) turns each `update(prev → next)` into minimal row upserts/deletes
   sent as ONE atomic RPC (`apply_estimate_changes`). Unit-tested with `node --test`.
4. **Client-generated UUIDs everywhere** (`uid()` = `crypto.randomUUID()`), so a retried save
   upserts the same row instead of creating a duplicate. Project creation and legacy import are
   idempotent on the id and on the legacy `client_id`.
5. **Optimistic UI + realtime reconcile.** Edits show instantly, save 400 ms later, retry with
   backoff on failure, and a remote change from another device triggers a re-read that is deferred
   while a local save is pending (nothing is lost). Own echoes are recognised by `updated_by`.
6. **Roles as data.** `role_permissions(company, role, capability)` seeded with a default matrix;
   the Owner role always holds every capability; Employees/Read-only are scoped to assigned
   projects via `project_members`. Every policy is `has_cap(...) AND on_project(...)` through
   SECURITY DEFINER helpers in the `authz` schema (no policy recursion, pinned `search_path`).
7. **Field-level rules by table design, not column grants**: Employees have no policy on
   `budget_lines` and no `estimates.view`, so money never reaches their client; the
   `project_summary` view is `security_invoker` and simply shows 0 for them.
8. **Audit by trigger** (`audit.row_change` with a per-table watched-column list) writing to an
   immutable `audit_log` (no user write policies). Summaries are rendered at write time so history
   reads well even after people leave.
9. **Progress by trigger**: tasks and estimate-item check-offs recompute `projects.progress_pct`, so
   every screen, device and (later) Bob and the daily update read one number.
10. **Invite-only access.** New accounts come from an Owner/Admin invitation. The invitation row is
    written with the caller's own client (RLS-checked); the email is sent through a server-only
    route holding the service-role key. If that key is absent the invitation still stands and the
    link can be sent from the Supabase dashboard. Someone who signs in without an invitation sees
    a "No access yet" screen and no data.
11. **First run bootstrap**: the first signed-in person creates the company and becomes Owner
    (`bootstrap_company()`, refuses once a company exists).
12. **Soft delete for projects, notes, files** (`deleted_at`): hidden everywhere through the
    policies, history kept. Hard delete/purge is an Owner tool for a later phase.
13. **Local, real Postgres tests instead of mocks.** `supabase/tests/run-local.sh` applies every
    migration to a throwaway PostgreSQL 16 with tiny stand-ins for the `auth`/`storage` schemas and
    runs `policies.sql`: 40+ assertions across four personas (owner, estimator, employee, outsider),
    including the audit sentence, progress maths, idempotent retries and storage path policies.
14. **Branding from one file**: `app.config.ts` (Monarch Development LLC, MONARCH wordmark, crown
    glyph in the brand gold). Everything else stays monochrome per the estimator's design rule.
15. **Toolchain**: TypeScript pinned to 5.9 (the repo had the pre-release 7.0, which
    typescript-eslint does not support yet). ESLint uses `eslint-config-next` 16; its new
    React-Compiler hook rules (`set-state-in-effect`, `refs`, `immutability`) are **warnings** because
    they flag long-standing patterns inside the inherited estimator components, which this phase
    leaves untouched on purpose. New code satisfies them. `lint` reports 0 errors / 10 warnings.
16. **`uid()` now returns `crypto.randomUUID()`** — the one edit inside the estimator's shared
    logic. Every template, takeoff insert and Bob tool automatically produces database-ready ids.

---

## 5. Supabase configuration (what the owner must do)

1. **Create a Supabase project** (Pro plan recommended once real data lives there — no pausing,
   daily backups). Region close to Dallas–Fort Worth.
2. **Run the migrations** in order, either with the CLI (`supabase db push` after
   `supabase link`) or by pasting each file from `supabase/migrations/` into the SQL editor:
   `0001_foundation.sql` → `0002_projects_estimates.sql` → `0003_budgets_tasks_notes_files.sql` →
   `0004_audit.sql` → `0005_storage.sql` → `0006_realtime.sql`.
3. **Authentication → Providers → Email**: keep Email enabled. **Disable "Allow new users to sign
   up"** (access is by invitation). Keep "Confirm email" on.
4. **Authentication → URL configuration**: set *Site URL* to the deployed address and add
   `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback` for
   development) to *Redirect URLs*.
5. **Authentication → Email templates** (optional): the *Invite user* template should link to
   `{{ .ConfirmationURL }}` (default) — it lands on `/auth/callback` and then `/set-password`.
6. **Create the first user** (yourself): Authentication → Users → *Add user* (with a password) or
   *Invite user*. Sign in to the app; the *Create the company* screen appears; you become Owner.
7. **Environment variables** (Vercel → Settings → Environment Variables, or `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` — Project settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the publishable (or legacy anon) key
   - `SUPABASE_SERVICE_ROLE_KEY` — the secret / service-role key, **server only** (invitations)
   - `NEXT_PUBLIC_SITE_URL` — e.g. `https://admin.monarchdevelopmentdfw.com`
8. **Storage**: buckets `plans` and `photos` are created by migration 0005 (private). Raise the
   per-file limit on `plans` in the dashboard if plan sets exceed 50 MB.
9. **Realtime**: migration 0006 adds the shared tables to the `supabase_realtime` publication.
   Check Database → Replication shows them if live updates do not appear.
10. **Backups**: enable daily backups (Pro). The old JSON export button is gone on purpose; the
    database is the backup source now.

Deploying: connect the GitHub repo to Vercel, set the variables above, build command `next build`.
CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build and the database tests.

---

## 6. How to run locally

```bash
cp .env.example .env.local        # fill in the Supabase values
npm install
npm run dev                       # http://localhost:3000 → /login
npm run check                     # typecheck + lint + unit tests
npm run db:test                   # migrations + policy tests on a local PostgreSQL 16
```

`db:test` needs `psql` and a running PostgreSQL 16 reachable through `PGHOST`/`PGPORT`/`PGUSER`.

---

## 7. Known limits and what comes next

- **Bob** still uses a browser-held key and only knows the open estimate. Phase 6 in the plan moves
  him server-side, app-wide, with confirmations. (Bob's sheet edits already persist centrally.)
- **Daily update, subcontractor applications, dashboard, permission editor UI, Settings** are later
  phases (plan §13). The Team sheet already lets Owners/Admins change roles.
- **Estimates have one version per project** for now; `estimates.version` exists for
  sent/accepted versions later.
- **Concurrent edits** to the same line are last-write-wins per row (shown via realtime).
- **Offline**: not supported yet; uploads need a connection.
- The research datasets and premade checklists remain in code (`lib/research*.ts`,
  `lib/templates.ts`) by design.

## 8. File map (new and changed)

```
app.config.ts                       company identity (Monarch)
proxy.ts                            route protection (Next 16 proxy)
app/(auth)/login, set-password      sign-in and invitation landing
app/auth/callback/route.ts          auth link exchange
app/(app)/layout.tsx                session gate + SessionProvider
app/(app)/projects/                 Sheet 02 · list, workspace with tabs
app/(app)/team/page.tsx             Sheet 13 · members, invitations, profile
app/(app)/guide/page.tsx            unchanged cost guide (now protected)
app/api/team/invite/route.ts        invitation (server-only service key)
components/shell/                   NotConfigured / NoAccess / Bootstrap gates
components/project/                 Overview, Budget, Tasks, Notes, Files, Activity, SaveIndicator
components/ui.tsx                   TopBar with user chip, Crown, shared state marks
lib/data/                           Supabase clients, types, diff writer, hooks, module APIs
lib/legacy-store.ts                 read-only reader for the old browser data
supabase/migrations/                0001–0006
supabase/tests/                     local-stubs.sql, policies.sql, run-local.sh
```
