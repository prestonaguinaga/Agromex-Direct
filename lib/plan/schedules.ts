import { deriveWalls, netDims, openingOnWall, roomArea } from "./geometry.ts";
import { netClearSqIn } from "./code.ts";
import { ftIn, sqft, type HousePlan, type Level, type Opening, type Room } from "./model.ts";

/**
 * Door, window and room schedules — the tables on a plan set. Marks (D1, W3)
 * are assigned deterministically so the drawing, the schedule and Bob agree.
 */

export interface DoorRow { mark: string; id: string; level: string; room: string; side: string; size: string; widthIn: number; heightIn: number; style: string; exterior: boolean; swing: string; notes: string }
export interface WindowRow { mark: string; id: string; level: string; room: string; side: string; size: string; widthIn: number; heightIn: number; sillIn: number; style: string; egress: boolean; tempered: boolean; netClearSqft: number; notes: string }
export interface OpeningRow { mark: string; id: string; level: string; room: string; side: string; size: string; widthIn: number; heightIn: number }
export interface RoomRow { id: string; level: string; name: string; type: string; net: string; areaSqft: number; ceiling: string; floorFinish: string; doors: number; windows: number }

export interface Schedules {
  doors: DoorRow[];
  windows: WindowRow[];
  openings: OpeningRow[];
  rooms: RoomRow[];
  /** opening id → mark */
  marks: Record<string, string>;
}

function sortOpenings(level: Level, os: Opening[]): Opening[] {
  const order = new Map(level.rooms.map((r, i) => [r.id, i]));
  const sideOrder: Record<string, number> = { N: 0, E: 1, S: 2, W: 3 };
  return [...os].sort((a, b) => (order.get(a.roomId) ?? 99) - (order.get(b.roomId) ?? 99) || sideOrder[a.side] - sideOrder[b.side] || a.offset - b.offset);
}

export function schedules(plan: HousePlan): Schedules {
  const doors: DoorRow[] = [], windows: WindowRow[] = [], openings: OpeningRow[] = [], rooms: RoomRow[] = [];
  const marks: Record<string, string> = {};
  let d = 0, w = 0, c = 0;
  for (const level of plan.levels) {
    const walls = deriveWalls(level, plan.settings.exteriorWallIn, plan.settings.interiorWallIn);
    const room = (id: string): Room | undefined => level.rooms.find((r) => r.id === id);
    for (const o of sortOpenings(level, level.openings)) {
      const r = room(o.roomId);
      if (!r) continue;
      const wall = openingOnWall(level, r, o, walls);
      const size = `${ftIn(o.width)} × ${ftIn(o.height)}`;
      if (o.kind === "door") {
        const mark = `D${++d}`;
        marks[o.id] = mark;
        doors.push({ mark, id: o.id, level: level.name, room: r.name, side: o.side, size, widthIn: o.width, heightIn: o.height, style: o.doorStyle ?? "hinged", exterior: Boolean(wall?.exterior), swing: o.doorStyle === "hinged" || !o.doorStyle ? `${o.swing ?? "in"}, ${o.hinge ?? "left"} hinge` : "—", notes: [wall?.exterior ? "exterior, insulated, weatherstripped" : "", o.label ?? ""].filter(Boolean).join("; ") });
      } else if (o.kind === "window") {
        const mark = `W${++w}`;
        marks[o.id] = mark;
        const nc = netClearSqIn(o);
        const isBed = r.type === "bedroom";
        const egress = isBed && nc.area >= 5.7 * 144 && nc.clearW >= 20 && nc.clearH >= 24 && (o.sill ?? 0) <= 44;
        windows.push({ mark, id: o.id, level: level.name, room: r.name, side: o.side, size, widthIn: o.width, heightIn: o.height, sillIn: o.sill ?? 0, style: o.windowStyle ?? "single-hung", egress, tempered: Boolean(o.tempered), netClearSqft: sqft(nc.area), notes: [egress ? "emergency escape" : "", o.tempered ? "tempered" : "", `U ≤ ${plan.settings.insulation.windowU}, SHGC ≤ ${plan.settings.insulation.windowShgc}`, o.label ?? ""].filter(Boolean).join("; ") });
      } else {
        const mark = `O${++c}`;
        marks[o.id] = mark;
        openings.push({ mark, id: o.id, level: level.name, room: r.name, side: o.side, size, widthIn: o.width, heightIn: o.height });
      }
    }
    for (const r of level.rooms) {
      const dims = netDims(level, r, walls);
      rooms.push({
        id: r.id,
        level: level.name,
        name: r.name,
        type: r.type,
        net: `${ftIn(dims.w)} × ${ftIn(dims.h)}`,
        areaSqft: sqft(roomArea(level, r, walls)),
        ceiling: ftIn(r.ceilingIn ?? level.ceilingIn),
        floorFinish: r.floorFinish ?? "",
        doors: level.openings.filter((o) => o.kind === "door" && o.roomId === r.id).length,
        windows: level.openings.filter((o) => o.kind === "window" && o.roomId === r.id).length,
      });
    }
  }
  return { doors, windows, openings, rooms, marks };
}
