import { test } from "node:test";
import assert from "node:assert/strict";
import { projectFlags, projectHeadline, projectMoney } from "./digest.ts";

const base = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  number: 7,
  name: "Smith kitchen",
  type: "remodel" as const,
  status: "active" as const,
  client_name: "J. Smith",
  start_date: "2026-07-14",
  target_end_date: "2026-10-22",
  display_progress_pct: 62,
  progress_pct: 62,
  progress_source: "calculated" as const,
  current_phase_name: "Framing",
  tasks_total: 30,
  tasks_done: 12,
  tasks_in_progress: 3,
  tasks_blocked: 1,
  tasks_overdue: 2,
  phases_total: 13,
  phases_complete: 3,
  budget_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  contract_amount: 185000,
  budget_budgeted: 190000,
  budget_committed: 20000,
  budget_actual: 175000,
  grand: 180000,
};
const today = new Date(2026, 8, 2);

test("money figures follow the sheet definitions", () => {
  const m = projectMoney(base);
  assert.equal(m.remaining, 15000);
  assert.equal(m.variance, -5000);
  assert.equal(m.contractDelta, -5000);
  assert.equal(m.hasBudget, true);
  const none = projectMoney({ ...base, budget_id: null, budget_budgeted: 0, budget_committed: 0, budget_actual: 0, contract_amount: null });
  assert.equal(none.hasBudget, false);
  assert.equal(none.contractDelta, null);
});

test("flags: over budget, budget over contract, overdue tasks, schedule", () => {
  const f = projectFlags(base, today);
  assert.equal(f.overBudget, true);
  assert.equal(f.budgetOverContract, true);
  assert.equal(f.overdueTasks, 2);
  assert.equal(f.blockedTasks, 1);
  assert.equal(f.behind, false); // 62 % done, 50 % elapsed → ahead
  const late = projectFlags({ ...base, display_progress_pct: 30 }, today);
  assert.equal(late.behind, true);
});

test("headline is one scannable line", () => {
  assert.equal(projectHeadline(base, today), "P-0007 Smith kitchen · remodel · active · phase: Framing · 62% (calculated) · ahead by about 12 days · 2 overdue");
});
