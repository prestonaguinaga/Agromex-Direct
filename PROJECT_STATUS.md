# Monarch Admin — Project Status

**Phase:** 4 · Bob's Daily Brief — **complete, builds green**
(Phase 3 · Bob, the site assistant — complete; Phase 2 · construction project management — complete;
Phase 1 · backend foundation — complete)
**Branch:** `claude/bob-monarch-admin-assistant-q0hu7d`
**Plan:** [`docs/MONARCH-ADMIN-PLAN.md`](docs/MONARCH-ADMIN-PLAN.md) (§9 of the plan is this phase; §8 was phase 3)
**Last updated:** 2026-09-02

---

## 0. Phase 4 — Bob's Daily Brief (a scheduled, server-side process)

Every morning at the company's delivery time Bob writes a brief for the owner and project
managers — without anyone's browser being open. A scheduler calls the app on the server; the
server reads the database with its own (service-role) credentials, works out what happened since
the previous brief, writes the document, stores it under **Sheet 16 · `/briefs`**, shows the
newest one on the **Projects dashboard card**, and emails it to the configured recipients. Every
statement in it is backed by a row in the database and links to the sheet where that row lives.

| Section | What it reports | Where it comes from |
|---|---|---|
| **Bob says you should look at** | Objective rules over the facts (below, §0.6): overdue and blocked work, negative variance, over-budget lines, projects gone quiet, urgent items, leads and applications waiting. Each item names the number behind it and links to the sheet. Nothing is invented: no rule, no item | `lib/brief/attention.ts` |
| **Active projects** | Phase, progress % (with its source), schedule chip, and what changed since the previous brief: budget edits, tasks, notes, photos, files, phases, members — the audit rows, grouped the way the Activity sheet groups them | `project_summary`, `audit_log` |
| **Schedule** | Due today · due in the next 7 days · overdue · blocked · behind schedule / past target date | `tasks`, `project_summary` |
| **Budget** *(switch)* | Over-budget lines · significant budget changes in the window (the same rule Bob's activity digest uses) · remaining budget per project · projects with negative variance | `budget_lines`, `budgets`, `audit_log` |
| **Progress** | Tasks completed · checklist items completed · projects whose progress % moved since the previous brief · notes written | `tasks`, `notes` |
| **Photos** | How many new progress photos per project with a link to that project's Photos sheet. Thumbnails are attached only when *Attach photo previews* is on (up to four per project, signed links valid 7 days) | `files` (bucket `photos`) |
| **Leads** *(switch)* | New inquiries in the window and how many are still waiting | `leads` |
| **Subcontractors** *(switch)* | New applications and applications waiting for manual review | `subcontractor_applications` |

### 0.1 Architecture

```
scheduler ── Supabase pg_cron + pg_net (every 15 min)  ─or─  Vercel Cron
   │   POST https://<app>/api/brief/run   Authorization: Bearer <BRIEF_CRON_SECRET>
   ▼
app/api/brief/run/route.ts      timing-safe secret check · 60 s budget · service-role client
   ▼
lib/brief/server/run.ts         runBriefs(): for every company that has settings
   ├─ isDue(settings, now)           lib/brief/schedule.ts    local date/time in the company's timezone
   ├─ claimBrief()                   unique (company_id, brief_date, kind)  ◄── the idempotency point
   ├─ gatherFacts()                  lib/brief/server/gather.ts  one parallel read of the company
   ├─ attentionItems(facts)          lib/brief/attention.ts   pure rules, unit-tested
   ├─ composeBrief(facts)            lib/brief/compose.ts     sections → items, every item with a link
   ├─ writeNarrative(doc)            lib/brief/server/narrative.ts  optional 3-sentence intro (model)
   ├─ store                          daily_briefs: facts, doc, narrative, summary, attention_count
   ├─ deliver()                      lib/brief/server/email.ts  Resend + Idempotency-Key, one row per recipient
   └─ stampRun()                     daily_brief_settings.last_run_at / last_run_note (shown on Sheet 14)
```

- **Pure core, thin shell.** `schedule`, `attention`, `compose`, `render` and `types` are pure
  modules with unit tests (`lib/brief/*.test.ts`). The server modules only fetch and store.
- **Facts first, words second.** The brief is a typed `BriefFacts` object (projects, schedule,
  budget, progress, photos, leads, applications, attention) turned into a `BriefDoc` (sections →
  groups → items with `href`s). The model is asked, optionally, for a short introduction *about
  that document* and nothing else; if `ANTHROPIC_API_KEY` is missing or the call fails, the brief
  is still written without it. The narrative is stored separately and labelled as Bob's summary.
- **Links, not URLs.** Every `href` is built by the server from the app's route map
  (`/projects/<id>?tab=budget`, `/briefs/<id>`, …); the model never produces a link.
- **The window.** From the previous *ready* scheduled brief to now (capped at 14 days), or the
  last 24 hours for a company's first brief. Progress-% changes compare with the previous brief's
  stored facts, so "moved from 40 % to 55 %" is exact.
- **Tables (migration 0009).** `daily_brief_settings` (one row per company),
  `daily_briefs` (one per company · local date · kind), `daily_brief_deliveries` (one per brief ·
  recipient), plus `leads` and `subcontractor_applications` so the Leads and Subcontractors
  sections report real rows. All audited, all under RLS.
- **Capabilities.** `briefs.view` (Owner, Admin, PM, Estimator) reads briefs and the settings;
  `settings.manage` (Owner, Admin) edits settings, sees delivery status and can run a test brief;
  `leads.view` / `leads.manage` and the existing `subcontractors.*` govern the two new tables. No
  role can insert or edit a brief — only the server process writes them.

### 0.2 Settings — Sheet 14 · `/settings`

| Setting | Default | Notes |
|---|---|---|
| Enable | off | Nothing runs until the owner turns it on |
| Delivery time | 07:00 | `HH:MM`; the scheduler ticks every 15 minutes, so the brief lands within that window after the time |
| Timezone | the company's timezone | Any IANA name (`America/Chicago`); validated, falls back to UTC if unknown |
| Email recipients | none | One per line or comma-separated; validated on save. No recipients = stored, not emailed |
| Include budget | on | Removes the Budget section and money-based attention items when off |
| Include applications | on | Subcontractor applications section |
| Include leads | on | Leads section |
| Include completed projects | off | Adds recently completed projects and keeps completed ones in the lists |
| Attach photo previews | off | Off: a link to Photos only. On: thumbnails in the email |

**Generate & send me a test brief** (settings.manage) runs the whole process now for the person's
company as a *manual* brief, ignoring the switch and the delivery time, and emails it to the
person's own address only. The sheet also shows the scheduler's last check-in ("Checked at 06:45:
before delivery time 07:00", "Generated the scheduled brief for 2026-09-02 at 07:00; 2/2 emails
sent", or the error) so the owner can see the scheduler is alive without opening Supabase.

### 0.3 Delivery

- **Stored.** `/briefs` lists every brief (date, kind, summary, attention count, status);
  `/briefs/[id]` renders the document with in-app links. People with `settings.manage` also see
  the delivery log there (recipient, sent / failed / skipped, provider id, error).
- **Dashboard card — Bob's Daily Brief** on `/projects`: the newest ready brief's summary, the
  top three attention items with links, *Read the brief* and *Settings*.
- **Email** (Resend): a single-column, 600 px, inline-styled message that reads on a phone —
  Bob's introduction, then each section as short lines with the same links, and a footer with
  *Open in Monarch Admin*, *Projects* and *Settings*. Recipients who are team members whose role
  cannot see money (`budgets.view`) receive a variant without budget figures; addresses that are
  not team members receive the full brief, so put only the owner's and PMs' addresses in the list.
- **Bob** can read it: *"What did this morning's brief say?"* → `get_daily_brief` (date and
  section optional); *"take me to the brief"* / *"open settings"* navigate to the new sheets.

### 0.4 No duplicate briefs, no duplicate emails

A scheduled function retries; two ticks can overlap; a deploy can restart a run half-way. The
design assumes all three:

1. **Claim before work.** The brief row is inserted with `on conflict do nothing` on the unique
   index `(company_id, brief_date, kind)` *before* any data is read. A second run for the same
   local date gets no row and stops. A row that is `failed`, or still `generating` after 15
   minutes (a crashed run), can be taken over — once — by the next tick.
2. **One delivery row per recipient** (`unique (brief_id, recipient_email)`) with a status.
   Rows already `sent` are never sent again. `failed` rows (provider down, bad address) and rows
   `skipped` while email was unconfigured are retried by later ticks, up to three attempts.
3. **Provider idempotency.** Every send carries `Idempotency-Key: brief-<briefId>-<email>`; Resend
   drops a repeated request with the same key even if the status update after a send was lost.
4. **The due check** is *"local time ≥ delivery time and no ready brief exists for today's local
   date"* — not *"local time == delivery time"* — so a missed tick is simply caught by the next
   one and a late tick never produces a second brief.

### 0.5 Scheduler and deployment configuration

1. **Migration**: run `supabase/migrations/0009_daily_brief.sql` after 0008 (SQL editor or
   `supabase db push`).
2. **Environment variables** on the server (Vercel → Settings → Environment Variables):
   `SUPABASE_SERVICE_ROLE_KEY` (the process reads as the system), `NEXT_PUBLIC_SITE_URL` (links in
   the email), `BRIEF_CRON_SECRET` (`openssl rand -hex 32`), `RESEND_API_KEY` and
   `BRIEF_FROM_EMAIL` (a sender on a domain verified in Resend), optionally `BRIEF_SITE_URL` and
   `BRIEF_MODEL`. `ANTHROPIC_API_KEY` is only needed for the narrative. Redeploy.
3. **Scheduler — option A, Supabase pg_cron + pg_net (recommended, no extra vendor):**
   in the SQL editor, `select vault.create_secret('<the same secret>', 'brief_cron_secret');`
   then open `supabase/scheduler/daily_brief_cron.sql`, replace `<your app>` with the deployed
   host, and run it. It enables `pg_cron` and `pg_net` and schedules `monarch-daily-brief` to
   POST `/api/brief/run` every 15 minutes with the secret from Vault (the secret is never written
   into the job definition). The file is not a migration on purpose: it carries deployment data.
   Check: `select jobname, schedule, active from cron.job;` and later
   `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;`.
4. **Scheduler — option B, Vercel Cron:** add to the repository root
   ```json
   { "crons": [{ "path": "/api/brief/run", "schedule": "*/15 * * * *" }] }
   ```
   as `vercel.json` and set `CRON_SECRET` (Vercel sends it as the bearer token automatically; the
   route accepts either `BRIEF_CRON_SECRET` or `CRON_SECRET`). Hobby projects allow one run per
   day: use a daily schedule in UTC just after the delivery time (Central Time is UTC−5 in summer,
   UTC−6 in winter — e.g. `"15 12 * * *"` for a 07:00 brief in summer) or use option A, which has
   no such limit.
5. **Turn it on** in Sheet 14 · Settings: recipients, time, timezone, switches → Save → *Generate &
   send me a test brief*. The next morning the card on `/projects` shows the brief and the
   Settings sheet shows the scheduler's check-ins.

Calling `/api/brief/run` every 15 minutes is cheap: when nothing is due the route reads one
settings table, stamps the check-in and returns. A run is capped at 60 s (`maxDuration`; the
pg_net call times out at 55 s); a company of ordinary size takes a few seconds.

### 0.6 What "Bob says you should look at" is allowed to say

Rules, each over stored rows, each item carrying the figure and a link (`lib/brief/attention.ts`):

| Rule | Severity |
|---|---|
| Overdue tasks on a project (oldest named, count) | medium; **high** when something is more than 7 days overdue |
| Blocked tasks | medium |
| Negative budget variance on a project | medium; **high** when ≥ $1,000 or ≥ 10 % of the budget |
| Over-budget lines (only when the project's variance is not already listed) | medium |
| Budget total above the contract amount | medium |
| Behind schedule / past target date (the Overview's schedule chip) | medium; **high** when past due |
| Active project with no activity for 5 or more days | medium |
| Important incomplete items: urgent or high priority, milestones, overdue inspections | medium; **high** for urgent or > 7 days overdue |
| Subcontractor applications waiting for review · leads waiting | medium |

When the Budget switch is off, the money rules are dropped from the attention list too. A company
with nothing wrong gets an empty section that says so — the composer's test asserts it.

### 0.7 Remaining limitations

- **No public intake forms yet.** `leads` and `subcontractor_applications` exist, are policy-
  protected and audited, and the brief reports them honestly; until an intake form or inbox sheet
  exists (a later phase), those sections read *none* unless rows are added by SQL.
- **Email is Resend only**, and the sender domain must be verified there. Without a key the brief
  is still generated and stored; deliveries are recorded as *skipped*.
- **External recipients receive the full brief** (including money when the Budget switch is on).
  Only team members are checked against `budgets.view`.
- **One scheduled brief per company per local day.** Changing the delivery time to an earlier
  hour after today's brief exists does not produce a second one; a *manual* brief can be generated
  any time and replaces the day's earlier manual brief.
- **Delivery within ±15 minutes** of the time, by design of the tick. A finer tick is a one-line
  change in the cron schedule.
- **The narrative is model-written** (facts-only instructions, short, labelled as Bob's summary).
  The sections beneath it are the record; the narrative is not stored as company fact anywhere.
- **Photo previews** are signed links valid 7 days; an old email's thumbnails expire (the link to
  the Photos sheet does not).
- **No SMS / push delivery**; no per-recipient customisation beyond the money-free variant.

### 0.8 Verification (2026-09-02)

`npm run check` — typecheck clean, ESLint 0 errors (the same 7 pre-existing warnings), 44 unit
tests passing (schedule due-check and timezones, every attention rule, composer sections and
money stripping, email HTML escaping). `npm run build` — `/api/brief/run`, `/briefs`,
`/briefs/[id]`, `/settings` compile. `npm run db:test` — migrations 0001–0009 and every policy
scenario pass, including the new *Daily brief* block (owner saves settings, service role claims a
brief and a delivery exactly once under `on conflict do nothing`, PM reads but cannot write
settings or briefs, employee sees nothing but applications). Not exercised here: a live Resend
send and a live narrative call (no keys in this environment).

---

## 1. Phase 3 — Bob becomes the assistant and navigation layer of Monarch Admin

Bob is no longer an estimator chatbot running in the browser with a pasted API key. He is one
assistant on every page — floating panel everywhere, full width on **Sheet 15 · `/bob`** — who
knows where you are, what you may see, and what the company's database says *right now*. He
answers project questions from live data, navigates the app through a fixed route map, performs
structured actions through typed tools, asks for confirmation before anything sensitive, and
keeps three kinds of memory strictly apart. His personality, voice input and visual identity are
unchanged; the estimator tools he always had now run server-side against the shared database.

| Ask | What happens |
|---|---|
| "How are we doing on the Smith project?" | `search_projects` → `get_project_summary`: phase, progress (with source), schedule health, money (if allowed), work in progress / overdue / upcoming, latest notes, recent changes — read at that instant, summarised in a few lines |
| "How much do we have left?" (inside a project) | The page's project is the context; `get_project_budget` answers from the budget as of now |
| "What projects are over budget?" · "Which projects are behind?" | `list_projects` with `over_budget` / `behind_schedule` — the same figures Overview and Budget show |
| "What is due this week?" · "What did we finish yesterday?" | `get_project_tasks` with `due: this_week` / `completed: yesterday`, across every visible project or the current one |
| "Who changed this budget?" · "What changed this week?" | `get_recent_activity` with kind / period — actor, sentence, old → new values, and whether it came via Bob |
| "Take me to the estimator" · "Open the Smith project" · "Show me progress pictures" | `navigate_to` → the app resolves the route; the panel navigates; Bob adds the key facts |
| "Add a task for the trusses, due Friday" · "Note that the framing inspection passed" · "Mark the foundation inspection complete" | `create_task` / `create_project_note` / `update_task_status` — done, one-line confirmation, recorded in Activity with your name and *via Bob* |
| "Set the electrical budget to $30,000" · "Delete the drywall task" · "Make Bea a project manager" | The tool returns *needs_confirmation*; a card appears: **Confirm** / **Cancel** (10-minute expiry). Nothing changes until you press Confirm |
| "Roofing is 25k total" · "How many 2x4s for a 20×20 garage?" | The estimator tools (unchanged behaviour), now applied to the project's sheet in the database and reflected on the open screen |

### 1.1 Bob architecture

```
Browser ─ BobChat panel (components/BobChat.tsx) ──────────────────────────────────┐
  context: route, project id, tab            NDJSON stream: status · delta · event  │
  renders: bubbles, event lines, navigate    · navigate · confirm · refresh · done   │
  chips, confirmation cards; router.push;                                           │
  refresh bus → open screens reload                                                 │
        │ POST /api/bob {message, conversationId, context}     POST /api/bob/confirm │
        ▼                                                      GET|POST /api/bob/conversations
Server ─ app/api/bob/*  (Node runtime, force-dynamic)
  loadBobSession()  ── session cookie → the PERSON's Supabase client (RLS) + my_context() capabilities
  toolsFor(can)     ── registry filtered by capability BEFORE the model sees it
  buildStableBrief  ── identity · app map · grounding · context · action · memory · security rules
                       (+ estimator rules and cost/framing knowledge when the role may see estimates)
                       → cached by Anthropic (cache_control)
  buildDynamicContext ─ now · person · role · capabilities · page · current project digest
                       (read from project_summary this instant) · preferences · thread summary
                       · sheet snapshot on the Estimate tab
  runBobTurn()      ── @anthropic-ai/sdk messages.stream: text deltas → client; tool_use →
                       registry.runTool → permission re-check → guard (confirmation gate) →
                       execute (person's client) → tool_result → repeat (≤ 12 rounds)
  memory            ── bob_conversations / bob_messages append; rolling summary when long
        │
        ▼
Supabase ─ tables, RLS, triggers: audit_log rows stamped source = 'bob'
```

- **`lib/bob/server/registry.ts`** — the boundary. `ALL_TOOLS` is the union of the tool modules;
  `toolsFor(can)` filters by `requires` (any-of); `runTool()` re-checks, runs the guard, executes,
  emits events, serialises results (capped), and turns every failure into a tool result the model
  can explain. No tool receives raw SQL, a shell, or a service-role client.
- **`lib/bob/server/run.ts`** — the loop: streams text, handles `tool_use`, `pause_turn` (web
  search), `refusal`, `max_tokens`; passes assistant content back unchanged so thinking blocks stay
  valid; accumulates usage.
- **`lib/bob/server/context.ts`** — the per-turn context block; **`lib/bob/knowledge.ts`** — the
  stable brief. **`lib/bob/server/memory.ts`** — threads, history, summaries, preferences, daily
  cap. **`lib/bob/server/confirm.ts`** — pending actions. **`lib/bob/server/data.ts`** — the read
  queries (all as the person). **`lib/bob/server/resolve.ts`** — names → rows with clarifying
  errors.
- **Pure, unit-tested pieces** (`lib/bob/*.ts`, `node --test`): `protocol` (stream events,
  context from location), `routes` (the safe route map), `match` (project / task / member matching
  and the ambiguity rule), `guard` (sensitivities, previews, "large change"), `time` (company-
  timezone date ranges), `digest` (money / schedule / flags from `project_summary`).
- **Client** — `components/BobChat.tsx` (streaming reader, confirmation cards, navigation chips,
  "+ New" conversation, voice input), mounted once in `app/(app)/layout.tsx`; `/bob` renders it
  full width. `lib/data/refresh-bus.ts` lets `useLiveRows` and `useProject` reload when Bob changed
  rows on the server.

### 1.2 Available commands and tools

Tools are offered to the model only when the person holds one of the listed capabilities
(Owner has all). *Guarded* = never runs without a Confirm.

| Group | Tool | Needs | What it does |
|---|---|---|---|
| Navigation | `navigate_to` | — (destination's own capability) | Opens `dashboard`, `projects`, `project`/`overview`, `estimator`/`estimate`, `budget`, `progress`, `tasks`/`checklists`, `plans`/`files`, `photos`, `notes`, `activity`, `team`, `subcontractors`, `guide`, `bob`; `applications` refuses with an explanation (not built) |
| Projects | `search_projects` | — | Fuzzy lookup by name, client, address, `P-0007` |
| | `list_projects` | — | `all` · `open` · `active` · `over_budget` · `behind_schedule` · `overdue_tasks` · `complete` · `on_hold` |
| | `get_project_summary` | — | The full "how are we doing" digest |
| | `get_project_progress` | — | Phases, dates, checklist completion, figures, schedule |
| | `set_project_status` | `projects.edit` | Status change; **guarded** when archiving |
| | `set_project_dates` | `projects.edit` | Start / target dates |
| | `set_manual_progress` | `progress.override` | The manager's figure (or clear it), with a note |
| Budget | `get_project_budget` | `budgets.view` | Contract, lines, totals, variance; focus on a category |
| | `set_budget_line` | `budgets.edit` | **Guarded** (money): budgeted / committed / spent of a line; creates the line if new |
| | `set_contract_amount` | `budgets.edit` | **Guarded** (money) |
| Tasks | `get_project_tasks` | — | Filters: status, due (overdue / today / this_week / next 7 / next 14), completed (today / yesterday / this_week / last_week / last 7 / last 30), assignee (`me` or a name), search; one project or all |
| | `create_task` | `tasks.manage` | Title, description, notes, trade, priority, dates, assignee, subcontractor, phase, checklist — names resolved server-side |
| | `update_task_status` | `tasks.manage` or `tasks.complete` | By id or title |
| | `update_task` | `tasks.manage` | Any field |
| | `delete_task` | `tasks.manage` | **Guarded** (delete) |
| Notes | `get_project_notes` | — | Newest first, search |
| | `create_project_note` | `notes.create` | Author- and time-stamped; optional task / phase link |
| | `delete_note` | author or `notes.manage` | **Guarded** (delete), soft delete |
| Files | `get_project_photos` | `files.view` | Newest first, phase / period filters, one-hour links |
| | `search_files` | `files.view` | Plans, documents, receipts, photos by name / caption; one project or all |
| Activity | `get_recent_activity` | `audit.view_project` or `audit.view_all` | Period, kind, minor edits toggle; who / what / when / via / old → new |
| Team | `get_team` | `team.view` | Members, roles, last seen; who is on a project |
| | `change_member_role` | `team.manage` | **Guarded** (permissions); the database's owner rules still apply |
| | `get_subcontractors` | `subcontractors.view` | Directory by trade / words |
| | `add_subcontractor` | `subcontractors.manage` | New directory entry |
| Estimate | `get_estimate_sheet` | `estimates.view` | The sheet snapshot with item ids |
| | `add_item`, `update_item`, `add_option`, `add_section`, `set_settings`, `set_project_info` | `estimates.edit` | The estimator tools, unchanged behaviour, now on the database sheet |
| | `remove_item`, `remove_section` | `estimates.edit` | **Guarded** (delete) when the line / section holds priced or checked-off work; free otherwise (job-intake trimming) |
| | `estimate_house`, `estimate_wall` | `estimates.view` (`insert` needs edit) | Takeoffs |
| Memory | `remember_preference`, `forget_preference` | — | `preferred_name`, `answer_style`, `default_project`, `note` — this person only |
| Web | Anthropic `web_search` / `web_fetch` | `estimates.edit` | Product links only (server tools, max 4 uses) |

### 1.3 Permission system

Three layers, in order:

1. **Offer** — `toolsFor(session.can)` removes every tool whose `requires` the person lacks before
   the request to the model is built, so a Read-only member's Bob does not even know `delete_task`
   exists. Money fields are omitted from summaries when the role lacks `budgets.view`, and the brief
   tells Bob never to quote money he was not given.
2. **Call** — `runTool()` re-checks `requires` on every call (and again, with a freshly loaded
   session, when a pending action is confirmed).
3. **Database** — every read and write is made with the person's own JWT, so the row-level
   security policies and triggers of phases 1–2 decide for real (`has_cap`, `on_project`, the
   task complete-only guard, the progress override guard, the owner rules on memberships).

Using Bob at all needs the new **`bob.use`** capability (granted to every role by default; the
Owner can revoke it per role in `role_permissions`). Conversations, pending actions and
preferences are readable and writable only by their own person (RLS: `user_id = auth.uid()`).

### 1.4 Confirmation system

A tool may declare a `guard(ctx, input)`. In the chat loop the guard runs *instead of* `execute`:
it resolves names to ids, reads the current values, and returns a sensitivity and a plain-English
preview — e.g. *"Change Electrical budget from $26,000 to $28,500, +10% (large change) (Smith
kitchen)"*, *"Delete task "Set trusses" (In Progress, due 2026-09-12)"*, *"Change Bea Estimator's
role from estimator to project manager"*. The registry stores it in `bob_pending_actions`
(status `pending`, expires in 10 minutes, content frozen by trigger), streams a `confirm` event,
and hands the model `{status: "needs_confirmation", action_id, preview}`. Bob tells the person what
is queued; the card shows **Confirm** / **Cancel**.

Confirming is `POST /api/bob/confirm` — a separate authenticated request that re-loads the
session, re-checks the tool's capabilities, executes with `confirmed: true`, records
`executed | declined | expired | failed` with the result, appends an event line to the thread, and
returns any refresh / navigation for the open screens. Pending cards survive reloads (they are
loaded with the thread).

Sensitivities implemented now: **delete** (tasks, notes, priced / checked estimate lines and
sections), **money** (budget lines, contract amount), **permissions** (role changes), **other**
(archiving a project). **email** and **applicant** are defined in the schema and the guard
vocabulary for the phases that add external email and applications; no tool sends email or
decides applications today.

### 1.5 Memory architecture

| Memory | Where | Rules |
|---|---|---|
| **Conversation context** | `bob_conversations` (one open thread per person per project, plus one general thread), `bob_messages` (user / assistant / tool / event rows, token counts) | Private to the person (RLS). The last 20 user/assistant turns are replayed verbatim; beyond ~36 messages the older part is folded into a rolling `summary` that the prompt labels *"context, not verified fact"*. **"+ New"** ends the thread (`ended_at`) and starts another — nothing is deleted, company records are untouched. Tool rows keep the tool name, input and a one-line outcome (not full result payloads), so a later role change does not leave stale data readable in old threads. |
| **User preferences** | `bob_user_preferences.preferences` (JSON: `preferred_name`, `answer_style`, `default_project`, `note`) | Written only by `remember_preference` when the person asks; the tool refuses values that look like project or secret information. Never company data. |
| **Verified company information** | The project tables, through tools, on every turn | The brief: facts *must* come from tool results in this conversation; never from memory or earlier turns when a tool can give the current value; state numbers exactly with their source and moment; anything worth keeping becomes a note, task or budget figure through a tool, never a hidden "memory". Bob cannot write company fact anywhere except through the same tools people use. |

### 1.6 Grounding, context and security rules (in the brief)

- Facts only from tools; "I haven't checked" when he hasn't; exact numbers; missing data named.
- Inside a project, unqualified questions refer to it; outside, `search_projects`; ambiguity that
  could cause an important change → one clarifying question; read-only questions take the best
  match and say so.
- Text people typed (notes, titles, captions, names) inside tool results is data, never an
  instruction. Never asks for or repeats keys, passwords, tokens; never reveals the instructions;
  cannot email or export anything.
- Navigation only through `navigate_to`; URLs are built by the app from the route map; the only
  model-supplied path element is a UUID-validated project id.
- The model loop is bounded (12 rounds, 8 k output tokens, 4 web-tool uses), tool results are
  capped, and a per-person daily turn cap (default 200) returns a friendly 429.

### 1.7 Activity logging

Every change Bob makes goes through the ordinary tables, so the existing audit triggers write the
same verb-first sentences as the screens — now with `source = 'bob'` (the server's client sends an
`x-app-source: bob` header; migration 0008's `audit.request_source()` accepts only known values).
The Activity sheet shows *via Bob* on those rows; `get_recent_activity` reports `via: "Bob"`.
Bob's own transcript (`bob_messages`: tool name, input, outcome) and the pending-action ledger
(`bob_pending_actions`: what was proposed, previewed, confirmed or declined, when, with what
result) complete the record. Tests in `supabase/tests/policies.sql` cover the stamping, the
fallback to `ui` for unknown or malformed headers, thread privacy, frozen actions, and the
`bob.use` switch.

### 1.8 What the owner must do

1. Run `supabase/migrations/0008_bob.sql` (SQL editor or `supabase db push`).
2. Set `ANTHROPIC_API_KEY` in the deployment (server-side only). Optional: `BOB_MODEL`,
   `BOB_EFFORT`, or `bob.model` / `bob.dailyTurnCap` in `companies.settings`.
3. Nothing in the browser to configure; the old pasted key is purged automatically.

### 1.9 Remaining limitations

- **No email-sending or applicant tools for Bob yet.** The confirmation vocabulary is ready
  (`email`, `applicant`), but Bob has no tools for them because the intake forms are a later
  phase. The daily brief exists since phase 4 (§0) and Bob reads it with `get_daily_brief`; asked
  for the applications inbox, Bob says it is not built and offers the subcontractor directory.
- **No photo upload or file upload through Bob** — he finds, lists and opens files; uploading
  stays on the Photos / Plans sheets (it needs the device's camera or file picker).
- **Single company per person** (as in phases 1–2). **Daily cap and model** are set by SQL in
  `companies.settings` until the Settings sheet exists.
- **Rolling summary is model-written** and marked as context; it can be wrong, which is why Bob is
  told to re-check anything he needs from it.
- **Refusal fallbacks** (Anthropic's server-side fallback chain) are not enabled; a refusal
  returns a short "I can't help with that one" instead of retrying on another model.
- **Realtime for Bob's own tables** is not needed (threads are loaded per page) and not enabled.
- **The web tools** are only for product links and only for people who can edit estimates; their
  results are never treated as company fact.
- **Confirmation cards live in the chat**; there is no separate "pending actions" sheet yet.

### 1.10 Verification (2026-09-02)

`npm run check` — typecheck clean, ESLint 0 errors (7 pre-existing warnings in inherited
components), 35 unit tests (13 existing + 22 new) passing. `npm run build` — all routes compile
(`/api/bob`, `/api/bob/confirm`, `/api/bob/conversations`, `/bob`, `/subcontractors` dynamic).
`npm run db:test` — migrations 0001–0008 apply on a local PostgreSQL 16 and every policy scenario
passes, including the new Bob block. Not exercised here: a live model round-trip (no API key in
this environment) — the loop, streaming and tool plumbing are typed against `@anthropic-ai/sdk`
0.122 and follow its documented shapes.

---

## 2. Phase 2 — the project management experience

Opening a project now answers the site questions directly, on a phone or a desktop, in the
estimator's own visual language. Nine tabs, in this order: **Overview · Budget · Estimate ·
Progress · Plans & files · Photos · Tasks & checklist · Notes · Activity**.

| Question | Where it is answered |
|---|---|
| Where are we? | Overview "Where are we" strip: current construction phase, next phase, phases complete, progress meter, schedule chip |
| What has been completed? | Progress → Completed phases; task counts; Activity feed |
| What is being worked on now? | Overview "Being worked on now"; Progress → Current work (tasks In Progress) |
| What is next? | Overview "Coming up · next 14 days"; Progress → Upcoming work; next phase |
| Ahead or behind schedule? | Schedule chip: straight-line expected % from start → target vs. displayed progress (±5 pt tolerance), days ahead/behind, past-due |
| Under or over budget? | Overview Money card and Budget "Budget position": contract, approved, committed, spent, remaining, variance |
| What changed recently? | Overview "What changed recently"; Activity feed |
| What does the jobsite look like? | Overview latest six photos; Photos sheet |

**Overview** shows name, address, customer (+ phone / email), project manager, start and target
dates, current phase, overall progress with its source, contract / approved / committed / spent /
remaining / variance, upcoming and overdue work, the latest note, latest photos, recent changes,
and who is assigned to the project.

**Progress** shows the displayed percentage with both figures spelled out — *Calculated
progress: 62 %* and *Manual project-manager progress: 65 % · Johnny · Sep 2 · "Framing ahead of
the checklist"* — a schedule panel (time elapsed vs. work complete), the phase rail with
per-phase checklist completion and status control, current / upcoming / delayed-blocked lists,
and completed phases with dates. Roles with `progress.override` (owner, admin, project manager
by default) may set or clear the manual figure; the calculated figure is never overwritten.

**Photos**: phone-first upload (Take photo / Choose photos), phase, caption and optional related
task per batch, EXIF date, uploader; Latest (14 days) / All, filter by phase and by month; grouped
by day; detail view with caption / phase / task editing and delete.

**Tasks & checklist**: title, description, notes, trade, assigned user, assigned subcontractor
(with inline "add a subcontractor"), priority, To Do / In Progress / Blocked / Complete, start,
due and completed dates; checklist view (tick items) and a status board; filters (mine, status);
reusable templates — 13 built-in construction checklists (Preconstruction → Complete) plus
company templates ("Save as template"); one click to set up the standard phases with their
checklists. Checklist completion drives the calculated progress.

**Notes**: timestamped, author-stamped, optional links to a task, budget item, photo / file and
phase, shown as chips. **Activity**: site-log sentences with the actor first ("Sarah uploaded 8
progress photos", "Mike completed Foundation Inspection", "Johnny changed Electrical budget from
$26,000 to $28,500", "moved task "Plumbing" from To Do to In Progress"), grouped by day, photo
bursts folded into one line, filter by kind; line-level estimate edits are classified *minor*
and hidden unless "detailed edits" is on.

Schema additions (`supabase/migrations/0007_project_management.sql`): `project_phases`,
`subcontractors`, `checklist_templates(+items)`; tasks gain trade / start_date / notes / phase /
subcontractor; task lists gain a phase; files gain phase and task; notes gain task / budget line /
file / phase links; budgets gain `contract_amount`; projects gain `manager_id` and the manual
progress columns; `audit_log.kind` (major / minor); `project_summary` v2 with phase, work
counts, money and `display_progress_pct` + `progress_source`. New capabilities:
`progress.override`, `subcontractors.view`, `subcontractors.manage` (seeded into existing
companies). Progress is now calculated from tasks and checklist items only; estimate check-offs
are shown separately as "materials handled".

## 3. What phase 1 delivered

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
| 8. Database-backed project progress | ✅ | `projects.progress_pct` maintained by triggers from tasks / checklist items (+ manual override with source, phase 2) |
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

## 4. What is now database-backed

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
- **Construction phases**: name, order, status, planned and actual dates, weight.
- **Tasks & checklists**: task lists (with phase), tasks (title, description, notes, trade,
  status, priority, assignee, subcontractor, phase, start / due / completed dates, completed by).
- **Checklist templates**: company-authored templates and items (built-ins ship in code).
- **Subcontractors**: directory (name, trade, contact, status).
- **Project progress**: `projects.progress_pct` calculated from tasks; `manual_progress_pct`
  with who / when / why; the summary view exposes `display_progress_pct` and `progress_source`.
- **Notes**: body, author, timestamp, pinned, edited, links to task / budget line / file / phase.
- **Files & photos**: metadata rows (kind, caption, taken-at, uploader, phase, related task);
  bytes in Storage buckets `plans` and `photos` at `{company}/{project}/{file-id}.ext`,
  thumbnails generated on the device.
- **Budgets**: contract amount, lines (budgeted / committed / spent).
- **Audit / activity**: field-level old → new for projects, estimates, items, prices, budgets,
  tasks, notes, files, memberships, permissions — with actor, project and a summary such as
  *"Budget for Electrical (budgeted) changed from $26,000.00 to $28,500.00"*, and `source`
  (`ui` or `bob`) saying whether the change came through the screens or through Bob.
- **Bob** (phase 3): `bob_conversations` / `bob_messages` (conversation memory, private to each
  person), `bob_pending_actions` (the confirmation gate), `bob_user_preferences` (what each person
  asked Bob to remember about themselves). None of these is ever a source of company fact.

## 5. What still lives in the browser (and why that is fine)

| Item | Kind | Notes |
|---|---|---|
| Supabase session cookie | auth | Standard; managed by `@supabase/ssr`. |
| Which tab is open, collapsed estimate sections, open option drawers | UI preference | Harmless; resets on reload. |
| `agromex.quotes.v1` (the OLD estimator's data) | legacy | Read-only. The Projects sheet offers *"Import N projects from this browser"*; after import it is marked imported and never written again. Safe to clear once imported. |
| ~~Bob's chat history (`monarch.bob.chat.*`)~~ | removed | Conversations now live in `bob_conversations` / `bob_messages`; the old keys are purged on first load. |
| ~~Bob's AI provider key (`monarch.bob.v1`)~~ | removed | The key is a server environment variable (`ANTHROPIC_API_KEY`); the browser never holds one. The old key is purged from `localStorage` on first load. |

There is **no** business record whose only copy is in a browser, and **no** secret in the browser.

---

## 6. Architecture decisions

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
14. **Manual progress never overwrites calculated progress.** Two columns, two labels, one
    `display_progress_pct` chosen by a stated rule (manual when set). The override is guarded by
    a capability (`progress.override`) enforced by a trigger, not just the UI.
15. **Activity is a site log, not a click log.** Summaries are verb-first sentences rendered at
    write time; every row carries `kind` = major / minor; the feed folds bursts (eight photo
    uploads → one line) and hides minor line-level estimate edits behind a toggle.
16. **Phases are data, checklists are templates.** 13 standard phases and their checklists ship
    in code (`lib/checklists.ts`); applying one creates a task list bound to the phase and tasks
    inherit the phase, so per-phase completion falls out of the same rows.
17. **Branding from one file**: `app.config.ts` (Monarch Development LLC, MONARCH wordmark, crown
    glyph in the brand gold). Everything else stays monochrome per the estimator's design rule.
18. **Toolchain**: TypeScript pinned to 5.9 (the repo had the pre-release 7.0, which
    typescript-eslint does not support yet). ESLint uses `eslint-config-next` 16; its new
    React-Compiler hook rules (`set-state-in-effect`, `refs`, `immutability`) are **warnings** because
    they flag long-standing patterns inside the inherited estimator components, which this phase
    leaves untouched on purpose. New code satisfies them. `lint` reports 0 errors / 10 warnings.
19. **`uid()` now returns `crypto.randomUUID()`** — the one edit inside the estimator's shared
    logic. Every template, takeoff insert and Bob tool automatically produces database-ready ids.

Phase 3 (Bob):

20. **Bob runs only on the server, as the person.** `/api/bob` verifies the session cookie, loads
    the person's capabilities with `my_context()`, and runs the model loop with a server-held
    `ANTHROPIC_API_KEY`. Every database read and write Bob makes uses the person's own JWT, so
    row-level security applies exactly as on the screens; Bob has no service-role access.
21. **Tools, not SQL or code.** The model never sees a database or a shell. It sees a registry of
    typed tools (name, description, JSON schema, required capabilities, kind, optional guard,
    execute). Tools are filtered by the person's capabilities *before* they are offered to the
    model, re-checked at call time, and the database checks a third time.
22. **Guarded tools stop at a confirmation gate.** Deleting information, budget and contract
    changes, role changes, archiving a project, removing priced or checked-off estimate lines
    never execute in the chat loop: they write `bob_pending_actions` with a plain-English preview
    and return `needs_confirmation`. Confirming is a separate authenticated request that re-loads
    the person's capabilities, executes, and records the outcome. Actions expire in 10 minutes and
    are frozen after insert (trigger).
23. **Three memories, kept apart.** Conversation context (`bob_conversations` / `bob_messages`,
    private per person, ended not deleted by "New conversation", rolling summary for long
    threads); user preferences (`bob_user_preferences`, only what a person asked Bob to remember
    about how they work); verified company information (the project tables, read through tools on
    every turn). The brief tells Bob explicitly that chat memory is never company fact and that
    anything worth keeping becomes a note, task or budget figure.
24. **Navigation through a fixed route map.** `navigate_to` takes a destination key; the URL is
    built by `lib/bob/routes.ts` from that map, and the only value that can come from the model
    is a project id, validated as a UUID. Unbuilt destinations (applications) refuse and explain.
25. **Context comes from the page.** The chat panel sends the current route, project id and tab;
    the server reads that project's summary at that instant into the prompt (money only when the
    role may see it) and, on the Estimate tab, the live sheet snapshot. Inside a project,
    unqualified questions refer to it; outside, Bob searches and asks when several match.
26. **Server-side changes announce themselves.** Bob's writes are stamped `source = 'bob'` in
    `audit_log` (via the `x-app-source` request header read by the audit trigger) and pushed to the
    open screens through a small in-page refresh bus, because the estimate hook deliberately
    ignores its own realtime echoes.
27. **Cost controls without a settings UI yet.** A per-person daily cap (default 200 turns,
    `companies.settings.bob.dailyTurnCap`), prompt caching of the stable brief, compact tool
    results (capped at 14 k characters), and a rolling summary instead of replaying whole threads.

---

## 7. Supabase configuration (what the owner must do)

1. **Create a Supabase project** (Pro plan recommended once real data lives there — no pausing,
   daily backups). Region close to Dallas–Fort Worth.
2. **Run the migrations** in order, either with the CLI (`supabase db push` after
   `supabase link`) or by pasting each file from `supabase/migrations/` into the SQL editor:
   `0001_foundation.sql` → `0002_projects_estimates.sql` → `0003_budgets_tasks_notes_files.sql` →
   `0004_audit.sql` → `0005_storage.sql` → `0006_realtime.sql` → `0007_project_management.sql` →
   `0008_bob.sql` → `0009_daily_brief.sql`. (Already on 0008? Run 0009 alone — it is additive:
   the daily-brief tables, `leads`, `subcontractor_applications` and the `briefs.view` /
   `leads.*` capabilities. Already on 0007? Run 0008 then 0009.)
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
   - `ANTHROPIC_API_KEY` — **server only**, for Bob (console.anthropic.com → API keys). Without it
     the app works and Bob says he is not configured.
   - `BOB_MODEL` / `BOB_EFFORT` (optional) — default `claude-opus-5` / `medium`; a company can also
     set `bob.model` and `bob.dailyTurnCap` in `companies.settings` (JSON) from the SQL editor.
   - `BRIEF_CRON_SECRET` — **server only**; the bearer token the scheduler presents to
     `/api/brief/run` (`openssl rand -hex 32`). With Vercel Cron, `CRON_SECRET` works as well.
   - `RESEND_API_KEY` + `BRIEF_FROM_EMAIL` — **server only**; email delivery of the daily brief
     through Resend, from a sender on a verified domain. Without them briefs are generated and
     stored, and every delivery is recorded as *skipped*.
   - `BRIEF_SITE_URL` / `BRIEF_MODEL` (optional) — link base for the email (defaults to
     `NEXT_PUBLIC_SITE_URL`) and the model for the brief's narrative (defaults to `BOB_MODEL`).
8. **Storage**: buckets `plans` and `photos` are created by migration 0005 (private). Raise the
   per-file limit on `plans` in the dashboard if plan sets exceed 50 MB.
9. **Realtime**: migration 0006 adds the shared tables to the `supabase_realtime` publication.
   Check Database → Replication shows them if live updates do not appear.
10. **Backups**: enable daily backups (Pro). The old JSON export button is gone on purpose; the
    database is the backup source now.
11. **Scheduler for Bob's Daily Brief**: after the deploy, store the secret in Vault and run
    `supabase/scheduler/daily_brief_cron.sql` (or add a Vercel Cron). Step by step, with the
    checks, in §0.5.

Deploying: connect the GitHub repo to Vercel, set the variables above, build command `next build`.
CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build and the database tests.

---

## 8. How to run locally

```bash
cp .env.example .env.local        # fill in the Supabase values
npm install
npm run dev                       # http://localhost:3000 → /login
npm run check                     # typecheck + lint + unit tests
npm run db:test                   # migrations + policy tests on a local PostgreSQL 16
```

`db:test` needs `psql` and a running PostgreSQL 16 reachable through `PGHOST`/`PGPORT`/`PGUSER`.

---

## 9. Known limits and what comes next

- **Schedule health is straight-line** (elapsed time vs. work complete). Phase planned dates are
  stored and shown; a phase-weighted expected curve is a later refinement.
- **Subcontractors** are a directory plus an applications table (phase 4); the public application
  form and the review inbox are a later phase.
- **Activity grouping** happens in the feed (photo bursts); the database keeps one row per event.

- **Bob** is server-side and app-wide now (phase 3, §1). What he cannot do yet is listed in §1.9.
- **Bob's Daily Brief and the Settings sheet** are built (phase 4, §0). **Lead and application
  intake forms, a full dashboard, and the permission editor UI** are later phases (plan §13). The
  Team sheet already lets Owners/Admins change roles.
- **Estimates have one version per project** for now; `estimates.version` exists for
  sent/accepted versions later.
- **Concurrent edits** to the same line are last-write-wins per row (shown via realtime).
- **Offline**: not supported yet; uploads need a connection.
- The research datasets and premade checklists remain in code (`lib/research*.ts`,
  `lib/templates.ts`) by design.

## 10. File map

```
app.config.ts                       company identity (Monarch)
proxy.ts                            route protection (Next 16 proxy)
app/(auth)/login, set-password      sign-in and invitation landing
app/auth/callback/route.ts          auth link exchange
app/(app)/layout.tsx                session gate + SessionProvider
app/(app)/projects/                 Sheet 02 · list, workspace with tabs
app/(app)/team/page.tsx             Sheet 13 · members, invitations, profile
app/(app)/guide/page.tsx            unchanged cost guide (now protected)
app/(app)/bob/page.tsx              Sheet 15 · Bob full page
app/(app)/subcontractors/page.tsx   Sheet 06 · subcontractor directory
app/(app)/briefs/                   Sheet 16 · every daily brief, and one brief with its delivery log
app/(app)/settings/page.tsx         Sheet 14 · Settings: Bob's Daily Brief
app/api/brief/run/route.ts          the scheduler's entry point (secret) and the manual test run
components/brief/                   BriefView (the document), BriefCard (dashboard card)
lib/brief/                          types, schedule (due check), attention (rules), compose, render — pure, unit-tested
lib/brief/server/                   gather (service-role reads), narrative, email (Resend), run (the process)
lib/data/briefs.ts                  client API: briefs, deliveries, settings, "run now"
supabase/scheduler/daily_brief_cron.sql   pg_cron + pg_net job (run by hand after deploying)
app/api/bob/route.ts                Bob turn (NDJSON stream), server-side model loop
app/api/bob/confirm/route.ts        confirmation gate: confirm / decline a pending action
app/api/bob/conversations/route.ts  the open thread for a page; "New conversation"
components/BobChat.tsx              the chat panel (floating on every page, full width on /bob)
lib/bob/protocol.ts, routes.ts, match.ts, guard.ts, time.ts, digest.ts   pure, unit-tested
lib/bob/knowledge.ts                Bob's standing brief (app map, rules, estimating knowledge)
lib/bob/tools.ts                    the estimator tools (pure transitions on the sheet)
lib/bob/server/                     session, data queries, registry, tools/* (incl. briefs), context, memory, confirm, run
lib/data/refresh-bus.ts             in-page "these tables changed" signal
app/api/team/invite/route.ts        invitation (server-only service key)
components/shell/                   NotConfigured / NoAccess / Bootstrap gates
components/project/                 Overview, Progress, Budget, Tasks (+TaskEditor), Photos, Files, Notes,
                                    Activity, ProjectContext (shared live data), bits (meter, rail, thumbs)
lib/checklists.ts                   13 standard phases + built-in checklists + trades
lib/data/phases.ts, subcontractors.ts, progress.ts   phase-2 data modules and pure helpers
components/ui.tsx                   TopBar with user chip, Crown, shared state marks
lib/data/                           Supabase clients, types, diff writer, hooks, module APIs
lib/legacy-store.ts                 read-only reader for the old browser data
supabase/migrations/                0001–0009 (0008 = Bob, 0009 = daily brief, leads, applications)
supabase/tests/                     local-stubs.sql, policies.sql, run-local.sh
```
