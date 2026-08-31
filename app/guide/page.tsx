import type { Metadata } from "next";
import { TopBar } from "@/components/ui";
import {
  FORMULA_GUIDE,
  NEW_BUILD_GUIDE,
  REMODEL_GUIDE,
  type GuidePhase,
} from "@/lib/research-full";
import {
  NEW_BUILD_COST_PER_SQFT,
  OPTION_LIBRARY,
  homeDepotSearchUrl,
} from "@/lib/research";

export const metadata: Metadata = {
  title: "Cost guide",
  description:
    "Researched US construction cost data: new-build phase breakdown, remodel checklists, material takeoff formulas and option tiers.",
};

const usd = (n: number) =>
  n >= 1000
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : `$${n % 1 === 0 ? n : n.toFixed(2)}`;

function Range({ low, high }: { low?: number; high?: number }) {
  if (low === undefined || high === undefined)
    return <span className="text-mute">—</span>;
  return (
    <span className="tnum whitespace-nowrap font-mono">
      {usd(low)}–{usd(high)}
    </span>
  );
}

function PhaseItems({ phase }: { phase: GuidePhase }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {phase.items.map((it) => (
          <tr key={it.name} className="border-b border-line-soft align-top last:border-b-0">
            <td className="w-56 py-1.5 pr-3 font-medium">{it.name}</td>
            <td className="w-32 py-1.5 pr-3 text-right">
              <Range low={it.typicalLowUSD} high={it.typicalHighUSD} />
            </td>
            <td className="w-40 py-1.5 pr-3 font-mono text-[0.625rem] text-mute">
              {it.unit}
            </td>
            <td className="py-1.5 leading-relaxed text-mute">{it.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function GuidePage() {
  const c = NEW_BUILD_COST_PER_SQFT;
  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="guide" />

      <main className="mx-auto max-w-5xl px-4 pb-24">
        {/* ── Title ───────────────────────────────────────────────── */}
        <section className="border-x border-b bg-paper p-6 md:p-10">
          <p className="microlabel">Sheet 02 · Reference data</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">Cost guide</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            What it takes to build and remodel, researched from 2025–2026 US
            national data (NAHB cost-of-construction survey, HomeGuide, Angi,
            HomeAdvisor and Home Depot retail prices) by a panel of research
            agents, then adversarially cross-checked. Ranges are national
            averages — your local prices win. Item ranges in the new-build
            table are typical <em>totals</em> for a 2,000 sq ft reference
            build.
          </p>
          <nav className="mt-5 flex flex-wrap gap-2">
            {[
              ["#new-build", "New build"],
              ["#remodels", "Remodels"],
              ["#formulas", "Takeoff formulas"],
              ["#options", "Material tiers"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="btn btn-xs btn-ghost">
                {label}
              </a>
            ))}
          </nav>
        </section>

        {/* ── New build ───────────────────────────────────────────── */}
        <section id="new-build" className="mt-10 scroll-mt-16">
          <h2 className="font-display text-lg">01 — Building a new home</h2>
          <div className="mt-4 grid grid-cols-3 divide-x border bg-paper">
            {(
              [
                ["Budget / owner-builder", c.lowUSD],
                ["Typical contractor build", c.midUSD],
                ["Custom / high-end", c.highUSD],
              ] as const
            ).map(([label, rate]) => (
              <div key={label} className="p-4 text-center md:p-6">
                <p className="microlabel">{label}</p>
                <p className="tnum mt-2 font-mono text-2xl md:text-3xl">
                  ${rate}
                </p>
                <p className="microlabel mt-1">per sq ft</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-mute">{c.notes}</p>

          <div className="mt-6 grid gap-2">
            {NEW_BUILD_GUIDE.phases.map((p, i) => (
              <details key={p.name} className="panel group bg-paper">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
                  <span className="microlabel tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm font-semibold">{p.name}</span>
                  {p.shareOfBudgetPct !== undefined && (
                    <>
                      <span className="hidden h-1.5 w-28 border sm:block">
                        <span
                          className="block h-full bg-ink"
                          style={{
                            width: `${Math.min(100, p.shareOfBudgetPct * 5)}%`,
                          }}
                        />
                      </span>
                      <span className="tnum w-14 text-right font-mono text-xs">
                        {p.shareOfBudgetPct}%
                      </span>
                    </>
                  )}
                  <span className="font-mono text-xs text-mute group-open:rotate-90">
                    ▸
                  </span>
                </summary>
                <div className="border-t px-4 py-3">
                  {p.description && (
                    <p className="mb-3 max-w-3xl text-xs leading-relaxed text-mute">
                      {p.description}
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                      <PhaseItems phase={p} />
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
          <p className="microlabel mt-2">
            Bar = share of total construction budget (NAHB 2024 stage shares)
          </p>
        </section>

        {/* ── Remodels ────────────────────────────────────────────── */}
        <section id="remodels" className="mt-12 scroll-mt-16">
          <h2 className="font-display text-lg">02 — Remodel projects</h2>
          <div className="mt-4 grid gap-2">
            {REMODEL_GUIDE.map((r) => (
              <details key={r.name} className="panel group bg-paper">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 select-none">
                  <span className="flex-1 text-sm font-semibold">{r.name}</span>
                  <span className="tnum font-mono text-xs">
                    {usd(r.lowUSD)}–{usd(r.highUSD)}
                  </span>
                  <span className="font-mono text-xs text-mute group-open:rotate-90">
                    ▸
                  </span>
                </summary>
                <div className="border-t px-4 py-3">
                  <p className="mb-3 max-w-3xl text-xs leading-relaxed text-mute">
                    {r.costBasis}
                  </p>
                  {r.phases.map((p) => (
                    <div key={p.name} className="mb-3 last:mb-0">
                      <p className="microlabel mb-1">{p.name}</p>
                      <div className="overflow-x-auto">
                        <div className="min-w-[560px]">
                          <PhaseItems phase={p} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Formulas ────────────────────────────────────────────── */}
        <section id="formulas" className="mt-12 scroll-mt-16">
          <h2 className="font-display text-lg">03 — Takeoff formulas</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-mute">
            The math behind the estimator tab: quantity = formula result ×
            (1 + waste%). Prices are Home Depot–level retail, materials only.
          </p>
          <div className="panel mt-4 overflow-x-auto bg-paper">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="border-b bg-ink text-left text-paper">
                  <th className="microlabel !text-paper/60 px-3 py-2">Material</th>
                  <th className="microlabel !text-paper/60 px-3 py-2">Formula</th>
                  <th className="microlabel !text-paper/60 px-3 py-2 text-right">
                    Waste
                  </th>
                  <th className="microlabel !text-paper/60 px-3 py-2 text-right">
                    Unit price
                  </th>
                </tr>
              </thead>
              <tbody>
                {FORMULA_GUIDE.formulas.map((f) => (
                  <tr key={f.name} className="border-b border-line-soft align-top last:border-b-0">
                    <td className="w-52 px-3 py-2">
                      <span className="font-medium">{f.name}</span>
                      <span className="microlabel !normal-case !tracking-normal block">
                        {f.category} · per {f.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[0.6875rem]">
                      {f.formula}
                    </td>
                    <td className="tnum px-3 py-2 text-right font-mono">
                      {f.wastePct}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Range low={f.unitCostLowUSD} high={f.unitCostHighUSD} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="panel mt-2 bg-paper">
            <summary className="microlabel cursor-pointer px-4 py-2.5 select-none">
              Assumptions behind the formulas ▸
            </summary>
            <ul className="grid gap-1.5 border-t px-4 py-3 text-xs leading-relaxed text-mute">
              {FORMULA_GUIDE.assumptions.map((a, i) => (
                <li key={i} className="border-b border-dashed pb-1.5 last:border-b-0">
                  {a}
                </li>
              ))}
            </ul>
          </details>
        </section>

        {/* ── Option tiers ────────────────────────────────────────── */}
        <section id="options" className="mt-12 scroll-mt-16">
          <h2 className="font-display text-lg">04 — Material tiers</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-mute">
            The &quot;wood floor vs marble&quot; tables — every big material
            choice with its budget → luxury spread. Insert any of these as
            ready-made options from the quote sheet (⊞ Insert researched
            tiers). Prices are materials only unless marked installed.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {OPTION_LIBRARY.map((entry) => (
              <div key={entry.item} className="panel bg-paper">
                <div className="flex items-baseline justify-between border-b px-3 py-2">
                  <span className="text-sm font-semibold">{entry.item}</span>
                  <span className="microlabel">per {entry.unit}</span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {entry.options.map((o) => (
                      <tr key={o.name} className="border-b border-line-soft last:border-b-0">
                        <td className="px-3 py-1.5">
                          {o.homeDepotSearch ? (
                            <a
                              href={homeDepotSearchUrl(o.homeDepotSearch)}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {o.name} ↗
                            </a>
                          ) : (
                            o.name
                          )}
                          {o.laborIncluded && (
                            <span className="microlabel ml-1.5 border px-1">
                              installed
                            </span>
                          )}
                        </td>
                        <td className="microlabel w-16 px-1 py-1.5">
                          {o.tier ?? ""}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Range low={o.lowUSD} high={o.highUSD} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        <p className="microlabel mt-12 border-t pt-4 text-center">
          Researched Aug 2026 · national averages · always confirm against live
          store prices
        </p>
      </main>
    </div>
  );
}
