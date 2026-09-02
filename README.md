# MONARCH ADMIN

Construction management for **Monarch Development LLC**, grown out of the Agromex construction
quote sheet. Same night-drafting-board look, same estimating engine — now a private, multi-user
system whose projects, estimates, budgets, checklists, notes, plans and progress photos live in a
central Supabase database and show up on every signed-in device.

| Sheet | Route | What it does |
| --- | --- | --- |
| 02 | `/projects` | Company-wide project index; new-project wizard; import of the old browser-only data |
| 02 · P-#### | `/projects/[id]` | Project workspace: Overview · Estimate (quote sheet, estimator, job info, print/email, Bob) · Budget · Tasks & checklist · Notes · Plans/files/photos · Activity |
| 13 | `/team` | Members, roles, invitations, your profile |
| — | `/guide` | Researched cost guide (unchanged) |

Roles: Owner · Administrator · Project manager · Estimator · Employee · Read only. Owners, admins,
PMs and estimators see every project; employees and read-only members see the projects they are
assigned to. Every rule is enforced by Postgres row-level security, not just the UI.

## Run it

```bash
cp .env.example .env.local     # Supabase URL + publishable key (+ service-role key for invitations)
npm install
npm run dev                    # http://localhost:3000
npm run check                  # typecheck + lint + unit tests
npm run db:test                # migrations + policy tests on a local PostgreSQL 16
```

Supabase setup, environment variables, deployment and every architectural decision are documented
in **[PROJECT_STATUS.md](PROJECT_STATUS.md)**. The long-range architecture (Bob as an app-wide
assistant, the server-scheduled daily update, subcontractor applications, permissions editor) is in
**[docs/MONARCH-ADMIN-PLAN.md](docs/MONARCH-ADMIN-PLAN.md)**.

## Stack

Next.js 16 (App Router, server-rendered) · React 19 · Tailwind CSS 4 · TypeScript ·
Supabase (Postgres + RLS, Auth, Storage, Realtime) · `@anthropic-ai/sdk` for Bob.

## Code map

| Path | What lives there |
| --- | --- |
| `app.config.ts` | Company identity (name, wordmark, timezone) |
| `proxy.ts` | Route protection — every page needs a session except `/login` and `/auth/*` |
| `app/(auth)/`, `app/auth/callback` | Sign-in, invitation landing, auth-link exchange |
| `app/(app)/` | The signed-in app: layout gate, projects, workspace, team, guide |
| `app/api/team/invite` | Invitation route (the only place the service-role key is used, server-only) |
| `components/` | Estimator components (unchanged) + `project/` tab panels + `shell/` gates |
| `lib/data/` | Supabase clients, database types, the estimate diff writer, live-row hooks, module APIs |
| `lib/estimator.ts`, `lib/format.ts`, `lib/templates.ts`, `lib/research*.ts` | Estimating logic and reference data (unchanged) |
| `lib/bob/` | Bob's tools, brief and provider adapters |
| `supabase/migrations/` | Schema, policies, triggers, buckets, realtime — apply in order |
| `supabase/tests/` | Local PostgreSQL harness and the policy scenario tests |
