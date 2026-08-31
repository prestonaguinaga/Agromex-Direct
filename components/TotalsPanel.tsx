"use client";

import type { Project, Totals } from "@/lib/types";
import { money } from "@/lib/format";
import { NumInput } from "./inputs";

type Update = (fn: (prev: Project) => Project) => void;

export function TotalsPanel({
  project,
  totals,
  update,
}: {
  project: Project;
  totals: Totals;
  update: Update;
}) {
  const setPct = (key: keyof Project["settings"], v: number) =>
    update((p) => ({ ...p, settings: { ...p.settings, [key]: v } }));

  const adjRow = (
    label: string,
    key: keyof Project["settings"],
    amount: number,
  ) => (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="whitespace-nowrap text-xs text-mute">{label}</span>
      <span className="flex items-center gap-1">
        <NumInput
          value={project.settings[key]}
          onCommit={(v) => setPct(key, v)}
          className="field-quiet w-14 !p-1 text-right text-xs"
        />
        <span className="microlabel">%</span>
        <span className="tnum w-24 text-right font-mono text-xs">
          {money(amount)}
        </span>
      </span>
    </div>
  );

  return (
    <aside className="panel bg-paper">
      <div className="border-b bg-ink px-4 py-2.5 text-paper">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
          Totals
        </span>
      </div>

      <div className="p-4">
        {/* Per-section breakdown */}
        <div className="grid gap-0.5">
          {totals.perSection
            .filter((s) => s.total > 0)
            .map((s) => (
              <div
                key={s.id}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="truncate text-mute">{s.name}</span>
                <span className="tnum shrink-0 font-mono">{money(s.total)}</span>
              </div>
            ))}
          {totals.materials === 0 && (
            <p className="text-xs leading-relaxed text-mute">
              Nothing priced yet — type prices on the sheet, or run the
              estimator for a head start.
            </p>
          )}
        </div>

        <div className="march my-3" aria-hidden />

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Materials subtotal</span>
          <span className="tnum font-mono text-sm">{money(totals.materials)}</span>
        </div>

        <div className="mt-2 border-t pt-1">
          {adjRow("Waste / overage", "wastePct", totals.waste)}
          {adjRow("Sales tax", "taxPct", totals.tax)}
          {adjRow("Labor & overhead", "laborPct", totals.labor)}
          {adjRow("Contingency", "contingencyPct", totals.contingency)}
        </div>

        <div className="mt-3 border border-ink bg-ink px-3 py-2.5 text-paper">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              Quote total
            </span>
            <span className="tnum font-mono text-xl">{money(totals.grand)}</span>
          </div>
        </div>

        <div className="mt-3 flex justify-between">
          <span className="microlabel tnum">
            {totals.pricedItems}/{totals.totalItems} priced
          </span>
          <span className="microlabel tnum">
            {totals.doneItems}/{totals.totalItems} checked off
          </span>
        </div>
        {totals.unpricedItems > 0 && (
          <p className="mt-1.5 border border-dashed px-2 py-1.5 text-[0.6875rem] leading-snug text-mute">
            {totals.unpricedItems} item{totals.unpricedItems > 1 ? "s" : ""}{" "}
            still unpriced — the total only counts priced lines.
          </p>
        )}
      </div>
    </aside>
  );
}
