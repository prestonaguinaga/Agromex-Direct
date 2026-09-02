import { test } from "node:test";
import assert from "node:assert/strict";
import { diffProject, isEmptyChangeSet, remapProjectIds, rowsToProject } from "./estimate-view.ts";
import type { Project } from "../types.ts";
import type { EstimateBundle } from "./estimate-view.ts";

const ESTIMATE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function sample(): Project {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Smith kitchen",
    type: "remodel",
    template: "kitchen",
    createdAt: 1,
    updatedAt: 1,
    info: {
      client: "J. Smith", phone: "", address: "", sqft: null, footprintSqft: null,
      stories: 1, ceilingFt: 9, bedrooms: null, bathrooms: null, roofPitch: "6/12", notes: "",
    },
    settings: { taxPct: 8.25, wastePct: 0, laborPct: 0, contingencyPct: 0 },
    sections: [
      {
        id: "s1", name: "Cabinets", items: [
          { id: "i1", name: "Drywall", qty: 10, unit: "sheet", done: false, activeOptionId: "o1",
            options: [{ id: "o1", label: "HD", url: "", unitPrice: 5 }] },
          { id: "i2", name: "Counter", qty: 2, unit: "sq ft", done: false, activeOptionId: "o2",
            options: [{ id: "o2", label: "Quartz", url: "", unitPrice: 100 }] },
        ],
      },
    ],
    plans: [],
    planNotes: "",
  };
}

test("no change → empty change set", () => {
  const p = sample();
  const cs = diffProject(p, structuredClone(p), ESTIMATE);
  assert.equal(isEmptyChangeSet(cs), true);
});

test("price edit → one option upsert, nothing else", () => {
  const prev = sample();
  const next = structuredClone(prev);
  next.sections[0].items[0].options[0].unitPrice = 6;
  const cs = diffProject(prev, next, ESTIMATE);
  assert.equal(cs.project, undefined);
  assert.equal(cs.estimate, undefined);
  assert.deepEqual(cs.sections, { upsert: [], delete: [] });
  assert.deepEqual(cs.items, { upsert: [], delete: [] });
  assert.equal(cs.options.upsert.length, 1);
  assert.equal(cs.options.upsert[0].id, "o1");
  assert.equal(cs.options.upsert[0].unit_price, 6);
});

test("removing an item deletes it and its option, and re-positions the rest", () => {
  const prev = sample();
  const next = structuredClone(prev);
  next.sections[0].items.splice(0, 1);
  const cs = diffProject(prev, next, ESTIMATE);
  assert.deepEqual(cs.items.delete, ["i1"]);
  assert.deepEqual(cs.options.delete, ["o1"]);
  // i2 moved from position 1 to 0
  assert.equal(cs.items.upsert.length, 1);
  assert.equal(cs.items.upsert[0].id, "i2");
  assert.equal(cs.items.upsert[0].position, 0);
});

test("settings and info changes land on the estimate / project patches", () => {
  const prev = sample();
  const next = structuredClone(prev);
  next.settings.taxPct = 7;
  next.info.client = "Jane Smith";
  next.info.sqft = 1800;
  next.planNotes = "Drive › Lot 14";
  const cs = diffProject(prev, next, ESTIMATE);
  assert.deepEqual(cs.estimate, { tax_pct: 7, sqft: 1800 });
  assert.deepEqual(cs.project, { client_name: "Jane Smith", plan_notes: "Drive › Lot 14" });
});

test("null prev → everything upserted (create / import)", () => {
  const p = sample();
  const cs = diffProject(null, p, ESTIMATE);
  assert.equal(cs.sections.upsert.length, 1);
  assert.equal(cs.items.upsert.length, 2);
  assert.equal(cs.options.upsert.length, 2);
  assert.equal(cs.project?.name, "Smith kitchen");
  assert.equal(cs.estimate?.tax_pct, 8.25);
  assert.equal(cs.items.delete.length + cs.sections.delete.length + cs.options.delete.length, 0);
});

test("rowsToProject rebuilds the same view model the diff produced", () => {
  const p = sample();
  const cs = diffProject(null, p, ESTIMATE);
  const bundle: EstimateBundle = {
    project: {
      id: p.id, company_id: "c", number: 1, name: p.name, type: "remodel", status: "estimating",
      template: "kitchen", client_name: "J. Smith", client_phone: "", client_email: "", address: "",
      notes: "", plan_notes: "", start_date: null, target_end_date: null, actual_end_date: null,
      progress_pct: 0, manager_id: null, manual_progress_pct: null, manual_progress_by: null,
      manual_progress_at: null, manual_progress_note: "",
      client_id: null, created_at: "1970-01-01T00:00:00.001Z", created_by: null,
      updated_at: "1970-01-01T00:00:00.001Z", updated_by: null, deleted_at: null,
    },
    estimate: {
      id: ESTIMATE, company_id: "c", project_id: p.id, version: 1, status: "draft",
      tax_pct: 8.25, waste_pct: 0, labor_pct: 0, contingency_pct: 0, sqft: null, footprint_sqft: null,
      stories: 1, ceiling_ft: 9, bedrooms: null, bathrooms: null, roof_pitch: "6/12",
      created_at: "", created_by: null, updated_at: "", updated_by: null, deleted_at: null,
    },
    // deliberately shuffled to prove ordering comes from `position`
    sections: cs.sections.upsert.map((s) => ({ ...s, company_id: "c", estimate_id: ESTIMATE, created_at: "", updated_at: "", updated_by: null })),
    items: [...cs.items.upsert].reverse().map((i) => ({ ...i, company_id: "c", estimate_id: ESTIMATE, created_at: "", updated_at: "", updated_by: null })),
    options: [...cs.options.upsert].reverse().map((o) => ({ ...o, company_id: "c", estimate_id: ESTIMATE, created_at: "", updated_at: "", updated_by: null })),
  };
  const rebuilt = rowsToProject(bundle);
  assert.deepEqual(rebuilt.sections, p.sections);
  assert.deepEqual(rebuilt.settings, p.settings);
  assert.deepEqual(rebuilt.info, p.info);
  assert.equal(isEmptyChangeSet(diffProject(rebuilt, p, ESTIMATE)), true);
});

test("remapProjectIds keeps the active option pointing at the remapped option", () => {
  let n = 0;
  const remapped = remapProjectIds(sample(), () => `new-${n++}`);
  const item = remapped.sections[0].items[0];
  assert.notEqual(item.id, "i1");
  assert.equal(item.activeOptionId, item.options[0].id);
});
