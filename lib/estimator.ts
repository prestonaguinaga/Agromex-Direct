import type { LineItem, Section } from "./types";
import { uid } from "./format";

/**
 * Material takeoff engine. Give it simple house dimensions and it produces
 * an itemized materials estimate using standard construction math:
 * 16" o.c. stud framing, 4x8/4x12 sheet goods, 350 sq ft/gal paint coverage,
 * roof-pitch area multipliers, 27 cu ft per yard of concrete, and per-item
 * waste factors. Unit prices are 2025–2026 US big-box store ranges
 * (verified against Home Depot/NAHB/HomeGuide data — see /guide).
 */

export interface EstimatorInputs {
  /** Ground-floor footprint in sq ft. */
  footprintSqft: number;
  stories: number;
  ceilingFt: number;
  /** Roof pitch as rise per 12" run: 4, 6, 8, 10, 12. */
  roofPitchRise: number;
  bedrooms: number;
  bathrooms: number;
  /** Slab thickness in inches (0 = crawlspace/basement, skip slab). */
  slabThicknessIn: number;
}

export const DEFAULT_INPUTS: EstimatorInputs = {
  footprintSqft: 1200,
  stories: 2,
  ceilingFt: 9,
  roofPitchRise: 6,
  bedrooms: 3,
  bathrooms: 2.5,
  slabThicknessIn: 4,
};

/** Multiplies roof footprint to get sloped surface area: sqrt(rise²+12²)/12. */
export function pitchMultiplier(rise: number): number {
  return Math.sqrt(rise * rise + 144) / 12;
}

export interface Derived {
  floorAreaSqft: number;
  /** Exterior wall perimeter per floor, with a non-square-plan correction. */
  perimeterFt: number;
  extWallLf: number;
  /** Interior partition walls ≈ 0.1 LF per finished sq ft (typical plans). */
  intWallLf: number;
  extWallAreaSqft: number;
  intWallAreaSqft: number;
  /** Both faces of interior walls + inside face of exterior + ceilings. */
  drywallAreaSqft: number;
  roofAreaSqft: number;
  roofSquares: number;
  windowCount: number;
  extDoorCount: number;
  intDoorCount: number;
  baseboardLf: number;
}

export function derive(i: EstimatorInputs): Derived {
  const floorAreaSqft = i.footprintSqft * i.stories;
  const perimeterFt = 4 * Math.sqrt(i.footprintSqft) * 1.05;
  const extWallLf = perimeterFt * i.stories;
  const intWallLf = floorAreaSqft * 0.1;
  const extWallAreaSqft = extWallLf * i.ceilingFt;
  const intWallAreaSqft = intWallLf * i.ceilingFt;
  const drywallAreaSqft =
    extWallAreaSqft + intWallAreaSqft * 2 + floorAreaSqft;
  const roofAreaSqft = i.footprintSqft * 1.1 * pitchMultiplier(i.roofPitchRise);
  const roofSquares = roofAreaSqft / 100;
  const windowCount = Math.max(6, Math.round(floorAreaSqft / 125));
  const extDoorCount = 3;
  const intDoorCount = Math.round(i.bedrooms * 2 + i.bathrooms + 3);
  const baseboardLf = floorAreaSqft * 0.4;
  return {
    floorAreaSqft,
    perimeterFt,
    extWallLf,
    intWallLf,
    extWallAreaSqft,
    intWallAreaSqft,
    drywallAreaSqft,
    roofAreaSqft,
    roofSquares,
    windowCount,
    extDoorCount,
    intDoorCount,
    baseboardLf,
  };
}

export interface EstLine {
  section: string;
  name: string;
  qty: number;
  unit: string;
  lowUnit: number;
  highUnit: number;
  formula: string;
}

const r = (n: number) => Math.ceil(n);

/** Full-house materials takeoff, grouped by build phase. */
export function estimateHouse(i: EstimatorInputs): EstLine[] {
  const d = derive(i);
  const lines: EstLine[] = [];
  const add = (
    section: string,
    name: string,
    qty: number,
    unit: string,
    lowUnit: number,
    highUnit: number,
    formula: string,
  ) => {
    if (qty > 0) lines.push({ section, name, qty, unit, lowUnit, highUnit, formula });
  };

  // ── Foundation ──────────────────────────────────────────────────────
  if (i.slabThicknessIn > 0) {
    const slabYd3 = (i.footprintSqft * (i.slabThicknessIn / 12)) / 27;
    add(
      "Foundation",
      `Ready-mix concrete, ${i.slabThicknessIn}" slab`,
      Math.ceil(slabYd3 * 1.1 * 10) / 10,
      "cu yd",
      140,
      185,
      "footprint × thickness ÷ 27, +10% waste",
    );
    add(
      "Foundation",
      "Wire mesh / rebar for slab",
      r((i.footprintSqft / 50) * 1.1),
      "sheet (50 sf)",
      25,
      40,
      "footprint ÷ 50 sf per 5×10 sheet, +10%",
    );
    add(
      "Foundation",
      "6-mil vapor barrier",
      r(i.footprintSqft / 1000),
      "roll",
      70,
      120,
      "footprint ÷ 1,000 sf per roll",
    );
  }

  // ── Framing ─────────────────────────────────────────────────────────
  add(
    "Framing",
    "2×6 exterior studs, 16\" o.c.",
    r(((d.extWallLf * 12) / 16) * 1.15),
    "ea",
    5.5,
    9,
    'ext wall LF × 12 ÷ 16" spacing, +15% corners/openings',
  );
  add(
    "Framing",
    "2×4 interior studs, 16\" o.c.",
    r(((d.intWallLf * 12) / 16) * 1.15),
    "ea",
    3.5,
    5,
    'int wall LF × 12 ÷ 16" spacing, +15%',
  );
  add(
    "Framing",
    "Plate lumber (1 bottom + 2 top)",
    r(((d.extWallLf + d.intWallLf) * 3) / 16),
    "16-ft board",
    8.5,
    16,
    "total wall LF × 3 plates ÷ 16-ft boards",
  );
  add(
    "Framing",
    "Wall sheathing, 7/16\" OSB 4×8",
    r((d.extWallAreaSqft / 32) * 1.1),
    "sheet",
    14,
    22,
    "ext wall area ÷ 32 sf, +10% waste",
  );
  if (i.stories > 1) {
    add(
      "Framing",
      "Floor system (I-joists + subfloor)",
      r(i.footprintSqft * (i.stories - 1)),
      "sq ft",
      6,
      10,
      "upper floor area × per-sf floor package",
    );
  }
  add(
    "Framing",
    "Roof trusses (engineered)",
    r(i.footprintSqft),
    "sq ft",
    4.5,
    8,
    "footprint × per-sf truss package",
  );
  add(
    "Framing",
    "Roof sheathing, 1/2\" OSB 4×8",
    r((d.roofAreaSqft / 32) * 1.1),
    "sheet",
    16,
    30,
    "roof area ÷ 32 sf, +10%",
  );

  // ── Exterior shell ──────────────────────────────────────────────────
  add(
    "Exterior",
    "House wrap",
    r(d.extWallAreaSqft / 900),
    "roll (900 sf)",
    150,
    225,
    "ext wall area ÷ 900 sf per roll",
  );
  add(
    "Exterior",
    "Siding (vinyl baseline)",
    r(d.extWallAreaSqft * 1.1),
    "sq ft",
    1.5,
    4,
    "ext wall area +10% waste — see /guide for upgrade tiers",
  );
  add(
    "Exterior",
    "Windows (vinyl, new-construction)",
    d.windowCount,
    "ea",
    200,
    500,
    "≈1 window per 125 sf of floor area",
  );
  add("Exterior", "Exterior doors", d.extDoorCount, "ea", 250, 800, "entry + back + garage-entry");
  add(
    "Roofing",
    "Architectural shingles",
    r(d.roofSquares * 3 * 1.1),
    "bundle",
    37,
    48,
    "3 bundles per square, +10% waste",
  );
  add(
    "Roofing",
    "Synthetic underlayment",
    r(d.roofAreaSqft / 1000),
    "roll (10 sq)",
    90,
    150,
    "roof area ÷ 1,000 sf per roll",
  );
  add(
    "Roofing",
    "Drip edge, 10-ft",
    r((d.perimeterFt * 1.15) / 10),
    "ea",
    7,
    12,
    "roof edge LF ÷ 10-ft sticks",
  );

  // ── Mechanicals (allowances) ────────────────────────────────────────
  add(
    "Mechanical",
    "Rough plumbing package",
    Math.round(i.bathrooms * 2) / 2,
    "bath",
    2000,
    5000,
    "materials allowance per bathroom (PEX, drains, vents)",
  );
  add(
    "Mechanical",
    "Rough electrical package",
    r(d.floorAreaSqft),
    "sq ft",
    2,
    4,
    "wire, boxes, panel, devices — per finished sf",
  );
  add(
    "Mechanical",
    "HVAC system + ductwork",
    Math.max(1, Math.round(d.floorAreaSqft / 2200)),
    "system",
    5000,
    12500,
    "1 system per ≈2,200 sf",
  );
  add(
    "Mechanical",
    "Water heater",
    1,
    "ea",
    600,
    1800,
    "tank baseline — tankless at the high end",
  );

  // ── Insulation ──────────────────────────────────────────────────────
  add(
    "Insulation",
    "R-21 wall batts",
    r(d.extWallAreaSqft * 1.05),
    "sq ft",
    0.8,
    1.4,
    "ext wall area +5%",
  );
  add(
    "Insulation",
    "R-38 blown-in attic (loose-fill bags)",
    r(i.footprintSqft / 50),
    "bag",
    30,
    42,
    "attic area ÷ ≈50 sf per bag at R-38 depth",
  );

  // ── Interior finish ─────────────────────────────────────────────────
  add(
    "Drywall",
    "1/2\" drywall 4×12",
    r((d.drywallAreaSqft / 48) * 1.1),
    "sheet",
    18,
    27,
    "wall+ceiling area ÷ 48 sf, +10%",
  );
  add(
    "Drywall",
    "Mud, tape & screws",
    r((d.drywallAreaSqft / 48) * 1.1),
    "per sheet",
    4,
    7,
    "≈$4–7 of finishing goods per 4×12 sheet",
  );
  add(
    "Paint",
    "Primer",
    r(d.drywallAreaSqft / 300),
    "gal",
    15,
    30,
    "area ÷ 300 sf per gallon",
  );
  add(
    "Paint",
    "Interior paint, 2 coats",
    r((d.drywallAreaSqft * 2) / 350),
    "gal",
    30,
    60,
    "area × 2 coats ÷ 350 sf/gal",
  );
  add(
    "Interior",
    "Interior doors (prehung)",
    d.intDoorCount,
    "ea",
    100,
    250,
    "bedrooms × 2 + baths + 3 (closets, etc.)",
  );
  add(
    "Interior",
    "Baseboard & casing",
    r(d.baseboardLf * 1.1),
    "lin ft",
    1.5,
    4,
    "≈0.4 LF per sf of floor, +10%",
  );
  add(
    "Flooring",
    "Flooring (LVP baseline)",
    r(d.floorAreaSqft * 1.08),
    "sq ft",
    2.5,
    5,
    "floor area +8% waste — see /guide for tiers",
  );
  add(
    "Kitchen & bath",
    "Kitchen cabinets (stock)",
    1,
    "kitchen",
    3500,
    9000,
    "stock-cabinet allowance — semi-custom doubles this",
  );
  add(
    "Kitchen & bath",
    "Countertops (quartz baseline)",
    r(Math.max(25, d.floorAreaSqft * 0.018)),
    "sq ft",
    50,
    100,
    "≈40–55 sf for a typical kitchen",
  );
  add(
    "Kitchen & bath",
    "Bath fixture set (tub/toilet/vanity/faucets)",
    Math.round(i.bathrooms * 2) / 2,
    "bath",
    1200,
    3500,
    "materials per full bath",
  );
  add(
    "Kitchen & bath",
    "Appliance package",
    1,
    "set",
    3000,
    8000,
    "range, fridge, dishwasher, microwave, hood",
  );

  return lines;
}

/** Single-wall quick calculator: the "wall is 10 ft × 10 ft" case. */
export interface WallInputs {
  lengthFt: number;
  heightFt: number;
  /** Finish drywall on both faces? (interior partition = true) */
  bothSides: boolean;
  exterior: boolean;
}

export function estimateWall(w: WallInputs): EstLine[] {
  const area = w.lengthFt * w.heightFt;
  const faces = w.bothSides ? 2 : 1;
  const lines: EstLine[] = [];
  lines.push({
    section: "Wall",
    name: w.exterior ? "2×6 studs, 16\" o.c." : "2×4 studs, 16\" o.c.",
    qty: r(((w.lengthFt * 12) / 16 + 1) * 1.15),
    unit: "ea",
    lowUnit: w.exterior ? 5.5 : 3,
    highUnit: w.exterior ? 9 : 5,
    formula: 'length × 12 ÷ 16" + 1, +15% for corners/openings',
  });
  lines.push({
    section: "Wall",
    name: "Plate lumber (1 bottom + 2 top)",
    qty: r((w.lengthFt * 3) / 16),
    unit: "16-ft board",
    lowUnit: w.exterior ? 13 : 8.5,
    highUnit: w.exterior ? 20 : 13,
    formula: "length × 3 ÷ 16-ft boards",
  });
  if (w.exterior) {
    lines.push({
      section: "Wall",
      name: "7/16\" OSB sheathing 4×8",
      qty: r((area / 32) * 1.1),
      unit: "sheet",
      lowUnit: 14,
      highUnit: 22,
      formula: "area ÷ 32 sf, +10%",
    });
    lines.push({
      section: "Wall",
      name: "R-21 insulation batts",
      qty: r(area * 1.05),
      unit: "sq ft",
      lowUnit: 0.8,
      highUnit: 1.4,
      formula: "area +5%",
    });
  }
  lines.push({
    section: "Wall",
    name: "1/2\" drywall 4×8",
    qty: r(((area * faces) / 32) * 1.1),
    unit: "sheet",
    lowUnit: 12,
    highUnit: 18,
    formula: `area × ${faces} face${faces > 1 ? "s" : ""} ÷ 32 sf, +10%`,
  });
  lines.push({
    section: "Wall",
    name: "Mud, tape & screws",
    qty: r(((area * faces) / 32) * 1.1),
    unit: "per sheet",
    lowUnit: 2.5,
    highUnit: 4.5,
    formula: "≈$2.50–4.50 per 4×8 sheet",
  });
  lines.push({
    section: "Wall",
    name: "Paint, 2 coats",
    qty: Math.max(1, r((area * faces * 2) / 350)),
    unit: "gal",
    lowUnit: 30,
    highUnit: 60,
    formula: "area × coats ÷ 350 sf/gal",
  });
  return lines;
}

export function estimateTotal(lines: EstLine[]): { low: number; high: number } {
  return lines.reduce(
    (acc, l) => ({
      low: acc.low + l.qty * l.lowUnit,
      high: acc.high + l.qty * l.highUnit,
    }),
    { low: 0, high: 0 },
  );
}

/** Convert estimate lines into real quote sections ready to insert. */
export function linesToSections(lines: EstLine[]): Section[] {
  const bySection = new Map<string, LineItem[]>();
  for (const l of lines) {
    const mid = Math.round(((l.lowUnit + l.highUnit) / 2) * 100) / 100;
    const optId = uid();
    const item: LineItem = {
      id: uid(),
      name: l.name,
      qty: l.qty,
      unit: l.unit,
      options: [
        {
          id: optId,
          label: "Estimated — replace with a real product link",
          url: "",
          unitPrice: mid,
          note: l.formula,
        },
      ],
      activeOptionId: optId,
      done: false,
      note: `Est. range ${l.lowUnit}–${l.highUnit}/${l.unit}`,
    };
    const list = bySection.get(l.section) ?? [];
    list.push(item);
    bySection.set(l.section, list);
  }
  return [...bySection.entries()].map(([name, items]) => ({
    id: uid(),
    name: `EST — ${name}`,
    items,
  }));
}
