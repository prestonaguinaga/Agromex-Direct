import "server-only";
import type { AuditLogRow, BudgetLineRow, FileRow, ProjectSummaryRow, TaskRow } from "../../data/database.types";
import { currentPhase, groupActivity, nextPhase } from "../../data/progress";
import { isLargeMoneyChange } from "../../bob/guard";
import { projectMoney, projectNumber, projectSchedule } from "../../bob/digest";
import { addDays } from "../../bob/time";
import { signedUrls } from "../../bob/server/data";
import type { Db } from "../../bob/server/types";
import type { ApplicationFact, BriefFacts, BriefSettings, BriefWindow, BudgetChangeFact, LeadFact, NoteFact, PhotoFact, ProjectFact, TaskFact } from "../types";

/**
 * Read everything the brief needs, as the server process (service role,
 * scoped to one company), and turn it into facts. Nothing here interprets;
 * the attention rules and the composer do that from these facts.
 */

export interface GatherInput {
  admin: Db;
  company: { id: string; name: string };
  settings: BriefSettings;
  now: Date;
  /** Local calendar date of the brief. */
  localDate: string;
  window: BriefWindow;
  previousFacts: BriefFacts | null;
  siteUrl: string;
}

const DAY = 86_400_000;
const SOON_DAYS = 7;
const PREVIEW_TTL_S = 7 * 24 * 3600;
const MONEY_FIELDS = new Set(["budgeted", "committed", "actual", "contract_amount"]);

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function daysBetweenYmd(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export async function gatherFacts(i: GatherInput): Promise<Omit<BriefFacts, "attention">> {
  const { admin, company, settings, window, siteUrl, localDate } = i;
  const cid = company.id;
  const href = (pid: string, tab?: string) => `${siteUrl}/projects/${pid}${tab ? `?tab=${tab}` : ""}`;

  const [summariesQ, phasesQ, tasksQ, notesQ, photosQ, auditQ, budgetsQ, linesQ, membershipsQ, subsQ] = await Promise.all([
    admin.from("project_summary").select("*").eq("company_id", cid),
    admin.from("project_phases").select("*").eq("company_id", cid),
    admin.from("tasks").select("*").eq("company_id", cid).limit(5000),
    admin.from("notes").select("*").eq("company_id", cid).is("deleted_at", null).gte("created_at", window.start).lt("created_at", window.end).order("created_at", { ascending: false }).limit(200),
    admin.from("files").select("*").eq("company_id", cid).eq("kind", "photo").is("deleted_at", null).gte("created_at", window.start).lt("created_at", window.end).order("created_at", { ascending: false }).limit(500),
    admin.from("audit_log").select("*").eq("company_id", cid).eq("kind", "major").gte("created_at", window.start).lt("created_at", window.end).order("created_at", { ascending: false }).limit(1500),
    admin.from("budgets").select("*").eq("company_id", cid).eq("status", "active"),
    admin.from("budget_lines").select("*").eq("company_id", cid),
    admin.from("memberships").select("*").eq("company_id", cid),
    admin.from("subcontractors").select("id,name").eq("company_id", cid),
  ]);
  for (const q of [summariesQ, phasesQ, tasksQ, notesQ, photosQ, auditQ, budgetsQ, linesQ, membershipsQ, subsQ]) if (q.error) throw q.error;

  const summaries = (summariesQ.data ?? []) as ProjectSummaryRow[];
  const userIds = [...new Set((membershipsQ.data ?? []).map((m) => m.user_id))];
  const profilesQ = userIds.length ? await admin.from("profiles").select("*").in("id", userIds) : { data: [], error: null };
  if (profilesQ.error) throw profilesQ.error;
  const nameOf = new Map((profilesQ.data ?? []).map((p) => [p.id, p.full_name?.trim() || p.email || "Unknown"]));
  const memberName = (id: string | null) => (id ? (nameOf.get(id) ?? "") : "");
  const subName = new Map((subsQ.data ?? []).map((s) => [s.id, s.name]));

  const includeCompleted = settings.includeCompletedProjects;
  const open = summaries.filter((s) => s.status !== "archived" && (includeCompleted || s.status !== "complete"));
  const openIds = new Set(open.map((s) => s.id));
  const active = open.filter((s) => s.status === "active");
  const projectName = new Map(summaries.map((s) => [s.id, s.name]));
  const phasesByProject = new Map<string, NonNullable<typeof phasesQ.data>>();
  for (const p of phasesQ.data ?? []) phasesByProject.set(p.project_id, [...(phasesByProject.get(p.project_id) ?? []), p]);
  const tasks = ((tasksQ.data ?? []) as TaskRow[]).filter((t) => openIds.has(t.project_id));
  const audits = (auditQ.data ?? []) as AuditLogRow[];
  const lines = (linesQ.data ?? []) as BudgetLineRow[];
  const linesByProject = new Map<string, BudgetLineRow[]>();
  for (const l of lines) linesByProject.set(l.project_id, [...(linesByProject.get(l.project_id) ?? []), l]);
  const photos = (photosQ.data ?? []) as FileRow[];

  // Last activity per active project (for "no recent updates").
  const lastActivity = new Map<string, string | null>();
  await Promise.all(
    active.map(async (s) => {
      const { data } = await admin.from("audit_log").select("created_at").eq("project_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      lastActivity.set(s.id, data?.created_at ?? null);
    }),
  );

  const taskFact = (t: TaskRow): TaskFact => ({
    id: t.id,
    title: t.title,
    projectId: t.project_id,
    projectName: projectName.get(t.project_id) ?? "?",
    due: t.due_date,
    assigned: memberName(t.assignee_id) || (t.subcontractor_id ? (subName.get(t.subcontractor_id) ?? null) : null) || null,
    priority: t.priority,
    trade: t.trade || null,
    status: t.status,
    checklist: t.task_list_id !== null,
    milestone: t.is_milestone,
    daysOverdue: t.status !== "done" && t.due_date && t.due_date < localDate ? daysBetweenYmd(t.due_date, localDate) : null,
    completedAt: t.completed_at,
    completedBy: memberName(t.completed_by) || null,
    href: href(t.project_id, "tasks"),
  });
  const byDue = (a: TaskFact, b: TaskFact) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.projectName.localeCompare(b.projectName);

  const notDone = tasks.filter((t) => t.status !== "done");
  const soonEnd = addDays(localDate, SOON_DAYS);
  const dueToday = notDone.filter((t) => t.due_date === localDate).map(taskFact).sort(byDue);
  const dueSoon = notDone.filter((t) => t.due_date && t.due_date > localDate && t.due_date <= soonEnd).map(taskFact).sort(byDue);
  const overdue = notDone.filter((t) => t.due_date && t.due_date < localDate).map(taskFact).sort(byDue);
  const blocked = notDone.filter((t) => t.status === "blocked").map(taskFact).sort(byDue);
  const behind = open
    .map((s) => ({ s, h: projectSchedule(s, i.now) }))
    .filter(({ h }) => h.status === "behind" || h.status === "past_due")
    .map(({ s, h }) => ({ projectId: s.id, projectName: s.name, label: h.label, href: href(s.id, "progress") }));

  // Audit rows per project → important changes.
  const auditByProject = new Map<string, AuditLogRow[]>();
  for (const a of audits) if (a.project_id) auditByProject.set(a.project_id, [...(auditByProject.get(a.project_id) ?? []), a]);
  const notesByProject = new Map<string, number>();
  for (const note of notesQ.data ?? []) notesByProject.set(note.project_id, (notesByProject.get(note.project_id) ?? 0) + 1);
  const photosByProject = new Map<string, FileRow[]>();
  for (const f of photos) if (openIds.has(f.project_id)) photosByProject.set(f.project_id, [...(photosByProject.get(f.project_id) ?? []), f]);

  const prevProgress = new Map((i.previousFacts?.projects ?? []).map((p) => [p.id, p.progress]));

  const projects: ProjectFact[] = active.map((s) => {
    const ph = phasesByProject.get(s.id) ?? [];
    const cur = currentPhase(ph);
    const nxt = nextPhase(ph, cur);
    const sched = projectSchedule(s, i.now);
    const mine = tasks.filter((t) => t.project_id === s.id);
    const grouped = groupActivity(auditByProject.get(s.id) ?? []);
    const money = settings.includeBudget && s.budget_id ? { ...projectMoney(s), overLines: (linesByProject.get(s.id) ?? []).filter((l) => n(l.budgeted) - n(l.committed) - n(l.actual) < 0).length } : null;
    return {
      id: s.id,
      number: projectNumber(s),
      name: s.name,
      status: s.status,
      type: s.type,
      href: href(s.id),
      phase: cur?.name ?? null,
      nextPhase: nxt?.name ?? null,
      phasesDone: n(s.phases_complete),
      phasesTotal: n(s.phases_total),
      progress: Math.round(n(s.display_progress_pct)),
      progressSource: s.progress_source,
      progressPrev: prevProgress.has(s.id) ? (prevProgress.get(s.id) ?? null) : null,
      schedule: { status: sched.status, label: sched.label, daysRemaining: sched.daysRemaining, target: s.target_end_date },
      manager: memberName(s.manager_id) || null,
      tasks: {
        open: mine.filter((t) => t.status !== "done").length,
        overdue: mine.filter((t) => t.status !== "done" && t.due_date && t.due_date < localDate).length,
        blocked: mine.filter((t) => t.status === "blocked").length,
        dueToday: mine.filter((t) => t.status !== "done" && t.due_date === localDate).length,
        dueSoon: mine.filter((t) => t.status !== "done" && t.due_date && t.due_date > localDate && t.due_date <= soonEnd).length,
        done: n(s.tasks_done),
        total: n(s.tasks_total),
      },
      money: money
        ? { contract: money.contract, budgeted: money.budgeted, committed: money.committed, spent: money.spent, remaining: money.remaining, variance: money.variance, overLines: money.overLines }
        : null,
      changes: grouped.slice(0, 3).map((g) => ({ when: g.createdAt, who: g.actorName, what: g.summary, via: g.rows[0].source })),
      changesTotal: grouped.length,
      newNotes: notesByProject.get(s.id) ?? 0,
      newPhotos: photosByProject.get(s.id)?.length ?? 0,
      lastActivityAt: lastActivity.get(s.id) ?? null,
    };
  });

  const otherCounts = new Map<string, number>();
  for (const s of open) if (s.status !== "active") otherCounts.set(s.status, (otherCounts.get(s.status) ?? 0) + 1);
  const otherOpen = [...otherCounts].map(([status, count]) => ({ status, count }));

  const completedRecently = audits
    .filter((a) => a.entity_type === "projects" && a.field === "status" && a.new_value === "complete" && a.project_id)
    .map((a) => ({ id: a.project_id!, name: projectName.get(a.project_id!) ?? "?", when: a.created_at, href: href(a.project_id!) }));

  // Budget.
  let budget: BriefFacts["budget"] = null;
  if (settings.includeBudget) {
    const overLines = lines
      .filter((l) => openIds.has(l.project_id) && n(l.budgeted) - n(l.committed) - n(l.actual) < 0)
      .map((l) => ({ projectId: l.project_id, projectName: projectName.get(l.project_id) ?? "?", category: l.category, budgeted: n(l.budgeted), committed: n(l.committed), spent: n(l.actual), remaining: n(l.budgeted) - n(l.committed) - n(l.actual), href: href(l.project_id, "budget") }));
    const remaining = open
      .filter((s) => s.budget_id)
      .map((s) => {
        const m = projectMoney(s);
        return { projectId: s.id, projectName: s.name, contract: m.contract, budgeted: m.budgeted, committed: m.committed, spent: m.spent, remaining: m.remaining, variance: m.variance, href: href(s.id, "budget") };
      });
    const changes: BudgetChangeFact[] = [];
    for (const a of audits) {
      if (!a.project_id || !openIds.has(a.project_id)) continue;
      const isLine = a.entity_type === "budget_lines";
      const isBudget = a.entity_type === "budgets";
      if (!isLine && !isBudget) continue;
      const from = a.old_value === null || a.old_value === undefined ? null : n(a.old_value);
      const to = a.new_value === null || a.new_value === undefined ? null : n(a.new_value);
      let keep = false;
      if (a.action === "update" && a.field && MONEY_FIELDS.has(a.field)) keep = isLargeMoneyChange(from, to ?? 0);
      else if (isLine && (a.action === "insert" || a.action === "delete")) {
        const row = (a.new_value ?? a.old_value) as { budgeted?: unknown } | null;
        keep = n(row?.budgeted) >= 1000;
      }
      if (!keep) continue;
      changes.push({ when: a.created_at, who: a.actor_name ?? "System", projectId: a.project_id, projectName: projectName.get(a.project_id) ?? "?", what: a.summary, from: a.action === "update" ? from : null, to: a.action === "update" ? to : null, large: true, via: a.source, href: href(a.project_id, "budget") });
    }
    budget = { overLines, changes, remaining, negativeVariance: remaining.filter((r) => r.variance < 0) };
  }

  // Progress.
  const doneInWindow = tasks.filter((t) => t.status === "done" && t.completed_at && t.completed_at >= window.start && t.completed_at < window.end).map(taskFact);
  const notes: NoteFact[] = (notesQ.data ?? [])
    .filter((note) => openIds.has(note.project_id))
    .slice(0, 12)
    .map((note) => ({ when: note.created_at, who: memberName(note.author_id) || "Unknown", projectId: note.project_id, projectName: projectName.get(note.project_id) ?? "?", text: note.body.length > 240 ? `${note.body.slice(0, 239)}…` : note.body, href: href(note.project_id, "notes") }));
  const progressChanges = open
    .filter((s) => prevProgress.has(s.id) && Math.round(n(s.display_progress_pct)) !== Math.round(prevProgress.get(s.id) ?? 0))
    .map((s) => ({ projectId: s.id, projectName: s.name, from: Math.round(prevProgress.get(s.id) ?? 0), to: Math.round(n(s.display_progress_pct)), href: href(s.id, "progress") }));

  // Photos.
  const photoFacts: PhotoFact[] = [];
  for (const [pid, files] of photosByProject) {
    let previews: string[] = [];
    if (settings.includePhotoPreviews) {
      const paths = files.slice(0, 4).map((f) => f.thumb_path ?? f.storage_path);
      const urls = await signedUrls(admin, "photos", paths, PREVIEW_TTL_S).catch(() => new Map<string, string>());
      previews = paths.map((p) => urls.get(p)).filter((u): u is string => Boolean(u));
    }
    const latest = files.map((f) => f.taken_at ?? f.created_at).sort().at(-1) ?? null;
    photoFacts.push({ projectId: pid, projectName: projectName.get(pid) ?? "?", count: files.length, latestAt: latest, href: href(pid, "photos"), previews });
  }

  // Inboxes.
  let leads: BriefFacts["leads"] = null;
  if (settings.includeLeads) {
    const [freshQ, waitingQ] = await Promise.all([
      admin.from("leads").select("*").eq("company_id", cid).gte("created_at", window.start).lt("created_at", window.end).order("created_at", { ascending: false }).limit(20),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "new"),
    ]);
    if (freshQ.error) throw freshQ.error;
    const fresh: LeadFact[] = (freshQ.data ?? []).map((l) => ({ id: l.id, when: l.created_at, name: l.name, contact: [l.email, l.phone].filter(Boolean).join(" · "), source: l.source, message: l.message, status: l.status }));
    leads = { fresh, waiting: waitingQ.count ?? 0 };
  }
  let applications: BriefFacts["applications"] = null;
  if (settings.includeApplications) {
    const [freshQ, waitingQ] = await Promise.all([
      admin.from("subcontractor_applications").select("*").eq("company_id", cid).gte("created_at", window.start).lt("created_at", window.end).order("created_at", { ascending: false }).limit(20),
      admin.from("subcontractor_applications").select("*").eq("company_id", cid).in("status", ["new", "reviewing"]).order("created_at").limit(25),
    ]);
    if (freshQ.error) throw freshQ.error;
    if (waitingQ.error) throw waitingQ.error;
    const toFact = (a: NonNullable<typeof freshQ.data>[number]): ApplicationFact => ({ id: a.id, when: a.created_at, company: a.company_name, contact: a.contact_name, trade: a.trade, status: a.status, waitingDays: Math.max(0, Math.floor((i.now.getTime() - Date.parse(a.created_at)) / DAY)) });
    applications = { fresh: (freshQ.data ?? []).map(toFact), waiting: (waitingQ.data ?? []).map(toFact) };
  }

  return {
    company,
    date: localDate,
    timezone: settings.timezone,
    generatedAt: i.now.toISOString(),
    window,
    settings,
    projects,
    otherOpen,
    completedRecently,
    schedule: { dueToday, dueSoon, overdue, blocked, behind },
    budget,
    progress: {
      completedTasks: doneInWindow.filter((t) => !t.checklist),
      completedChecklist: doneInWindow.filter((t) => t.checklist),
      progressChanges,
      notes,
    },
    photos: photoFacts,
    leads,
    applications,
  };
}

