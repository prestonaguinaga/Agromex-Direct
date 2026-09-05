import { applyOps, newPlan, type PlanOp } from "./ops.ts";
import type { HousePlan } from "./model.ts";

/**
 * A complete example plan — the 20×20 two-story guest house — built the
 * same way Bob builds one: a sequence of validated operations. Used by the
 * tests and as the worked example in the brief.
 *
 * Centerline footprint 233.5" (20'-0" outside face with 6.5" walls).
 * Level 1: stair hall along the west, living/kitchen, full bath.
 * Level 2: bedroom, closet, mechanical/laundry, open stair hall.
 */
export function guestHouse2020(): HousePlan {
  const F = 240 - 6.5; // 233.5
  const ops: PlanOp[] = [
    { op: "set_title", title: "20×20 Guest House", description: "Bedroom up; living/kitchen and full bath down. Slab on grade, 2×6 walls, 6/12 gable." },
    { op: "set_settings", settings: { address: "DFW, TX", jurisdiction: "City of —", foundation: "post-tension slab" } },
    { op: "add_level", name: "Level 1", ceilingIn: 96, floorStructureIn: 0 },
    { op: "add_level", name: "Level 2", ceilingIn: 96, floorStructureIn: 12 },
    // level 1
    { op: "add_room", levelId: "l1", name: "Stair Hall", type: "stair", x: 0, y: 0, w: 48, h: F },
    { op: "add_room", levelId: "l1", name: "Living", type: "living", x: 48, y: 0, w: F - 48, h: 140 },
    { op: "add_room", levelId: "l1", name: "Bath", type: "bathroom", x: 48, y: 140, w: 90, h: F - 140 },
    { op: "add_room", levelId: "l1", name: "Kitchen", type: "kitchen", x: 138, y: 140, w: F - 138, h: F - 140 },
    { op: "add_opening", roomId: "r2", kind: "door", side: "S", offset: 30, width: 36, label: "Entry" },
    { op: "add_opening", roomId: "r2", kind: "window", side: "S", offset: 100, width: 36, height: 48, sill: 30 },
    { op: "add_opening", roomId: "r2", kind: "window", side: "E", offset: 40, width: 36, height: 48, sill: 30 },
    { op: "add_opening", roomId: "r1", kind: "opening", side: "E", offset: 40, width: 60 },
    { op: "add_opening", roomId: "r3", kind: "door", side: "S", offset: 50, width: 28 },
    { op: "add_opening", roomId: "r3", kind: "window", side: "N", offset: 30, width: 24, height: 36, sill: 48 },
    { op: "add_opening", roomId: "r4", kind: "opening", side: "S", offset: 10, width: 72 },
    { op: "add_opening", roomId: "r4", kind: "window", side: "E", offset: 28, width: 36, height: 36, sill: 42 },
    { op: "add_stair", roomId: "r1", x: 6, y: 24, width: 36, run: "N", toLevelId: "l2" },
    // level 2
    { op: "add_room", levelId: "l2", name: "Stair Hall Up", type: "stair", x: 0, y: 0, w: 48, h: F },
    { op: "add_room", levelId: "l2", name: "Bedroom", type: "bedroom", x: 48, y: 0, w: F - 48, h: 160 },
    { op: "add_room", levelId: "l2", name: "Closet", type: "closet", x: 48, y: 160, w: 60, h: F - 160 },
    { op: "add_room", levelId: "l2", name: "Mechanical / Laundry", type: "laundry", x: 108, y: 160, w: F - 108, h: F - 160 },
    { op: "add_opening", roomId: "r6", kind: "door", side: "W", offset: 110, width: 32 },
    { op: "add_opening", roomId: "r6", kind: "window", side: "S", offset: 40, width: 36, height: 60, sill: 24 },
    { op: "add_opening", roomId: "r6", kind: "window", side: "E", offset: 50, width: 36, height: 48, sill: 30 },
    { op: "add_opening", roomId: "r7", kind: "door", side: "S", offset: 14, width: 30, doorStyle: "bifold" },
    { op: "add_opening", roomId: "r8", kind: "door", side: "S", offset: 12, width: 30 },
    { op: "add_opening", roomId: "r8", kind: "window", side: "N", offset: 40, width: 30, height: 36, sill: 48 },
  ];
  const r = applyOps(newPlan("20×20 Guest House"), ops);
  if (!r.ok) throw new Error(`fixture failed: ${r.error}`);
  return r.plan;
}
