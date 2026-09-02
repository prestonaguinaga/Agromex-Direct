import type { BudgetLineRow, BudgetRow } from "./database.types";

/**
 * The numbers Overview, Budget and Bob all show; one definition so they never
 * disagree. Pure (shared by the browser and the server).
 */
export interface BudgetFigures {
  contract: number | null;
  budgeted: number;
  committed: number;
  actual: number;
  /** Budget left to pay out: budgeted − spent. */
  remaining: number;
  /** Projected position at completion: budgeted − committed − spent (negative = over). */
  variance: number;
  /** Approved budget versus the contract (negative = budget exceeds contract). */
  contractDelta: number | null;
}

export function budgetTotals(lines: Pick<BudgetLineRow, "budgeted" | "committed" | "actual">[]) {
  const t = lines.reduce(
    (acc, l) => ({
      budgeted: acc.budgeted + Number(l.budgeted),
      committed: acc.committed + Number(l.committed),
      actual: acc.actual + Number(l.actual),
    }),
    { budgeted: 0, committed: 0, actual: 0 },
  );
  return { ...t, variance: t.budgeted - t.committed - t.actual };
}

export function budgetFigures(
  budget: Pick<BudgetRow, "contract_amount"> | null,
  lines: Pick<BudgetLineRow, "budgeted" | "committed" | "actual">[],
): BudgetFigures {
  const t = budgetTotals(lines);
  const contract = budget?.contract_amount == null ? null : Number(budget.contract_amount);
  return {
    contract,
    budgeted: t.budgeted,
    committed: t.committed,
    actual: t.actual,
    remaining: t.budgeted - t.actual,
    variance: t.variance,
    contractDelta: contract == null ? null : contract - t.budgeted,
  };
}
