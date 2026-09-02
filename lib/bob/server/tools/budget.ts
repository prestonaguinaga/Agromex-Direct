import "server-only";
import type { BudgetLineRow, BudgetRow } from "../../../data/database.types";
import { budgetFigures } from "../../../data/budget-math";
import { uid } from "../../../format";
import { fmtMoney, moneyChangePreview } from "../../guard";
import { matchByName } from "../../match";
import { isUuid } from "../../protocol";
import { loadBudget } from "../data";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, num, schema, str, type Db, type ToolCtx, type ToolDef } from "../types";

async function ensureBudget(sb: Db, companyId: string, projectId: string): Promise<BudgetRow> {
  const { budget } = await loadBudget(sb, projectId);
  if (budget) return budget;
  const { data, error } = await sb.from("budgets").insert({ id: uid(), company_id: companyId, project_id: projectId }).select("*").single();
  if (error) throw error;
  return data;
}

function lineView(l: BudgetLineRow) {
  const remaining = Number(l.budgeted) - Number(l.committed) - Number(l.actual);
  return { id: l.id, category: l.category, budgeted: Number(l.budgeted), committed: Number(l.committed), spent: Number(l.actual), remaining, over_budget: remaining < 0, notes: l.notes || null };
}

function findLine(lines: BudgetLineRow[], input: Record<string, unknown>): BudgetLineRow | null {
  const id = str(input, "line_id");
  if (id) {
    if (!isUuid(id)) throw new ToolError("line_id must be a uuid (from get_project_budget)");
    const l = lines.find((x) => x.id === id);
    if (!l) throw new ToolError("No budget line with that id on this project.");
    return l;
  }
  const category = str(input, "category");
  if (!category) return null;
  const m = matchByName(category, lines, (l) => l.category);
  if (m.length === 0) return null;
  const [top, second] = m;
  if (top.score >= 70 && (!second || top.score - second.score >= 15 || top.score === 100)) return top.project;
  throw new ToolError(`Several budget lines match "${category}": ${m.slice(0, 5).map((x) => `"${x.project.category}" [${x.project.id}]`).join("; ")} — ask which one.`);
}

const FIELDS = [
  ["budgeted", "budgeted", "budget"],
  ["committed", "committed", "committed amount"],
  ["spent", "actual", "spent amount"],
] as const;

async function planLineChange(ctx: ToolCtx, input: Record<string, unknown>) {
  const s = await resolveProject(ctx, input);
  const { lines } = await loadBudget(ctx.session.sb, s.id);
  const line = findLine(lines, input);
  const changes: { field: "budgeted" | "committed" | "actual"; from: number | null; to: number; label: string }[] = [];
  for (const [key, column, label] of FIELDS) {
    const v = num(input, key);
    if (v === undefined) continue;
    if (v < 0) throw new ToolError(`${key} can't be negative`);
    changes.push({ field: column, from: line ? Number(line[column]) : null, to: v, label });
  }
  if (!changes.length) throw new ToolError("Give at least one of budgeted, committed or spent.");
  const category = line?.category ?? str(input, "category");
  if (!category) throw new ToolError("Give the category (budget line name) or line_id.");
  return { s, lines, line, changes, category };
}

export const budgetTools: ToolDef[] = [
  {
    name: "get_project_budget",
    description:
      "The project's budget: contract amount, every line with budgeted / committed / spent / remaining, totals and variance. Answers 'how much is left in the electrical budget', 'are we over budget', 'what's the contract'. Optional category narrows to matching lines.",
    input_schema: schema({ ...PROJECT_PROPS, category: { type: "string", description: "budget line to focus on, e.g. Electrical" } }),
    requires: ["budgets.view"],
    kind: "read",
    status: "reading the budget…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const { budget, lines } = await loadBudget(ctx.session.sb, s.id);
      if (!budget) return { data: { project: s.name, no_budget_yet: true, estimate_total: Number(s.grand), note: "No budget exists yet. The Budget sheet (or set_budget_line) creates one; 'From estimate sections' seeds lines from the estimate." } };
      const f = budgetFigures(budget, lines);
      const category = str(input, "category");
      let focus: BudgetLineRow[] = lines;
      if (category) {
        focus = matchByName(category, lines, (l) => l.category)
          .filter((m) => m.score >= 40)
          .map((m) => m.project);
        if (focus.length === 0) throw new ToolError(`No budget line matches "${category}". Lines: ${lines.map((l) => l.category).join(", ") || "none"}`);
      }
      return {
        data: {
          as_of: ctx.now.toISOString(),
          project: { id: s.id, name: s.name },
          contract: f.contract,
          totals: { budgeted: f.budgeted, committed: f.committed, spent: f.actual, remaining: f.remaining, variance: f.variance, over_budget: f.variance < 0, budget_vs_contract: f.contractDelta },
          lines: focus.map(lineView),
          definitions: "remaining = budgeted − spent; variance = budgeted − committed − spent (negative = over budget); per line, remaining = budgeted − committed − spent",
        },
      };
    },
  },
  {
    name: "set_budget_line",
    description:
      "Set the budgeted, committed and/or spent amount of a budget line (by category name or line_id); creates the line when the category does not exist yet. Financial change: always needs the person's confirmation — the tool queues it and returns needs_confirmation.",
    input_schema: schema({
      ...PROJECT_PROPS,
      line_id: { type: "string" },
      category: { type: "string", description: "e.g. Electrical" },
      budgeted: { type: "number" },
      committed: { type: "number" },
      spent: { type: "number" },
    }),
    requires: ["budgets.edit"],
    kind: "write",
    status: "preparing the budget change…",
    guard: async (ctx, input) => {
      const { s, line, changes, category } = await planLineChange(ctx, input);
      const previews = changes.map((c) => moneyChangePreview(`${category} ${c.label}`, c.from, c.to));
      const preview = line ? previews.join("; ") : `Add budget line "${category}" to ${s.name} at ${changes.map((c) => `${fmtMoney(c.to)} ${c.label}`).join(", ")}`;
      const resolved: Record<string, unknown> = { project_id: s.id, category };
      if (line) resolved.line_id = line.id;
      for (const c of changes) resolved[c.field === "actual" ? "spent" : c.field] = c.to;
      return { sensitivity: "money", preview: `${preview} (${s.name})`, projectId: s.id, input: resolved };
    },
    execute: async (ctx, input) => {
      const { s, line, changes, category } = await planLineChange(ctx, input);
      const { sb, companyId } = ctx.session;
      const budget = await ensureBudget(sb, companyId, s.id);
      const patch: Partial<BudgetLineRow> = {};
      for (const c of changes) patch[c.field] = c.to;
      if (line) {
        const { error } = await sb.from("budget_lines").update(patch).eq("id", line.id);
        if (error) throw error;
      } else {
        const { lines } = await loadBudget(sb, s.id);
        const { error } = await sb.from("budget_lines").insert({ id: uid(), company_id: companyId, budget_id: budget.id, project_id: s.id, category, position: lines.length, ...patch });
        if (error) throw error;
      }
      const text = line
        ? `$ ${s.name}: ${changes.map((c) => `${category} ${c.label} ${fmtMoney(c.from)} → ${fmtMoney(c.to)}`).join("; ")}`
        : `$ ${s.name}: added budget line "${category}" (${changes.map((c) => `${c.label} ${fmtMoney(c.to)}`).join(", ")})`;
      return { data: { ok: true, project: s.name, category, changes }, event: text, refresh: ["budgets", "budget_lines"], projectId: s.id };
    },
  },
  {
    name: "set_contract_amount",
    description: "Set the project's original contract / estimate amount (the figure the approved budget is compared with). Financial change: always needs confirmation.",
    input_schema: schema({ ...PROJECT_PROPS, amount: { type: "number" } }, ["amount"]),
    requires: ["budgets.edit"],
    kind: "write",
    status: "preparing the contract change…",
    guard: async (ctx, input) => {
      const amount = num(input, "amount");
      if (amount === undefined || amount < 0) throw new ToolError("amount must be a positive number");
      const s = await resolveProject(ctx, input);
      const { budget } = await loadBudget(ctx.session.sb, s.id);
      const from = budget?.contract_amount == null ? null : Number(budget.contract_amount);
      return { sensitivity: "money", preview: `${moneyChangePreview(`the contract amount for ${s.name}`, from, amount)}`, projectId: s.id, input: { project_id: s.id, amount } };
    },
    execute: async (ctx, input) => {
      const amount = num(input, "amount");
      if (amount === undefined || amount < 0) throw new ToolError("amount must be a positive number");
      const s = await resolveProject(ctx, input);
      const { sb, companyId } = ctx.session;
      const budget = await ensureBudget(sb, companyId, s.id);
      const from = budget.contract_amount == null ? null : Number(budget.contract_amount);
      const { error } = await sb.from("budgets").update({ contract_amount: amount }).eq("id", budget.id);
      if (error) throw error;
      return { data: { ok: true, project: s.name, from, to: amount }, event: `$ ${s.name}: contract ${fmtMoney(from)} → ${fmtMoney(amount)}`, refresh: ["budgets", "budget_lines"], projectId: s.id };
    },
  },
];
