import type { ProjectStatus, ProjectSummaryRow } from "../data/database.types";
import { scheduleHealth, type ScheduleHealth } from "../data/progress.ts";

/**
 * Pure readers over the project_summary row — the same figures the Overview
 * and Budget sheets show, so Bob and the screens never disagree.
 */

export const STATUS_TEXT: Record<ProjectStatus, string> = {
  lead: "lead",
  estimating: "estimating",
  active: "active",
  on_hold: "on hold",
  complete: "complete",
  archived: "archived",
};

type SummaryLike = Pick<
  ProjectSummaryRow,
  | "id"
  | "number"
  | "name"
  | "type"
  | "status"
  | "client_name"
  | "start_date"
  | "target_end_date"
  | "display_progress_pct"
  | "progress_pct"
  | "progress_source"
  | "current_phase_name"
  | "tasks_total"
  | "tasks_done"
  | "tasks_in_progress"
  | "tasks_blocked"
  | "tasks_overdue"
  | "phases_total"
  | "phases_complete"
  | "budget_id"
  | "contract_amount"
  | "budget_budgeted"
  | "budget_committed"
  | "budget_actual"
  | "grand"
>;

export interface MoneyFigures {
  hasBudget: boolean;
  contract: number | null;
  estimateTotal: number;
  budgeted: number;
  committed: number;
  spent: number;
  /** budgeted − spent */
  remaining: number;
  /** budgeted − committed − spent (negative = over budget) */
  variance: number;
  /** contract − budgeted (negative = budget exceeds contract) */
  contractDelta: number | null;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function projectMoney(s: SummaryLike): MoneyFigures {
  const budgeted = n(s.budget_budgeted);
  const committed = n(s.budget_committed);
  const spent = n(s.budget_actual);
  const contract = s.contract_amount == null ? null : n(s.contract_amount);
  return {
    hasBudget: Boolean(s.budget_id),
    contract,
    estimateTotal: n(s.grand),
    budgeted,
    committed,
    spent,
    remaining: budgeted - spent,
    variance: budgeted - committed - spent,
    contractDelta: contract == null ? null : contract - budgeted,
  };
}

export function projectSchedule(s: SummaryLike, today?: Date): ScheduleHealth {
  return scheduleHealth({
    startDate: s.start_date,
    targetDate: s.target_end_date,
    progressPct: n(s.display_progress_pct),
    today,
  });
}

export interface ProjectFlags {
  overBudget: boolean;
  budgetOverContract: boolean;
  behind: boolean;
  pastDue: boolean;
  overdueTasks: number;
  blockedTasks: number;
}

export function projectFlags(s: SummaryLike, today?: Date): ProjectFlags {
  const m = projectMoney(s);
  const h = projectSchedule(s, today);
  return {
    overBudget: m.hasBudget && m.variance < 0,
    budgetOverContract: m.contractDelta !== null && m.contractDelta < 0,
    behind: h.status === "behind",
    pastDue: h.status === "past_due",
    overdueTasks: n(s.tasks_overdue),
    blockedTasks: n(s.tasks_blocked),
  };
}

export function projectNumber(s: { number: number | null }): string {
  return s.number ? `P-${String(s.number).padStart(4, "0")}` : "";
}

export function pct(v: unknown): string {
  return `${Math.round(n(v))}%`;
}

/** One line per project for lists: "P-0007 Smith kitchen · remodel · active · Framing · 62% (calculated) · on schedule". */
export function projectHeadline(s: SummaryLike, today?: Date): string {
  const h = projectSchedule(s, today);
  const bits = [
    [projectNumber(s), s.name].filter(Boolean).join(" "),
    s.type === "new-build" ? "new build" : "remodel",
    STATUS_TEXT[s.status] ?? s.status,
    s.current_phase_name ? `phase: ${s.current_phase_name}` : n(s.phases_total) ? "all phases complete" : "no phases",
    `${pct(s.display_progress_pct)} (${s.progress_source})`,
    h.status === "no_dates" ? "no schedule dates" : h.label.toLowerCase(),
  ];
  if (n(s.tasks_overdue) > 0) bits.push(`${s.tasks_overdue} overdue`);
  return bits.join(" · ");
}
