import { HABITABLE, type HousePlan, type Level, type Opening, type Rect, type Room, type Side, type Stair, STANDARD } from "./model.ts";

/**
 * Everything derived from the model: walls from room edges, opening
 * positions, footprint, areas, stair math. Pure functions; every renderer,
 * rule and export reads the model through these so they all agree.
 */

const EPS = 0.01;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;

export interface WallSegment {
  id: string;
  /** Centerline endpoints; a is west/south of b. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  horizontal: boolean;
  exterior: boolean;
  thickness: number;
  /** Rooms touching this segment (1 for exterior, 2 for interior). */
  roomIds: string[];
  /** For exterior walls: which way the outside faces. */
  outside?: Side;
}

export function wallLength(w: WallSegment): number {
  return w.horizontal ? w.bx - w.ax : w.by - w.ay;
}

/** The building's centerline footprint: the bounding box of the level's rooms. */
export function footprint(level: Level): Rect | null {
  if (level.rooms.length === 0) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of level.rooms) {
    x0 = Math.min(x0, r.x);
    y0 = Math.min(y0, r.y);
    x1 = Math.max(x1, r.x + r.w);
    y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Outside-face dimensions (centerline footprint + one exterior wall thickness). */
export function overallDims(level: Level, exteriorWallIn: number): { w: number; h: number } | null {
  const f = footprint(level);
  if (!f) return null;
  return { w: f.w + exteriorWallIn, h: f.h + exteriorWallIn };
}

/** Rooms that overlap (interiors intersect, not just touching edges). */
export function overlaps(rooms: Room[]): Array<[Room, Room]> {
  const out: Array<[Room, Room]> = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > EPS && iy > EPS) out.push([a, b]);
    }
  }
  return out;
}

/** Area inside the footprint not covered by any room (sq in). */
export function unassignedArea(level: Level): number {
  const f = footprint(level);
  if (!f) return 0;
  const covered = level.rooms.reduce((s, r) => s + r.w * r.h, 0);
  return Math.max(0, f.w * f.h - covered);
}

/**
 * Derive walls: every room edge is split at every other room's vertex on the
 * same line; each elementary piece bordered by one room is exterior, by two
 * is interior.
 */
export function deriveWalls(level: Level, exteriorWallIn: number, interiorWallIn: number): WallSegment[] {
  const out: WallSegment[] = [];
  const rooms = level.rooms;

  // vertical lines: x = const
  const xs = [...new Set(rooms.flatMap((r) => [r.x, r.x + r.w]))].sort((a, b) => a - b);
  const ys = [...new Set(rooms.flatMap((r) => [r.y, r.y + r.h]))].sort((a, b) => a - b);

  for (const x of xs) {
    const pieces: { y0: number; y1: number; left: string[]; right: string[] }[] = [];
    for (let k = 0; k < ys.length - 1; k++) {
      const y0 = ys[k], y1 = ys[k + 1];
      const mid = (y0 + y1) / 2;
      const left = rooms.filter((r) => near(r.x + r.w, x) && r.y < mid && r.y + r.h > mid).map((r) => r.id);
      const right = rooms.filter((r) => near(r.x, x) && r.y < mid && r.y + r.h > mid).map((r) => r.id);
      if (left.length + right.length > 0) pieces.push({ y0, y1, left, right });
    }
    // merge runs with identical adjacency
    let i = 0;
    while (i < pieces.length) {
      let j = i;
      while (j + 1 < pieces.length && near(pieces[j].y1, pieces[j + 1].y0) && same(pieces[j], pieces[j + 1])) j++;
      const p = pieces[i];
      const ids = [...p.left, ...p.right];
      const exterior = ids.length === 1;
      out.push({
        id: `wv-${x}-${p.y0}`,
        ax: x, ay: p.y0, bx: x, by: pieces[j].y1,
        horizontal: false,
        exterior,
        thickness: exterior ? exteriorWallIn : interiorWallIn,
        roomIds: ids,
        outside: exterior ? (p.left.length ? "E" : "W") : undefined,
      });
      i = j + 1;
    }
  }

  for (const y of ys) {
    const pieces: { x0: number; x1: number; below: string[]; above: string[] }[] = [];
    for (let k = 0; k < xs.length - 1; k++) {
      const x0 = xs[k], x1 = xs[k + 1];
      const mid = (x0 + x1) / 2;
      const below = rooms.filter((r) => near(r.y + r.h, y) && r.x < mid && r.x + r.w > mid).map((r) => r.id);
      const above = rooms.filter((r) => near(r.y, y) && r.x < mid && r.x + r.w > mid).map((r) => r.id);
      if (below.length + above.length > 0) pieces.push({ x0, x1, below, above });
    }
    let i = 0;
    while (i < pieces.length) {
      let j = i;
      while (j + 1 < pieces.length && near(pieces[j].x1, pieces[j + 1].x0) && sameH(pieces[j], pieces[j + 1])) j++;
      const p = pieces[i];
      const ids = [...p.below, ...p.above];
      const exterior = ids.length === 1;
      out.push({
        id: `wh-${y}-${p.x0}`,
        ax: p.x0, ay: y, bx: pieces[j].x1, by: y,
        horizontal: true,
        exterior,
        thickness: exterior ? exteriorWallIn : interiorWallIn,
        roomIds: ids,
        outside: exterior ? (p.below.length ? "N" : "S") : undefined,
      });
      i = j + 1;
    }
  }
  return out;
}

function same(a: { left: string[]; right: string[] }, b: { left: string[]; right: string[] }) {
  return a.left.join() === b.left.join() && a.right.join() === b.right.join();
}
function sameH(a: { below: string[]; above: string[] }, b: { below: string[]; above: string[] }) {
  return a.below.join() === b.below.join() && a.above.join() === b.above.join();
}

/** Length of a room's side along which openings are placed. */
export function sideLength(room: Rect, side: Side): number {
  return side === "N" || side === "S" ? room.w : room.h;
}

/** Is this side of the room an exterior wall along its whole length? Partial → "mixed". */
export function sideExposure(level: Level, room: Room, side: Side, walls: WallSegment[]): "exterior" | "interior" | "mixed" {
  const segs = walls.filter((w) => w.roomIds.includes(room.id) && onSide(w, room, side));
  if (segs.length === 0) return "interior";
  const ext = segs.filter((s) => s.exterior).length;
  if (ext === segs.length) return "exterior";
  if (ext === 0) return "interior";
  return "mixed";
}

function onSide(w: WallSegment, r: Rect, side: Side): boolean {
  switch (side) {
    case "N": return w.horizontal && near(w.ay, r.y + r.h);
    case "S": return w.horizontal && near(w.ay, r.y);
    case "E": return !w.horizontal && near(w.ax, r.x + r.w);
    case "W": return !w.horizontal && near(w.ax, r.x);
  }
}

/** Absolute centerline segment of an opening. */
export function openingSpan(room: Rect, o: Opening): { ax: number; ay: number; bx: number; by: number; horizontal: boolean } {
  switch (o.side) {
    case "N": return { ax: room.x + o.offset, ay: room.y + room.h, bx: room.x + o.offset + o.width, by: room.y + room.h, horizontal: true };
    case "S": return { ax: room.x + o.offset, ay: room.y, bx: room.x + o.offset + o.width, by: room.y, horizontal: true };
    case "E": return { ax: room.x + room.w, ay: room.y + o.offset, bx: room.x + room.w, by: room.y + o.offset + o.width, horizontal: false };
    case "W": return { ax: room.x, ay: room.y + o.offset, bx: room.x, by: room.y + o.offset + o.width, horizontal: false };
  }
}

/** Is the opening's span fully inside a single derived wall segment on that side? */
export function openingOnWall(level: Level, room: Room, o: Opening, walls: WallSegment[]): WallSegment | null {
  const s = openingSpan(room, o);
  for (const w of walls) {
    if (!w.roomIds.includes(room.id) || !onSide(w, room, o.side)) continue;
    if (w.horizontal && s.ax >= w.ax - EPS && s.bx <= w.bx + EPS) return w;
    if (!w.horizontal && s.ay >= w.ay - EPS && s.by <= w.by + EPS) return w;
  }
  return null;
}

/** Net interior dimensions of a room (centerline rect minus half a wall each side). */
export function netDims(level: Level, room: Room, walls: WallSegment[]): { w: number; h: number } {
  const half = (side: Side) => {
    const segs = walls.filter((w) => w.roomIds.includes(room.id) && onSide(w, room, side));
    if (segs.length === 0) return 0;
    return Math.max(...segs.map((s) => s.thickness)) / 2;
  };
  return { w: room.w - half("E") - half("W"), h: room.h - half("N") - half("S") };
}

export function roomArea(level: Level, room: Room, walls: WallSegment[]): number {
  const d = netDims(level, room, walls);
  return Math.max(0, d.w) * Math.max(0, d.h);
}

// ── stairs ───────────────────────────────────────────────────────────────────

export interface StairMath {
  floorToFloorIn: number;
  risers: number;
  riserIn: number;
  treads: number;
  treadIn: number;
  runIn: number;
  /** Footprint rect of the stair (run + a landing-depth at the top) inside the room, room-relative. */
  rect: Rect;
  headroomOk: boolean | null;
}

/** Floor-to-floor from this level to the next: ceiling + the upper level's floor structure. */
export function floorToFloor(plan: HousePlan, level: Level, toLevelId: string | null): number | null {
  if (!toLevelId) return null;
  const up = plan.levels.find((l) => l.id === toLevelId);
  if (!up) return null;
  return level.ceilingIn + up.floorStructureIn;
}

export function stairMath(plan: HousePlan, level: Level, s: Stair): StairMath | null {
  const ftf = floorToFloor(plan, level, s.toLevelId);
  if (ftf == null) return null;
  const risers = Math.ceil(ftf / STANDARD.maxRise);
  const riserIn = ftf / risers;
  const treads = risers - 1;
  const runIn = treads * s.treadIn;
  const along = runIn; // + a 36" landing at the arrival end is validated in code.ts
  const rect: Rect =
    s.run === "N" || s.run === "S"
      ? { x: s.x, y: s.y, w: s.width, h: along }
      : { x: s.x, y: s.y, w: along, h: s.width };
  return { floorToFloorIn: ftf, risers, riserIn, treads, treadIn: s.treadIn, runIn, rect, headroomOk: null };
}

// ── whole-building totals (feeds the takeoff) ────────────────────────────────

export interface PlanTotals {
  levels: number;
  footprintSqft: number;
  floorAreaSqft: number;
  extWallLf: number;
  intWallLf: number;
  extWallAreaSqft: number;
  intWallAreaSqft: number;
  windowCount: number;
  extDoorCount: number;
  intDoorCount: number;
  bedrooms: number;
  bathrooms: number;
  glazingSqft: number;
}

export function planTotals(plan: HousePlan): PlanTotals {
  const t: PlanTotals = { levels: plan.levels.length, footprintSqft: 0, floorAreaSqft: 0, extWallLf: 0, intWallLf: 0, extWallAreaSqft: 0, intWallAreaSqft: 0, windowCount: 0, extDoorCount: 0, intDoorCount: 0, bedrooms: 0, bathrooms: 0, glazingSqft: 0 };
  const { exteriorWallIn, interiorWallIn } = plan.settings;
  plan.levels.forEach((level, i) => {
    const walls = deriveWalls(level, exteriorWallIn, interiorWallIn);
    const f = footprint(level);
    if (i === 0 && f) t.footprintSqft = ((f.w + exteriorWallIn) * (f.h + exteriorWallIn)) / 144;
    for (const r of level.rooms) {
      t.floorAreaSqft += roomArea(level, r, walls) / 144;
      if (r.type === "bedroom") t.bedrooms++;
      if (r.type === "bathroom") t.bathrooms++;
    }
    for (const w of walls) {
      const lf = wallLength(w) / 12;
      if (w.exterior) { t.extWallLf += lf; t.extWallAreaSqft += (lf * level.ceilingIn) / 12; }
      else { t.intWallLf += lf; t.intWallAreaSqft += (lf * level.ceilingIn) / 12; }
    }
    for (const o of level.openings) {
      const room = level.rooms.find((r) => r.id === o.roomId);
      if (!room) continue;
      const wall = openingOnWall(level, room, o, walls);
      if (o.kind === "window") { t.windowCount++; t.glazingSqft += (o.width * o.height) / 144; }
      else if (o.kind === "door" && wall?.exterior) t.extDoorCount++;
      else if (o.kind === "door") t.intDoorCount++;
    }
  });
  const round = (n: number) => Math.round(n * 10) / 10;
  for (const k of Object.keys(t) as (keyof PlanTotals)[]) t[k] = round(t[k]);
  return t;
}

export function isHabitable(r: Room): boolean {
  return HABITABLE.has(r.type);
}
