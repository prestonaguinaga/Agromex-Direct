/**
 * The bridge between the estimator's in-memory Project (lib/types.ts — the
 * shape every existing component and Bob tool already works on) and the
 * normalised rows in Supabase.
 *
 *   rows  ──rowsToProject──▶  Project view model  ──diffProject──▶  ChangeSet
 *
 * A ChangeSet is what apply_estimate_changes() takes: minimal upserts and
 * deletes keyed on the ids the client generated, so the same set can be sent
 * twice without creating duplicates. Pure functions; unit-tested in
 * estimate-view.test.ts with plain `node --test`.
 */
import type { ItemOption, LineItem, Project, Section } from "../types";
import type {
  EstimateItemOptionRow,
  EstimateItemRow,
  EstimateRow,
  EstimateSectionRow,
  ProjectRow,
} from "./database.types";

export interface EstimateBundle {
  project: ProjectRow;
  estimate: EstimateRow;
  sections: EstimateSectionRow[];
  items: EstimateItemRow[];
  options: EstimateItemOptionRow[];
}

export interface SectionUpsert {
  id: string;
  name: string;
  position: number;
}
export interface ItemUpsert {
  id: string;
  section_id: string;
  name: string;
  qty: number;
  unit: string;
  done: boolean;
  note: string | null;
  active_option_id: string | null;
  position: number;
}
export interface OptionUpsert {
  id: string;
  item_id: string;
  label: string;
  url: string;
  unit_price: number | null;
  note: string | null;
  position: number;
}

export interface ProjectPatch {
  name?: string;
  type?: Project["type"];
  template?: string | null;
  client_name?: string;
  client_phone?: string;
  address?: string;
  notes?: string;
  plan_notes?: string;
}
export interface EstimatePatch {
  tax_pct?: number;
  waste_pct?: number;
  labor_pct?: number;
  contingency_pct?: number;
  sqft?: number | null;
  footprint_sqft?: number | null;
  stories?: number;
  ceiling_ft?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  roof_pitch?: string;
}

export interface ChangeSet {
  estimate_id: string;
  project?: ProjectPatch;
  estimate?: EstimatePatch;
  sections: { upsert: SectionUpsert[]; delete: string[] };
  items: { upsert: ItemUpsert[]; delete: string[] };
  options: { upsert: OptionUpsert[]; delete: string[] };
}

const num = (v: number | string | null | undefined, fallback = 0): number => {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined ? null : num(v);
const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Assemble the estimator's Project from database rows. */
export function rowsToProject(b: EstimateBundle): Project {
  const optionsByItem = new Map<string, ItemOption[]>();
  for (const o of [...b.options].sort(byPosition)) {
    const list = optionsByItem.get(o.item_id) ?? [];
    list.push({
      id: o.id,
      label: o.label ?? "",
      url: o.url ?? "",
      unitPrice: numOrNull(o.unit_price),
      ...(o.note ? { note: o.note } : {}),
    });
    optionsByItem.set(o.item_id, list);
  }

  const itemsBySection = new Map<string, LineItem[]>();
  for (const i of [...b.items].sort(byPosition)) {
    const list = itemsBySection.get(i.section_id) ?? [];
    const options = optionsByItem.get(i.id) ?? [];
    list.push({
      id: i.id,
      name: i.name ?? "",
      qty: num(i.qty, 1),
      unit: i.unit ?? "ea",
      options,
      activeOptionId: i.active_option_id ?? options[0]?.id ?? null,
      done: Boolean(i.done),
      ...(i.note ? { note: i.note } : {}),
    });
    itemsBySection.set(i.section_id, list);
  }

  const sections: Section[] = [...b.sections].sort(byPosition).map((s) => ({
    id: s.id,
    name: s.name ?? "",
    items: itemsBySection.get(s.id) ?? [],
  }));

  const p = b.project;
  const e = b.estimate;
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    template: p.template ?? "blank",
    createdAt: Date.parse(p.created_at),
    updatedAt: Date.parse(p.updated_at),
    info: {
      client: p.client_name ?? "",
      phone: p.client_phone ?? "",
      address: p.address ?? "",
      sqft: numOrNull(e.sqft),
      footprintSqft: numOrNull(e.footprint_sqft),
      stories: num(e.stories, 1),
      ceilingFt: num(e.ceiling_ft, 9),
      bedrooms: numOrNull(e.bedrooms),
      bathrooms: numOrNull(e.bathrooms),
      roofPitch: e.roof_pitch ?? "6/12",
      notes: p.notes ?? "",
    },
    settings: {
      taxPct: num(e.tax_pct, 8.25),
      wastePct: num(e.waste_pct),
      laborPct: num(e.labor_pct),
      contingencyPct: num(e.contingency_pct),
    },
    sections,
    plans: [],
    planNotes: p.plan_notes ?? "",
  };
}

function itemUpsert(item: LineItem, sectionId: string, position: number): ItemUpsert {
  return {
    id: item.id,
    section_id: sectionId,
    name: item.name,
    qty: num(item.qty, 1),
    unit: item.unit,
    done: Boolean(item.done),
    note: item.note ?? null,
    active_option_id: item.activeOptionId ?? item.options[0]?.id ?? null,
    position,
  };
}
function optionUpsert(o: ItemOption, itemId: string, position: number): OptionUpsert {
  return {
    id: o.id,
    item_id: itemId,
    label: o.label ?? "",
    url: o.url ?? "",
    unit_price: o.unitPrice === undefined ? null : o.unitPrice,
    note: o.note ?? null,
    position,
  };
}
const sameItem = (a: ItemUpsert, b: ItemUpsert) =>
  a.section_id === b.section_id &&
  a.name === b.name &&
  a.qty === b.qty &&
  a.unit === b.unit &&
  a.done === b.done &&
  a.note === b.note &&
  a.active_option_id === b.active_option_id &&
  a.position === b.position;
const sameOption = (a: OptionUpsert, b: OptionUpsert) =>
  a.item_id === b.item_id &&
  a.label === b.label &&
  a.url === b.url &&
  a.unit_price === b.unit_price &&
  a.note === b.note &&
  a.position === b.position;

/**
 * Minimal set of row operations that turns `prev` into `next`. With `prev`
 * null everything is an upsert (used when creating or importing a project).
 */
export function diffProject(prev: Project | null, next: Project, estimateId: string): ChangeSet {
  const cs: ChangeSet = {
    estimate_id: estimateId,
    sections: { upsert: [], delete: [] },
    items: { upsert: [], delete: [] },
    options: { upsert: [], delete: [] },
  };

  // ── project / estimate scalar patches ─────────────────────────────────
  const pp: ProjectPatch = {};
  const ep: EstimatePatch = {};
  const setIf = <T extends object, K extends keyof T>(obj: T, key: K, a: T[K], b: T[K]) => {
    if (prev === null || a !== b) obj[key] = b;
  };
  setIf(pp, "name", prev?.name, next.name);
  setIf(pp, "type", prev?.type, next.type);
  setIf(pp, "template", prev?.template ?? null, next.template ?? null);
  setIf(pp, "client_name", prev?.info.client, next.info.client);
  setIf(pp, "client_phone", prev?.info.phone, next.info.phone);
  setIf(pp, "address", prev?.info.address, next.info.address);
  setIf(pp, "notes", prev?.info.notes, next.info.notes);
  setIf(pp, "plan_notes", prev?.planNotes, next.planNotes);
  setIf(ep, "tax_pct", prev?.settings.taxPct, next.settings.taxPct);
  setIf(ep, "waste_pct", prev?.settings.wastePct, next.settings.wastePct);
  setIf(ep, "labor_pct", prev?.settings.laborPct, next.settings.laborPct);
  setIf(ep, "contingency_pct", prev?.settings.contingencyPct, next.settings.contingencyPct);
  setIf(ep, "sqft", prev?.info.sqft, next.info.sqft);
  setIf(ep, "footprint_sqft", prev?.info.footprintSqft, next.info.footprintSqft);
  setIf(ep, "stories", prev?.info.stories, next.info.stories);
  setIf(ep, "ceiling_ft", prev?.info.ceilingFt, next.info.ceilingFt);
  setIf(ep, "bedrooms", prev?.info.bedrooms, next.info.bedrooms);
  setIf(ep, "bathrooms", prev?.info.bathrooms, next.info.bathrooms);
  setIf(ep, "roof_pitch", prev?.info.roofPitch, next.info.roofPitch);
  if (Object.keys(pp).length) cs.project = pp;
  if (Object.keys(ep).length) cs.estimate = ep;

  // ── index the previous state by id ────────────────────────────────────
  const prevSections = new Map<string, SectionUpsert>();
  const prevItems = new Map<string, ItemUpsert>();
  const prevOptions = new Map<string, OptionUpsert>();
  prev?.sections.forEach((s, si) => {
    prevSections.set(s.id, { id: s.id, name: s.name, position: si });
    s.items.forEach((it, ii) => {
      prevItems.set(it.id, itemUpsert(it, s.id, ii));
      it.options.forEach((o, oi) => prevOptions.set(o.id, optionUpsert(o, it.id, oi)));
    });
  });

  // ── walk the next state ───────────────────────────────────────────────
  const seenSections = new Set<string>();
  const seenItems = new Set<string>();
  const seenOptions = new Set<string>();
  next.sections.forEach((s, si) => {
    seenSections.add(s.id);
    const su: SectionUpsert = { id: s.id, name: s.name, position: si };
    const ps = prevSections.get(s.id);
    if (!ps || ps.name !== su.name || ps.position !== su.position) cs.sections.upsert.push(su);
    s.items.forEach((it, ii) => {
      seenItems.add(it.id);
      const iu = itemUpsert(it, s.id, ii);
      const pi = prevItems.get(it.id);
      if (!pi || !sameItem(pi, iu)) cs.items.upsert.push(iu);
      it.options.forEach((o, oi) => {
        seenOptions.add(o.id);
        const ou = optionUpsert(o, it.id, oi);
        const po = prevOptions.get(o.id);
        if (!po || !sameOption(po, ou)) cs.options.upsert.push(ou);
      });
    });
  });

  for (const id of prevSections.keys()) if (!seenSections.has(id)) cs.sections.delete.push(id);
  for (const id of prevItems.keys()) if (!seenItems.has(id)) cs.items.delete.push(id);
  for (const id of prevOptions.keys()) if (!seenOptions.has(id)) cs.options.delete.push(id);

  return cs;
}

export function isEmptyChangeSet(cs: ChangeSet): boolean {
  return (
    !cs.project &&
    !cs.estimate &&
    cs.sections.upsert.length === 0 &&
    cs.sections.delete.length === 0 &&
    cs.items.upsert.length === 0 &&
    cs.items.delete.length === 0 &&
    cs.options.upsert.length === 0 &&
    cs.options.delete.length === 0
  );
}

/** Give every entity in a Project a fresh UUID (used when importing or duplicating). */
export function remapProjectIds(p: Project, newId: () => string): Project {
  return {
    ...p,
    id: newId(),
    sections: p.sections.map((s) => ({
      ...s,
      id: newId(),
      items: s.items.map((it) => {
        const optionIds = new Map(it.options.map((o) => [o.id, newId()]));
        return {
          ...it,
          id: newId(),
          options: it.options.map((o) => ({ ...o, id: optionIds.get(o.id)! })),
          activeOptionId: it.activeOptionId ? (optionIds.get(it.activeOptionId) ?? null) : null,
        };
      }),
    })),
  };
}

/**
 * Carry per-user UI state (collapsed sections) from the previous view model
 * onto a freshly fetched one so a remote change doesn't reset the screen.
 */
export function carryUiState(prev: Project | null, fresh: Project): Project {
  if (!prev) return fresh;
  const collapsed = new Map(prev.sections.map((s) => [s.id, s.collapsed]));
  return {
    ...fresh,
    sections: fresh.sections.map((s) =>
      collapsed.get(s.id) ? { ...s, collapsed: true } : s,
    ),
  };
}
