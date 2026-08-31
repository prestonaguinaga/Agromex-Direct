/**
 * Core data model. Everything lives in the browser (localStorage) — see
 * lib/store.ts — so these shapes are also the on-disk JSON export format.
 * Bump STORE_VERSION in store.ts if a breaking change is made here.
 */

export type ProjectType = "new-build" | "remodel";

/** One purchasable choice for a line item — e.g. "LVP" vs "Marble tile". */
export interface ItemOption {
  id: string;
  label: string;
  /** Product page link (Home Depot or anywhere). Empty string = none yet. */
  url: string;
  /** Price per `LineItem.unit`. null = not priced yet. */
  unitPrice: number | null;
  note?: string;
}

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  /** Every item has ≥1 option, even when there's only one link. */
  options: ItemOption[];
  /** Which option is priced into the totals. */
  activeOptionId: string | null;
  /** Checklist state. */
  done: boolean;
  note?: string;
}

export interface Section {
  id: string;
  name: string;
  collapsed?: boolean;
  items: LineItem[];
}

/** A plan/photo attached to the project, stored inline as a data URL. */
export interface PlanFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface ProjectInfo {
  client: string;
  phone: string;
  address: string;
  /** Total finished floor area (all stories). */
  sqft: number | null;
  /** Ground-floor footprint; used for slab, roof. */
  footprintSqft: number | null;
  stories: number;
  ceilingFt: number;
  bedrooms: number | null;
  bathrooms: number | null;
  /** e.g. "6/12" — used for the roof-area multiplier. */
  roofPitch: string;
  notes: string;
}

export interface QuoteSettings {
  /** Sales tax applied to the materials subtotal. */
  taxPct: number;
  /** Waste/overage cushion on materials. */
  wastePct: number;
  /** Labor & overhead as a % of materials (rough-quote mode). */
  laborPct: number;
  /** Contingency on the whole quote. */
  contingencyPct: number;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  /** Template id this project started from (see lib/templates.ts). */
  template: string;
  createdAt: number;
  updatedAt: number;
  info: ProjectInfo;
  settings: QuoteSettings;
  sections: Section[];
  plans: PlanFile[];
  planNotes: string;
}

/** Computed money rollup for a project — see lib/format.ts:computeTotals. */
export interface Totals {
  materials: number;
  waste: number;
  tax: number;
  labor: number;
  contingency: number;
  grand: number;
  pricedItems: number;
  unpricedItems: number;
  doneItems: number;
  totalItems: number;
  perSection: { id: string; name: string; total: number }[];
}
