import { fmtMoney } from "../bob/guard.ts";
import type { AttentionItem, BriefFacts } from "./types.ts";

/**
 * "Bob Says You Should Look At" — objective rules over the facts. Every item
 * carries the evidence it rests on; nothing here is inferred or guessed.
 */

export const STALE_DAYS = 5;
export const SOON_DAYS = 7;
const VARIANCE_ABS = 1000;
const VARIANCE_PCT = 10;

const DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((Date.parse(toIso) - Date.parse(fromIso)) / DAY);
}

export function attentionItems(f: Omit<BriefFacts, "attention">): AttentionItem[] {
  const out: AttentionItem[] = [];
  const byProject = new Map(f.projects.map((p) => [p.id, p]));

  // 1. Overdue work, per project.
  const overdueByProject = new Map<string, typeof f.schedule.overdue>();
  for (const t of f.schedule.overdue) overdueByProject.set(t.projectId, [...(overdueByProject.get(t.projectId) ?? []), t]);
  for (const [pid, tasks] of overdueByProject) {
    const oldest = tasks.reduce((a, b) => ((a.daysOverdue ?? 0) >= (b.daysOverdue ?? 0) ? a : b));
    const worst = oldest.daysOverdue ?? 0;
    out.push({
      severity: worst > 7 ? "high" : "medium",
      kind: "overdue",
      projectId: pid,
      projectName: oldest.projectName,
      text: `${tasks.length} overdue task${tasks.length === 1 ? "" : "s"} on ${oldest.projectName}; oldest is "${oldest.title}", ${worst} day${worst === 1 ? "" : "s"} past due`,
      evidence: tasks
        .slice(0, 4)
        .map((t) => `"${t.title}" due ${t.due}`)
        .join("; "),
      href: byProject.has(pid) ? `${byProject.get(pid)!.href}?tab=tasks` : oldest.href,
    });
  }

  // 2. Blocked tasks.
  const blockedByProject = new Map<string, typeof f.schedule.blocked>();
  for (const t of f.schedule.blocked) blockedByProject.set(t.projectId, [...(blockedByProject.get(t.projectId) ?? []), t]);
  for (const [pid, tasks] of blockedByProject) {
    out.push({
      severity: "medium",
      kind: "blocked",
      projectId: pid,
      projectName: tasks[0].projectName,
      text: `${tasks.length} blocked task${tasks.length === 1 ? "" : "s"} on ${tasks[0].projectName}: ${tasks
        .slice(0, 3)
        .map((t) => `"${t.title}"`)
        .join(", ")}${tasks.length > 3 ? "…" : ""}`,
      evidence: `tasks with status Blocked as of the brief`,
      href: tasks[0].href,
    });
  }

  // 3. Money: negative variance, lines over budget, budget above contract.
  if (f.budget) {
    for (const r of f.budget.negativeVariance) {
      const large = Math.abs(r.variance) >= VARIANCE_ABS || (r.budgeted > 0 && (Math.abs(r.variance) / r.budgeted) * 100 >= VARIANCE_PCT);
      out.push({
        severity: large ? "high" : "medium",
        kind: "variance",
        projectId: r.projectId,
        projectName: r.projectName,
        text: `${r.projectName} is ${fmtMoney(-r.variance)} over its approved budget`,
        evidence: `budgeted ${fmtMoney(r.budgeted)} − committed ${fmtMoney(r.committed)} − spent ${fmtMoney(r.spent)} = ${fmtMoney(r.variance)}`,
        href: r.href,
      });
    }
    const overByProject = new Map<string, typeof f.budget.overLines>();
    for (const l of f.budget.overLines) overByProject.set(l.projectId, [...(overByProject.get(l.projectId) ?? []), l]);
    for (const [pid, lines] of overByProject) {
      if (f.budget.negativeVariance.some((r) => r.projectId === pid)) continue; // already covered above
      out.push({
        severity: "medium",
        kind: "over_line",
        projectId: pid,
        projectName: lines[0].projectName,
        text: `${lines.length} budget line${lines.length === 1 ? "" : "s"} over budget on ${lines[0].projectName}: ${lines
          .slice(0, 3)
          .map((l) => `${l.category} (${fmtMoney(-l.remaining)} over)`)
          .join(", ")}`,
        evidence: lines
          .slice(0, 3)
          .map((l) => `${l.category}: budgeted ${fmtMoney(l.budgeted)}, committed ${fmtMoney(l.committed)}, spent ${fmtMoney(l.spent)}`)
          .join("; "),
        href: lines[0].href,
      });
    }
    for (const r of f.budget.remaining) {
      if (r.contract !== null && r.budgeted > r.contract) {
        out.push({
          severity: "medium",
          kind: "over_contract",
          projectId: r.projectId,
          projectName: r.projectName,
          text: `${r.projectName}'s approved budget (${fmtMoney(r.budgeted)}) exceeds the contract (${fmtMoney(r.contract)}) by ${fmtMoney(r.budgeted - r.contract)}`,
          evidence: `contract ${fmtMoney(r.contract)}, approved budget ${fmtMoney(r.budgeted)}`,
          href: r.href,
        });
      }
    }
  }

  // 4. Schedule health.
  for (const b of f.schedule.behind) {
    const p = byProject.get(b.projectId);
    out.push({
      severity: p?.schedule.status === "past_due" ? "high" : "medium",
      kind: "behind",
      projectId: b.projectId,
      projectName: b.projectName,
      text: `${b.projectName} is ${b.label.toLowerCase()}`,
      evidence: p
        ? `${p.progress}% complete vs. straight-line expectation${p.schedule.target ? `, target ${p.schedule.target}` : ""}`
        : "straight-line schedule comparison",
      href: b.href,
    });
  }

  // 5. Projects with no recent updates.
  for (const p of f.projects) {
    if (p.status !== "active") continue;
    const days = p.lastActivityAt ? daysBetween(p.lastActivityAt, f.generatedAt) : null;
    if (days === null || days >= STALE_DAYS) {
      out.push({
        severity: "medium",
        kind: "stale",
        projectId: p.id,
        projectName: p.name,
        text: days === null ? `${p.name} has no recorded activity yet` : `No changes, notes or photos on ${p.name} for ${days} days`,
        evidence: p.lastActivityAt ? `last activity ${p.lastActivityAt.slice(0, 10)}` : "no activity rows, notes or photos",
        href: p.href,
      });
    }
  }

  // 6. Important incomplete checklist items: high/urgent priority, milestones, overdue inspections.
  const important = [...f.schedule.overdue, ...f.schedule.dueToday, ...f.schedule.dueSoon, ...f.schedule.blocked].filter(
    (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i && (t.priority === "urgent" || t.priority === "high" || t.milestone || ((t.trade ?? "").toLowerCase() === "inspection" && (t.daysOverdue ?? 0) > 0)),
  );
  for (const t of important.slice(0, 6)) {
    const why = t.milestone ? "milestone" : t.priority === "urgent" || t.priority === "high" ? `${t.priority} priority` : "inspection";
    out.push({
      severity: t.priority === "urgent" || (t.daysOverdue ?? 0) > 7 ? "high" : "medium",
      kind: "important_item",
      projectId: t.projectId,
      projectName: t.projectName,
      text: `"${t.title}" (${why}) on ${t.projectName} is ${t.daysOverdue ? `${t.daysOverdue} day${t.daysOverdue === 1 ? "" : "s"} overdue` : t.status === "blocked" ? "blocked" : t.due ? `due ${t.due}` : "open"}`,
      evidence: `status ${t.status}${t.due ? `, due ${t.due}` : ""}${t.assigned ? `, assigned to ${t.assigned}` : ", unassigned"}`,
      href: t.href,
    });
  }

  // 7. Inboxes waiting for a person.
  if (f.applications && f.applications.waiting.length) {
    out.push({
      severity: "medium",
      kind: "applications",
      projectId: null,
      projectName: null,
      text: `${f.applications.waiting.length} subcontractor application${f.applications.waiting.length === 1 ? "" : "s"} waiting for review`,
      evidence: f.applications.waiting
        .slice(0, 3)
        .map((a) => `${a.company} (${a.trade || "trade not given"}, ${a.waitingDays} day${a.waitingDays === 1 ? "" : "s"})`)
        .join("; "),
      href: null,
    });
  }
  if (f.leads && f.leads.waiting) {
    out.push({
      severity: "medium",
      kind: "leads",
      projectId: null,
      projectName: null,
      text: `${f.leads.waiting} new customer inquir${f.leads.waiting === 1 ? "y" : "ies"} not yet contacted`,
      evidence: "leads with status New",
      href: null,
    });
  }

  const rank = { high: 0, medium: 1 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.projectName ?? "~").localeCompare(b.projectName ?? "~"));
}
