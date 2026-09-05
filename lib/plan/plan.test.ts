import { test } from "node:test";
import assert from "node:assert/strict";
import { codeCheck, netClearSqIn } from "./code.ts";
import { deriveWalls, footprint, overallDims, planTotals, stairMath } from "./geometry.ts";
import { guestHouse2020 } from "./fixtures.ts";
import { ftIn } from "./model.ts";
import { applyOp, applyOps, newPlan, validatePlan } from "./ops.ts";
import { levelDxf, planDxf } from "./dxf.ts";
import { levelSvg } from "./svg.ts";
import { schedules } from "./schedules.ts";

test("ftIn formats architecturally, to the nearest eighth", () => {
  assert.equal(ftIn(240), `20'-0"`);
  assert.equal(ftIn(137.5), `11'-5½"`);
  assert.equal(ftIn(233.5), `19'-5½"`);
  assert.equal(ftIn(51.25), `4'-3¼"`);
  assert.equal(ftIn(98.75), `8'-2¾"`);
  assert.equal(ftIn(143.25), `11'-11¼"`);
  assert.equal(ftIn(11.99), `1'-0"`);
});

test("the guest house fixture builds, tiles its footprint and reads 20'-0\" outside", () => {
  const plan = guestHouse2020();
  assert.equal(plan.levels.length, 2);
  assert.deepEqual(validatePlan(plan), []);
  const l1 = plan.levels[0];
  const f = footprint(l1)!;
  assert.equal(f.w, 233.5);
  const o = overallDims(l1, plan.settings.exteriorWallIn)!;
  assert.equal(o.w, 240);
  assert.equal(ftIn(o.w), `20'-0"`);
});

test("walls derive from room edges: exterior around, interior where rooms meet", () => {
  const plan = guestHouse2020();
  const l1 = plan.levels[0];
  const walls = deriveWalls(l1, 6.5, 4.5);
  const ext = walls.filter((w) => w.exterior);
  const int = walls.filter((w) => !w.exterior);
  // four exterior sides, each possibly split where an interior wall meets it
  assert.ok(ext.length >= 4, `exterior segments: ${ext.length}`);
  for (const w of ext) assert.equal(w.roomIds.length, 1);
  for (const w of int) assert.equal(w.roomIds.length, 2);
  // the hall/living wall is interior and 140 long
  const hallLiving = int.find((w) => w.roomIds.includes("r1") && w.roomIds.includes("r2"));
  assert.ok(hallLiving);
  assert.equal(hallLiving!.by - hallLiving!.ay, 140);
});

test("rooms cannot overlap; openings cannot run past a side or sit on a corner", () => {
  const plan = guestHouse2020();
  const overlap = applyOp(plan, { op: "add_room", levelId: "l1", name: "Pantry", type: "other", x: 100, y: 100, w: 60, h: 60 });
  assert.equal(overlap.ok, false);
  assert.match((overlap as { error: string }).error, /overlap/);

  const tooFar = applyOp(plan, { op: "add_opening", roomId: "r3", kind: "window", side: "N", offset: 80, width: 36 });
  assert.equal(tooFar.ok, false);
  assert.match((tooFar as { error: string }).error, /runs past/);

  // a window on the bath's S side would look into the living room
  const interiorWindow = applyOp(plan, { op: "add_opening", roomId: "r3", kind: "window", side: "S", offset: 10, width: 24 });
  assert.equal(interiorWindow.ok, false);
  assert.match((interiorWindow as { error: string }).error, /interior wall/);

  // the hall's E side meets living AND bath — an opening spanning the join is refused
  const corner = applyOp(plan, { op: "add_opening", roomId: "r1", kind: "opening", side: "E", offset: 120, width: 40 });
  assert.equal(corner.ok, false);
  assert.match((corner as { error: string }).error, /corner|two different rooms/);
});

test("resizing a room that would strand an opening or a stair is refused, not half-applied", () => {
  const plan = guestHouse2020();
  const shrink = applyOp(plan, { op: "resize_room", roomId: "r2", w: 120 });
  assert.equal(shrink.ok, false); // the S window at offset 100 no longer fits
  const stairRoom = applyOp(plan, { op: "resize_room", roomId: "r1", h: 120 });
  assert.equal(stairRoom.ok, false);
  assert.match((stairRoom as { error: string }).error, /stair/i);
  // and the original is untouched
  assert.equal(plan.levels[0].rooms.find((r) => r.id === "r2")!.w, 233.5 - 48);
});

test("stair math: 8 ft ceiling + 12 in floor → 14 risers under 7¾ in", () => {
  const plan = guestHouse2020();
  const l1 = plan.levels[0];
  const m = stairMath(plan, l1, l1.stairs[0])!;
  assert.equal(m.floorToFloorIn, 108);
  assert.equal(m.risers, 14);
  assert.ok(m.riserIn <= 7.75);
  assert.equal(m.runIn, 130);
});

test("code check: the fixture has no fails; a fixed window loses bedroom egress", () => {
  const plan = guestHouse2020();
  const r = codeCheck(plan);
  assert.deepEqual(r.items.filter((i) => i.severity === "fail").map((i) => i.message), []);
  assert.ok(r.passes.some((p) => /Bedroom: window .* emergency escape/.test(p)));

  const fixed = applyOps(plan, [
    { op: "set_opening", openingId: "o10", windowStyle: "fixed" },
    { op: "set_opening", openingId: "o11", windowStyle: "fixed" },
  ]);
  assert.equal(fixed.ok, true);
  const r2 = codeCheck((fixed as { plan: typeof plan }).plan);
  assert.ok(r2.items.some((i) => i.severity === "fail" && i.ref.startsWith("IRC R310")));
});

test("code check: envelope and egress-door rules fire", () => {
  const p = guestHouse2020();
  const weak = applyOp(p, { op: "set_settings", settings: { insulation: { ...p.settings.insulation, wallR: 13 } } });
  assert.equal(weak.ok, true);
  const r = codeCheck((weak as { plan: typeof p }).plan);
  assert.ok(r.items.some((i) => i.ref === "IECC R402.1.3" && /R-13/.test(i.message)));

  const noDoor = applyOp(p, { op: "remove_opening", openingId: "o1" });
  assert.equal(noDoor.ok, true);
  const r2 = codeCheck((noDoor as { plan: typeof p }).plan);
  assert.ok(r2.items.some((i) => i.ref === "IRC R311.2"));
});

test("net clear opening math is conservative and style-aware", () => {
  const sh = netClearSqIn({ id: "x", kind: "window", roomId: "r", side: "S", offset: 0, width: 36, height: 60, windowStyle: "single-hung" });
  assert.ok(sh.area / 144 >= 5.7, `single-hung 36×60 → ${sh.area / 144} sq ft`);
  const fixed = netClearSqIn({ id: "x", kind: "window", roomId: "r", side: "S", offset: 0, width: 36, height: 60, windowStyle: "fixed" });
  assert.equal(fixed.area, 0);
});

test("schedules assign stable marks and rooms report net size", () => {
  const s = schedules(guestHouse2020());
  assert.equal(s.doors[0].mark, "D1");
  assert.ok(s.windows.length >= 5);
  assert.ok(s.windows.some((w) => w.egress && w.room === "Bedroom"));
  const bath = s.rooms.find((r) => r.name === "Bath")!;
  assert.ok(bath.areaSqft > 40 && bath.areaSqft < 60, `bath ${bath.areaSqft} sf`);
});

test("totals feed the takeoff: 800 sf-ish floor, real wall LF", () => {
  const t = planTotals(guestHouse2020());
  assert.equal(t.levels, 2);
  assert.ok(t.footprintSqft > 395 && t.footprintSqft < 405, `footprint ${t.footprintSqft}`);
  assert.ok(t.floorAreaSqft > 650 && t.floorAreaSqft < 800, `floor area ${t.floorAreaSqft}`);
  assert.ok(t.extWallLf > 150 && t.extWallLf < 160, `ext wall LF ${t.extWallLf}`);
  assert.equal(t.bedrooms, 1);
  assert.equal(t.bathrooms, 1);
});

test("DXF is a valid R12 document with layers, entities and an EOF", () => {
  const plan = guestHouse2020();
  const dxf = levelDxf(plan, "l1")!;
  assert.match(dxf, /AC1009/);
  assert.match(dxf, /\r\n2\r\nA-WALL\r\n/);
  assert.ok((dxf.match(/\r\n0\r\nLINE\r\n/g) ?? []).length > 40);
  assert.equal((dxf.match(/\r\n0\r\nARC\r\n/g) ?? []).length, 2, "two hinged doors on level 1 → two swing arcs");
  assert.match(dxf, /\r\n0\r\nEOF\r\n$/);
  const all = planDxf(plan);
  assert.ok(all.length > dxf.length);
});

test("SVG renders every level with the rooms labelled", () => {
  const plan = guestHouse2020();
  const svg = levelSvg(plan, "l2")!;
  assert.match(svg, /^<svg /);
  assert.match(svg, /BEDROOM/);
  assert.match(svg, /W\d/);
  assert.equal(levelSvg(plan, "nope"), null);
});

test("an empty plan draws a placeholder rather than throwing", () => {
  const p = applyOp(newPlan("Empty"), { op: "add_level" });
  assert.equal(p.ok, true);
  const svg = levelSvg((p as { plan: ReturnType<typeof newPlan> }).plan, "l1")!;
  assert.match(svg, /no rooms yet/);
});
