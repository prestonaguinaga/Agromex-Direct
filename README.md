# MONARCH ADMIN

Construction management for **Monarch Development LLC**, grown out of the Agromex construction
quote sheet. Same night-drafting-board look, same estimating engine — now a private, multi-user
system whose projects, estimates, budgets, checklists, notes, plans and progress photos live in a
central Supabase database and show up on every signed-in device, with **Bob**, the site assistant,
on every page.

| Sheet | Route | What it does |
| --- | --- | --- |
| 02 | `/projects` | Company-wide project index; new-project wizard; import of the old browser-only data |
| 02 · P-#### | `/projects/[id]` | Project workspace: Overview · Budget · Estimate (quote sheet, estimator, job info, print/email) · Progress · Plans & files · Photos · Tasks & checklist · Notes · Activity |
| 06 | `/subcontractors` | Subcontractor directory |
| 13 | `/team` | Members, roles, invitations, your profile |
| 14 | `/settings` | Settings: Bob's Daily Brief — enable, delivery time, timezone, recipients, which sections |
| 15 | `/bob` | Bob, full page (he also floats on every other page) |
| 16 | `/briefs` | Bob's Daily Brief: every brief Bob has written, newest first; `/briefs/[id]` for one |
| — | `/guide` | Researched cost guide (unchanged) |

Roles: Owner · Administrator · Project manager · Estimator · Employee · Read only. Owners, admins,
PMs and estimators see every project; employees and read-only members see the projects they are
assigned to. Every rule is enforced by Postgres row-level security, not just the UI — and Bob
works through the same rules with the person's own session.

## Bob, the site assistant

Ask Bob anything about the company's projects — "how are we doing on Smith?", "which projects are
behind?", "what's due this week?", "how much is left in the electrical budget?", "who changed this
budget?" — and he answers from the database as of that moment, never from memory. Tell him what to
do — "add a task for the trusses, due Friday", "note that the framing inspection passed", "mark the
foundation inspection complete", "take me to the photos", "roofing is 25k total" — and he does it
through typed tools that check the person's permissions and write to the activity log. Deleting
things, changing money, changing someone's role: Bob queues those and waits for a Confirm.

Everything runs server-side (`/api/bob`) with `ANTHROPIC_API_KEY`; the browser never holds a key.
How it is built — tools, permissions, confirmations, memory, limits — is in
[PROJECT_STATUS.md §1](PROJECT_STATUS.md).

## Bob's Daily Brief

Every morning at the company's delivery time — on the server, no browser required — Bob writes a
brief: what needs looking at (overdue and blocked work, negative variance, projects gone quiet,
leads and applications waiting), each active project's phase, progress and changes since the last
brief, the schedule (due today, due soon, overdue, blocked, behind), the budget, what got finished,
new photos, new leads and new subcontractor applications. Every line is backed by a row in the
database and links to the sheet it came from. The brief is stored under `/briefs`, shown on the
Projects dashboard card, and emailed to the recipients set on `/settings`. A scheduler (Supabase
`pg_cron`, or Vercel Cron) calls `/api/brief/run` every 15 minutes with a secret; retries never
produce a second brief or a second email. Setup and the scheduler configuration are in
[PROJECT_STATUS.md §0](PROJECT_STATUS.md).

## Run it

```bash
cp .env.example .env.local     # Supabase keys; ANTHROPIC_API_KEY for Bob; BRIEF_CRON_SECRET + Resend for the daily brief
npm install
npm run dev                    # http://localhost:3000
npm run check                  # typecheck + lint + unit tests
npm run db:test                # migrations + policy tests on a local PostgreSQL 16
```

Supabase setup, environment variables, deployment and every architectural decision are documented
in **[PROJECT_STATUS.md](PROJECT_STATUS.md)**. The long-range architecture (lead and application
intake forms, the permissions editor) is in
**[docs/MONARCH-ADMIN-PLAN.md](docs/MONARCH-ADMIN-PLAN.md)**.

## Stack

Next.js 16 (App Router, server-rendered) · React 19 · Tailwind CSS 4 · TypeScript ·
Supabase (Postgres + RLS, Auth, Storage, Realtime, pg_cron) · `@anthropic-ai/sdk` (server-side) for
Bob · Resend for the daily-brief email.

## Code map

| Path | What lives there |
| --- | --- |
| `app.config.ts` | Company identity (name, wordmark, timezone) |
| `proxy.ts` | Route protection — every page needs a session except `/login` and `/auth/*` |
| `app/(auth)/`, `app/auth/callback` | Sign-in, invitation landing, auth-link exchange |
| `app/(app)/` | The signed-in app: layout gate (+ Bob), projects, workspace, subcontractors, team, bob, briefs, settings, guide |
| `app/api/team/invite` | Invitation route (the only place the service-role key is used, server-only) |
| `app/api/bob/*` | Bob: the streaming turn route, the confirmation route, conversation threads |
| `app/api/brief/run` | The daily brief's entry point: scheduler (bearer secret) and the manual test run |
| `components/` | Estimator components (unchanged) + `BobChat` + `project/` tab panels + `brief/` (document, dashboard card) + `shell/` gates |
| `lib/bob/` | Bob's pure pieces (protocol, route map, matcher, guard, time, digest, brief, estimator tools) + unit tests |
| `lib/bob/server/` | Server-only: session, data queries, tool registry, tools, context, memory, confirmation gate, model loop |
| `lib/brief/` | The daily brief's pure pieces (types, due check, attention rules, composer, renderers) + unit tests |
| `lib/brief/server/` | Server-only: gather facts with the service role, narrative, Resend email, the run itself |
| `lib/data/` | Supabase clients, database types, the estimate diff writer, live-row hooks, refresh bus, module APIs |
| `lib/estimator.ts`, `lib/format.ts`, `lib/templates.ts`, `lib/research*.ts` | Estimating logic and reference data (unchanged) |
| `supabase/migrations/` | Schema, policies, triggers, buckets, realtime — apply in order (0001–0009) |
| `supabase/scheduler/` | The pg_cron + pg_net job for the daily brief (run once by hand after deploying) |
| `supabase/tests/` | Local PostgreSQL harness and the policy scenario tests |
