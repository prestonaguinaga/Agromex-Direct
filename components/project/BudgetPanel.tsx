"use client";

import { useMemo, useState } from "react";
import { MoneyInput, TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar } from "@/components/ui";
import {
  addBudgetLines,
  budgetFigures,
  deleteBudgetLine,
  ensureBudget,
  linesFromEstimate,
  loadBudget,
  updateBudget,
  updateBudgetLine,
  type BudgetBundle,
} from "@/lib/data/budgets";
import { describeError } from "@/lib/data/client";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { money } from "@/lib/format";
import type { Project, Totals } from "@/lib/types";

export function BudgetPanel({
  projectId,
  companyId,
  project,
  totals,
  canEdit,
}: {
  projectId: string;
  companyId: string;
  project: Project;
  totals: Totals | null;
  canEdit: boolean;
}) {
  const live = useLiveRows<BudgetBundle>(
    `budget:${projectId}`,
    async () => [await loadBudget(projectId)],
    [
      { table: "budgets", filter: `project_id=eq.${projectId}` },
      { table: "budget_lines", filter: `project_id=eq.${projectId}` },
    ],
  );
  const bundle = live.rows[0];
  const lines = useMemo(() => bundle?.lines ?? [], [bundle]);
  const budget = bundle?.budget ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await live.reload();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const fromEstimate = () =>
    run(async () => {
      const b = await ensureBudget(projectId, companyId);
      const existing = new Set(lines.map((l) => l.source_section_id).filter(Boolean));
      const fresh = linesFromEstimate(project, lines.length).filter((l) => !existing.has(l.source_section_id ?? ""));
      await addBudgetLines(b, fresh);
      if (b.contract_amount == null && totals && totals.grand > 0) await updateBudget(b.id, { contract_amount: Math.round(totals.grand * 100) / 100 });
    });

  const addLine = () =>
    run(async () => {
      const b = await ensureBudget(projectId, companyId);
      await addBudgetLines(b, [{ category: "New category", position: lines.length }]);
    });

  const setContract = (v: number | null) =>
    run(async () => {
      const b = budget ?? (await ensureBudget(projectId, companyId));
      await updateBudget(b.id, { contract_amount: v });
    });

  const f = useMemo(() => budgetFigures(budget, lines), [budget, lines]);
  const hasSheet = project.sections.some((s) => s.items.length > 0);

  return (
    <div className="grid gap-4">
      {/* ── Figures ─────────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <PanelBar title="Budget position" right={live.refreshing && <span className="microlabel">syncing…</span>} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="microlabel">Original contract / estimate</p>
            {canEdit ? (
              <MoneyInput value={f.contract} onCommit={(v) => void setContract(v)} className="field-quiet !px-0 text-base" placeholder={totals ? `${money(totals.grand)} est.` : "$ —"} />
            ) : (
              <p className="tnum font-mono text-base">{f.contract === null ? (totals ? `${money(totals.grand)} est.` : "—") : money(f.contract)}</p>
            )}
            {f.contractDelta !== null && (
              <p className="microlabel !normal-case !tracking-normal">
                budget is {f.contractDelta >= 0 ? `${money(f.contractDelta)} under` : `${money(-f.contractDelta)} over`} contract
              </p>
            )}
          </div>
          <Fig label="Current approved budget" value={f.budgeted} />
          <Fig label="Committed" value={f.committed} />
          <Fig label="Paid / spent" value={f.actual} />
          <Fig label="Remaining budget" value={f.remaining} hint="budgeted − spent" />
          <Fig label="Budget variance" value={f.variance} signed hint="budgeted − committed − spent" />
        </div>
      </section>

      {/* ── Lines ───────────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <PanelBar
          title="Budget lines"
          right={
            <span className="flex items-center gap-2">
              {canEdit && hasSheet && (
                <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => void fromEstimate()}>
                  ⇣ From estimate sections
                </button>
              )}
              {canEdit && (
                <button className="btn btn-xs" disabled={busy} onClick={() => void addLine()}>
                  + Line
                </button>
              )}
            </span>
          }
        />
        {(error || live.error) && <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />}
        {live.loading && <LoadingMark text="Loading budget…" />}
        {!live.loading && !live.error && lines.length === 0 && (
          <div>
            <EmptyMark text={canEdit ? "No budget lines yet" : "No budget has been set for this project"} />
            {canEdit && (
              <p className="px-6 pb-6 text-center text-xs leading-relaxed text-mute">
                Start from the estimate — one line per section at its priced total, and the estimate total becomes the contract amount — or add lines by hand. Every change to a figure is recorded in Activity with who changed it and the old and new amounts.
              </p>
            )}
          </div>
        )}
        {lines.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1fr_120px_120px_120px_120px_40px] items-center gap-1 border-b px-3 py-1.5">
                <span className="microlabel">Category</span>
                <span className="microlabel text-right">Budgeted</span>
                <span className="microlabel text-right">Committed</span>
                <span className="microlabel text-right">Spent</span>
                <span className="microlabel text-right">Remaining</span>
                <span />
              </div>
              {lines.map((l) => {
                const remaining = Number(l.budgeted) - Number(l.committed) - Number(l.actual);
                const over = remaining < 0;
                return (
                  <div key={l.id} className={`grid grid-cols-[1fr_120px_120px_120px_120px_40px] items-center gap-1 border-b border-line-soft px-3 py-1 ${over ? "bg-paper-2" : ""}`}>
                    <TextInput value={l.category} onCommit={(v) => void run(() => updateBudgetLine(l.id, { category: v }))} className={`field-quiet text-[0.8125rem] font-medium ${canEdit ? "" : "pointer-events-none"}`} />
                    {(["budgeted", "committed", "actual"] as const).map((k) => (
                      <MoneyInput key={k} value={Number(l[k])} onCommit={(v) => void run(() => updateBudgetLine(l.id, { [k]: v ?? 0 }))} className={`field-quiet text-right text-xs ${canEdit ? "" : "pointer-events-none"}`} />
                    ))}
                    <span className={`tnum pr-1 text-right font-mono text-[0.8125rem] ${over ? "font-semibold" : ""}`}>{over ? `(${money(-remaining)})` : money(remaining)}</span>
                    {canEdit ? (
                      <button className="justify-self-center font-mono text-xs text-mute hover:text-ink" title="Delete line" onClick={() => { if (confirm(`Delete budget line "${l.category}"?`)) void run(() => deleteBudgetLine(l.id)); }}>
                        ✕
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
              <div className="grid grid-cols-[1fr_120px_120px_120px_120px_40px] items-center gap-1 border-t border-ink px-3 py-2">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">Total</span>
                <span className="tnum text-right font-mono text-sm">{money(f.budgeted)}</span>
                <span className="tnum text-right font-mono text-sm">{money(f.committed)}</span>
                <span className="tnum text-right font-mono text-sm">{money(f.actual)}</span>
                <span className={`tnum pr-1 text-right font-mono text-sm ${f.variance < 0 ? "font-semibold" : ""}`}>{f.variance < 0 ? `(${money(-f.variance)})` : money(f.variance)}</span>
                <span />
              </div>
            </div>
          </div>
        )}
      </section>
      <p className="microlabel !normal-case !tracking-normal">
        Remaining = budgeted − committed − spent per line. Lines in a raised box are over budget. Every figure change is logged with who and when.
      </p>
    </div>
  );
}

function Fig({ label, value, signed = false, hint }: { label: string; value: number; signed?: boolean; hint?: string }) {
  const negative = signed && value < 0;
  return (
    <div title={hint}>
      <p className="microlabel">{label}</p>
      <p className={`tnum font-mono text-base ${negative ? "font-semibold" : ""}`}>{negative ? `(${money(-value)})` : money(value)}</p>
      {signed && <p className="microlabel !normal-case !tracking-normal">{negative ? "over budget" : "under budget"}</p>}
    </div>
  );
}
