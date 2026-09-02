/**
 * Built-in construction phases and their checklists. These ship with the app;
 * the company can also author its own templates (checklist_templates tables).
 * Applying a phase's checklist to a project creates a task list linked to the
 * phase, so completing items moves both the phase and the project along.
 */

export interface PhaseTemplate {
  key: string;
  name: string;
  /** Rough share of a typical build, used only for planning hints. */
  share: number;
}

export interface ChecklistTemplate {
  key: string;
  name: string;
  phaseKey: string;
  items: { title: string; trade: string }[];
}

export const STANDARD_PHASES: PhaseTemplate[] = [
  { key: "preconstruction", name: "Preconstruction", share: 4 },
  { key: "sitework", name: "Sitework", share: 5 },
  { key: "foundation", name: "Foundation", share: 9 },
  { key: "framing", name: "Framing", share: 15 },
  { key: "roofing", name: "Roofing", share: 5 },
  { key: "mep_rough", name: "MEP Rough", share: 12 },
  { key: "insulation", name: "Insulation", share: 3 },
  { key: "drywall", name: "Drywall", share: 7 },
  { key: "interior_finish", name: "Interior Finish", share: 20 },
  { key: "exterior", name: "Exterior", share: 10 },
  { key: "final_inspections", name: "Final Inspections", share: 3 },
  { key: "punch_list", name: "Punch List", share: 5 },
  { key: "complete", name: "Complete", share: 2 },
];

export const TRADES = [
  "General",
  "Sitework",
  "Concrete",
  "Framing",
  "Roofing",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Insulation",
  "Drywall",
  "Painting",
  "Flooring",
  "Tile",
  "Cabinets",
  "Countertops",
  "Windows & Doors",
  "Siding",
  "Trim",
  "Landscaping",
  "Cleaning",
  "Inspection",
  "Other",
] as const;

const item = (title: string, trade: string = "General") => ({ title, trade });

export const BUILTIN_CHECKLISTS: ChecklistTemplate[] = [
  {
    key: "preconstruction",
    name: "Preconstruction",
    phaseKey: "preconstruction",
    items: [
      item("Contract signed"),
      item("Building permits pulled"),
      item("Plans and engineering approved"),
      item("Survey and site staking"),
      item("Utilities located (811 call)"),
      item("Temporary power and portable toilet on site"),
      item("Dumpster on site"),
      item("Schedule reviewed with the client"),
    ],
  },
  {
    key: "sitework",
    name: "Sitework",
    phaseKey: "sitework",
    items: [
      item("Clearing and grubbing", "Sitework"),
      item("Erosion control in place", "Sitework"),
      item("Excavation to grade", "Sitework"),
      item("Utility trenches dug", "Sitework"),
      item("Gravel / base delivered and spread", "Sitework"),
      item("Rough grade complete", "Sitework"),
    ],
  },
  {
    key: "foundation",
    name: "Foundation",
    phaseKey: "foundation",
    items: [
      item("Footings formed", "Concrete"),
      item("Footing inspection passed", "Inspection"),
      item("Footings poured", "Concrete"),
      item("Stem walls / foundation walls complete", "Concrete"),
      item("Under-slab plumbing rough-in", "Plumbing"),
      item("Vapor barrier and mesh placed", "Concrete"),
      item("Slab poured", "Concrete"),
      item("Anchor bolts verified", "Concrete"),
      item("Foundation inspection passed", "Inspection"),
    ],
  },
  {
    key: "framing",
    name: "Framing",
    phaseKey: "framing",
    items: [
      item("Sill plates set", "Framing"),
      item("Floor system framed", "Framing"),
      item("Exterior walls framed", "Framing"),
      item("Interior walls framed", "Framing"),
      item("Roof trusses / rafters set", "Framing"),
      item("Wall and roof sheathing complete", "Framing"),
      item("Windows and exterior doors installed", "Windows & Doors"),
      item("Framing inspection passed", "Inspection"),
    ],
  },
  {
    key: "roofing",
    name: "Roofing",
    phaseKey: "roofing",
    items: [
      item("Underlayment and drip edge installed", "Roofing"),
      item("Flashing installed", "Roofing"),
      item("Shingles / roofing installed", "Roofing"),
      item("Ridge vent and penetrations sealed", "Roofing"),
      item("Gutters and downspouts installed", "Roofing"),
    ],
  },
  {
    key: "mep_rough",
    name: "MEP Rough",
    phaseKey: "mep_rough",
    items: [
      item("Plumbing rough-in complete", "Plumbing"),
      item("Electrical rough-in complete", "Electrical"),
      item("HVAC rough-in and ductwork complete", "HVAC"),
      item("Low-voltage rough-in complete", "Electrical"),
      item("Rough-in inspections passed", "Inspection"),
    ],
  },
  {
    key: "insulation",
    name: "Insulation",
    phaseKey: "insulation",
    items: [
      item("Air sealing complete", "Insulation"),
      item("Wall insulation installed", "Insulation"),
      item("Attic insulation installed", "Insulation"),
      item("Insulation inspection passed", "Inspection"),
    ],
  },
  {
    key: "drywall",
    name: "Drywall",
    phaseKey: "drywall",
    items: [
      item("Drywall hung", "Drywall"),
      item("Taped and mudded", "Drywall"),
      item("Sanded", "Drywall"),
      item("Primed", "Painting"),
    ],
  },
  {
    key: "interior_finish",
    name: "Interior Finish",
    phaseKey: "interior_finish",
    items: [
      item("Interior doors and trim installed", "Trim"),
      item("Cabinets set", "Cabinets"),
      item("Countertops installed", "Countertops"),
      item("Tile complete", "Tile"),
      item("Flooring installed", "Flooring"),
      item("Interior paint complete", "Painting"),
      item("Plumbing trim-out", "Plumbing"),
      item("Electrical trim-out", "Electrical"),
      item("HVAC trim-out", "HVAC"),
    ],
  },
  {
    key: "exterior",
    name: "Exterior",
    phaseKey: "exterior",
    items: [
      item("House wrap and flashing complete", "Siding"),
      item("Siding installed", "Siding"),
      item("Exterior trim and paint complete", "Painting"),
      item("Porches / decks complete", "Framing"),
      item("Driveway and walks poured", "Concrete"),
      item("Final grade and landscaping", "Landscaping"),
    ],
  },
  {
    key: "final_inspections",
    name: "Final Inspections",
    phaseKey: "final_inspections",
    items: [
      item("Final plumbing inspection", "Inspection"),
      item("Final electrical inspection", "Inspection"),
      item("Final mechanical inspection", "Inspection"),
      item("Final building inspection", "Inspection"),
      item("Certificate of occupancy issued", "Inspection"),
    ],
  },
  {
    key: "punch_list",
    name: "Punch List",
    phaseKey: "punch_list",
    items: [
      item("Client walkthrough completed"),
      item("Punch list items completed"),
      item("Final clean", "Cleaning"),
      item("Keys, manuals and warranties handed over"),
    ],
  },
  {
    key: "complete",
    name: "Complete",
    phaseKey: "complete",
    items: [
      item("Final payment received"),
      item("Project photos archived"),
      item("Lessons learned noted"),
    ],
  },
];

export function builtinChecklistFor(phaseKey: string | null | undefined): ChecklistTemplate | undefined {
  return BUILTIN_CHECKLISTS.find((c) => c.phaseKey === phaseKey);
}
