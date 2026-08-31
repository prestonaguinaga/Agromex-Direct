import type { Project, ProjectType, Section } from "./types";
import { uid } from "./format";

/**
 * Premade checklists a new project starts from. Items begin unpriced with a
 * single empty option — paste a product link and type the price to fill it.
 * Phase ordering and item coverage follow standard US construction sequence
 * (see /guide for the researched cost breakdown behind these).
 */

interface TemplateItem {
  name: string;
  unit: string;
  qty?: number;
  note?: string;
}

interface TemplateSection {
  name: string;
  items: TemplateItem[];
}

export interface Template {
  id: string;
  type: ProjectType;
  name: string;
  blurb: string;
  sections: TemplateSection[];
}

const NEW_BUILD: TemplateSection[] = [
  {
    name: "Pre-construction",
    items: [
      { name: "Building permits & fees", unit: "lot" },
      { name: "House plans / engineering", unit: "set" },
      { name: "Survey & site staking", unit: "lot" },
      { name: "Temporary power pole", unit: "ea" },
      { name: "Portable toilet rental", unit: "mo" },
      { name: "Dumpster rental", unit: "pull" },
    ],
  },
  {
    name: "Site work",
    items: [
      { name: "Clearing & excavation", unit: "lot" },
      { name: "Gravel / fill", unit: "ton" },
      { name: "Water & sewer / septic hookup", unit: "lot" },
      { name: "Utility trenching", unit: "lin ft" },
    ],
  },
  {
    name: "Foundation",
    items: [
      { name: "Footing concrete", unit: "cu yd" },
      { name: "Foundation wall / stem wall", unit: "cu yd" },
      { name: "Slab concrete", unit: "cu yd" },
      { name: "Rebar & wire mesh", unit: "ea" },
      { name: "Vapor barrier", unit: "roll" },
      { name: "Anchor bolts & hardware", unit: "box" },
      { name: "Foundation waterproofing", unit: "5-gal" },
    ],
  },
  {
    name: "Framing",
    items: [
      { name: "2×6 exterior studs", unit: "ea" },
      { name: "2×4 interior studs", unit: "ea" },
      { name: "Plate lumber", unit: "ea" },
      { name: "Headers / beams (LVL)", unit: "ea" },
      { name: "Floor joists / I-joists", unit: "ea" },
      { name: "3/4\" subfloor T&G", unit: "sheet" },
      { name: "Wall sheathing OSB", unit: "sheet" },
      { name: "Roof trusses", unit: "set" },
      { name: "Roof sheathing OSB", unit: "sheet" },
      { name: "Framing nails & hangers", unit: "box" },
    ],
  },
  {
    name: "Roofing",
    items: [
      { name: "Shingles", unit: "bundle" },
      { name: "Synthetic underlayment", unit: "roll" },
      { name: "Ice & water shield", unit: "roll" },
      { name: "Drip edge", unit: "ea" },
      { name: "Ridge vent & flashing", unit: "ea" },
    ],
  },
  {
    name: "Windows & exterior doors",
    items: [
      { name: "Windows", unit: "ea" },
      { name: "Front entry door", unit: "ea" },
      { name: "Back / side doors", unit: "ea" },
      { name: "Garage door", unit: "ea" },
    ],
  },
  {
    name: "Exterior finish",
    items: [
      { name: "House wrap", unit: "roll" },
      { name: "Siding", unit: "sq ft" },
      { name: "Fascia & soffit", unit: "lin ft" },
      { name: "Exterior trim & caulk", unit: "lot" },
      { name: "Gutters & downspouts", unit: "lin ft" },
    ],
  },
  {
    name: "Rough plumbing",
    items: [
      { name: "PEX supply lines & fittings", unit: "lot" },
      { name: "DWV pipe (drain/waste/vent)", unit: "lot" },
      { name: "Water heater", unit: "ea" },
      { name: "Tub/shower units (set at rough-in)", unit: "ea" },
    ],
  },
  {
    name: "Rough electrical",
    items: [
      { name: "Service panel & breakers", unit: "ea" },
      { name: "Romex wire", unit: "roll" },
      { name: "Boxes, outlets & switches", unit: "lot" },
      { name: "Recessed can lights", unit: "ea" },
      { name: "Low-voltage / data / smoke detectors", unit: "lot" },
    ],
  },
  {
    name: "HVAC",
    items: [
      { name: "Furnace / air handler", unit: "ea" },
      { name: "A/C condenser or heat pump", unit: "ea" },
      { name: "Ductwork & registers", unit: "lot" },
      { name: "Bath exhaust fans", unit: "ea" },
      { name: "Thermostat", unit: "ea" },
    ],
  },
  {
    name: "Insulation",
    items: [
      { name: "Wall batts (R-21)", unit: "sq ft" },
      { name: "Attic blown-in (R-38)", unit: "bag" },
      { name: "Rim joist / spray foam kit", unit: "kit" },
    ],
  },
  {
    name: "Drywall",
    items: [
      { name: "1/2\" drywall sheets", unit: "sheet" },
      { name: "Moisture-resistant board (baths)", unit: "sheet" },
      { name: "Joint compound", unit: "bucket" },
      { name: "Tape, screws & corner bead", unit: "lot" },
    ],
  },
  {
    name: "Interior trim & doors",
    items: [
      { name: "Interior doors (prehung)", unit: "ea" },
      { name: "Baseboard", unit: "lin ft" },
      { name: "Door & window casing", unit: "lin ft" },
      { name: "Closet shelving", unit: "lot" },
      { name: "Door hardware", unit: "ea" },
    ],
  },
  {
    name: "Kitchen & bath",
    items: [
      { name: "Kitchen cabinets", unit: "set" },
      { name: "Countertops", unit: "sq ft" },
      { name: "Kitchen sink & faucet", unit: "ea" },
      { name: "Bath vanities", unit: "ea" },
      { name: "Toilets", unit: "ea" },
      { name: "Tub / shower trim kits", unit: "ea" },
      { name: "Mirrors & bath accessories", unit: "lot" },
    ],
  },
  {
    name: "Flooring",
    items: [
      { name: "Main flooring", unit: "sq ft" },
      { name: "Tile (baths / entry)", unit: "sq ft" },
      { name: "Underlayment", unit: "roll" },
      { name: "Thinset & grout", unit: "bag" },
      { name: "Transitions & stair nosing", unit: "ea" },
    ],
  },
  {
    name: "Paint",
    items: [
      { name: "Primer", unit: "gal" },
      { name: "Wall paint", unit: "gal" },
      { name: "Ceiling paint", unit: "gal" },
      { name: "Trim paint", unit: "gal" },
      { name: "Exterior paint / stain", unit: "gal" },
    ],
  },
  {
    name: "Fixtures & appliances",
    items: [
      { name: "Light fixtures", unit: "ea" },
      { name: "Appliance package", unit: "set" },
      { name: "Bath faucets", unit: "ea" },
      { name: "Shelving & hardware", unit: "lot" },
    ],
  },
  {
    name: "Final / outdoor",
    items: [
      { name: "Driveway concrete / asphalt", unit: "sq ft" },
      { name: "Walkways & porch", unit: "sq ft" },
      { name: "Deck / patio", unit: "sq ft" },
      { name: "Landscaping & topsoil", unit: "lot" },
      { name: "Final clean", unit: "lot" },
    ],
  },
];

const KITCHEN_REMODEL: TemplateSection[] = [
  {
    name: "Prep & demo",
    items: [
      { name: "Permit (if moving plumbing/electrical)", unit: "lot" },
      { name: "Dumpster / debris removal", unit: "pull" },
      { name: "Floor & surface protection", unit: "roll" },
      { name: "Demo tools & bags", unit: "lot" },
    ],
  },
  {
    name: "Rough-in changes",
    items: [
      { name: "Plumbing relocation parts", unit: "lot" },
      { name: "Electrical — circuits & outlets", unit: "lot" },
      { name: "Under-cabinet lighting wiring", unit: "lot" },
      { name: "Vent hood ducting", unit: "lot" },
      { name: "Drywall patch & repair", unit: "sheet" },
    ],
  },
  {
    name: "Cabinets & counters",
    items: [
      { name: "Cabinets", unit: "set" },
      { name: "Cabinet hardware (pulls/knobs)", unit: "ea" },
      { name: "Countertops", unit: "sq ft" },
      { name: "Backsplash tile", unit: "sq ft" },
      { name: "Thinset & grout", unit: "bag" },
    ],
  },
  {
    name: "Fixtures & appliances",
    items: [
      { name: "Sink", unit: "ea" },
      { name: "Faucet", unit: "ea" },
      { name: "Garbage disposal", unit: "ea" },
      { name: "Range / cooktop", unit: "ea" },
      { name: "Refrigerator", unit: "ea" },
      { name: "Dishwasher", unit: "ea" },
      { name: "Vent hood / microwave", unit: "ea" },
      { name: "Light fixtures", unit: "ea" },
    ],
  },
  {
    name: "Finish",
    items: [
      { name: "Flooring", unit: "sq ft" },
      { name: "Paint & primer", unit: "gal" },
      { name: "Trim / baseboard", unit: "lin ft" },
      { name: "Caulk & touch-up", unit: "lot" },
    ],
  },
];

const BATH_REMODEL: TemplateSection[] = [
  {
    name: "Prep & demo",
    items: [
      { name: "Permit", unit: "lot" },
      { name: "Debris bags / disposal", unit: "lot" },
      { name: "Surface protection", unit: "roll" },
    ],
  },
  {
    name: "Rough-in",
    items: [
      { name: "Shower valve & plumbing parts", unit: "lot" },
      { name: "Cement backer board", unit: "sheet" },
      { name: "Waterproofing membrane", unit: "gal" },
      { name: "Electrical — GFCI, fan circuit", unit: "lot" },
      { name: "Exhaust fan", unit: "ea" },
    ],
  },
  {
    name: "Wet area",
    items: [
      { name: "Tub or shower base", unit: "ea" },
      { name: "Wall tile / surround", unit: "sq ft" },
      { name: "Floor tile", unit: "sq ft" },
      { name: "Thinset, grout & sealer", unit: "bag" },
      { name: "Shower door / rod", unit: "ea" },
      { name: "Trim kit (shower head, controls)", unit: "ea" },
    ],
  },
  {
    name: "Fixtures & finish",
    items: [
      { name: "Vanity & top", unit: "ea" },
      { name: "Faucet", unit: "ea" },
      { name: "Toilet", unit: "ea" },
      { name: "Mirror / medicine cabinet", unit: "ea" },
      { name: "Light fixture", unit: "ea" },
      { name: "Towel bars & accessories", unit: "set" },
      { name: "Paint (bath enamel)", unit: "gal" },
    ],
  },
];

const WHOLE_HOME_REMODEL: TemplateSection[] = [
  {
    name: "Prep & demo",
    items: [
      { name: "Permits", unit: "lot" },
      { name: "Dumpster rentals", unit: "pull" },
      { name: "Demo labor / tools", unit: "lot" },
      { name: "Surface protection", unit: "roll" },
    ],
  },
  {
    name: "Systems updates",
    items: [
      { name: "Electrical panel / rewire", unit: "lot" },
      { name: "Plumbing updates", unit: "lot" },
      { name: "HVAC replacement", unit: "system" },
      { name: "Water heater", unit: "ea" },
      { name: "Insulation top-up", unit: "bag" },
    ],
  },
  {
    name: "Walls & surfaces",
    items: [
      { name: "Framing changes (walls moved)", unit: "lot" },
      { name: "Drywall & finishing", unit: "sheet" },
      { name: "Interior doors", unit: "ea" },
      { name: "Trim & baseboard", unit: "lin ft" },
      { name: "Windows (replacement)", unit: "ea" },
    ],
  },
  {
    name: "Kitchen",
    items: [
      { name: "Cabinets", unit: "set" },
      { name: "Countertops", unit: "sq ft" },
      { name: "Appliance package", unit: "set" },
      { name: "Backsplash", unit: "sq ft" },
    ],
  },
  {
    name: "Bathrooms",
    items: [
      { name: "Bath remodel package (per bath)", unit: "bath" },
      { name: "Tile & waterproofing", unit: "sq ft" },
      { name: "Fixtures", unit: "set" },
    ],
  },
  {
    name: "Finish",
    items: [
      { name: "Flooring throughout", unit: "sq ft" },
      { name: "Paint & primer", unit: "gal" },
      { name: "Light fixtures", unit: "ea" },
      { name: "Hardware & accessories", unit: "lot" },
      { name: "Final clean", unit: "lot" },
    ],
  },
];

const BLANK: TemplateSection[] = [
  { name: "Materials", items: [{ name: "First item", unit: "ea" }] },
];

export const TEMPLATES: Template[] = [
  {
    id: "new-build",
    type: "new-build",
    name: "New build — full checklist",
    blurb: "17 phases in construction order, permits through final clean.",
    sections: NEW_BUILD,
  },
  {
    id: "kitchen",
    type: "remodel",
    name: "Kitchen remodel",
    blurb: "Demo → rough-in → cabinets & counters → appliances → finish.",
    sections: KITCHEN_REMODEL,
  },
  {
    id: "bath",
    type: "remodel",
    name: "Bathroom remodel",
    blurb: "Wet-area focus: waterproofing, tile, fixtures, finish.",
    sections: BATH_REMODEL,
  },
  {
    id: "whole-home",
    type: "remodel",
    name: "Whole-home remodel",
    blurb: "Systems, surfaces, kitchen, baths and finish in one sheet.",
    sections: WHOLE_HOME_REMODEL,
  },
  {
    id: "blank",
    type: "remodel",
    name: "Blank sheet",
    blurb: "Start from nothing and build your own list.",
    sections: BLANK,
  },
];

export function instantiateSections(t: Template): Section[] {
  return t.sections.map((s) => ({
    id: uid(),
    name: s.name,
    items: s.items.map((it) => {
      const optId = uid();
      return {
        id: uid(),
        name: it.name,
        qty: it.qty ?? 1,
        unit: it.unit,
        options: [{ id: optId, label: "", url: "", unitPrice: null }],
        activeOptionId: optId,
        done: false,
        note: it.note,
      };
    }),
  }));
}

export function createProject(opts: {
  name: string;
  type: ProjectType;
  templateId: string;
}): Project {
  const t = TEMPLATES.find((x) => x.id === opts.templateId) ?? TEMPLATES[TEMPLATES.length - 1];
  const now = Date.now();
  return {
    id: uid(),
    name: opts.name,
    type: opts.type,
    template: t.id,
    createdAt: now,
    updatedAt: now,
    info: {
      client: "",
      phone: "",
      address: "",
      sqft: null,
      footprintSqft: null,
      stories: 1,
      ceilingFt: 9,
      bedrooms: null,
      bathrooms: null,
      roofPitch: "6/12",
      notes: "",
    },
    settings: { taxPct: 8.25, wastePct: 0, laborPct: 0, contingencyPct: 0 },
    sections: instantiateSections(t),
    plans: [],
    planNotes: "",
  };
}
