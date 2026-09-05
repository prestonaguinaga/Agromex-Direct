import { deriveWalls, footprint, openingOnWall, openingSpan, overlaps, sideExposure, sideLength, stairMath } from "./geometry.ts";
import {
  DEFAULT_ROOF,
  DEFAULT_SETTINGS,
  PLAN_SCHEMA_VERSION,
  ROOM_TYPES,
  SIDES,
  STANDARD,
  type HousePlan,
  type Level,
  type Opening,
  type OpeningKind,
  type PlanSettings,
  type RoofSpec,
  type Room,
  type RoomType,
  type Side,
  type Stair,
} from "./model.ts";

/**
 * Every change to a plan is one of these operations, validated against the
 * current model before it is applied. An op either returns the new plan or
 * a plain-English refusal — never a half-applied model. `structural` ops
 * (changing the shell, removing rooms, changing levels) are the ones Bob
 * stops for a Confirm on.
 */

export type PlanOp =
  | { op: "add_level"; name?: string; ceilingIn?: number; floorStructureIn?: number }
  | { op: "remove_level"; levelId: string }
  | { op: "set_level"; levelId: string; name?: string; ceilingIn?: number; floorStructureIn?: number }
  | { op: "add_room"; levelId: string; name: string; type: RoomType; x: number; y: number; w: number; h: number; ceilingIn?: number; floorFinish?: string }
  | { op: "resize_room"; roomId: string; x?: number; y?: number; w?: number; h?: number }
  | { op: "rename_room"; roomId: string; name?: string; type?: RoomType; floorFinish?: string; notes?: string; ceilingIn?: number | null }
  | { op: "remove_room"; roomId: string }
  | { op: "add_opening"; roomId: string; kind: OpeningKind; side: Side; offset: number; width?: number; height?: number; sill?: number; swing?: Opening["swing"]; hinge?: Opening["hinge"]; doorStyle?: Opening["doorStyle"]; windowStyle?: Opening["windowStyle"]; label?: string }
  | { op: "move_opening"; openingId: string; side?: Side; offset?: number; roomId?: string }
  | { op: "resize_opening"; openingId: string; width?: number; height?: number; sill?: number }
  | { op: "set_opening"; openingId: string; swing?: Opening["swing"]; hinge?: Opening["hinge"]; doorStyle?: Opening["doorStyle"]; windowStyle?: Opening["windowStyle"]; tempered?: boolean; label?: string }
  | { op: "remove_opening"; openingId: string }
  | { op: "add_stair"; roomId: string; x: number; y: number; width?: number; run: Side; toLevelId: string | null; treadIn?: number }
  | { op: "move_stair"; stairId: string; x?: number; y?: number; run?: Side; width?: number; roomId?: string }
  | { op: "remove_stair"; stairId: string }
  | { op: "set_roof"; roof: Partial<RoofSpec> }
  | { op: "set_settings"; settings: Partial<PlanSettings> }
  | { op: "set_title"; title?: string; description?: string };

export const STRUCTURAL_OPS: ReadonlySet<PlanOp["op"]> = new Set(["add_level", "remove_level", "remove_room", "resize_room", "add_room", "set_roof", "remove_stair", "move_stair", "add_stair"]);

export type OpResult = { ok: true; plan: HousePlan; summary: string } | { ok: false; error: string };

export class OpError extends Error {}

const fail = (msg: string): OpResult => ({ ok: false, error: msg });

export function newPlan(title: string, settings: Partial<PlanSettings> = {}): HousePlan {
  return {
    schema: PLAN_SCHEMA_VERSION,
    title,
    description: "",
    settings: { ...DEFAULT_SETTINGS, ...settings, insulation: { ...DEFAULT_SETTINGS.insulation, ...(settings.insulation ?? {}) }, setbacksIn: { ...DEFAULT_SETTINGS.setbacksIn, ...(settings.setbacksIn ?? {}) } },
    roof: { ...DEFAULT_ROOF },
    levels: [],
  };
}

let counter = 0;
/** Deterministic, readable ids: "l1", "r3", "o12", "s1". Callers may pass their own uid. */
export function nextId(prefix: string, plan: HousePlan): string {
  const used = new Set<string>();
  for (const l of plan.levels) {
    used.add(l.id);
    for (const r of l.rooms) used.add(r.id);
    for (const o of l.openings) used.add(o.id);
    for (const s of l.stairs) used.add(s.id);
  }
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  counter++;
  return `${prefix}${n}`;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function findRoom(plan: HousePlan, roomId: string): { level: Level; room: Room } | null {
  for (const level of plan.levels) {
    const room = level.rooms.find((r) => r.id === roomId);
    if (room) return { level, room };
  }
  return null;
}
function findOpening(plan: HousePlan, id: string): { level: Level; opening: Opening } | null {
  for (const level of plan.levels) {
    const opening = level.openings.find((o) => o.id === id);
    if (opening) return { level, opening };
  }
  return null;
}
function findStair(plan: HousePlan, id: string): { level: Level; stair: Stair } | null {
  for (const level of plan.levels) {
    const stair = level.stairs.find((o) => o.id === id);
    if (stair) return { level, stair };
  }
  return null;
}

const pos = (n: unknown, what: string): string | null => (typeof n !== "number" || !Number.isFinite(n) || n <= 0 ? `${what} must be a positive number of inches` : null);
const nonneg = (n: unknown, what: string): string | null => (typeof n !== "number" || !Number.isFinite(n) || n < 0 ? `${what} must be a number of inches, 0 or more` : null);

/** Validate a room rectangle against its level: no overlaps, snapped to ½". */
function checkRoom(level: Level, room: Room, ignoreId?: string): string | null {
  for (const k of ["x", "y", "w", "h"] as const) {
    const v = room[k];
    if (!Number.isFinite(v)) return `${k} must be a number`;
  }
  if (room.w < 24 || room.h < 24) return `"${room.name}" would be ${Math.round(room.w)}×${Math.round(room.h)} in — a room needs at least 24 in each way (closets included)`;
  const others = level.rooms.filter((r) => r.id !== room.id && r.id !== ignoreId);
  const ov = overlaps([...others, room]).filter(([a, b]) => a.id === room.id || b.id === room.id);
  if (ov.length) {
    const other = ov[0][0].id === room.id ? ov[0][1] : ov[0][0];
    return `"${room.name}" would overlap "${other.name}". Rooms share walls; they cannot overlap. Shrink or move one of them.`;
  }
  return null;
}

/** Validate an opening fits a single wall segment of its room's side and does not collide with siblings. */
function checkOpening(plan: HousePlan, level: Level, o: Opening, ignoreId?: string): string | null {
  const room = level.rooms.find((r) => r.id === o.roomId);
  if (!room) return `Opening ${o.id}: room ${o.roomId} is not on this level`;
  if (!SIDES.includes(o.side)) return `side must be one of N, E, S, W`;
  const e = nonneg(o.offset, "offset") ?? pos(o.width, "width") ?? pos(o.height, "height");
  if (e) return e;
  const len = sideLength(room, o.side);
  if (o.offset + o.width > len + 0.01) return `"${o.label ?? o.kind}" (${o.width} in wide at offset ${o.offset}) runs past the ${o.side} side of "${room.name}", which is ${Math.round(len)} in long. Largest offset for that width: ${Math.max(0, Math.round(len - o.width))} in.`;
  if (o.offset < 3 || o.offset + o.width > len - 3) return `Leave at least 3 in of wall at each end of the ${o.side} side of "${room.name}" for the jamb and corner framing (offset ${o.offset}, width ${o.width}, side ${Math.round(len)}).`;
  const walls = deriveWalls(level, plan.settings.exteriorWallIn, plan.settings.interiorWallIn);
  const wall = openingOnWall(level, room, o, walls);
  if (!wall) return `"${o.label ?? o.kind}" would span a wall corner or a spot where the ${o.side} side of "${room.name}" meets two different rooms. Move it so it sits within one wall.`;
  if (o.kind === "window" && !wall.exterior) return `A window on the ${o.side} side of "${room.name}" would look into "${wall.roomIds.find((id) => id !== room.id)}" — that side is an interior wall. Windows go on exterior walls only.`;
  if (o.kind === "window" && (o.sill ?? 0) + o.height > level.ceilingIn - 6) return `Window head at ${(o.sill ?? 0) + o.height} in would hit the ceiling (${level.ceilingIn} in). Lower the sill or the height.`;
  if (o.kind === "door" && o.height > level.ceilingIn - 4) return `Door height ${o.height} in does not fit under a ${level.ceilingIn} in ceiling.`;
  // collisions with other openings on the same wall line (either room's side)
  const span = openingSpan(room, o);
  for (const other of level.openings) {
    if (other.id === o.id || other.id === ignoreId) continue;
    const oroom = level.rooms.find((r) => r.id === other.roomId);
    if (!oroom) continue;
    const s2 = openingSpan(oroom, other);
    if (span.horizontal !== s2.horizontal) continue;
    const sameLine = span.horizontal ? Math.abs(span.ay - s2.ay) < 0.01 : Math.abs(span.ax - s2.ax) < 0.01;
    if (!sameLine) continue;
    const [a0, a1] = span.horizontal ? [span.ax, span.bx] : [span.ay, span.by];
    const [b0, b1] = s2.horizontal ? [s2.ax, s2.bx] : [s2.ay, s2.by];
    if (Math.min(a1, b1) - Math.max(a0, b0) > 0.01) return `"${o.label ?? o.kind}" would overlap "${other.label ?? other.kind}" (${other.id}) on the same wall.`;
  }
  return null;
}

function checkStair(plan: HousePlan, level: Level, s: Stair): string | null {
  const room = level.rooms.find((r) => r.id === s.roomId);
  if (!room) return `Stair: room ${s.roomId} is not on this level`;
  const e = nonneg(s.x, "x") ?? nonneg(s.y, "y") ?? pos(s.width, "width") ?? pos(s.treadIn, "tread");
  if (e) return e;
  if (s.width < STANDARD.stairWidth) return `Stair width ${s.width} in is under the 36 in minimum (IRC R311.7.1).`;
  if (s.treadIn < STANDARD.tread) return `Tread ${s.treadIn} in is under the 10 in minimum (IRC R311.7.5.2).`;
  if (s.toLevelId && !plan.levels.some((l) => l.id === s.toLevelId)) return `Stair climbs to level ${s.toLevelId}, which does not exist.`;
  if (s.toLevelId === level.id) return `A stair cannot climb to its own level.`;
  const m = stairMath(plan, level, s);
  if (m) {
    const landing = 36;
    const needW = s.run === "N" || s.run === "S" ? m.rect.w : m.rect.w + landing;
    const needH = s.run === "N" || s.run === "S" ? m.rect.h + landing : m.rect.h;
    if (s.x + needW > room.w + 0.01 || s.y + needH > room.h + 0.01) {
      return `The stair needs ${Math.round(m.runIn)} in of run plus a 36 in landing (${m.risers} risers at ${m.riserIn.toFixed(2)} in for a ${m.floorToFloorIn} in floor-to-floor) — ${Math.round(needW)}×${Math.round(needH)} in — but "${room.name}" is ${Math.round(room.w)}×${Math.round(room.h)} in from that corner. Enlarge the room, lower the ceiling below, or turn the run.`;
    }
  }
  return null;
}

/** Apply one operation. */
export function applyOp(input: HousePlan, op: PlanOp): OpResult {
  const plan = clone(input);
  const s = plan.settings;
  switch (op.op) {
    case "set_title": {
      if (op.title !== undefined) plan.title = op.title.trim() || plan.title;
      if (op.description !== undefined) plan.description = op.description;
      return { ok: true, plan, summary: `title/description updated` };
    }
    case "set_settings": {
      const next = { ...s, ...op.settings, insulation: { ...s.insulation, ...(op.settings.insulation ?? {}) }, setbacksIn: { ...s.setbacksIn, ...(op.settings.setbacksIn ?? {}) } };
      if (next.exteriorWallIn < 3.5 || next.exteriorWallIn > 14) return fail("exteriorWallIn must be between 3.5 and 14 in");
      if (next.interiorWallIn < 3.5 || next.interiorWallIn > 8) return fail("interiorWallIn must be between 3.5 and 8 in");
      plan.settings = next;
      return { ok: true, plan, summary: `settings updated: ${Object.keys(op.settings).join(", ")}` };
    }
    case "set_roof": {
      const next = { ...plan.roof, ...op.roof };
      if (!["gable", "hip", "shed", "flat"].includes(next.type)) return fail("roof type must be gable, hip, shed or flat");
      if (next.pitchRise < 0 || next.pitchRise > 18) return fail("pitch rise must be 0–18 (per 12)");
      plan.roof = next;
      return { ok: true, plan, summary: `roof: ${next.type} ${next.pitchRise}/12` };
    }
    case "add_level": {
      const id = nextId("l", plan);
      const n = plan.levels.length + 1;
      const level: Level = { id, name: op.name?.trim() || `Level ${n}`, ceilingIn: op.ceilingIn ?? (n === 1 ? 108 : 96), floorStructureIn: op.floorStructureIn ?? (n === 1 ? 0 : 12), rooms: [], openings: [], stairs: [] };
      if (level.ceilingIn < 84) return fail("Ceiling height under 84 in (7 ft) is not habitable (IRC R305.1)");
      plan.levels.push(level);
      return { ok: true, plan, summary: `+ ${level.name} (${id}), ceiling ${level.ceilingIn} in` };
    }
    case "remove_level": {
      const i = plan.levels.findIndex((l) => l.id === op.levelId);
      if (i < 0) return fail(`No level ${op.levelId}`);
      const [gone] = plan.levels.splice(i, 1);
      for (const l of plan.levels) for (const st of l.stairs) if (st.toLevelId === gone.id) st.toLevelId = null;
      return { ok: true, plan, summary: `− ${gone.name} and its ${gone.rooms.length} rooms` };
    }
    case "set_level": {
      const level = plan.levels.find((l) => l.id === op.levelId);
      if (!level) return fail(`No level ${op.levelId}`);
      if (op.name !== undefined) level.name = op.name.trim() || level.name;
      if (op.ceilingIn !== undefined) {
        if (op.ceilingIn < 84) return fail("Ceiling height under 84 in (7 ft) is not habitable (IRC R305.1)");
        level.ceilingIn = op.ceilingIn;
      }
      if (op.floorStructureIn !== undefined) {
        const e = nonneg(op.floorStructureIn, "floorStructureIn");
        if (e) return fail(e);
        level.floorStructureIn = op.floorStructureIn;
      }
      // stairs to/from this level may no longer fit
      for (const l of plan.levels) for (const st of l.stairs) {
        const e = checkStair(plan, l, st);
        if (e) return fail(`That ceiling change breaks a stair: ${e}`);
      }
      return { ok: true, plan, summary: `${level.name}: ceiling ${level.ceilingIn} in` };
    }
    case "add_room": {
      const level = plan.levels.find((l) => l.id === op.levelId);
      if (!level) return fail(`No level ${op.levelId}`);
      if (!ROOM_TYPES.includes(op.type)) return fail(`type must be one of ${ROOM_TYPES.join(", ")}`);
      const name = op.name.trim();
      if (!name) return fail("Give the room a name");
      if (level.rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) return fail(`"${name}" already exists on ${level.name} — pick a distinct name (Bedroom 2, Hall 2…)`);
      const room: Room = { id: nextId("r", plan), name, type: op.type, x: op.x, y: op.y, w: op.w, h: op.h };
      if (op.ceilingIn) room.ceilingIn = op.ceilingIn;
      if (op.floorFinish) room.floorFinish = op.floorFinish;
      const e = checkRoom(level, room);
      if (e) return fail(e);
      level.rooms.push(room);
      return { ok: true, plan, summary: `+ ${name} (${room.id}) ${Math.round(op.w)}×${Math.round(op.h)} in on ${level.name}` };
    }
    case "resize_room": {
      const hit = findRoom(plan, op.roomId);
      if (!hit) return fail(`No room ${op.roomId}`);
      const { level, room } = hit;
      const next = { ...room, x: op.x ?? room.x, y: op.y ?? room.y, w: op.w ?? room.w, h: op.h ?? room.h };
      const e = checkRoom(level, next);
      if (e) return fail(e);
      Object.assign(room, next);
      // openings and stairs on this room must still fit
      for (const o of level.openings.filter((o) => o.roomId === room.id)) {
        const oe = checkOpening(plan, level, o);
        if (oe) return fail(`Resizing "${room.name}" that way breaks ${o.kind} ${o.id}: ${oe} Move or remove it first.`);
      }
      for (const st of level.stairs.filter((st) => st.roomId === room.id)) {
        const se = checkStair(plan, level, st);
        if (se) return fail(`Resizing "${room.name}" that way breaks stair ${st.id}: ${se}`);
      }
      // openings in OTHER rooms that shared a wall with this room may now sit on a corner
      for (const o of level.openings.filter((o) => o.roomId !== room.id)) {
        const oe = checkOpening(plan, level, o);
        if (oe) return fail(`Resizing "${room.name}" that way breaks ${o.kind} ${o.id} in another room: ${oe}`);
      }
      return { ok: true, plan, summary: `✎ ${room.name}: ${Math.round(next.w)}×${Math.round(next.h)} in at (${Math.round(next.x)}, ${Math.round(next.y)})` };
    }
    case "rename_room": {
      const hit = findRoom(plan, op.roomId);
      if (!hit) return fail(`No room ${op.roomId}`);
      const { level, room } = hit;
      if (op.name !== undefined) {
        const name = op.name.trim();
        if (!name) return fail("Name can't be empty");
        if (level.rooms.some((r) => r.id !== room.id && r.name.toLowerCase() === name.toLowerCase())) return fail(`"${name}" already exists on ${level.name}`);
        room.name = name;
      }
      if (op.type !== undefined) {
        if (!ROOM_TYPES.includes(op.type)) return fail(`type must be one of ${ROOM_TYPES.join(", ")}`);
        room.type = op.type;
      }
      if (op.floorFinish !== undefined) room.floorFinish = op.floorFinish;
      if (op.notes !== undefined) room.notes = op.notes;
      if (op.ceilingIn !== undefined) {
        if (op.ceilingIn === null) delete room.ceilingIn;
        else room.ceilingIn = op.ceilingIn;
      }
      return { ok: true, plan, summary: `✎ ${room.name} (${room.type})` };
    }
    case "remove_room": {
      const hit = findRoom(plan, op.roomId);
      if (!hit) return fail(`No room ${op.roomId}`);
      const { level, room } = hit;
      level.rooms = level.rooms.filter((r) => r.id !== room.id);
      const droppedOpenings = level.openings.filter((o) => o.roomId === room.id).length;
      level.openings = level.openings.filter((o) => o.roomId !== room.id);
      const droppedStairs = level.stairs.filter((s) => s.roomId === room.id).length;
      level.stairs = level.stairs.filter((s) => s.roomId !== room.id);
      // openings of neighbours may now span a corner — report, don't silently keep
      for (const o of level.openings) {
        const oe = checkOpening(plan, level, o);
        if (oe) return fail(`Removing "${room.name}" would leave ${o.kind} ${o.id} on a broken wall: ${oe}`);
      }
      return { ok: true, plan, summary: `− ${room.name}${droppedOpenings ? ` and ${droppedOpenings} opening(s)` : ""}${droppedStairs ? ` and ${droppedStairs} stair(s)` : ""}` };
    }
    case "add_opening": {
      const hit = findRoom(plan, op.roomId);
      if (!hit) return fail(`No room ${op.roomId}`);
      const { level, room } = hit;
      const walls = deriveWalls(level, s.exteriorWallIn, s.interiorWallIn);
      const exposure = sideExposure(level, room, op.side, walls);
      if (!["door", "window", "opening"].includes(op.kind)) return fail("kind must be door, window or opening (a cased opening with no door)");
      if (op.kind === "opening" && exposure !== "interior") return fail(`A cased opening on the ${op.side} side of "${room.name}" would be a hole in an exterior wall — use a door.`);
      const isDoor = op.kind === "door";
      const def = op.kind === "opening"
        ? STANDARD.casedOpening
        : isDoor
          ? exposure === "exterior" ? STANDARD.exteriorDoor : room.type === "closet" ? STANDARD.closetDoor : room.type === "bathroom" ? STANDARD.bathDoor : STANDARD.door
          : room.type === "bedroom" ? STANDARD.egressWindow : STANDARD.window;
      const o: Opening = {
        id: nextId("o", plan),
        kind: op.kind,
        roomId: room.id,
        side: op.side,
        offset: op.offset,
        width: op.width ?? def.width,
        height: op.height ?? def.height,
      };
      if (op.kind === "window") { o.sill = op.sill ?? ("sill" in def ? def.sill : STANDARD.window.sill); o.windowStyle = op.windowStyle ?? "single-hung"; }
      else if (isDoor) { o.swing = op.swing ?? "in"; o.hinge = op.hinge ?? "left"; o.doorStyle = op.doorStyle ?? "hinged"; }
      if (op.label) o.label = op.label;
      const e = checkOpening(plan, level, o);
      if (e) return fail(e);
      level.openings.push(o);
      return { ok: true, plan, summary: `+ ${o.kind} ${o.id} ${o.width}×${o.height} on ${room.name} ${o.side} @ ${o.offset} in${exposure === "exterior" ? " (exterior)" : ""}` };
    }
    case "move_opening": {
      const hit = findOpening(plan, op.openingId);
      if (!hit) return fail(`No opening ${op.openingId}`);
      const { level, opening } = hit;
      const next = { ...opening, side: op.side ?? opening.side, offset: op.offset ?? opening.offset, roomId: op.roomId ?? opening.roomId };
      if (op.roomId && !level.rooms.some((r) => r.id === op.roomId)) return fail(`Room ${op.roomId} is not on ${level.name}`);
      const e = checkOpening(plan, level, next, opening.id);
      if (e) return fail(e);
      Object.assign(opening, next);
      return { ok: true, plan, summary: `✎ ${opening.kind} ${opening.id} → ${level.rooms.find((r) => r.id === opening.roomId)?.name} ${opening.side} @ ${opening.offset} in` };
    }
    case "resize_opening": {
      const hit = findOpening(plan, op.openingId);
      if (!hit) return fail(`No opening ${op.openingId}`);
      const { level, opening } = hit;
      const next = { ...opening, width: op.width ?? opening.width, height: op.height ?? opening.height, sill: op.sill ?? opening.sill };
      const e = checkOpening(plan, level, next, opening.id);
      if (e) return fail(e);
      Object.assign(opening, next);
      return { ok: true, plan, summary: `✎ ${opening.kind} ${opening.id}: ${next.width}×${next.height}${opening.kind === "window" ? ` sill ${next.sill}` : ""}` };
    }
    case "set_opening": {
      const hit = findOpening(plan, op.openingId);
      if (!hit) return fail(`No opening ${op.openingId}`);
      const { opening } = hit;
      for (const k of ["swing", "hinge", "doorStyle", "windowStyle", "tempered", "label"] as const) {
        if (op[k] !== undefined) (opening as unknown as Record<string, unknown>)[k] = op[k];
      }
      return { ok: true, plan, summary: `✎ ${opening.kind} ${opening.id} details` };
    }
    case "remove_opening": {
      const hit = findOpening(plan, op.openingId);
      if (!hit) return fail(`No opening ${op.openingId}`);
      hit.level.openings = hit.level.openings.filter((o) => o.id !== op.openingId);
      return { ok: true, plan, summary: `− ${hit.opening.kind} ${hit.opening.id}` };
    }
    case "add_stair": {
      const hit = findRoom(plan, op.roomId);
      if (!hit) return fail(`No room ${op.roomId}`);
      const { level, room } = hit;
      const st: Stair = { id: nextId("s", plan), roomId: room.id, x: op.x, y: op.y, width: op.width ?? STANDARD.stairWidth, run: op.run, toLevelId: op.toLevelId, treadIn: op.treadIn ?? STANDARD.tread, shape: "straight" };
      const e = checkStair(plan, level, st);
      if (e) return fail(e);
      level.stairs.push(st);
      const m = stairMath(plan, level, st);
      return { ok: true, plan, summary: `+ stair ${st.id} in ${room.name}${m ? `: ${m.risers} risers @ ${m.riserIn.toFixed(2)} in, ${Math.round(m.runIn)} in run` : ""}` };
    }
    case "move_stair": {
      const hit = findStair(plan, op.stairId);
      if (!hit) return fail(`No stair ${op.stairId}`);
      const { level, stair } = hit;
      const next = { ...stair, x: op.x ?? stair.x, y: op.y ?? stair.y, run: op.run ?? stair.run, width: op.width ?? stair.width, roomId: op.roomId ?? stair.roomId };
      const e = checkStair(plan, level, next);
      if (e) return fail(e);
      Object.assign(stair, next);
      return { ok: true, plan, summary: `✎ stair ${stair.id}` };
    }
    case "remove_stair": {
      const hit = findStair(plan, op.stairId);
      if (!hit) return fail(`No stair ${op.stairId}`);
      hit.level.stairs = hit.level.stairs.filter((s) => s.id !== op.stairId);
      return { ok: true, plan, summary: `− stair ${op.stairId}` };
    }
  }
}

/** Apply several ops atomically: all succeed or the original plan is returned with the first error. */
export function applyOps(plan: HousePlan, ops: PlanOp[]): OpResult {
  let cur = plan;
  const summaries: string[] = [];
  for (const op of ops) {
    const r = applyOp(cur, op);
    if (!r.ok) return { ok: false, error: `${op.op}: ${r.error}` };
    cur = r.plan;
    summaries.push(r.summary);
  }
  return { ok: true, plan: cur, summary: summaries.join("; ") };
}

/** Whole-model sanity: rooms do not overlap, every opening sits on a wall, every stair fits. */
export function validatePlan(plan: HousePlan): string[] {
  const problems: string[] = [];
  for (const level of plan.levels) {
    for (const [a, b] of overlaps(level.rooms)) problems.push(`${level.name}: "${a.name}" overlaps "${b.name}"`);
    for (const o of level.openings) {
      const e = checkOpening(plan, level, o);
      if (e) problems.push(`${level.name}: ${e}`);
    }
    for (const st of level.stairs) {
      const e = checkStair(plan, level, st);
      if (e) problems.push(`${level.name}: ${e}`);
    }
    if (!footprint(level)) problems.push(`${level.name} has no rooms`);
  }
  return problems;
}

export const _test = { checkRoom, checkOpening, checkStair, counter: () => counter };
