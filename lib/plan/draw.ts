import { codeCheck, codeSummary } from "./code.ts";
import { deriveWalls, footprint, netDims, openingSpan, roomArea, stairMath, wallLength, type WallSegment } from "./geometry.ts";
import { ftIn, sqft, type HousePlan, type Level, type Opening } from "./model.ts";
import { schedules } from "./schedules.ts";

/**
 * One drawing model, two outputs. drawLevel() turns a level into layered
 * primitives (lines, arcs, text) in inches; dxf.ts and svg.ts serialise the
 * same list, so the DXF you import into Home Designer and the plan on screen
 * are the same drawing.
 */

export type Layer = "wall" | "wall-center" | "door" | "window" | "opening" | "stair" | "room-text" | "mark" | "dim" | "title" | "symbol";

export type Prim =
  | { t: "line"; layer: Layer; x1: number; y1: number; x2: number; y2: number; dashed?: boolean }
  | { t: "arc"; layer: Layer; cx: number; cy: number; r: number; a0: number; a1: number }
  | { t: "circle"; layer: Layer; cx: number; cy: number; r: number }
  | { t: "text"; layer: Layer; x: number; y: number; text: string; size: number; anchor: "start" | "middle" | "end"; rotate?: number; bold?: boolean };

export interface Drawing {
  levelId: string;
  levelName: string;
  title: string;
  prims: Prim[];
  /** Drawing extents including dimensions and title, inches. */
  bounds: { x0: number; y0: number; x1: number; y1: number };
}

const TEXT = { room: 6, sub: 4, mark: 4, dim: 4, title: 9, note: 5 };
const DIM_OFF_1 = 24;
const DIM_OFF_2 = 44;
const MARGIN = 84;

export function drawLevel(plan: HousePlan, levelId: string): Drawing | null {
  const level = plan.levels.find((l) => l.id === levelId);
  if (!level) return null;
  const f = footprint(level);
  const P: Prim[] = [];
  const line = (layer: Layer, x1: number, y1: number, x2: number, y2: number, dashed?: boolean) => P.push({ t: "line", layer, x1, y1, x2, y2, dashed });
  const text = (layer: Layer, x: number, y: number, s: string, size: number, anchor: "start" | "middle" | "end" = "middle", rotate?: number, bold?: boolean) => P.push({ t: "text", layer, x, y, text: s, size, anchor, rotate, bold });
  const title = `${plan.title} — ${level.name}`;

  if (!f) {
    text("title", 0, 0, `${title}: no rooms yet`, TEXT.title, "start");
    return { levelId, levelName: level.name, title, prims: P, bounds: { x0: -12, y0: -24, x1: 400, y1: 24 } };
  }

  const ext = plan.settings.exteriorWallIn;
  const walls = deriveWalls(level, ext, plan.settings.interiorWallIn);
  const sched = schedules(plan);
  const outer = { x0: f.x - ext / 2, y0: f.y - ext / 2, x1: f.x + f.w + ext / 2, y1: f.y + f.h + ext / 2 };
  const onEdge = (x: number, y: number) => Math.abs(x - f.x) < 0.01 || Math.abs(x - f.x - f.w) < 0.01 || Math.abs(y - f.y) < 0.01 || Math.abs(y - f.y - f.h) < 0.01;

  // ── walls ────────────────────────────────────────────────────────────────
  for (const w of walls) {
    const t = w.thickness / 2;
    line("wall-center", w.ax, w.ay, w.bx, w.by, true);
    // the openings that cut this wall, as [from, to] along the wall axis
    const cuts: Array<[number, number, Opening]> = [];
    for (const o of level.openings) {
      const room = level.rooms.find((r) => r.id === o.roomId);
      if (!room) continue;
      const s = openingSpan(room, o);
      if (s.horizontal !== w.horizontal) continue;
      const sameLine = w.horizontal ? Math.abs(s.ay - w.ay) < 0.01 : Math.abs(s.ax - w.ax) < 0.01;
      if (!sameLine) continue;
      const [a, b] = w.horizontal ? [s.ax, s.bx] : [s.ay, s.by];
      const [wa, wb] = w.horizontal ? [w.ax, w.bx] : [w.ay, w.by];
      if (a >= wa - 0.01 && b <= wb + 0.01) cuts.push([a, b, o]);
    }
    cuts.sort((p, q) => p[0] - q[0]);

    // end extensions: exterior walls close their outer corners; interior walls stop at the abutting face
    const [wa, wb] = w.horizontal ? [w.ax, w.bx] : [w.ay, w.by];
    const c = w.horizontal ? w.ay : w.ax;
    const endA = w.horizontal ? onEdge(w.ax, w.ay) : onEdge(w.ax, w.ay);
    const endB = w.horizontal ? onEdge(w.bx, w.by) : onEdge(w.bx, w.by);
    const extendA = w.exterior ? (endA ? ext / 2 : -plan.settings.interiorWallIn / 2) : endA ? -ext / 2 : -plan.settings.interiorWallIn / 2;
    const extendB = w.exterior ? (endB ? ext / 2 : -plan.settings.interiorWallIn / 2) : endB ? -ext / 2 : -plan.settings.interiorWallIn / 2;

    for (const sign of [-1, 1]) {
      const off = c + sign * t;
      // outer face of an exterior wall extends past the corner; inner face stops short
      const isOuter = w.exterior && ((w.outside === "N" || w.outside === "E") ? sign === 1 : sign === -1);
      const a0 = wa - (w.exterior ? (isOuter ? Math.max(extendA, 0) : Math.min(extendA, 0)) : extendA);
      const b0 = wb + (w.exterior ? (isOuter ? Math.max(extendB, 0) : Math.min(extendB, 0)) : extendB);
      let cur = a0;
      for (const [ca, cb] of cuts) {
        if (ca > cur) seg(cur, ca, off);
        cur = cb;
      }
      if (cur < b0) seg(cur, b0, off);
    }
    // jambs across the wall at each opening end
    for (const [ca, cb, o] of cuts) {
      if (w.horizontal) { line(layerOf(o), ca, c - t, ca, c + t); line(layerOf(o), cb, c - t, cb, c + t); }
      else { line(layerOf(o), c - t, ca, c + t, ca); line(layerOf(o), c - t, cb, c + t, cb); }
      drawOpening(w, o, ca, cb, c, t);
    }

    function seg(a: number, b: number, off: number) {
      if (w.horizontal) line("wall", a, off, b, off);
      else line("wall", off, a, off, b);
    }
  }

  function layerOf(o: Opening): Layer {
    return o.kind === "door" ? "door" : o.kind === "window" ? "window" : "opening";
  }

  function drawOpening(w: WallSegment, o: Opening, ca: number, cb: number, c: number, t: number) {
    const mark = sched.marks[o.id];
    const mid = (ca + cb) / 2;
    const room = level!.rooms.find((r) => r.id === o.roomId)!;
    // which side of the wall the room is on (+1 = room is north/east of the line)
    const roomSign = w.horizontal ? (room.y + room.h / 2 > c ? 1 : -1) : (room.x + room.w / 2 > c ? 1 : -1);
    if (o.kind === "window") {
      // frame lines across the opening at both faces + glass line at center
      if (w.horizontal) { line("window", ca, c - t, cb, c - t); line("window", ca, c + t, cb, c + t); line("window", ca, c, cb, c); }
      else { line("window", c - t, ca, c - t, cb); line("window", c + t, ca, c + t, cb); line("window", c, ca, c, cb); }
      // mark outside the wall
      const off = -roomSign * (t + 10);
      if (w.horizontal) text("mark", mid, c + off - (off < 0 ? TEXT.mark : 0), mark, TEXT.mark);
      else text("mark", c + off, mid - TEXT.mark / 2, mark, TEXT.mark, off < 0 ? "end" : "start");
      return;
    }
    if (o.kind === "opening") {
      // cased opening: dashed header line at the centerline
      if (w.horizontal) line("opening", ca, c, cb, c, true);
      else line("opening", c, ca, c, cb, true);
      if (w.horizontal) text("mark", mid, c + roomSign * (t + 4) - (roomSign < 0 ? TEXT.mark : 0), mark, TEXT.mark);
      else text("mark", c + roomSign * (t + 4), mid - TEXT.mark / 2, mark, TEXT.mark, roomSign < 0 ? "end" : "start");
      return;
    }
    // door
    const width = cb - ca;
    const swingSign = (o.swing ?? "in") === "in" ? roomSign : -roomSign;
    const hingeAtA = (o.hinge ?? "left") === "left";
    const style = o.doorStyle ?? "hinged";
    if (style === "hinged" || style === "barn" || style === "pocket" || style === "bifold") {
      const hx = hingeAtA ? ca : cb;
      const dir = hingeAtA ? 1 : -1;
      if (style === "hinged") {
        // leaf perpendicular to the wall, swing arc a quarter circle
        if (w.horizontal) {
          line("door", hx, c + swingSign * t, hx, c + swingSign * (t + width));
          const a0 = swingSign > 0 ? (dir > 0 ? 0 : 90) : (dir > 0 ? 270 : 180);
          P.push({ t: "arc", layer: "door", cx: hx, cy: c + swingSign * t, r: width, a0, a1: a0 + 90 });
        } else {
          line("door", c + swingSign * t, hx, c + swingSign * (t + width), hx);
          const a0 = swingSign > 0 ? (dir > 0 ? 0 : 270) : (dir > 0 ? 90 : 180);
          P.push({ t: "arc", layer: "door", cx: c + swingSign * t, cy: hx, r: width, a0, a1: a0 + 90 });
        }
      } else if (style === "bifold") {
        // two panels folded: zigzag
        const q = width / 4;
        for (let i = 0; i < 2; i++) {
          const s0 = ca + i * (width / 2);
          if (w.horizontal) { line("door", s0, c + swingSign * t, s0 + q, c + swingSign * (t + q * 1.6)); line("door", s0 + q, c + swingSign * (t + q * 1.6), s0 + 2 * q, c + swingSign * t); }
          else { line("door", c + swingSign * t, s0, c + swingSign * (t + q * 1.6), s0 + q); line("door", c + swingSign * (t + q * 1.6), s0 + q, c + swingSign * t, s0 + 2 * q); }
        }
      } else {
        // pocket / barn: a leaf line parallel to the wall, offset to the swing side (barn) or inside the wall (pocket)
        const off = style === "pocket" ? 0 : swingSign * (t + 2);
        if (w.horizontal) line("door", hx, c + off, hx + dir * width, c + off, style === "pocket");
        else line("door", c + off, hx, c + off, hx + dir * width, style === "pocket");
      }
    } else {
      // sliding: two overlapping panels
      const half = width / 2;
      if (w.horizontal) { line("door", ca, c - 1, ca + half + 2, c - 1); line("door", ca + half - 2, c + 1, cb, c + 1); }
      else { line("door", c - 1, ca, c - 1, ca + half + 2); line("door", c + 1, ca + half - 2, c + 1, cb); }
    }
    // mark beside the door on the side the leaf does NOT swing to, tight to the wall, so it never lands in the room label
    const markSign = -swingSign;
    if (w.horizontal) text("mark", mid, c + markSign * (t + 3) - (markSign < 0 ? TEXT.mark : 0), mark, TEXT.mark);
    else text("mark", c + markSign * (t + 3), mid - TEXT.mark / 2, mark, TEXT.mark, markSign < 0 ? "end" : "start");
  }

  // ── rooms ────────────────────────────────────────────────────────────────
  for (const r of level.rooms) {
    const d = netDims(level, r, walls);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const small = Math.min(r.w, r.h) < 60;
    const nameSize = small ? TEXT.sub : TEXT.room;
    text("room-text", cx, cy + (small ? 2 : 4), r.name.toUpperCase(), nameSize, "middle", undefined, true);
    if (!small) {
      text("room-text", cx, cy - 5, `${ftIn(d.w)} × ${ftIn(d.h)}`, TEXT.sub);
      text("room-text", cx, cy - 11, `${sqft(roomArea(level, r, walls))} SF · CLG ${ftIn(r.ceilingIn ?? level.ceilingIn)}`, TEXT.sub);
    }
  }

  // ── stairs ───────────────────────────────────────────────────────────────
  for (const st of level.stairs) {
    const room = level.rooms.find((r) => r.id === st.roomId);
    const m = stairMath(plan, level, st);
    if (!room || !m) continue;
    const x0 = room.x + st.x, y0 = room.y + st.y;
    const along = st.run === "N" || st.run === "S";
    const w = st.width, run = m.runIn;
    // outline
    if (along) { line("stair", x0, y0, x0 + w, y0); line("stair", x0, y0 + run, x0 + w, y0 + run); line("stair", x0, y0, x0, y0 + run); line("stair", x0 + w, y0, x0 + w, y0 + run); }
    else { line("stair", x0, y0, x0, y0 + w); line("stair", x0 + run, y0, x0 + run, y0 + w); line("stair", x0, y0, x0 + run, y0); line("stair", x0, y0 + w, x0 + run, y0 + w); }
    // treads
    for (let i = 1; i < m.treads; i++) {
      const p = i * st.treadIn;
      if (along) line("stair", x0, y0 + p, x0 + w, y0 + p);
      else line("stair", x0 + p, y0, x0 + p, y0 + w);
    }
    // direction arrow along the centre, pointing UP
    const up = st.run === "N" || st.run === "E" ? 1 : -1;
    if (along) {
      const xm = x0 + w / 2;
      const ya = up > 0 ? y0 + 6 : y0 + run - 6, yb = up > 0 ? y0 + run - 10 : y0 + 10;
      line("stair", xm, ya, xm, yb);
      line("stair", xm, yb, xm - 3, yb - up * 6); line("stair", xm, yb, xm + 3, yb - up * 6);
      text("stair", xm, up > 0 ? y0 + run + 4 : y0 - 8, `UP ${m.risers}R @ ${m.riserIn.toFixed(2)}"`, TEXT.sub);
    } else {
      const ym = y0 + w / 2;
      const xa = up > 0 ? x0 + 6 : x0 + run - 6, xb = up > 0 ? x0 + run - 10 : x0 + 10;
      line("stair", xa, ym, xb, ym);
      line("stair", xb, ym, xb - up * 6, ym - 3); line("stair", xb, ym, xb - up * 6, ym + 3);
      text("stair", up > 0 ? x0 + run + 4 : x0 - 4, ym - 2, `UP ${m.risers}R @ ${m.riserIn.toFixed(2)}"`, TEXT.sub, up > 0 ? "start" : "end");
    }
  }

  // ── dimensions: strings along north and east, overall further out ────────
  const northBreaks = [...new Set(walls.filter((w) => !w.horizontal && (Math.abs(w.by - (f.y + f.h)) < 0.01)).map((w) => w.ax))].sort((a, b) => a - b);
  const eastBreaks = [...new Set(walls.filter((w) => w.horizontal && (Math.abs(w.bx - (f.x + f.w)) < 0.01)).map((w) => w.ay))].sort((a, b) => a - b);
  dimString("N", [outer.x0, ...northBreaks.filter((x) => x > f.x + 0.01 && x < f.x + f.w - 0.01), outer.x1], outer.y1);
  dimString("E", [outer.y0, ...eastBreaks.filter((y) => y > f.y + 0.01 && y < f.y + f.h - 0.01), outer.y1], outer.x1);

  function dimString(side: "N" | "E", pts: number[], base: number) {
    const rows: Array<{ pts: number[]; off: number }> = [{ pts, off: DIM_OFF_1 }];
    if (pts.length > 2) rows.push({ pts: [pts[0], pts[pts.length - 1]], off: DIM_OFF_2 });
    else rows[0].off = DIM_OFF_2;
    for (const row of rows) {
      const y = base + row.off;
      if (side === "N") {
        line("dim", row.pts[0], y, row.pts[row.pts.length - 1], y);
        for (const x of row.pts) { line("dim", x, base + 4, x, y + 3); line("dim", x - 2, y - 2, x + 2, y + 2); }
        for (let i = 0; i < row.pts.length - 1; i++) text("dim", (row.pts[i] + row.pts[i + 1]) / 2, y + 2, ftIn(row.pts[i + 1] - row.pts[i]), TEXT.dim);
      } else {
        line("dim", y, row.pts[0], y, row.pts[row.pts.length - 1]);
        for (const p of row.pts) { line("dim", base + 4, p, y + 3, p); line("dim", y - 2, p - 2, y + 2, p + 2); }
        for (let i = 0; i < row.pts.length - 1; i++) text("dim", y + 2, (row.pts[i] + row.pts[i + 1]) / 2, ftIn(row.pts[i + 1] - row.pts[i]), TEXT.dim, "middle", 90);
      }
    }
  }

  // ── north arrow, title, notes ────────────────────────────────────────────
  const nx = outer.x1 + DIM_OFF_2 + 30, ny = outer.y1 + DIM_OFF_2 + 6;
  P.push({ t: "circle", layer: "symbol", cx: nx, cy: ny, r: 9 });
  line("symbol", nx, ny - 7, nx, ny + 7); line("symbol", nx, ny + 7, nx - 3, ny + 2); line("symbol", nx, ny + 7, nx + 3, ny + 2);
  text("symbol", nx, ny + 12, "N", TEXT.sub);

  const report = codeCheck(plan);
  const extLf = walls.filter((w) => w.exterior).reduce((a, w) => a + wallLength(w), 0) / 12;
  const ty = outer.y0 - 20;
  const notes = [
    `FLOOR PLAN · CLG ${ftIn(level.ceilingIn)} · EXT WALL ${ext}" · INT WALL ${plan.settings.interiorWallIn}" · EXT WALL ${Math.round(extLf)} LF`,
    `DIMENSIONS TO OUTSIDE FACE OF EXTERIOR WALLS AND CENTERLINE OF INTERIOR WALLS · ${plan.roof.type.toUpperCase()} ROOF ${plan.roof.pitchRise}/12`,
    `${(plan.settings.address || "ADDRESS NOT SET").toUpperCase()} · ${plan.settings.codeEdition} IRC / IECC CLIMATE ZONE ${plan.settings.climateZone}`,
    codeSummary(report).toUpperCase(),
  ];
  text("title", outer.x0, ty - TEXT.title, title.toUpperCase(), TEXT.title, "start", undefined, true);
  notes.forEach((n, i) => text("title", outer.x0, ty - TEXT.title - 8 - i * 7, n, TEXT.note, "start"));
  // text has no measured width here; a monospace note is ≈0.62 × size per character
  const textRight = outer.x0 + Math.max(title.length * TEXT.title * 0.62, ...notes.map((n) => n.length * TEXT.note * 0.62));

  return {
    levelId,
    levelName: level.name,
    title,
    prims: P,
    bounds: { x0: outer.x0 - MARGIN / 2, y0: ty - TEXT.title - 8 - notes.length * 7 - 10, x1: Math.max(outer.x1 + DIM_OFF_2 + 48, nx + 16, textRight + 12), y1: outer.y1 + DIM_OFF_2 + 24 },
  };
}

export function drawPlan(plan: HousePlan): Drawing[] {
  return plan.levels.map((l) => drawLevel(plan, l.id)).filter((d): d is Drawing => Boolean(d));
}

export type { Level };
