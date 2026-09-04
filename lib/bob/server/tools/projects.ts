import "server-only";
import type { FileRow, Json, ProjectStatus, ProjectSummaryRow, TaskRow } from "../../../data/database.types";
import { STATUS_LABELS } from "../../../data/task-labels";
import { currentPhase, groupActivity, nextPhase } from "../../../data/progress";
import { uid } from "../../../format";
import { STATUS_TEXT, pct, projectFlags, projectHeadline, projectMoney, projectNumber, projectSchedule } from "../../digest";

import { findLikelyDuplicate, matchByName, matchProjects } from "../../match";
import { addDays, isYmd } from "../../time";
import {
  loadActivity,
  loadBudget,
  loadFiles,
  loadMembers,
  loadNotes,
  loadPhases,
  loadProjectMemberIds,
  loadSubcontractors,
  loadTasks,
  listSummaries,
  getSummary,
  profilesById,
  nameOf,
  type Member,
} from "../data";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, bool, intIn, num, schema, str, truncate, type ToolCtx, type ToolDef } from "../types";

const PROJECT_STATUSES: ProjectStatus[] = ["lead", "estimating", "active", "on_hold", "complete", "archived"];
const PROJECT_TYPES = ["remodel", "new-build"] as const;

/** Resolve a manager name to a member; null (not thrown) on no/ambiguous match — a project is still created without one. */
function resolveManager(ctx: ToolCtx, members: Member[], query: string): { id: string; name: string } | null {
  if (/^(me|myself|i)$/i.test(query.trim())) return { id: ctx.session.userId, name: ctx.session.displayName };
  const active = members.filter((m) => m.isActive);
  const m = matchByName(query, active.map((x) => ({ ...x, id: x.userId })), (x) => `${x.name} ${x.email ?? ""}`);
  if (m.length === 0) return null;
  const [top, second] = m;
  if (top.score >= 60 && (!second || top.score - second.score >= 15 || top.score === 100)) return { id: top.project.userId, name: top.project.name };
  return null;
}

export function taskLine(t: TaskRow, names: { member: (id: string | null) => string; sub: (id: string | null) => string }, today: string) {
  const who = names.member(t.assignee_id) || names.sub(t.subcontractor_id) || null;
  return {
    id: t.id,
    title: t.title,
    status: STATUS_LABELS[t.status],
    due: t.due_date,
    overdue: t.status !== "done" && Boolean(t.due_date && t.due_date < today),
    assigned_to: who,
    trade: t.trade || null,
    priority: t.priority !== "normal" ? t.priority : null,
  };
}

export async function nameLookups(ctx: ToolCtx) {
  const { sb, companyId, can } = ctx.session;
  const members: Member[] = await loadMembers(sb, companyId).catch(() => []);
  const subs = can("subcontractors.view") ? await loadSubcontractors(sb, companyId).catch(() => []) : [];
  return {
    members,
    subs,
    member: (id: string | null) => (id ? (members.find((m) => m.userId === id)?.name ?? "") : ""),
    sub: (id: string | null) => (id ? (subs.find((s) => s.id === id)?.name ?? "") : ""),
  };
}

function projectCard(s: ProjectSummaryRow, canMoney: boolean, now: Date) {
  const f = projectFlags(s, now);
  const sched = projectSchedule(s, now);
  const base = {
    id: s.id,
    number: projectNumber(s),
    name: s.name,
    client: s.client_name || null,
    type: s.type,
    status: STATUS_TEXT[s.status],
    phase: s.current_phase_name,
    progress: pct(s.display_progress_pct),
    progress_source: s.progress_source,
    schedule: sched.status === "no_dates" ? "no dates" : sched.label,
    start_date: s.start_date,
    target_end_date: s.target_end_date,
    tasks: { total: s.tasks_total, done: s.tasks_done, in_progress: s.tasks_in_progress, overdue: s.tasks_overdue, blocked: s.tasks_blocked },
    flags: { behind_schedule: f.behind || f.pastDue, overdue_tasks: f.overdueTasks, blocked_tasks: f.blockedTasks },
    updated_at: s.updated_at,
  };
  if (!canMoney) return base;
  const m = projectMoney(s);
  return {
    ...base,
    flags: { ...base.flags, over_budget: f.overBudget, budget_exceeds_contract: f.budgetOverContract },
    money: m.hasBudget
      ? { contract: m.contract, budgeted: m.budgeted, committed: m.committed, spent: m.spent, remaining: m.remaining, variance: m.variance }
      : { no_budget_yet: true, estimate_total: m.estimateTotal },
  };
}

export const projectTools: ToolDef[] = [
  {
    name: "create_project",
    description:
      "Create a new project — through the same authorized service the New Project screen uses (a project shell with a blank estimate sheet, same defaults, same authorization). Only call this when the person clearly asks to create, make, start or add a project — never when they are only discussing or considering one. A name or an address is enough to start; everything else can be added later, including through follow-up commands once the project is created (it becomes the current project). Before creating, this checks for a likely duplicate (same address, or a near-identical name) and, if found, refuses with the existing project's details instead of creating one — tell the person and ask whether to open that one or create a new one anyway; only then call this again with force: true. To also set a budget or contract amount, call set_contract_amount next — it needs the person's confirmation, like any money change; do not put a budget figure in this tool.",
    input_schema: schema({
      name: { type: "string", description: "Project name. Falls back to the address when omitted." },
      address: { type: "string" },
      client_name: { type: "string", description: "Customer / client name" },
      client_email: { type: "string" },
      client_phone: { type: "string" },
      project_type: { type: "string", enum: [...PROJECT_TYPES], description: "default remodel" },
      status: { type: "string", enum: PROJECT_STATUSES, description: "default estimating — the same default the New Project screen uses" },
      notes: { type: "string" },
      manager: { type: "string", description: "Project manager's name, or 'me'" },
      start_date: { type: "string", description: "YYYY-MM-DD" },
      target_end_date: { type: "string", description: "YYYY-MM-DD" },
      force: { type: "boolean", description: "Create even though a likely duplicate exists. Set true only after the person has said to create it anyway." },
    }),
    requires: ["projects.create"],
    kind: "write",
    status: "creating the project…",
    execute: async (ctx, input) => {
      const rawName = str(input, "name");
      const address = str(input, "address");
      const name = rawName ?? address;
      if (!name) throw new ToolError("Give at least a project name or an address to create a project.");

      const type = str(input, "project_type") as (typeof PROJECT_TYPES)[number] | undefined;
      if (type && !PROJECT_TYPES.includes(type)) throw new ToolError(`project_type must be one of ${PROJECT_TYPES.join(", ")}`);
      const status = str(input, "status") as ProjectStatus | undefined;
      if (status && !PROJECT_STATUSES.includes(status)) throw new ToolError(`status must be one of ${PROJECT_STATUSES.join(", ")}`);
      const startDate = str(input, "start_date");
      if (startDate && !isYmd(startDate)) throw new ToolError("start_date must be YYYY-MM-DD");
      const targetDate = str(input, "target_end_date");
      if (targetDate && !isYmd(targetDate)) throw new ToolError("target_end_date must be YYYY-MM-DD");

      const force = bool(input, "force") ?? false;
      if (!force) {
        const all = await listSummaries(ctx.session.sb);
        const dup = findLikelyDuplicate(name, address, all);
        if (dup) {
          const p = dup.project;
          throw new ToolError(
            `A project that looks like the same one already exists: ${projectNumber(p)} "${p.name}"${p.address ? ` at ${p.address}` : ""} (${STATUS_TEXT[p.status]}). Ask the person whether to open that one, or create a new project anyway (pass force: true only if they say to create it anyway).`,
            { duplicate: true, existing_project: { id: p.id, number: projectNumber(p), name: p.name, address: p.address || null, status: STATUS_TEXT[p.status] } },
          );
        }
      }

      const { sb, companyId } = ctx.session;
      const pid = uid();
      const payload = {
        id: pid,
        estimate_id: uid(),
        company_id: companyId,
        client_id: null,
        project: {
          name,
          type: type ?? "remodel",
          status: status ?? "estimating",
          client_name: str(input, "client_name") ?? "",
          client_phone: str(input, "client_phone") ?? "",
          client_email: str(input, "client_email") ?? "",
          address: address ?? "",
          notes: str(input, "notes") ?? "",
          plan_notes: "",
        },
        estimate: {},
        sections: [],
        items: [],
        options: [],
      };
      // Same RPC the New Project screen calls (lib/data/projects.ts createProjectInDb) — security
      // invoker, so this insert is checked by the projects_insert RLS policy exactly as the UI is.
      const { data, error } = await sb.rpc("create_project", { p: payload as unknown as Json });
      if (error) throw error;
      const r = data as { project_id: string; existing: boolean };

      const managerQuery = str(input, "manager");
      let managerNote: string | null = null;
      const patch: { manager_id?: string; start_date?: string; target_end_date?: string } = {};
      if (managerQuery) {
        const lookups = await nameLookups(ctx);
        const resolved = resolveManager(ctx, lookups.members, managerQuery);
        if (resolved) {
          patch.manager_id = resolved.id;
          managerNote = resolved.name;
        } else {
          managerNote = `couldn't match "${managerQuery}" to a team member — manager not set`;
        }
      }
      if (startDate) patch.start_date = startDate;
      if (targetDate) patch.target_end_date = targetDate;
      if (patch.manager_id || patch.start_date || patch.target_end_date) {
        const { error: uErr } = await sb.from("projects").update(patch).eq("id", r.project_id);
        if (uErr) throw uErr;
      }

      // Re-read the row we just committed — the response reflects the real database state, not just echoed input.
      const created = await getSummary(sb, r.project_id);
      const finalName = created?.name ?? name;
      const bits = [address && `at ${address}`, patch.manager_id && managerNote && `${managerNote} as manager`].filter(Boolean).join(", ");
      return {
        data: {
          success: true,
          project_id: r.project_id,
          project_name: finalName,
          number: created ? projectNumber(created) : null,
          status: created ? STATUS_TEXT[created.status] : STATUS_TEXT[status ?? "estimating"],
          route: `/projects/${r.project_id}`,
          duplicate_warning: false,
          manager_note: managerNote,
          already_existed: r.existing,
        },
        event: `+ project "${finalName}" created${bits ? ` (${bits})` : ""}`,
        refresh: ["projects"],
        navigate: { href: `/projects/${r.project_id}`, label: finalName },
        projectId: r.project_id,
      };
    },
  },
  {
    name: "search_projects",
    description:
      "Find projects by name, client, address or number ('Smith', 'the Hampton job', 'P-0007'). Returns the best matches with ids. Use before anything project-specific when you are outside a project or the person names a project. If several match closely, ask which one.",
    input_schema: schema({ query: { type: "string" } }, ["query"]),
    requires: [],
    kind: "read",
    status: "looking up projects…",
    execute: async (ctx, input) => {
      const q = str(input, "query") ?? "";
      const all = await listSummaries(ctx.session.sb);
      const matches = matchProjects(q, all).slice(0, 8);
      return {
        data: {
          query: q,
          matches: matches.map((m) => ({ score: m.score, ...projectCard(m.project, ctx.session.can("budgets.view"), ctx.now) })),
          visible_projects: all.length,
          hint: matches.length === 0 ? "No match — the person may be using a nickname; list_projects shows everything they can see." : undefined,
        },
      };
    },
  },
  {
    name: "list_projects",
    description:
      "List the projects the person can see, optionally filtered: all, open (not complete/archived), active, over_budget, behind_schedule, overdue_tasks, complete, on_hold. Answers 'which projects are behind?', 'what's over budget?', 'what are we working on?'. Money fields appear only when the person may see money.",
    input_schema: schema({
      filter: { type: "string", enum: ["all", "open", "active", "over_budget", "behind_schedule", "overdue_tasks", "complete", "on_hold"] },
      limit: { type: "number", description: "default 25" },
    }),
    requires: [],
    kind: "read",
    status: "reading the project list…",
    execute: async (ctx, input) => {
      const filter = str(input, "filter") ?? "open";
      const limit = intIn(input, "limit", 25, 1, 100);
      const canMoney = ctx.session.can("budgets.view");
      if (filter === "over_budget" && !canMoney) throw new ToolError("This person's role can't see money, so over-budget can't be checked.");
      const all = await listSummaries(ctx.session.sb);
      const rows = all.filter((s) => {
        const f = projectFlags(s, ctx.now);
        switch (filter) {
          case "all":
            return true;
          case "open":
            return s.status !== "complete" && s.status !== "archived";
          case "active":
            return s.status === "active";
          case "over_budget":
            return f.overBudget || f.budgetOverContract;
          case "behind_schedule":
            return f.behind || f.pastDue;
          case "overdue_tasks":
            return f.overdueTasks > 0;
          case "complete":
            return s.status === "complete";
          case "on_hold":
            return s.status === "on_hold";
          default:
            return true;
        }
      });
      return {
        data: {
          filter,
          count: rows.length,
          of_visible: all.length,
          projects: rows.slice(0, limit).map((s) => projectCard(s, canMoney, ctx.now)),
          headlines: rows.slice(0, limit).map((s) => projectHeadline(s, ctx.now)),
        },
      };
    },
  },
  {
    name: "get_project_summary",
    description:
      "Everything needed for 'how are we doing on X?' or to prepare a project summary: facts, current phase, progress with its source, schedule health, money (when allowed), work in progress / overdue / upcoming, latest notes, recent changes, photos, team. Read fresh from the database.",
    input_schema: schema({ ...PROJECT_PROPS }),
    requires: [],
    kind: "read",
    status: "pulling the project together…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const { sb, can } = ctx.session;
      const names = await nameLookups(ctx);
      const [phases, tasks, notes, activity, photos, memberIds] = await Promise.all([
        loadPhases(sb, s.id),
        loadTasks(sb, s.id),
        loadNotes(sb, s.id, 3),
        can("audit.view_project") ? loadActivity(sb, { projectId: s.id, limit: 10 }).catch(() => []) : Promise.resolve([]),
        can("files.view") ? loadFiles(sb, s.id, "photo", 200).catch(() => [] as FileRow[]) : Promise.resolve([] as FileRow[]),
        loadProjectMemberIds(sb, s.id).catch(() => []),
      ]);
      const authors = await profilesById(sb, notes.map((n) => n.author_id ?? "").filter(Boolean));
      const today = ctx.today;
      const horizon = addDays(today, 7);
      const line = (t: TaskRow) => taskLine(t, names, today);
      const open = tasks.filter((t) => t.status !== "done");
      const inProgress = open.filter((t) => t.status === "in_progress");
      const blocked = open.filter((t) => t.status === "blocked");
      const overdue = open.filter((t) => t.due_date && t.due_date < today);
      const upcoming = open
        .filter((t) => t.status === "todo" && t.due_date && t.due_date >= today && t.due_date <= horizon)
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
      const cur = currentPhase(phases);
      const nxt = nextPhase(phases, cur);
      const sched = projectSchedule(s, ctx.now);
      const manager = names.member(s.manager_id) || null;
      const data: Record<string, unknown> = {
        as_of: ctx.now.toISOString(),
        project: {
          id: s.id,
          number: projectNumber(s),
          name: s.name,
          type: s.type,
          status: STATUS_TEXT[s.status],
          client: s.client_name || null,
          client_phone: s.client_phone || null,
          address: s.address || null,
          manager,
          start_date: s.start_date,
          target_end_date: s.target_end_date,
        },
        phase: {
          current: cur ? { name: cur.name, status: cur.status, started: cur.actual_start } : phases.length ? "all phases complete" : "no phases set up",
          next: nxt?.name ?? null,
          complete: s.phases_complete,
          total: s.phases_total,
          completed_phases: phases.filter((p) => p.status === "complete").map((p) => ({ name: p.name, finished: p.actual_end })),
        },
        progress: {
          displayed: pct(s.display_progress_pct),
          source: s.progress_source === "manual" ? "project manager's figure" : "calculated from tasks and checklist items",
          calculated: pct(s.progress_pct),
          manual: s.manual_progress_pct == null ? null : { pct: pct(s.manual_progress_pct), by: names.member(s.manual_progress_by) || null, at: s.manual_progress_at, note: s.manual_progress_note || null },
        },
        schedule: {
          status: sched.status,
          label: sched.label,
          expected_pct_today: sched.status === "no_dates" ? null : Math.round(sched.expectedPct),
          days_remaining: sched.daysRemaining,
          days_ahead_or_behind: sched.daysDelta,
        },
        work: {
          counts: { total: s.tasks_total, done: s.tasks_done, in_progress: inProgress.length, overdue: overdue.length, blocked: blocked.length, upcoming_7_days: upcoming.length },
          in_progress: inProgress.slice(0, 8).map(line),
          overdue: overdue.slice(0, 8).map(line),
          blocked: blocked.slice(0, 6).map(line),
          upcoming_7_days: upcoming.slice(0, 8).map(line),
        },
        latest_notes: notes.map((n) => ({ when: n.created_at, by: nameOf(authors.get(n.author_id ?? "")) || "Unknown", text: truncate(n.body, 400), pinned: n.pinned })),
        recent_changes: groupActivity(activity)
          .slice(0, 8)
          .map((a) => ({ when: a.createdAt, who: a.actorName, what: a.summary, via: a.rows[0].source === "bob" ? "Bob" : "app" })),
        photos: can("files.view") ? { count: photos.length, latest: photos[0]?.taken_at ?? photos[0]?.created_at ?? null } : "not visible to this role",
        team: memberIds.map((id) => names.member(id)).filter(Boolean),
      };
      if (can("budgets.view")) {
        const m = projectMoney(s);
        const { lines } = await loadBudget(sb, s.id).catch(() => ({ budget: null, lines: [] }));
        data.money = m.hasBudget
          ? {
              contract: m.contract,
              estimate_total: m.estimateTotal,
              approved_budget: m.budgeted,
              committed: m.committed,
              spent: m.spent,
              remaining: m.remaining,
              variance: m.variance,
              over_budget: m.variance < 0,
              budget_vs_contract: m.contractDelta,
              lines_over_budget: lines
                .map((l) => ({ category: l.category, remaining: Number(l.budgeted) - Number(l.committed) - Number(l.actual) }))
                .filter((l) => l.remaining < 0),
            }
          : { no_budget_yet: true, estimate_total: m.estimateTotal, note: "No budget has been created; the Budget sheet can create one from the estimate." };
      } else {
        data.money = "not visible to this person's role";
      }
      return { data };
    },
  },
  {
    name: "get_project_progress",
    description:
      "Progress detail for a project: every construction phase with status and dates, checklist completion per phase, the displayed / calculated / manual progress figures, schedule health, and completed phases. For 'where are we', 'what phase', 'are we behind', 'what's finished'.",
    input_schema: schema({ ...PROJECT_PROPS }),
    requires: [],
    kind: "read",
    status: "checking progress…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const { sb } = ctx.session;
      const [phases, tasks] = await Promise.all([loadPhases(sb, s.id), loadTasks(sb, s.id)]);
      const names = await nameLookups(ctx);
      const sched = projectSchedule(s, ctx.now);
      return {
        data: {
          project: { id: s.id, number: projectNumber(s), name: s.name },
          progress: {
            displayed: pct(s.display_progress_pct),
            source: s.progress_source,
            calculated_from_checklists: pct(s.progress_pct),
            manual_override: s.manual_progress_pct == null ? null : { pct: pct(s.manual_progress_pct), by: names.member(s.manual_progress_by) || null, at: s.manual_progress_at, note: s.manual_progress_note || null },
            tasks_done: `${s.tasks_done}/${s.tasks_total}`,
          },
          schedule: { status: sched.status, label: sched.label, start: s.start_date, target: s.target_end_date, elapsed_pct: Math.round(sched.elapsedPct), expected_pct: Math.round(sched.expectedPct), days_remaining: sched.daysRemaining, days_delta: sched.daysDelta },
          phases: phases.map((p) => {
            const inPhase = tasks.filter((t) => t.phase_id === p.id);
            const done = inPhase.filter((t) => t.status === "done").length;
            return { name: p.name, status: p.status, planned: [p.planned_start, p.planned_end], actual: [p.actual_start, p.actual_end], checklist: inPhase.length ? `${done}/${inPhase.length}` : "no checklist" };
          }),
          current_phase: currentPhase(phases)?.name ?? null,
          next_phase: nextPhase(phases, currentPhase(phases))?.name ?? null,
        },
      };
    },
  },
  {
    name: "set_project_status",
    description: "Change a project's status: lead, estimating, active, on_hold, complete, archived. Archiving is guarded (needs confirmation).",
    input_schema: schema({ ...PROJECT_PROPS, status: { type: "string", enum: PROJECT_STATUSES } }, ["status"]),
    requires: ["projects.edit"],
    kind: "write",
    status: "updating the project…",
    guard: async (ctx, input) => {
      const status = str(input, "status");
      if (status !== "archived") return null;
      const s = await resolveProject(ctx, input);
      return { sensitivity: "other", preview: `Archive project ${projectNumber(s)} ${s.name} (it leaves the open list; history is kept)`, projectId: s.id, input: { project_id: s.id, status } };
    },
    execute: async (ctx, input) => {
      const status = str(input, "status") as ProjectStatus | undefined;
      if (!status || !PROJECT_STATUSES.includes(status)) throw new ToolError(`status must be one of ${PROJECT_STATUSES.join(", ")}`);
      const s = await resolveProject(ctx, input);
      const { error } = await ctx.session.sb.from("projects").update({ status }).eq("id", s.id);
      if (error) throw error;
      return { data: { ok: true, project: s.name, from: STATUS_TEXT[s.status], to: STATUS_TEXT[status] }, event: `✎ ${s.name}: status ${STATUS_TEXT[s.status]} → ${STATUS_TEXT[status]}`, refresh: ["projects"], projectId: s.id };
    },
  },
  {
    name: "set_project_dates",
    description: "Set a project's start date and/or target completion date (YYYY-MM-DD). Schedule health is computed from these.",
    input_schema: schema({ ...PROJECT_PROPS, start_date: { type: "string" }, target_end_date: { type: "string" } }),
    requires: ["projects.edit"],
    kind: "write",
    status: "updating the schedule…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const patch: { start_date?: string; target_end_date?: string } = {};
      const sd = str(input, "start_date");
      const td = str(input, "target_end_date");
      if (sd) {
        if (!isYmd(sd)) throw new ToolError("start_date must be YYYY-MM-DD");
        patch.start_date = sd;
      }
      if (td) {
        if (!isYmd(td)) throw new ToolError("target_end_date must be YYYY-MM-DD");
        patch.target_end_date = td;
      }
      if (!Object.keys(patch).length) throw new ToolError("Give start_date and/or target_end_date.");
      const { error } = await ctx.session.sb.from("projects").update(patch).eq("id", s.id);
      if (error) throw error;
      const bits = [patch.start_date && `start ${patch.start_date}`, patch.target_end_date && `target ${patch.target_end_date}`].filter(Boolean).join(", ");
      return { data: { ok: true, project: s.name, ...patch }, event: `✎ ${s.name}: ${bits}`, refresh: ["projects"], projectId: s.id };
    },
  },
  {
    name: "set_manual_progress",
    description:
      "Set (or clear) the project manager's manual progress percentage with a short reason. The calculated figure is kept alongside; the manual one is displayed when set. Say what you are doing first.",
    input_schema: schema({ ...PROJECT_PROPS, percent: { type: "number", description: "0–100" }, clear: { type: "boolean", description: "true removes the override and shows the calculated figure" }, note: { type: "string", description: "why — shown next to the figure" } }),
    requires: ["progress.override"],
    kind: "write",
    status: "setting the progress figure…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const clear = bool(input, "clear") ?? false;
      const percent = num(input, "percent");
      const note = str(input, "note") ?? "";
      if (!clear && (percent === undefined || percent < 0 || percent > 100)) throw new ToolError("percent must be 0–100 (or clear=true)");
      const patch = clear ? { manual_progress_pct: null, manual_progress_note: "" } : { manual_progress_pct: Math.round(percent!), manual_progress_note: note };
      const { error } = await ctx.session.sb.from("projects").update(patch).eq("id", s.id);
      if (error) throw error;
      const text = clear ? `↺ ${s.name}: manual progress cleared (calculated ${pct(s.progress_pct)} shows)` : `✎ ${s.name}: manual progress set to ${Math.round(percent!)}%${note ? ` — "${note}"` : ""} (calculated ${pct(s.progress_pct)})`;
      return { data: { ok: true, project: s.name, displayed: clear ? pct(s.progress_pct) : `${Math.round(percent!)}%`, calculated: pct(s.progress_pct) }, event: text, refresh: ["projects"], projectId: s.id };
    },
  },
];

