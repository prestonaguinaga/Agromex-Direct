"use client";

import type { Project } from "../types";
import { lineTotal, uid } from "../format";
import { supabase } from "./client";
import type { BudgetLineRow, BudgetRow } from "./database.types";

export interface BudgetBundle {
  budget: BudgetRow | null;
  lines: BudgetLineRow[];
}

export async function loadBudget(projectId: string): Promise<BudgetBundle> {
  const sb = supabase();
  const { data: budget, error } = await sb
    .from("budgets")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!budget) return { budget: null, lines: [] };
  const { data: lines, error: lErr } = await sb
    .from("budget_lines")
    .select("*")
    .eq("budget_id", budget.id)
    .order("position");
  if (lErr) throw lErr;
  return { budget, lines: lines ?? [] };
}

/** The project's active budget, created on first use. Safe to call twice. */
export async function ensureBudget(projectId: string, companyId: string): Promise<BudgetRow> {
  const sb = supabase();
  const existing = await sb.from("budgets").select("*").eq("project_id", projectId).eq("status", "active").maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const { data, error } = await sb
    .from("budgets")
    .insert({ id: uid(), company_id: companyId, project_id: projectId })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      // Someone else created it a moment ago — use theirs.
      const again = await sb.from("budgets").select("*").eq("project_id", projectId).eq("status", "active").single();
      if (again.error) throw again.error;
      return again.data;
    }
    throw error;
  }
  return data;
}

export interface NewBudgetLine {
  id?: string;
  category: string;
  budgeted?: number;
  committed?: number;
  actual?: number;
  notes?: string;
  source_section_id?: string | null;
  position: number;
}

export async function addBudgetLines(
  budget: BudgetRow,
  lines: NewBudgetLine[],
): Promise<void> {
  if (lines.length === 0) return;
  const rows = lines.map((l) => ({
    id: l.id ?? uid(),
    company_id: budget.company_id,
    budget_id: budget.id,
    project_id: budget.project_id,
    category: l.category,
    budgeted: l.budgeted ?? 0,
    committed: l.committed ?? 0,
    actual: l.actual ?? 0,
    notes: l.notes ?? "",
    source_section_id: l.source_section_id ?? null,
    position: l.position,
  }));
  // Upsert on id: a retried request never doubles a line.
  const { error } = await supabase().from("budget_lines").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function updateBudgetLine(
  id: string,
  patch: Partial<Pick<BudgetLineRow, "category" | "budgeted" | "committed" | "actual" | "notes" | "position">>,
): Promise<void> {
  const { error } = await supabase().from("budget_lines").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBudgetLine(id: string): Promise<void> {
  const { error } = await supabase().from("budget_lines").delete().eq("id", id);
  if (error) throw error;
}

/** One budget line per estimate section, budgeted at the section's priced total. */
export function linesFromEstimate(project: Project, startPosition = 0): NewBudgetLine[] {
  return project.sections
    .map((s, i) => ({
      category: s.name || `Section ${i + 1}`,
      budgeted: Math.round(s.items.reduce((a, it) => a + (lineTotal(it) ?? 0), 0) * 100) / 100,
      source_section_id: s.id,
      position: startPosition + i,
    }))
    .filter((l) => l.category.trim().length > 0);
}

export async function updateBudget(
  id: string,
  patch: Partial<Pick<BudgetRow, "contract_amount" | "notes" | "name">>,
): Promise<void> {
  const { error } = await supabase().from("budgets").update(patch).eq("id", id);
  if (error) throw error;
}

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

/** The numbers Overview and Budget both show; one definition so they never disagree. */
export function budgetFigures(budget: BudgetRow | null, lines: BudgetLineRow[]): BudgetFigures {
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

export function budgetTotals(lines: BudgetLineRow[]) {
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
