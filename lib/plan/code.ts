import { deriveWalls, footprint, isHabitable, netDims, openingOnWall, roomArea, sideExposure, stairMath, unassignedArea, type WallSegment } from "./geometry.ts";
import { ftIn, sqft, type HousePlan, type Level, type Opening, type Room, type Side } from "./model.ts";

/**
 * Building-code checks over the model. Pure rules, each naming the section
 * it enforces; the plan tab, Bob and the DXF title block all read the same
 * report. Baseline: 2021 IRC + 2021 IECC, climate zone 3A (DFW). Zoning is
 * deliberately NOT a rule — it is per city and belongs on the checklist.
 *
 * Severity: fail = would not pass plan review · warn = usually flagged, fix
 * or justify · info = a requirement the drawings must show (alarms, fans).
 */

export type Severity = "fail" | "warn" | "info";

export interface CodeItem {
  id: string;
  severity: Severity;
  /** Code reference, e.g. "IRC R310.2.1". */
  ref: string;
  message: string;
  levelId?: string;
  /** Ids of rooms / openings / stairs the item is about. */
  targets: string[];
}

export interface CodeReport {
  edition: string;
  items: CodeItem[];
  fails: number;
  warns: number;
  infos: number;
  passes: string[];
}

/** Net clear opening area of a window in sq in, by operable type (conservative manufacturer-typical). */
export function netClearSqIn(o: Opening): { area: number; clearW: number; clearH: number } {
  const w = o.width, h = o.height;
  switch (o.windowStyle ?? "single-hung") {
    case "casement": return { area: Math.max(0, (w - 5) * (h - 4)), clearW: w - 5, clearH: h - 4 };
    case "awning": return { area: Math.max(0, (w - 5) * (h - 6) * 0.5), clearW: w - 5, clearH: (h - 6) * 0.5 };
    case "slider": return { area: Math.max(0, (w / 2 - 3) * (h - 4)), clearW: w / 2 - 3, clearH: h - 4 };
    case "fixed": return { area: 0, clearW: 0, clearH: 0 };
    case "single-hung":
    case "double-hung":
    default: return { area: Math.max(0, (w - 4) * (h / 2 - 3)), clearW: w - 4, clearH: h / 2 - 3 };
  }
}

export function codeCheck(plan: HousePlan): CodeReport {
  const items: CodeItem[] = [];
  const passes: string[] = [];
  const s = plan.settings;
  let n = 0;
  const add = (severity: Severity, ref: string, message: string, targets: string[] = [], levelId?: string) => {
    items.push({ id: `c${++n}`, severity, ref, message, targets, levelId });
  };

  // ── envelope (IECC 2021, zone 3A) ──────────────────────────────────────────
  const ins = s.insulation;
  const zone3 = { wallR: 20, ceilingR: 38, floorR: 19, windowU: 0.3, shgc: 0.25 };
  if (ins.wallR < zone3.wallR) add("fail", "IECC R402.1.3", `Wall insulation R-${ins.wallR} is under R-20 (or R-13 + R-5 continuous) for zone 3.`);
  else passes.push("Wall insulation meets IECC zone 3 (R-20).");
  if (ins.ceilingR < zone3.ceilingR) add("fail", "IECC R402.1.3", `Ceiling insulation R-${ins.ceilingR} is under R-38 for zone 3.`);
  else passes.push("Ceiling insulation meets IECC zone 3 (R-38).");
  if (ins.windowU > zone3.windowU + 1e-9) add("fail", "IECC R402.1.3", `Window U-factor ${ins.windowU} exceeds 0.30 for zone 3.`);
  else passes.push("Window U-factor ≤ 0.30.");
  if (ins.windowShgc > zone3.shgc + 1e-9) add("fail", "IECC R402.1.3", `Window SHGC ${ins.windowShgc} exceeds 0.25 for zone 3.`);
  else passes.push("Window SHGC ≤ 0.25.");
  if (s.foundation !== "post-tension slab" && s.foundation !== "slab on grade" && ins.floorR < zone3.floorR) add("warn", "IECC R402.1.3", `Floor over unconditioned space R-${ins.floorR} is under R-19 for zone 3.`);

  // ── foundation note for DFW clay ───────────────────────────────────────────
  if (plan.levels.length >= 2 && s.foundation === "slab on grade") add("warn", "IRC R403 / local", "Two stories on a plain slab: DFW plan reviewers expect an engineer-designed (post-tension or beam) slab on expansive clay. Show the engineer's design or change the foundation type.");

  let egressDoor = false;
  const ground = plan.levels[0];

  plan.levels.forEach((level, li) => {
    const walls = deriveWalls(level, s.exteriorWallIn, s.interiorWallIn);
    const isGround = li === 0;

    // unassigned footprint
    const ua = unassignedArea(level);
    if (ua > 144) add("warn", "plan", `${level.name}: ${sqft(ua)} sq ft inside the footprint is not assigned to any room — the walls there are undefined. Add a room (hall, closet, mechanical) to cover it.`, [], level.id);

    // stairs between levels
    if (li > 0) {
      const below = plan.levels[li - 1];
      const climbs = below.stairs.some((st) => st.toLevelId === level.id);
      if (!climbs) add("fail", "IRC R311.7", `${level.name} has no stair from ${below.name}. Add a stair on ${below.name} climbing to ${level.name}.`, [], below.id);
    }

    // ceiling
    for (const r of level.rooms) {
      const ceil = r.ceilingIn ?? level.ceilingIn;
      const min = r.type === "bathroom" || r.type === "laundry" ? 80 : 84;
      if ((isHabitable(r) || r.type === "hall" || r.type === "bathroom" || r.type === "laundry") && ceil < min) add("fail", "IRC R305.1", `${r.name}: ceiling ${ftIn(ceil)} is under ${ftIn(min)}.`, [r.id], level.id);
    }

    // room size
    for (const r of level.rooms) {
      if (!isHabitable(r) || r.type === "kitchen") continue;
      const d = netDims(level, r, walls);
      const area = roomArea(level, r, walls);
      if (area < 70 * 144) add("fail", "IRC R304.1", `${r.name}: ${sqft(area)} sq ft net is under the 70 sq ft minimum for a habitable room.`, [r.id], level.id);
      if (Math.min(d.w, d.h) < 84) add("fail", "IRC R304.2", `${r.name}: ${ftIn(Math.min(d.w, d.h))} clear is under the 7 ft minimum in any direction.`, [r.id], level.id);
    }

    // halls
    for (const r of level.rooms.filter((r) => r.type === "hall")) {
      const d = netDims(level, r, walls);
      if (Math.min(d.w, d.h) < 36) add("fail", "IRC R311.6", `${r.name}: ${ftIn(Math.min(d.w, d.h))} clear is under the 36 in hallway minimum.`, [r.id], level.id);
    }

    // every room has a way in
    for (const r of level.rooms) {
      if (r.type === "porch") continue;
      const ways = level.openings.filter((o) => o.kind !== "window" && o.roomId === r.id);
      // openings belonging to a neighbour that land on this room's wall also count
      const neighbourWays = level.openings.filter((o) => {
        if (o.kind === "window" || o.roomId === r.id) return false;
        const oroom = level.rooms.find((x) => x.id === o.roomId);
        if (!oroom) return false;
        const wall = openingOnWall(level, oroom, o, walls);
        return Boolean(wall && wall.roomIds.includes(r.id));
      });
      if (ways.length + neighbourWays.length === 0 && r.type !== "stair") add("fail", "plan", `${r.name} has no door or opening — there is no way in.`, [r.id], level.id);
    }

    // bedrooms: egress
    for (const r of level.rooms.filter((r) => r.type === "bedroom")) {
      const windows = level.openings.filter((o) => o.kind === "window" && o.roomId === r.id);
      const doors = level.openings.filter((o) => o.kind === "door" && o.roomId === r.id && openingOnWall(level, r, o, walls)?.exterior);
      if (doors.length) { passes.push(`${r.name}: exterior door serves as emergency escape.`); continue; }
      const grade = isGround;
      const needArea = (grade ? 5.0 : 5.7) * 144;
      const ok = windows.find((w) => {
        const nc = netClearSqIn(w);
        return nc.area >= needArea && nc.clearW >= 20 && nc.clearH >= 24 && (w.sill ?? 0) <= 44;
      });
      if (ok) passes.push(`${r.name}: window ${ok.id} meets emergency escape (${sqft(netClearSqIn(ok).area)} sq ft clear, sill ${ftIn(ok.sill ?? 0)}).`);
      else if (windows.length === 0) add("fail", "IRC R310.1", `${r.name} has no window — a bedroom needs an emergency escape opening (≥ ${grade ? "5.0" : "5.7"} sq ft net clear, 20 in wide, 24 in high, sill ≤ 44 in).`, [r.id], level.id);
      else {
        const best = windows.map((w) => ({ w, nc: netClearSqIn(w) })).sort((a, b) => b.nc.area - a.nc.area)[0];
        const why: string[] = [];
        if (best.nc.area < needArea) why.push(`${sqft(best.nc.area)} sq ft clear < ${grade ? "5.0" : "5.7"}`);
        if (best.nc.clearW < 20) why.push(`${Math.round(best.nc.clearW)} in clear width < 20`);
        if (best.nc.clearH < 24) why.push(`${Math.round(best.nc.clearH)} in clear height < 24`);
        if ((best.w.sill ?? 0) > 44) why.push(`sill ${ftIn(best.w.sill ?? 0)} > 44 in`);
        add("fail", "IRC R310.2", `${r.name}: no window qualifies as emergency escape — best is ${best.w.id} (${best.w.windowStyle ?? "single-hung"} ${best.w.width}×${best.w.height}): ${why.join(", ")}. A 36×60 single-hung with a 24 in sill, or a casement, fixes it.`, [r.id, best.w.id], level.id);
      }
    }

    // natural light & ventilation, habitable rooms
    for (const r of level.rooms.filter(isHabitable)) {
      const area = roomArea(level, r, walls);
      const glazing = level.openings.filter((o) => o.kind === "window" && o.roomId === r.id).reduce((a, o) => a + o.width * o.height, 0);
      if (glazing < area * 0.08) add("warn", "IRC R303.1", `${r.name}: glazing ${sqft(glazing)} sq ft is under 8% of ${sqft(area)} sq ft floor area (${sqft(area * 0.08)} needed). Add a window, or show the artificial-light and mechanical-ventilation exception.`, [r.id], level.id);
    }

    // bathrooms
    for (const r of level.rooms.filter((r) => r.type === "bathroom")) {
      const win = level.openings.filter((o) => o.kind === "window" && o.roomId === r.id);
      const glazing = win.reduce((a, o) => a + o.width * o.height, 0);
      if (glazing < 3 * 144) add("info", "IRC R303.3", `${r.name}: no 3 sq ft window — show a 50 cfm exhaust fan ducted outside.`, [r.id], level.id);
      for (const w of win) if ((w.sill ?? 0) < 60 && !w.tempered) add("warn", "IRC R308.4.5", `${r.name}: window ${w.id} sill ${ftIn(w.sill ?? 0)} is under 60 in — if it is within the tub/shower it must be tempered glass. Mark it tempered or move it.`, [r.id, w.id], level.id);
    }

    // exterior egress door (any level counts if it opens to grade; take level 1)
    if (isGround) {
      for (const o of level.openings.filter((o) => o.kind === "door")) {
        const room = level.rooms.find((r) => r.id === o.roomId);
        if (!room) continue;
        const wall = openingOnWall(level, room, o, walls);
        if (wall?.exterior && o.width >= 36 && o.height >= 78 && (o.doorStyle ?? "hinged") === "hinged") egressDoor = true;
      }
    }

    // stairs
    for (const st of level.stairs) {
      const m = stairMath(plan, level, st);
      if (!m) { add("warn", "IRC R311.7", `Stair ${st.id} on ${level.name} does not climb to a level.`, [st.id], level.id); continue; }
      if (m.riserIn > 7.75 + 1e-9) add("fail", "IRC R311.7.5.1", `Stair ${st.id}: riser ${m.riserIn.toFixed(2)} in exceeds 7¾ in.`, [st.id], level.id);
      if (st.treadIn < 10) add("fail", "IRC R311.7.5.2", `Stair ${st.id}: tread ${st.treadIn} in is under 10 in.`, [st.id], level.id);
      if (st.width < 36) add("fail", "IRC R311.7.1", `Stair ${st.id}: ${st.width} in wide is under 36 in.`, [st.id], level.id);
      if (m.riserIn <= 7.75 && st.treadIn >= 10 && st.width >= 36) passes.push(`Stair ${st.id}: ${m.risers} risers @ ${m.riserIn.toFixed(2)} in, ${st.treadIn} in treads, ${Math.round(m.runIn)} in run — R311.7 ok. Show 6'-8" headroom and a handrail 34–38 in.`);
      add("info", "IRC R311.7.8 / R312", `Stair ${st.id}: show a handrail (34–38 in above nosings) and a 36 in guard at the upper landing.`, [st.id], level.id);
    }

    // fire separation from property lines
    for (const side of ["N", "E", "S", "W"] as Side[]) {
      const setback = s.setbacksIn[side];
      if (setback == null) continue;
      const exposedRooms = level.rooms.filter((r) => sideExposure(level, r, side, walls) !== "interior" && onFootprintEdge(level, r, side));
      if (exposedRooms.length === 0) continue;
      if (setback < 36) {
        const openings = level.openings.filter((o) => exposedRooms.some((r) => r.id === o.roomId) && o.side === side);
        add("fail", "IRC R302.1, Table R302.1(1)", `${level.name} ${side} wall is ${ftIn(setback)} from the property line: under 3 ft, no openings are allowed and the wall needs a 1-hour rating${openings.length ? ` — ${openings.length} opening(s) on that side must move` : ""}.`, openings.map((o) => o.id), level.id);
      } else if (setback < 60) {
        const openings = level.openings.filter((o) => exposedRooms.some((r) => r.id === o.roomId) && o.side === side);
        add("warn", "IRC R302.1, Table R302.1(1)", `${level.name} ${side} wall is ${ftIn(setback)} from the property line: 1-hour rated wall required and openings limited to 25% of the wall area${openings.length ? ` (${openings.length} on that side)` : ""}.`, openings.map((o) => o.id), level.id);
      }
    }

    // alarms (drawings must show them)
    const beds = level.rooms.filter((r) => r.type === "bedroom");
    if (beds.length) add("info", "IRC R314.3", `${level.name}: smoke alarm in each bedroom (${beds.map((b) => b.name).join(", ")}) and one outside the sleeping area, interconnected.`, beds.map((b) => b.id), level.id);
    else add("info", "IRC R314.3", `${level.name}: at least one smoke alarm on this level.`, [], level.id);
  });

  if (!egressDoor && ground) add("fail", "IRC R311.2", `No qualifying egress door: at least one side-hinged exterior door ≥ 36 in wide × 78 in high on ${ground.name}.`, [], ground.id);
  else if (ground) passes.push("A 36 in side-hinged exterior door serves as the required egress door (R311.2).");

  if (s.fuelBurning || s.attachedGarage) add("info", "IRC R315.3", "Carbon-monoxide alarm outside each sleeping area and on each level with a fuel-burning appliance or attached garage.");

  if (plan.levels.length > 0 && footprint(plan.levels[0]) == null) add("fail", "plan", "The plan has no rooms.");

  const fails = items.filter((i) => i.severity === "fail").length;
  const warns = items.filter((i) => i.severity === "warn").length;
  const infos = items.filter((i) => i.severity === "info").length;
  return { edition: `${s.codeEdition} IRC / ${s.codeEdition} IECC zone ${s.climateZone}`, items, fails, warns, infos, passes };
}

function onFootprintEdge(level: Level, r: Room, side: Side): boolean {
  const f = footprint(level);
  if (!f) return false;
  const eps = 0.01;
  switch (side) {
    case "N": return Math.abs(r.y + r.h - (f.y + f.h)) < eps;
    case "S": return Math.abs(r.y - f.y) < eps;
    case "E": return Math.abs(r.x + r.w - (f.x + f.w)) < eps;
    case "W": return Math.abs(r.x - f.x) < eps;
  }
}

/** One-line status for headers and title blocks. */
export function codeSummary(r: CodeReport): string {
  if (r.fails === 0 && r.warns === 0) return `Code check: no issues (${r.edition})`;
  return `Code check: ${r.fails} fail · ${r.warns} warn · ${r.infos} to show (${r.edition})`;
}

export type { WallSegment };
