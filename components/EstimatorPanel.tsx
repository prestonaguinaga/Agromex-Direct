"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Project } from "@/lib/types";
import {
  DEFAULT_INPUTS,
  derive,
  estimateHouse,
  estimateTotal,
  estimateWall,
  linesToSections,
  type EstimatorInputs,
  type WallInputs,
  type EstLine,
} from "@/lib/estimator";
import { NEW_BUILD_COST_PER_SQFT, REMODEL_COSTS } from "@/lib/research";
import { money, moneyWhole, num } from "@/lib/format";
import { NumInput } from "./inputs";
import { Label } from "./ui";

type Update = (fn: (prev: Project) => Project) => void;

function pitchRiseFrom(s: string): number {
  const m = s.match(/^(\d+)/);
  return m ? Number(m[1]) : 6;
}

export function EstimatorPanel({
  project,
  update,
}: {
  project: Project;
  update: Update;
}) {
  const [inserted, setInserted] = useState(false);

  // Seed the takeoff from the project info panel where it's filled in.
  const [inputs, setInputs] = useState<EstimatorInputs>({
    ...DEFAULT_INPUTS,
    footprintSqft:
      project.info.footprintSqft ??
      (project.info.sqft
        ? Math.round(project.info.sqft / Math.max(1, project.info.stories))
        : DEFAULT_INPUTS.footprintSqft),
    stories: project.info.stories || DEFAULT_INPUTS.stories,
    ceilingFt: project.info.ceilingFt || DEFAULT_INPUTS.ceilingFt,
    roofPitchRise: pitchRiseFrom(project.info.roofPitch),
    bedrooms: project.info.bedrooms ?? DEFAULT_INPUTS.bedrooms,
    bathrooms: project.info.bathrooms ?? DEFAULT_INPUTS.bathrooms,
  });

  const set = (patch: Partial<EstimatorInputs>) => {
    setInputs((prev) => ({ ...prev, ...patch }));
    setInserted(false);
  };

  const d = useMemo(() => derive(inputs), [inputs]);
  const lines = useMemo(() => estimateHouse(inputs), [inputs]);
  const range = useMemo(() => estimateTotal(lines), [lines]);

  const insert = () => {
    const sections = linesToSections(lines);
    update((p) => ({
      ...p,
      // Re-running the estimator replaces prior estimate sections instead
      // of stacking duplicates; hand-added sections are untouched.
      sections: [
        ...p.sections.filter((s) => !s.name.startsWith("EST — ")),
        ...sections,
      ],
      info: {
        ...p.info,
        footprintSqft: inputs.footprintSqft,
        stories: inputs.stories,
        ceilingFt: inputs.ceilingFt,
        bedrooms: inputs.bedrooms,
        bathrooms: inputs.bathrooms,
        roofPitch: `${inputs.roofPitchRise}/12`,
      },
    }));
    setInserted(true);
  };

  const sqftForBallpark =
    project.info.sqft ?? inputs.footprintSqft * inputs.stories;

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* ── Inputs column ─────────────────────────────────────────── */}
      <div className="grid content-start gap-4">
        <section className="panel bg-paper">
          <div className="bar border-b px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              House dimensions
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <div>
              <Label>Footprint (sq ft)</Label>
              <NumInput
                value={inputs.footprintSqft}
                onCommit={(v) => set({ footprintSqft: v })}
                className="text-sm"
              />
            </div>
            <div>
              <Label>Stories</Label>
              <select
                className="field field-mono text-sm"
                value={inputs.stories}
                onChange={(e) => set({ stories: Number(e.target.value) })}
              >
                {[1, 1.5, 2, 3].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ceiling height (ft)</Label>
              <NumInput
                value={inputs.ceilingFt}
                onCommit={(v) => set({ ceilingFt: v })}
                className="text-sm"
              />
            </div>
            <div>
              <Label>Roof pitch</Label>
              <select
                className="field field-mono text-sm"
                value={inputs.roofPitchRise}
                onChange={(e) => set({ roofPitchRise: Number(e.target.value) })}
              >
                {[4, 6, 8, 10, 12].map((r) => (
                  <option key={r} value={r}>
                    {r}/12
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Bedrooms</Label>
              <NumInput
                value={inputs.bedrooms}
                onCommit={(v) => set({ bedrooms: v })}
                className="text-sm"
              />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <NumInput
                value={inputs.bathrooms}
                onCommit={(v) => set({ bathrooms: v })}
                className="text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label>Slab thickness (in) — 0 for crawlspace/basement</Label>
              <NumInput
                value={inputs.slabThicknessIn}
                onCommit={(v) => set({ slabThicknessIn: v })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Derived readout — the "instrument panel" */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t bg-paper-2/60 px-4 py-3">
            {(
              [
                ["Floor area", `${num(Math.round(d.floorAreaSqft))} sf`],
                ["Ext wall", `${num(Math.round(d.extWallLf))} lf`],
                ["Int walls (est)", `${num(Math.round(d.intWallLf))} lf`],
                ["Drywall area", `${num(Math.round(d.drywallAreaSqft))} sf`],
                ["Roof area", `${num(Math.round(d.roofAreaSqft))} sf`],
                ["Windows (est)", `${d.windowCount}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="microlabel">{k}</span>
                <span className="tnum font-mono text-xs">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Ballpark card */}
        <section className="panel bg-paper">
          <div className="bar border-b px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              Ballpark check
            </span>
          </div>
          <div className="p-4">
            {project.type === "new-build" ? (
              <>
                <p className="text-xs leading-relaxed text-mute">
                  US average build cost across {num(sqftForBallpark)} sq ft
                  (materials + labor, land excluded):
                </p>
                <div className="mt-3 grid grid-cols-3 divide-x border">
                  {(
                    [
                      ["Budget", NEW_BUILD_COST_PER_SQFT.lowUSD],
                      ["Typical", NEW_BUILD_COST_PER_SQFT.midUSD],
                      ["High-end", NEW_BUILD_COST_PER_SQFT.highUSD],
                    ] as const
                  ).map(([label, rate]) => (
                    <div key={label} className="p-2.5 text-center">
                      <p className="microlabel">{label}</p>
                      <p className="tnum mt-1 font-mono text-sm">
                        {moneyWhole(rate * sqftForBallpark)}
                      </p>
                      <p className="microlabel tnum mt-0.5">${rate}/sf</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-mute">
                  Typical total project ranges (materials + labor):
                </p>
                <div className="mt-3 grid gap-1">
                  {REMODEL_COSTS.map((r) => (
                    <div
                      key={r.name}
                      className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1 text-xs last:border-b-0"
                    >
                      <span>{r.name}</span>
                      <span className="tnum shrink-0 font-mono">
                        {moneyWhole(r.lowUSD)}–{moneyWhole(r.highUSD)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <p className="microlabel mt-3">
              Full source data in the <Link className="underline" href="/guide/">cost guide</Link>
            </p>
          </div>
        </section>

        <WallCalc update={update} />
      </div>

      {/* ── Takeoff results ───────────────────────────────────────── */}
      <section className="panel bg-paper">
        <div className="bar flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            Materials takeoff — whole house
          </span>
          <span className="tnum font-mono text-sm">
            {moneyWhole(range.low)} – {moneyWhole(range.high)}
          </span>
        </div>
        <EstTable lines={lines} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
          <p className="max-w-md text-[0.6875rem] leading-snug text-mute">
            Standard takeoff math (16&quot; o.c. framing, sheet goods +10%
            waste) with big-box unit prices. Insert it, then replace estimate
            lines with real product links as you shop.
          </p>
          <button className="btn btn-solid" onClick={insert}>
            {inserted ? "✓ Inserted — view sheet" : "Insert into quote sheet →"}
          </button>
        </div>
      </section>
    </div>
  );
}

function EstTable({ lines }: { lines: EstLine[] }) {
  let lastSection = "";
  return (
    <div className="max-h-[560px] overflow-y-auto">
      <table className="w-full text-xs">
        <tbody>
          {lines.map((l, i) => {
            const header = l.section !== lastSection;
            lastSection = l.section;
            return (
              <FragmentRow key={i} line={l} header={header} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ line, header }: { line: EstLine; header: boolean }) {
  return (
    <>
      {header && (
        <tr className="border-y bg-paper-2/80">
          <td colSpan={4} className="microlabel px-3 py-1">
            {line.section}
          </td>
        </tr>
      )}
      <tr className="border-b border-line-soft last:border-b-0">
        <td className="px-3 py-1.5">
          <span className="block">{line.name}</span>
          <span className="microlabel !normal-case !tracking-normal">
            {line.formula}
          </span>
        </td>
        <td className="tnum whitespace-nowrap px-2 py-1.5 text-right font-mono">
          {num(line.qty)} {line.unit}
        </td>
        <td className="tnum whitespace-nowrap px-2 py-1.5 text-right font-mono text-mute">
          {money(line.lowUnit)}–{money(line.highUnit)}
        </td>
        <td className="tnum whitespace-nowrap px-3 py-1.5 text-right font-mono">
          {moneyWhole(line.qty * line.lowUnit)}–{moneyWhole(line.qty * line.highUnit)}
        </td>
      </tr>
    </>
  );
}

/** "The wall is 10 ft × 10 ft" quick calculator. */
function WallCalc({ update }: { update: Update }) {
  const [w, setW] = useState<WallInputs>({
    lengthFt: 10,
    heightFt: 10,
    bothSides: true,
    exterior: false,
  });
  const [added, setAdded] = useState(false);
  const lines = useMemo(() => estimateWall(w), [w]);
  const range = useMemo(() => estimateTotal(lines), [lines]);

  const insert = () => {
    const [section] = linesToSections(lines);
    section.name = `EST — Wall ${w.lengthFt}×${w.heightFt}`;
    update((p) => ({ ...p, sections: [...p.sections, section] }));
    setAdded(true);
  };

  return (
    <section className="panel bg-paper">
      <div className="bar border-b px-4 py-2.5">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
          Quick wall calc
        </span>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Length (ft)</Label>
            <NumInput
              value={w.lengthFt}
              onCommit={(v) => {
                setW((p) => ({ ...p, lengthFt: v }));
                setAdded(false);
              }}
              className="text-sm"
            />
          </div>
          <div>
            <Label>Height (ft)</Label>
            <NumInput
              value={w.heightFt}
              onCommit={(v) => {
                setW((p) => ({ ...p, heightFt: v }));
                setAdded(false);
              }}
              className="text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="checkbox"
              checked={w.exterior}
              onChange={(e) =>
                setW((p) => ({ ...p, exterior: e.target.checked }))
              }
            />
            Exterior wall
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="checkbox"
              checked={w.bothSides}
              onChange={(e) =>
                setW((p) => ({ ...p, bothSides: e.target.checked }))
              }
            />
            Drywall both sides
          </label>
        </div>

        <div className="mt-3 grid gap-1 border-t pt-3">
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-2 text-xs">
              <span className="truncate">{l.name}</span>
              <span className="tnum shrink-0 font-mono text-mute">
                {num(l.qty)} {l.unit}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="tnum font-mono text-sm">
            {moneyWhole(range.low)}–{moneyWhole(range.high)}
          </span>
          <button className="btn btn-xs" onClick={insert}>
            {added ? "✓ Added" : "Add to sheet"}
          </button>
        </div>
      </div>
    </section>
  );
}
