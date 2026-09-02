import "server-only";
import type { ProjectPhaseRow, SubcontractorRow, TaskListRow, TaskRow, TaskStatus } from "../../../data/database.types";
import { STATUS_LABELS, parsePriority, parseTaskStatus } from "../../../data/task-labels";
import { uid } from "../../../format";
import { deletePreview } from "../../guard";
import { matchByName } from "../../match";
import { dateRange, instantRange, isYmd, parsePreset } from "../../time";
import { listSummaries, loadPhases, loadTaskLists, loadTasks, type Member } from "../data";
import { optionalProject, resolveProject, resolveTask } from "../resolve";
import { PROJECT_PROPS, ToolError, intIn, schema, str, type ToolCtx, type ToolDef } from "../types";
import { nameLookups, taskLine } from "./projects";

function one<T>(what: string, query: string, rows: T[], nameOf: (r: T) => string, idOf: (r: T) => string): T {
  const m = matchByName(query, rows as (T & { id: string })[], nameOf);
  if (m.length === 0) throw new ToolError(`No ${what} matches "${query}". Known: ${rows.map(nameOf).slice(0, 15).join(", ") || "none"}`);
  const [top, second] = m;
  if (top.score >= 60 && (!second || top.score - second.score >= 15 || top.score === 100)) return top.project;
  throw new ToolError(`Several ${what}s match "${query}": ${m.slice(0, 5).map((x) => `${nameOf(x.project)} [${idOf(x.project)}]`).join("; ")} — ask which one.`);
}

function resolveMember(ctx: ToolCtx, members: Member[], query: string): Member {
  if (/^(me|myself|i)$/i.test(query.trim())) {
    const me = members.find((m) => m.userId === ctx.session.userId);
    if (me) return me;
    return { userId: ctx.session.userId, name: ctx.session.displayName, email: ctx.session.email, role: ctx.session.role, isActive: true, lastSeen: null, membershipId: "" };
  }
  const active = members.filter((m) => m.isActive);
  return one("team member", query, active.map((m) => ({ ...m, id: m.userId })), (m) => `${m.name} ${m.email ?? ""}`, (m) => m.userId);
}

interface Resolved {
  assignee_id?: string | null;
  subcontractor_id?: string | null;
  phase_id?: string | null;
  task_list_id?: string | null;
  labels: string[];
}

async function resolveLinks(ctx: ToolCtx, projectId: string, input: Record<string, unknown>, lookups: Awaited<ReturnType<typeof nameLookups>>): Promise<Resolved> {
  const out: Resolved = { labels: [] };
  const assignee = str(input, "assignee");
  if (assignee !== undefined) {
    if (/^(nobody|none|unassigned|clear)$/i.test(assignee)) out.assignee_id = null;
    else {
      const m = resolveMember(ctx, lookups.members, assignee);
      out.assignee_id = m.userId;
      out.labels.push(`assigned to ${m.name}`);
    }
  }
  const sub = str(input, "subcontractor");
  if (sub !== undefined) {
    if (/^(none|clear)$/i.test(sub)) out.subcontractor_id = null;
    else {
      const s = one<SubcontractorRow>("subcontractor", sub, lookups.subs, (x) => `${x.name} ${x.trade}`, (x) => x.id);
      out.subcontractor_id = s.id;
      out.labels.push(`sub ${s.name}`);
    }
  }
  const phase = str(input, "phase");
  if (phase !== undefined) {
    if (/^(none|clear)$/i.test(phase)) out.phase_id = null;
    else {
      const phases = await loadPhases(ctx.session.sb, projectId);
      const p = one<ProjectPhaseRow>("phase", phase, phases, (x) => x.name, (x) => x.id);
      out.phase_id = p.id;
      out.labels.push(`phase ${p.name}`);
    }
  }
  const list = str(input, "checklist");
  if (list !== undefined) {
    if (/^(none|clear)$/i.test(list)) out.task_list_id = null;
    else {
      const lists = await loadTaskLists(ctx.session.sb, projectId);
      const l = one<TaskListRow>("checklist", list, lists, (x) => x.name, (x) => x.id);
      out.task_list_id = l.id;
      out.labels.push(`in ${l.name}`);
    }
  }
  return out;
}

const TASK_FIELD_PROPS = {
  title: { type: "string" },
  description: { type: "string" },
  notes: { type: "string" },
  trade: { type: "string", description: "e.g. Framing, Electrical, Plumbing" },
  priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
  due_date: { type: "string", description: "YYYY-MM-DD" },
  start_date: { type: "string", description: "YYYY-MM-DD" },
  assignee: { type: "string", description: "team member name or 'me'; 'nobody' clears" },
  subcontractor: { type: "string", description: "subcontractor name; 'none' clears" },
  phase: { type: "string", description: "construction phase name" },
  checklist: { type: "string", description: "task list / checklist name" },
};

export const taskTools: ToolDef[] = [
  {
    name: "get_project_tasks",
    description:
      "Tasks and checklist items, for one project (default: the current one) or across every visible project (all_projects=true). Filters: status; due (overdue, today, this_week, next_7_days, next_14_days); completed (today, yesterday, this_week, last_week, last_7_days — what got finished); assignee ('me' or a name); search words. Answers 'what is due this week', 'what did we finish yesterday', 'what's next', 'what am I supposed to do'.",
    input_schema: schema({
      ...PROJECT_PROPS,
      all_projects: { type: "boolean" },
      status: { type: "string", enum: ["todo", "in_progress", "blocked", "done", "open"] },
      due: { type: "string", enum: ["overdue", "today", "this_week", "next_7_days", "next_14_days"] },
      completed: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "last_7_days", "last_30_days"] },
      assignee: { type: "string" },
      search: { type: "string" },
      limit: { type: "number", description: "default 30" },
    }),
    requires: [],
    kind: "read",
    status: "checking tasks…",
    execute: async (ctx, input) => {
      const all = (input.all_projects === true) || (!str(input, "project_id") && !str(input, "project") && !ctx.context.projectId);
      const project = all ? null : await resolveProject(ctx, input);
      const { sb, timezone } = ctx.session;
      const lookups = await nameLookups(ctx);
      let rows = await loadTasks(sb, project?.id ?? null);
      const today = ctx.today;
      const status = str(input, "status");
      if (status === "open") rows = rows.filter((t) => t.status !== "done");
      else if (status) {
        const st = parseTaskStatus(status);
        if (!st) throw new ToolError("status must be todo, in_progress, blocked, done or open");
        rows = rows.filter((t) => t.status === st);
      }
      const due = str(input, "due");
      let dueLabel: string | null = null;
      if (due === "overdue") {
        rows = rows.filter((t) => t.status !== "done" && t.due_date && t.due_date < today);
        dueLabel = "overdue";
      } else if (due) {
        const preset = parsePreset(due);
        if (!preset) throw new ToolError("due must be overdue, today, this_week, next_7_days or next_14_days");
        const r = dateRange(preset, ctx.now, timezone);
        rows = rows.filter((t) => t.status !== "done" && t.due_date && t.due_date >= r.from && t.due_date <= r.to);
        dueLabel = `due ${r.label} (${r.from} → ${r.to})`;
      }
      const completed = str(input, "completed");
      let completedLabel: string | null = null;
      if (completed) {
        const preset = parsePreset(completed);
        if (!preset) throw new ToolError("completed must be today, yesterday, this_week, last_week, last_7_days or last_30_days");
        const r = instantRange(preset, ctx.now, timezone);
        rows = rows.filter((t) => t.status === "done" && t.completed_at && t.completed_at >= r.fromIso && t.completed_at < r.toIso);
        completedLabel = `completed ${r.label}`;
      }
      const assignee = str(input, "assignee");
      if (assignee) {
        const m = resolveMember(ctx, lookups.members, assignee);
        rows = rows.filter((t) => t.assignee_id === m.userId);
      }
      const search = str(input, "search");
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((t) => `${t.title} ${t.description} ${t.notes} ${t.trade}`.toLowerCase().includes(q));
      }
      const limit = intIn(input, "limit", 30, 1, 200);
      const projectNames = all ? new Map((await listSummaries(sb)).map((s) => [s.id, s.name])) : null;
      const sorted = [...rows].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
      return {
        data: {
          scope: project ? { project: project.name } : "all visible projects",
          filters: [status && `status ${status}`, dueLabel, completedLabel, assignee && `assignee ${assignee}`, search && `search "${search}"`].filter(Boolean),
          count: rows.length,
          tasks: sorted.slice(0, limit).map((t) => ({
            ...taskLine(t, lookups, today),
            ...(projectNames ? { project: projectNames.get(t.project_id) ?? "?" } : {}),
            completed_at: t.status === "done" ? t.completed_at : undefined,
            completed_by: t.status === "done" ? lookups.member(t.completed_by) || undefined : undefined,
          })),
        },
      };
    },
  },
  {
    name: "create_task",
    description:
      "Create a task / checklist item on a project (current project by default). Give a clear title; optional description, notes, trade, priority, due_date, start_date, assignee (name or 'me'), subcontractor, phase and checklist by name. Say what you are creating first.",
    input_schema: schema({ ...PROJECT_PROPS, ...TASK_FIELD_PROPS }, ["title"]),
    requires: ["tasks.manage"],
    kind: "write",
    status: "adding the task…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const title = str(input, "title");
      if (!title) throw new ToolError("title is required");
      const lookups = await nameLookups(ctx);
      const links = await resolveLinks(ctx, s.id, input, lookups);
      const due = str(input, "due_date");
      const start = str(input, "start_date");
      if (due && !isYmd(due)) throw new ToolError("due_date must be YYYY-MM-DD");
      if (start && !isYmd(start)) throw new ToolError("start_date must be YYYY-MM-DD");
      const priority = str(input, "priority") ? parsePriority(str(input, "priority")) : "normal";
      if (!priority) throw new ToolError("priority must be low, normal, high or urgent");
      const { sb, companyId } = ctx.session;
      const { data, error } = await sb
        .from("tasks")
        .insert({
          id: uid(),
          company_id: companyId,
          project_id: s.id,
          title,
          description: str(input, "description") ?? "",
          notes: str(input, "notes") ?? "",
          trade: str(input, "trade") ?? "",
          priority,
          due_date: due ?? null,
          start_date: start ?? null,
          assignee_id: links.assignee_id ?? null,
          subcontractor_id: links.subcontractor_id ?? null,
          phase_id: links.phase_id ?? null,
          task_list_id: links.task_list_id ?? null,
          position: 9999,
        })
        .select("*")
        .single();
      if (error) throw error;
      const bits = [due && `due ${due}`, ...links.labels, priority !== "normal" && priority].filter(Boolean).join(" · ");
      return { data: { ok: true, task: taskLine(data, lookups, ctx.today), project: s.name }, event: `+ task "${title}" on ${s.name}${bits ? ` · ${bits}` : ""}`, refresh: ["tasks"], projectId: s.id };
    },
  },
  {
    name: "update_task_status",
    description:
      "Change a task's status: todo, in_progress, blocked or done ('mark the framing inspection complete', 'start the trusses task'). Find the task by task_id or by title (current project by default).",
    input_schema: schema({ ...PROJECT_PROPS, task_id: { type: "string" }, task: { type: "string", description: "task title when the id is unknown" }, status: { type: "string", enum: ["todo", "in_progress", "blocked", "done"] } }, ["status"]),
    requires: ["tasks.manage", "tasks.complete"],
    kind: "write",
    status: "updating the task…",
    execute: async (ctx, input) => {
      const status = parseTaskStatus(str(input, "status"));
      if (!status) throw new ToolError("status must be todo, in_progress, blocked or done");
      const project = await optionalProject(ctx, input);
      const t = await resolveTask(ctx, input, project?.id ?? null);
      if (t.status === status) return { data: { ok: true, unchanged: true, task: t.title, status: STATUS_LABELS[status] } };
      const { error } = await ctx.session.sb.from("tasks").update({ status }).eq("id", t.id);
      if (error) throw error;
      const glyph = status === "done" ? "✓" : status === "blocked" ? "✕" : "↻";
      return { data: { ok: true, task: t.title, from: STATUS_LABELS[t.status], to: STATUS_LABELS[status] }, event: `${glyph} "${t.title}": ${STATUS_LABELS[t.status]} → ${STATUS_LABELS[status]}`, refresh: ["tasks"], projectId: t.project_id };
    },
  },
  {
    name: "update_task",
    description: "Change a task's details: title, description, notes, trade, priority, due_date, start_date, assignee, subcontractor, phase, checklist, status. Only the fields given change. Find the task by task_id or title.",
    input_schema: schema({ ...PROJECT_PROPS, task_id: { type: "string" }, task: { type: "string" }, ...TASK_FIELD_PROPS, status: { type: "string", enum: ["todo", "in_progress", "blocked", "done"] } }),
    requires: ["tasks.manage"],
    kind: "write",
    status: "updating the task…",
    execute: async (ctx, input) => {
      const project = await optionalProject(ctx, input);
      const t = await resolveTask(ctx, input, project?.id ?? null);
      const lookups = await nameLookups(ctx);
      const links = await resolveLinks(ctx, t.project_id, input, lookups);
      const patch: Partial<TaskRow> = {};
      const changes: string[] = [];
      const title = str(input, "title");
      if (title && !str(input, "task_id") && !str(input, "task")) {
        // title was used to find the task, not to rename it
      } else if (title && title !== t.title) {
        patch.title = title;
        changes.push(`title → "${title}"`);
      }
      for (const k of ["description", "notes", "trade"] as const) {
        const v = str(input, k);
        if (v !== undefined) {
          patch[k] = v;
          changes.push(`${k} updated`);
        }
      }
      const pr = str(input, "priority");
      if (pr) {
        const p = parsePriority(pr);
        if (!p) throw new ToolError("priority must be low, normal, high or urgent");
        patch.priority = p;
        changes.push(`priority ${p}`);
      }
      for (const k of ["due_date", "start_date"] as const) {
        const v = str(input, k);
        if (v !== undefined) {
          if (!/^(none|clear)$/i.test(v) && !isYmd(v)) throw new ToolError(`${k} must be YYYY-MM-DD`);
          patch[k] = /^(none|clear)$/i.test(v) ? null : v;
          changes.push(`${k.replace("_", " ")} ${patch[k] ?? "cleared"}`);
        }
      }
      const st = str(input, "status");
      if (st) {
        const s2 = parseTaskStatus(st) as TaskStatus | null;
        if (!s2) throw new ToolError("status must be todo, in_progress, blocked or done");
        patch.status = s2;
        changes.push(`status ${STATUS_LABELS[s2]}`);
      }
      for (const k of ["assignee_id", "subcontractor_id", "phase_id", "task_list_id"] as const) {
        if (k in links && links[k] !== undefined) patch[k] = links[k] ?? null;
      }
      changes.push(...links.labels);
      if (!Object.keys(patch).length) throw new ToolError("Nothing to change — give at least one field.");
      const { error } = await ctx.session.sb.from("tasks").update(patch).eq("id", t.id);
      if (error) throw error;
      return { data: { ok: true, task: t.title, changes }, event: `✎ "${t.title}": ${changes.join(", ")}`, refresh: ["tasks"], projectId: t.project_id };
    },
  },
  {
    name: "delete_task",
    description: "Delete a task or checklist item permanently. Guarded: always needs the person's confirmation. Find it by task_id or title.",
    input_schema: schema({ ...PROJECT_PROPS, task_id: { type: "string" }, task: { type: "string" } }),
    requires: ["tasks.manage"],
    kind: "write",
    status: "preparing the deletion…",
    guard: async (ctx, input) => {
      const project = await optionalProject(ctx, input);
      const t = await resolveTask(ctx, input, project?.id ?? null);
      return { sensitivity: "delete", preview: `${deletePreview("task", t.title)} (${STATUS_LABELS[t.status]}${t.due_date ? `, due ${t.due_date}` : ""})`, projectId: t.project_id, input: { task_id: t.id } };
    },
    execute: async (ctx, input) => {
      const t = await resolveTask(ctx, input, null);
      const { error } = await ctx.session.sb.from("tasks").delete().eq("id", t.id);
      if (error) throw error;
      return { data: { ok: true, deleted: t.title }, event: `✕ deleted task "${t.title}"`, refresh: ["tasks"], projectId: t.project_id };
    },
  },
];
