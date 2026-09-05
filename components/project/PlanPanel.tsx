"use client";

import { useMemo, useState } from "react";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar } from "@/components/ui";
import { loadHousePlan, type HousePlanBundle } from "@/lib/data/house-plans";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { codeCheck, codeSummary, type CodeItem } from "@/lib/plan/code";
import { planTotals } from "@/lib/plan/geometry";
import { levelDxf, planDxf } from "@/lib/plan/dxf";
import { ftIn } from "@/lib/plan/model";
import { schedules } from "@/lib/plan/schedules";
import { levelSvg } from "@/lib/plan/svg";
import { useProjectData } from "./ProjectContext";

/**
 * Sheet 02 · Plan tab: the house model drawn as a floor plan per level, the
 * door / window / room schedules, the code check, and DXF downloads. Read-
 * only here — the model is edited through Bob, so every change is validated
 * and logged; the tab live-reloads when it is saved.
 */
export function PlanPanel() {
  const { projectId } = useProjectData();
  const live = useLiveRows<HousePlanBundle>(`plan:${projectId}`, async () => { const b = await loadHousePlan(projectId); return b ? [b] : []; }, [{ table: "house_plans", filter: `project_id=eq.${projectId}` }]);
  const bundle = live.rows[0] ?? null;
  const plan = bundle?.plan ?? null;
  const [levelId, setLevelId] = useState<string | null>(null);
  const [showCenter, setShowCenter] = useState(true);
  const [tab, setTab] = useState<"drawing" | "schedules" | "code">("drawing");

  const current = plan ? (plan.levels.find((l) => l.id === levelId) ?? plan.levels[0] ?? null) : null;
  const svg = useMemo(() => (plan && current ? levelSvg(plan, current.id, { showCenterlines: showCenter, className: "plan-svg" }) : null), [plan, current, showCenter]);
  const report = useMemo(() => (plan ? codeCheck(plan) : null), [plan]);
  const sched = useMemo(() => (plan ? schedules(plan) : null), [plan]);
  const totals = useMemo(() => (plan ? planTotals(plan) : null), [plan]);

  if (live.loading) return <div className="panel bg-paper"><LoadingMark text="Opening the plan…" /></div>;
  if (live.error) return <div className="panel bg-paper"><ErrorMark text={live.error} onRetry={() => void live.reload()} /></div>;
  if (!plan || !bundle) {
    return (
      <div className="panel bg-paper">
        <PanelBar title="Plan" />
        <EmptyMark text="No house plan yet." />
        <p className="px-4 pb-4 text-sm text-mute">
          Ask Bob to draw one: <em>&ldquo;Bob, design a 20×20 two-story guest house — bedroom upstairs, living/kitchen and a full bath down.&rdquo;</em> He lays out the rooms, checks them against the code, and you can download the DXF here to finish in Home Designer.
        </p>
      </div>
    );
  }

  const download = (name: string, content: string) => {
    const blob = new Blob([content], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const safe = plan.title.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "plan";

  const sub = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} className={`px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] transition-colors ${tab === t ? "bg-ink text-paper" : "text-mute hover:bg-ink/10 hover:text-ink"}`}>
      {label}
    </button>
  );

  return (
    <div className="grid gap-4">
      <section className="panel bg-paper">
        <PanelBar
          title={`${plan.title} · v${bundle.row.version}`}
          right={
            <span className="flex items-center gap-3">
              {live.refreshing && <span className="microlabel">syncing…</span>}
              {report && <span className={`microlabel ${report.fails ? "text-red-700" : report.warns ? "text-amber-700" : ""}`}>{codeSummary(report)}</span>}
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-1 border-b px-4 pb-3">
          {sub("drawing", "Floor plans")}
          {sub("schedules", "Schedules")}
          {sub("code", `Code check${report?.fails ? ` · ${report.fails}` : ""}`)}
          {totals && (
            <span className="microlabel tnum ml-auto">
              {totals.floorAreaSqft} sf net · {totals.levels} level{totals.levels === 1 ? "" : "s"} · {totals.bedrooms} bd / {totals.bathrooms} ba · ext wall {totals.extWallLf} LF
            </span>
          )}
        </div>

        {tab === "drawing" && (
          <div className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {plan.levels.map((l) => (
                <button key={l.id} onClick={() => setLevelId(l.id)} className={`border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] ${current?.id === l.id ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"}`}>
                  {l.name}
                </button>
              ))}
              <label className="microlabel ml-auto flex items-center gap-2">
                <input type="checkbox" checked={showCenter} onChange={(e) => setShowCenter(e.target.checked)} /> wall centerlines
              </label>
              {current && (
                <button className="btn" onClick={() => { const d = levelDxf(plan, current.id); if (d) download(`${safe}-v${bundle.row.version}-${current.name.replace(/\s+/g, "-")}.dxf`, d); }}>
                  ↧ DXF · {current.name}
                </button>
              )}
              <button className="btn btn-solid" onClick={() => download(`${safe}-v${bundle.row.version}-all-levels.dxf`, planDxf(plan))}>
                ↧ DXF · all levels
              </button>
            </div>
            {svg ? (
              <div
                className="plan-sheet overflow-x-auto border"
                style={{ ["--plan-paper" as string]: "var(--color-paper, #fff)", ["--plan-ink" as string]: "var(--color-ink, #1c2321)", ["--plan-dim" as string]: "var(--color-mute, #4a5451)", ["--plan-faint" as string]: "#9aa39e", ["--plan-accent" as string]: "#c95d17" }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <EmptyMark text="This level has no rooms yet." />
            )}
            {current && (
              <p className="mt-2 text-xs text-mute">
                {current.name}: ceiling {ftIn(current.ceilingIn)} · dimensions to outside face of exterior walls and to centerline of interior walls · marks D/W/O key to the schedules. Import the DXF as CAD in Home Designer and trace walls over the A-WALL-CNTR layer.
              </p>
            )}
          </div>
        )}

        {tab === "schedules" && sched && (
          <div className="grid gap-6 p-4">
            <Table
              title={`Rooms · ${sched.rooms.length}`}
              head={["Level", "Room", "Type", "Net size", "Area (sf)", "Ceiling", "Doors", "Windows"]}
              rows={sched.rooms.map((r) => [r.level, r.name, r.type, r.net, String(r.areaSqft), r.ceiling, String(r.doors), String(r.windows)])}
            />
            <Table
              title={`Doors · ${sched.doors.length}`}
              head={["Mark", "Level", "Room", "Side", "Size", "Type", "Swing", "Notes"]}
              rows={sched.doors.map((d) => [d.mark, d.level, d.room, d.side, d.size, `${d.style}${d.exterior ? " · exterior" : ""}`, d.swing, d.notes])}
            />
            <Table
              title={`Windows · ${sched.windows.length}`}
              head={["Mark", "Level", "Room", "Side", "Size", "Sill", "Type", "Net clear (sf)", "Notes"]}
              rows={sched.windows.map((w) => [w.mark, w.level, w.room, w.side, w.size, ftIn(w.sillIn), w.style, String(w.netClearSqft), w.notes])}
            />
            {sched.openings.length > 0 && (
              <Table title={`Cased openings · ${sched.openings.length}`} head={["Mark", "Level", "Room", "Side", "Size"]} rows={sched.openings.map((o) => [o.mark, o.level, o.room, o.side, o.size])} />
            )}
          </div>
        )}

        {tab === "code" && report && (
          <div className="grid gap-4 p-4">
            <p className="text-sm text-mute">{report.edition}. Zoning (what the city allows on the lot) is not checked here — it is a per-city checklist.</p>
            <CodeList title="Fails — would not pass plan review" items={report.items.filter((i) => i.severity === "fail")} tone="text-red-700" />
            <CodeList title="Warnings — fix or justify" items={report.items.filter((i) => i.severity === "warn")} tone="text-amber-700" />
            <CodeList title="Must show on the drawings" items={report.items.filter((i) => i.severity === "info")} tone="text-mute" />
            {report.passes.length > 0 && (
              <div>
                <p className="microlabel mb-1">Passes</p>
                <ul className="grid gap-1 text-sm">
                  {report.passes.map((p, i) => (
                    <li key={i} className="text-mute">✓ {p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div>
      <p className="microlabel mb-1">{title}</p>
      <div className="overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-ink/5">
              {head.map((h) => (
                <th key={h} className="px-2 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-mute">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="px-2 py-2 text-mute" colSpan={head.length}>none</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((c, j) => (
                  <td key={j} className={`px-2 py-1.5 align-top ${j === 0 ? "font-mono" : ""}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodeList({ title, items, tone }: { title: string; items: CodeItem[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`microlabel mb-1 ${tone}`}>{title} · {items.length}</p>
      <ul className="grid gap-1.5 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="shrink-0 font-mono text-[0.6875rem] text-mute">{i.ref}</span>
            <span>{i.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
