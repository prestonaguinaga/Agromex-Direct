import "server-only";
import type { HousePlanRow, Json } from "../../../data/database.types";
import { uid } from "../../../format";
import { codeCheck, codeSummary } from "../../../plan/code";
import { levelDxf, planDxf } from "../../../plan/dxf";
import { deriveWalls, footprint, netDims, overallDims, planTotals, roomArea, stairMath } from "../../../plan/geometry";
import { ROOM_TYPES, SIDES, ftIn, sqft, type HousePlan } from "../../../plan/model";
import { STRUCTURAL_OPS, applyOps, newPlan, validatePlan, type PlanOp } from "../../../plan/ops";
import { schedules } from "../../../plan/schedules";
import { projectHref } from "../../routes";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, bool, schema, str, type Db, type ToolCtx, type ToolDef } from "../types";

/**
 * Bob's house-plan tools. The model is data (lib/plan); every change is a
 * validated operation; the drawing, schedules, code report and DXF are all
 * derived from it — so "move the bathroom window" changes one thing and
 * nothing else drifts. Saves name the version they read (save_house_plan
 * refuses stale writes), and every save writes an activity line.
 */

const OP_NAMES = [
  "add_level", "remove_level", "set_level",
  "add_room", "resize_room", "rename_room", "remove_room",
  "add_opening", "move_opening", "resize_opening", "set_opening", "remove_opening",
  "add_stair", "move_stair", "remove_stair",
  "set_roof", "set_settings", "set_title",
] as const;

const OPS_DOC = `Each op is an object with "op" and its fields (inches; ids from get_house_plan):
- add_level {name?, ceilingIn? (108 default level 1, 96 above), floorStructureIn? (0 slab, 12 upper)}
- set_level {levelId, name?, ceilingIn?, floorStructureIn?} · remove_level {levelId}
- add_room {levelId, name, type (${ROOM_TYPES.join("|")}), x, y, w, h, ceilingIn?, floorFinish?} — rectangles to wall centerlines; rooms must tile the footprint without overlapping
- resize_room {roomId, x?, y?, w?, h?} · rename_room {roomId, name?, type?, floorFinish?, notes?, ceilingIn?} · remove_room {roomId}
- add_opening {roomId, kind (door|window|opening), side (N|E|S|W), offset (from the room's W corner on N/S sides, S corner on E/W), width?, height?, sill?, swing? (in|out), hinge? (left|right), doorStyle? (hinged|sliding|pocket|bifold|barn), windowStyle? (single-hung|double-hung|casement|slider|fixed|awning), label?} — sensible defaults per room type; "opening" is a cased opening for open plans (interior walls only)
- move_opening {openingId, side?, offset?, roomId?} · resize_opening {openingId, width?, height?, sill?} · set_opening {openingId, swing?, hinge?, doorStyle?, windowStyle?, tempered?, label?} · remove_opening {openingId}
- add_stair {roomId, x, y (offset inside the room), width? (36), run (N|E|S|W, direction of travel going up), toLevelId, treadIn? (10)} · move_stair {stairId, x?, y?, run?, width?, roomId?} · remove_stair {stairId}
- set_roof {roof: {type? (gable|hip|shed|flat), pitchRise?, overhangIn?, ridge? (x|y)}}
- set_settings {settings: {address?, jurisdiction?, codeEdition?, exteriorWallIn?, interiorWallIn?, setbacksIn? {N?,E?,S?,W?}, insulation? {wallR?, ceilingR?, windowU?, windowShgc?}, foundation?, fuelBurning?, attachedGarage?}}
- set_title {title?, description?}`;

interface Loaded {
  row: HousePlanRow | null;
  plan: HousePlan | null;
  projectId: string;
  projectName: string;
}

async function loadPlan(ctx: ToolCtx, input: Record<string, unknown>): Promise<Loaded> {
  const s = await resolveProject(ctx, input);
  const { data, error } = await ctx.session.sb.from("house_plans").select("*").eq("project_id", s.id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  return { row: data, plan: data ? (data.model as unknown as HousePlan) : null, projectId: s.id, projectName: s.name };
}

async function savePlan(sb: Db, projectId: string, expectedVersion: number, plan: HousePlan, summary: string): Promise<HousePlanRow> {
  const report = codeCheck(plan);
  const { data, error } = await sb.rpc("save_house_plan", {
    p_project_id: projectId,
    p_expected_version: expectedVersion,
    p_model: plan as unknown as Json,
    p_title: plan.title,
    p_summary: summary,
    p_code_fails: report.fails,
    p_code_warns: report.warns,
    p_source: "bob",
  });
  if (error) {
    if (error.code === "40001" || error.code === "P0002") throw new ToolError(`${error.message}. Call get_house_plan and apply the change again.`);
    throw error;
  }
  return data as HousePlanRow;
}

function parseOps(input: Record<string, unknown>): PlanOp[] {
  const raw = input.ops;
  if (!Array.isArray(raw) || raw.length === 0) throw new ToolError("Give ops: a non-empty array of operations.");
  if (raw.length > 60) throw new ToolError("At most 60 operations per call — split the work.");
  return raw.map((o, i) => {
    if (!o || typeof o !== "object" || typeof (o as { op?: unknown }).op !== "string") throw new ToolError(`ops[${i}] must be an object with an "op" field`);
    const name = (o as { op: string }).op;
    if (!(OP_NAMES as readonly string[]).includes(name)) throw new ToolError(`ops[${i}]: unknown op "${name}". Known: ${OP_NAMES.join(", ")}`);
    return o as PlanOp;
  });
}

/** Compact, id-bearing view of the model for the model to reason over. */
function describe(plan: HousePlan, row: HousePlanRow | null) {
  const s = plan.settings;
  const sched = schedules(plan);
  const report = codeCheck(plan);
  const totals = planTotals(plan);
  return {
    version: row?.version ?? 0,
    title: plan.title,
    description: plan.description || null,
    settings: { address: s.address || null, jurisdiction: s.jurisdiction || null, code: `${s.codeEdition} IRC/IECC zone ${s.climateZone}`, exteriorWallIn: s.exteriorWallIn, interiorWallIn: s.interiorWallIn, foundation: s.foundation, setbacksIn: s.setbacksIn, insulation: s.insulation },
    roof: plan.roof,
    totals,
    levels: plan.levels.map((level) => {
      const walls = deriveWalls(level, s.exteriorWallIn, s.interiorWallIn);
      const f = footprint(level);
      const o = overallDims(level, s.exteriorWallIn);
      return {
        id: level.id,
        name: level.name,
        ceilingIn: level.ceilingIn,
        floorStructureIn: level.floorStructureIn,
        footprint_centerline: f ? { x: f.x, y: f.y, w: f.w, h: f.h } : null,
        overall_outside: o ? `${ftIn(o.w)} × ${ftIn(o.h)}` : null,
        rooms: level.rooms.map((r) => {
          const d = netDims(level, r, walls);
          return { id: r.id, name: r.name, type: r.type, x: r.x, y: r.y, w: r.w, h: r.h, net: `${ftIn(d.w)} × ${ftIn(d.h)}`, sqft: sqft(roomArea(level, r, walls)), ceilingIn: r.ceilingIn ?? level.ceilingIn, floorFinish: r.floorFinish ?? null };
        }),
        openings: level.openings.map((op) => ({ id: op.id, mark: sched.marks[op.id] ?? null, kind: op.kind, roomId: op.roomId, room: level.rooms.find((r) => r.id === op.roomId)?.name, side: op.side, offset: op.offset, width: op.width, height: op.height, sill: op.sill ?? null, style: op.doorStyle ?? op.windowStyle ?? null, swing: op.swing ?? null, hinge: op.hinge ?? null, tempered: op.tempered ?? false, label: op.label ?? null })),
        stairs: level.stairs.map((st) => {
          const m = stairMath(plan, level, st);
          return { id: st.id, roomId: st.roomId, x: st.x, y: st.y, width: st.width, run: st.run, toLevelId: st.toLevelId, treadIn: st.treadIn, math: m ? { floorToFloorIn: m.floorToFloorIn, risers: m.risers, riserIn: Math.round(m.riserIn * 100) / 100, runIn: m.runIn } : null };
        }),
      };
    }),
    schedules: { doors: sched.doors.length, windows: sched.windows.length, cased_openings: sched.openings.length, rooms: sched.rooms.length },
    code: { summary: codeSummary(report), fails: report.items.filter((i) => i.severity === "fail").map((i) => `${i.ref}: ${i.message}`), warns: report.items.filter((i) => i.severity === "warn").map((i) => `${i.ref}: ${i.message}`), must_show: report.items.filter((i) => i.severity === "info").map((i) => `${i.ref}: ${i.message}`) },
    model_problems: validatePlan(plan),
  };
}

/** Does the footprint of any level change? (the "structural" test for resize/add room) */
function footprintChanged(before: HousePlan, after: HousePlan): boolean {
  const key = (p: HousePlan) => p.levels.map((l) => { const f = footprint(l); return `${l.id}:${f ? `${f.x},${f.y},${f.w},${f.h}` : "-"}`; }).join("|");
  return key(before) !== key(after);
}

function needsConfirm(before: HousePlan, after: HousePlan, ops: PlanOp[]): string | null {
  const hard = ops.filter((o) => o.op === "remove_room" || o.op === "remove_level" || o.op === "add_level");
  if (hard.length) return hard.map((o) => o.op.replace("_", " ")).join(", ");
  if (ops.some((o) => STRUCTURAL_OPS.has(o.op)) && footprintChanged(before, after)) return "the building footprint changes";
  return null;
}

export const planTools: ToolDef[] = [
  {
    name: "get_house_plan",
    description:
      "Read the project's house plan model: every level with rooms (ids, centerline rectangles, net size, area), openings (ids, marks D1/W1, room, side, offset, size), stairs (with riser math), settings, roof, totals, schedules counts and the code-check report. ALWAYS call this before editing a plan and use the ids it returns — never guess an id or a position.",
    input_schema: schema({ ...PROJECT_PROPS }),
    requires: [],
    kind: "read",
    status: "reading the plan…",
    execute: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (!l.plan) return { data: { project: l.projectName, exists: false, hint: "No house plan yet. create_house_plan starts one." } };
      return { data: { project: l.projectName, exists: true, ...describe(l.plan, l.row) } };
    },
  },
  {
    name: "create_house_plan",
    description:
      `Start a project's house plan from a batch of operations — levels, rooms, openings, stairs — in one validated, atomic call (every op must succeed or nothing is saved). Design first: lay rooms out as centerline rectangles that tile the footprint (footprint = outside dimension − exterior wall thickness, e.g. 20'-0" outside with 6.5" walls → 233.5 in), stairs need run + 36 in landing, bedrooms need an egress window. The result reports the code check; fix fails with edit_house_plan. Only call this when the person clearly asked for a plan or layout to be created.\n${OPS_DOC}`,
    input_schema: schema({
      ...PROJECT_PROPS,
      title: { type: "string" },
      description: { type: "string" },
      ops: { type: "array", items: { type: "object" }, description: "Operations applied in order to an empty plan (start with add_level)." },
      settings: { type: "object", description: "Initial settings (address, jurisdiction, exteriorWallIn, insulation…)" },
    }, ["title", "ops"]),
    requires: ["plans.edit"],
    kind: "write",
    status: "drawing the plan…",
    execute: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (l.plan) throw new ToolError(`${l.projectName} already has a house plan (version ${l.row?.version}). Use edit_house_plan to change it, or remove its levels first.`);
      const title = str(input, "title") ?? `${l.projectName} plan`;
      const settings = (input.settings && typeof input.settings === "object" ? input.settings : {}) as Partial<HousePlan["settings"]>;
      let plan = newPlan(title, settings);
      if (str(input, "description")) plan.description = str(input, "description")!;
      const ops = parseOps(input);
      const r = applyOps(plan, ops);
      if (!r.ok) throw new ToolError(`The plan could not be built — nothing was saved. ${r.error}`);
      plan = r.plan;
      const problems = validatePlan(plan);
      if (problems.length) throw new ToolError(`The plan is not consistent — nothing was saved: ${problems.join("; ")}`);
      const row = await savePlan(ctx.session.sb, l.projectId, 0, plan, `Bob drew the house plan "${title}" (${plan.levels.length} level${plan.levels.length === 1 ? "" : "s"}, ${plan.levels.reduce((a, lv) => a + lv.rooms.length, 0)} rooms)`);
      const d = describe(plan, row);
      return {
        data: { success: true, project: l.projectName, ...d },
        event: `✎ drew the house plan "${title}" — ${d.code.summary}`,
        refresh: ["house_plans"],
        navigate: { href: projectHref(l.projectId, "plan"), label: `${l.projectName} · Plan` },
        projectId: l.projectId,
      };
    },
  },
  {
    name: "edit_house_plan",
    description:
      `Change the project's house plan with one or more operations, applied atomically and validated against the current model (an edit that would strand an opening, overlap a room or break a stair is refused with the reason, and nothing changes). Call get_house_plan first and use its ids. Removing rooms or levels, adding a level, or any change to the building footprint is structural and stops for the person's confirmation; windows, doors, room names/sizes inside the shell, stairs, roof and settings apply at once. The result includes the updated code check.\n${OPS_DOC}`,
    input_schema: schema({ ...PROJECT_PROPS, ops: { type: "array", items: { type: "object" } }, note: { type: "string", description: "Short reason, shown in Activity" } }, ["ops"]),
    requires: ["plans.edit"],
    kind: "write",
    status: "updating the plan…",
    guard: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (!l.plan || !l.row) return null; // execute will explain
      const ops = parseOps(input);
      const r = applyOps(l.plan, ops);
      if (!r.ok) return null; // execute will throw the same error
      const why = needsConfirm(l.plan, r.plan, ops);
      if (!why) return null;
      return {
        sensitivity: "other",
        preview: `Change the house plan of ${l.projectName} — ${why}: ${r.summary}`,
        projectId: l.projectId,
        input: { project_id: l.projectId, ops, note: str(input, "note") ?? "" },
      };
    },
    execute: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (!l.plan || !l.row) throw new ToolError(`${l.projectName} has no house plan yet — create_house_plan starts one.`);
      const ops = parseOps(input);
      const r = applyOps(l.plan, ops);
      if (!r.ok) throw new ToolError(`Not applied — ${r.error}`);
      const problems = validatePlan(r.plan);
      if (problems.length) throw new ToolError(`Not applied — the result would be inconsistent: ${problems.join("; ")}`);
      const note = str(input, "note");
      const row = await savePlan(ctx.session.sb, l.projectId, l.row.version, r.plan, `${r.summary}${note ? ` — ${note}` : ""}`);
      const d = describe(r.plan, row);
      return {
        data: { success: true, applied: ops.length, summary: r.summary, version: row.version, code: d.code, levels: d.levels, totals: d.totals },
        event: `✎ plan: ${r.summary}`,
        refresh: ["house_plans"],
        projectId: l.projectId,
      };
    },
  },
  {
    name: "check_house_plan",
    description: "Run the building-code check (2021 IRC / IECC zone 3A baseline) on the project's house plan and return every fail, warning and must-show item with its code reference, plus what passes. Zoning is not checked — it is per city; list it as a checklist for the address instead.",
    input_schema: schema({ ...PROJECT_PROPS }),
    requires: [],
    kind: "read",
    status: "checking the plan against code…",
    execute: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (!l.plan) throw new ToolError(`${l.projectName} has no house plan yet.`);
      const r = codeCheck(l.plan);
      return { data: { project: l.projectName, version: l.row?.version, summary: codeSummary(r), items: r.items, passes: r.passes, model_problems: validatePlan(l.plan) } };
    },
  },
  {
    name: "export_house_plan_dxf",
    description:
      "Write the house plan as DXF files into the project's Plans & files (one per level plus one with every level), at true scale in inches, on AIA layers (A-WALL, A-WALL-CNTR, A-DOOR, A-GLAZ, A-ANNO-DIMS…). The person imports these into Home Designer / Chief Architect and traces walls over A-WALL-CNTR. Returns the file names. Files replace earlier exports of the same plan version name.",
    input_schema: schema({ ...PROJECT_PROPS, combined_only: { type: "boolean", description: "Only the all-levels file" } }),
    requires: ["plans.edit", "files.upload"],
    kind: "write",
    status: "exporting the DXF…",
    execute: async (ctx, input) => {
      const l = await loadPlan(ctx, input);
      if (!l.plan || !l.row) throw new ToolError(`${l.projectName} has no house plan yet.`);
      if (!ctx.session.can("files.upload")) throw new ToolError("Your role can't upload files, so the DXF can't be saved to Plans & files.");
      const { sb, companyId, userId } = ctx.session;
      const plan = l.plan;
      const safe = plan.title.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "plan";
      const files: Array<{ name: string; content: string }> = [];
      if (!bool(input, "combined_only")) {
        for (const level of plan.levels) {
          const dxf = levelDxf(plan, level.id);
          if (dxf) files.push({ name: `${safe}-v${l.row.version}-${level.name.replace(/[^A-Za-z0-9._-]+/g, "-")}.dxf`, content: dxf });
        }
      }
      files.push({ name: `${safe}-v${l.row.version}-all-levels.dxf`, content: planDxf(plan) });
      const saved: string[] = [];
      for (const f of files) {
        const id = uid();
        const path = `${companyId}/${l.projectId}/${id}.dxf`;
        const bytes = Buffer.from(f.content, "utf8");
        const up = await sb.storage.from("plans").upload(path, bytes, { upsert: true, contentType: "application/dxf" });
        if (up.error) throw new ToolError(`Couldn't store ${f.name}: ${up.error.message}`);
        const { error } = await sb.from("files").insert({
          id, company_id: companyId, project_id: l.projectId, kind: "plan", bucket: "plans", storage_path: path, thumb_path: null,
          name: f.name, mime: "application/dxf", size_bytes: bytes.byteLength, width: null, height: null, taken_at: null,
          caption: `DXF export of house plan v${l.row.version} — ${plan.levels.length} level(s). Import as CAD and trace A-WALL-CNTR.`,
          uploaded_by: userId, phase_id: null, task_id: null, client_id: null,
        });
        if (error) throw error;
        saved.push(f.name);
      }
      return {
        data: { success: true, project: l.projectName, files: saved, hint: "Home Designer: File → Import → Import Drawing (DXF/DWG), units inches, then trace walls over the A-WALL-CNTR layer." },
        event: `↧ exported ${saved.length} DXF file${saved.length === 1 ? "" : "s"} to Plans & files`,
        refresh: ["files"],
        navigate: { href: projectHref(l.projectId, "files"), label: `${l.projectName} · Plans & files` },
        projectId: l.projectId,
      };
    },
  },
];

export const _internal = { OP_NAMES, SIDES };
