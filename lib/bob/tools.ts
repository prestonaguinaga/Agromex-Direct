import type { ItemOption, LineItem, Project, Section } from "../types";
import { computeTotals, lineTotal, money, num, parseProductLink, uid } from "../format";
import {
  DEFAULT_INPUTS,
  estimateHouse,
  estimateTotal,
  estimateWall,
  linesToSections,
} from "../estimator";

/**
 * Bob tool layer. Every tool is a pure transition on Project — the chat
 * loop keeps a working copy, applies tools synchronously, and commits after
 * each round. Provider-neutral: the same specs are mapped to Anthropic and
 * OpenAI function-calling shapes in provider.ts.
 */

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolOutcome {
  project: Project;
  /** Fed back to the model as the tool result. */
  result: string;
  /** Human-readable change line for the chat transcript (null = read-only). */
  event: string | null;
}

const S = (props: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties: props,
  required,
  additionalProperties: false,
});

export const BOB_TOOLS: ToolSpec[] = [
  {
    name: "add_item",
    description:
      "Add a line item to the quote sheet. `section` may be an existing section's name or id (fuzzy-matched) or a new section name — it is created if missing. Give unit_price when the user stated one; for a lump sum use qty 1 and unit 'lot'.",
    input_schema: S(
      {
        section: { type: "string", description: "section name or id" },
        name: { type: "string" },
        qty: { type: "number" },
        unit: {
          type: "string",
          description: "ea, sq ft, lin ft, sheet, bundle, roll, bag, gal, lot…",
        },
        unit_price: { type: "number", description: "price per unit, USD" },
        url: { type: "string", description: "product link if the user gave one" },
        note: { type: "string" },
      },
      ["section", "name", "qty", "unit"],
    ),
  },
  {
    name: "update_item",
    description:
      "Update an existing line item by its id from the sheet snapshot. Only pass fields being changed. unit_price sets the price of the item's selected option. done marks the checklist state.",
    input_schema: S(
      {
        item_id: { type: "string" },
        name: { type: "string" },
        qty: { type: "number" },
        unit: { type: "string" },
        unit_price: { type: "number" },
        url: { type: "string" },
        note: { type: "string" },
        done: { type: "boolean" },
      },
      ["item_id"],
    ),
  },
  {
    name: "add_option",
    description:
      "Add an alternative product option to an existing item (e.g. a second flooring choice to compare). make_active selects it into the quote totals.",
    input_schema: S(
      {
        item_id: { type: "string" },
        label: { type: "string" },
        unit_price: { type: "number" },
        url: { type: "string" },
        make_active: { type: "boolean" },
      },
      ["item_id", "label"],
    ),
  },
  {
    name: "remove_item",
    description: "Delete a line item by id. Only when the user clearly asked.",
    input_schema: S({ item_id: { type: "string" } }, ["item_id"]),
  },
  {
    name: "add_section",
    description: "Add a new empty section to the sheet.",
    input_schema: S({ name: { type: "string" } }, ["name"]),
  },
  {
    name: "remove_section",
    description:
      "Delete a whole section (and its items) by name or id. Use when trimming a sheet down to the job's actual scope — but never delete a section holding priced work without the user asking.",
    input_schema: S({ section: { type: "string" } }, ["section"]),
  },
  {
    name: "set_settings",
    description:
      "Set quote-level percentages: sales tax, waste/overage, labor & overhead markup, contingency.",
    input_schema: S({
      tax_pct: { type: "number" },
      waste_pct: { type: "number" },
      labor_pct: { type: "number" },
      contingency_pct: { type: "number" },
    }),
  },
  {
    name: "set_project_info",
    description:
      "Update project facts: client, address, finished sq ft, footprint, stories, ceiling height, bedrooms, bathrooms, notes.",
    input_schema: S({
      client: { type: "string" },
      address: { type: "string" },
      sqft: { type: "number" },
      footprint_sqft: { type: "number" },
      stories: { type: "number" },
      ceiling_ft: { type: "number" },
      bedrooms: { type: "number" },
      bathrooms: { type: "number" },
      notes: { type: "string" },
    }),
  },
  {
    name: "estimate_house",
    description:
      "Run the whole-house materials takeoff from dimensions (16\" o.c. framing math, sheet goods, roofing by pitch, concrete…). Returns the itemized estimate with a low–high range. insert=true also writes it into the sheet as EST sections (replacing previous EST sections).",
    input_schema: S(
      {
        footprint_sqft: { type: "number", description: "ground-floor footprint" },
        stories: { type: "number" },
        ceiling_ft: { type: "number" },
        roof_pitch_rise: { type: "number", description: "4, 6, 8, 10 or 12 (rise per 12)" },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        slab_thickness_in: { type: "number", description: "0 = no slab" },
        insert: { type: "boolean", description: "write the estimate into the sheet" },
      },
      ["footprint_sqft", "stories", "insert"],
    ),
  },
  {
    name: "estimate_wall",
    description:
      "Quick single-wall takeoff: studs, plates, sheathing, drywall, insulation, paint for a wall of given length × height. insert=true adds it to the sheet as its own section.",
    input_schema: S(
      {
        length_ft: { type: "number" },
        height_ft: { type: "number" },
        exterior: { type: "boolean", description: "exterior wall (2x6, sheathing, insulation)" },
        drywall_both_sides: { type: "boolean" },
        insert: { type: "boolean" },
      },
      ["length_ft", "height_ft", "insert"],
    ),
  },
];

/* ── helpers ─────────────────────────────────────────────────────── */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findSection(p: Project, query: string): Section | null {
  const q = norm(query);
  return (
    p.sections.find((s) => s.id === query) ??
    p.sections.find((s) => norm(s.name) === q) ??
    p.sections.find((s) => norm(s.name).includes(q) || q.includes(norm(s.name))) ??
    null
  );
}

function findItem(p: Project, id: string): { section: Section; item: LineItem } | null {
  for (const section of p.sections)
    for (const item of section.items) if (item.id === id) return { section, item };
  return null;
}

function patchItem(
  p: Project,
  itemId: string,
  fn: (i: LineItem) => LineItem,
): Project {
  return {
    ...p,
    sections: p.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? fn(i) : i)),
    })),
  };
}

const fail = (project: Project, msg: string): ToolOutcome => ({
  project,
  result: `ERROR: ${msg}`,
  event: null,
});

/* ── executor ────────────────────────────────────────────────────── */

export function applyTool(
  project: Project,
  name: string,
  rawInput: unknown,
): ToolOutcome {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string) : undefined);
  const numIn = (k: string) => (typeof input[k] === "number" && Number.isFinite(input[k] as number) ? (input[k] as number) : undefined);
  const boolIn = (k: string) => (typeof input[k] === "boolean" ? (input[k] as boolean) : undefined);

  switch (name) {
    case "add_item": {
      const sectionQ = str("section");
      const itemName = str("name");
      if (!sectionQ || !itemName) return fail(project, "section and name are required");
      const qty = numIn("qty") ?? 1;
      const unit = str("unit") ?? "ea";
      const unitPrice = numIn("unit_price") ?? null;
      const rawUrl = str("url") ?? "";
      const parsed = rawUrl ? parseProductLink(rawUrl) : null;

      let p = project;
      let section = findSection(p, sectionQ);
      if (!section) {
        section = { id: uid(), name: sectionQ, items: [] };
        p = { ...p, sections: [...p.sections, section] };
      }
      const optId = uid();
      const item: LineItem = {
        id: uid(),
        name: itemName,
        qty,
        unit,
        options: [
          {
            id: optId,
            label: parsed?.store ?? "",
            url: parsed?.url ?? rawUrl,
            unitPrice,
          },
        ],
        activeOptionId: optId,
        done: false,
        note: str("note"),
      };
      p = {
        ...p,
        sections: p.sections.map((s) =>
          s.id === section!.id ? { ...s, items: [...s.items, item] } : s,
        ),
      };
      const priceTxt =
        unitPrice === null ? "unpriced" : `@ ${money(unitPrice)} = ${money(unitPrice * qty)}`;
      return {
        project: p,
        result: `Added item ${item.id} "${itemName}" (${num(qty)} ${unit}, ${priceTxt}) to section "${section.name}".`,
        event: `+ ${itemName} — ${num(qty)} ${unit} ${priceTxt} → ${section.name}`,
      };
    }

    case "update_item": {
      const id = str("item_id");
      if (!id) return fail(project, "item_id is required");
      const found = findItem(project, id);
      if (!found) return fail(project, `no item with id ${id} — check the sheet snapshot`);
      const changes: string[] = [];
      const p = patchItem(project, id, (i) => {
        let next = { ...i };
        const nm = str("name");
        if (nm !== undefined) { next.name = nm; changes.push(`name → ${nm}`); }
        const q = numIn("qty");
        if (q !== undefined) { next.qty = q; changes.push(`qty → ${num(q)}`); }
        const u = str("unit");
        if (u !== undefined) { next.unit = u; changes.push(`unit → ${u}`); }
        const nt = str("note");
        if (nt !== undefined) next.note = nt;
        const dn = boolIn("done");
        if (dn !== undefined) { next.done = dn; changes.push(dn ? "checked off" : "unchecked"); }
        const price = numIn("unit_price");
        const url = str("url");
        if (price !== undefined || url !== undefined) {
          const activeId = next.activeOptionId ?? next.options[0]?.id;
          next = {
            ...next,
            options: next.options.map((o) => {
              if (o.id !== activeId) return o;
              const parsed = url ? parseProductLink(url) : null;
              if (price !== undefined) changes.push(`price → ${money(price)}`);
              if (url !== undefined) changes.push("link set");
              return {
                ...o,
                unitPrice: price !== undefined ? price : o.unitPrice,
                url: url !== undefined ? (parsed?.url ?? url) : o.url,
                label: o.label || (parsed?.store ?? o.label),
              };
            }),
          };
        }
        return next;
      });
      const after = findItem(p, id)!;
      const total = lineTotal(after.item);
      return {
        project: p,
        result: `Updated "${after.item.name}": ${changes.join(", ") || "no changes"}. Line total now ${total === null ? "unpriced" : money(total)}.`,
        event: `✎ ${after.item.name} — ${changes.join(", ") || "no change"}`,
      };
    }

    case "add_option": {
      const id = str("item_id");
      const label = str("label");
      if (!id || !label) return fail(project, "item_id and label are required");
      const found = findItem(project, id);
      if (!found) return fail(project, `no item with id ${id}`);
      const rawUrl = str("url") ?? "";
      const parsed = rawUrl ? parseProductLink(rawUrl) : null;
      const opt: ItemOption = {
        id: uid(),
        label,
        url: parsed?.url ?? rawUrl,
        unitPrice: numIn("unit_price") ?? null,
      };
      const makeActive = boolIn("make_active") ?? false;
      const p = patchItem(project, id, (i) => ({
        ...i,
        options: [...i.options, opt],
        activeOptionId: makeActive ? opt.id : i.activeOptionId,
      }));
      return {
        project: p,
        result: `Added option "${label}" to "${found.item.name}"${makeActive ? " and selected it" : ""}.`,
        event: `⊕ ${found.item.name}: option "${label}"${makeActive ? " (selected)" : ""}`,
      };
    }

    case "remove_item": {
      const id = str("item_id");
      if (!id) return fail(project, "item_id is required");
      const found = findItem(project, id);
      if (!found) return fail(project, `no item with id ${id}`);
      const p = {
        ...project,
        sections: project.sections.map((s) => ({
          ...s,
          items: s.items.filter((i) => i.id !== id),
        })),
      };
      return {
        project: p,
        result: `Removed "${found.item.name}" from "${found.section.name}".`,
        event: `✕ removed ${found.item.name}`,
      };
    }

    case "add_section": {
      const nm = str("name");
      if (!nm) return fail(project, "name is required");
      const existing = findSection(project, nm);
      if (existing)
        return { project, result: `Section "${existing.name}" already exists (id ${existing.id}).`, event: null };
      const section: Section = { id: uid(), name: nm, items: [] };
      return {
        project: { ...project, sections: [...project.sections, section] },
        result: `Added section "${nm}" (id ${section.id}).`,
        event: `+ section ${nm}`,
      };
    }

    case "remove_section": {
      const q = str("section");
      if (!q) return fail(project, "section is required");
      const section = findSection(project, q);
      if (!section) return fail(project, `no section matching "${q}"`);
      const priced = section.items.filter((i) => (lineTotal(i) ?? 0) > 0).length;
      return {
        project: {
          ...project,
          sections: project.sections.filter((s) => s.id !== section.id),
        },
        result: `Removed section "${section.name}" (${section.items.length} items${priced ? `, ${priced} of them priced` : ""}).`,
        event: `✕ removed section ${section.name}`,
      };
    }

    case "set_settings": {
      const map: [string, keyof Project["settings"], string][] = [
        ["tax_pct", "taxPct", "sales tax"],
        ["waste_pct", "wastePct", "waste"],
        ["labor_pct", "laborPct", "labor & overhead"],
        ["contingency_pct", "contingencyPct", "contingency"],
      ];
      const changes: string[] = [];
      let settings = { ...project.settings };
      for (const [key, field, label] of map) {
        const v = numIn(key);
        if (v !== undefined) {
          settings = { ...settings, [field]: v };
          changes.push(`${label} ${v}%`);
        }
      }
      if (!changes.length) return fail(project, "no settings given");
      return {
        project: { ...project, settings },
        result: `Settings updated: ${changes.join(", ")}.`,
        event: `⚙ ${changes.join(", ")}`,
      };
    }

    case "set_project_info": {
      const info = { ...project.info };
      const changes: string[] = [];
      const sset = (k: string, f: () => void) => {
        if (input[k] !== undefined) { f(); changes.push(k.replace(/_/g, " ")); }
      };
      sset("client", () => (info.client = str("client") ?? info.client));
      sset("address", () => (info.address = str("address") ?? info.address));
      sset("sqft", () => (info.sqft = numIn("sqft") ?? info.sqft));
      sset("footprint_sqft", () => (info.footprintSqft = numIn("footprint_sqft") ?? info.footprintSqft));
      sset("stories", () => (info.stories = numIn("stories") ?? info.stories));
      sset("ceiling_ft", () => (info.ceilingFt = numIn("ceiling_ft") ?? info.ceilingFt));
      sset("bedrooms", () => (info.bedrooms = numIn("bedrooms") ?? info.bedrooms));
      sset("bathrooms", () => (info.bathrooms = numIn("bathrooms") ?? info.bathrooms));
      sset("notes", () => (info.notes = str("notes") ?? info.notes));
      if (!changes.length) return fail(project, "no fields given");
      return {
        project: { ...project, info },
        result: `Project info updated: ${changes.join(", ")}.`,
        event: `ℹ ${changes.join(", ")} updated`,
      };
    }

    case "estimate_house": {
      const footprint = numIn("footprint_sqft");
      const stories = numIn("stories");
      if (!footprint || !stories) return fail(project, "footprint_sqft and stories are required");
      const inputs = {
        ...DEFAULT_INPUTS,
        footprintSqft: footprint,
        stories,
        ceilingFt: numIn("ceiling_ft") ?? DEFAULT_INPUTS.ceilingFt,
        roofPitchRise: numIn("roof_pitch_rise") ?? DEFAULT_INPUTS.roofPitchRise,
        bedrooms: numIn("bedrooms") ?? DEFAULT_INPUTS.bedrooms,
        bathrooms: numIn("bathrooms") ?? DEFAULT_INPUTS.bathrooms,
        slabThicknessIn: numIn("slab_thickness_in") ?? DEFAULT_INPUTS.slabThicknessIn,
      };
      const lines = estimateHouse(inputs);
      const range = estimateTotal(lines);
      const summary = lines
        .map((l) => `${l.section} | ${l.name}: ${num(l.qty)} ${l.unit} (${money(l.lowUnit)}–${money(l.highUnit)}/${l.unit})`)
        .join("\n");
      const insert = boolIn("insert") ?? false;
      let p = project;
      if (insert) {
        p = {
          ...p,
          sections: [
            ...p.sections.filter((s) => !s.name.startsWith("EST — ")),
            ...linesToSections(lines),
          ],
          info: { ...p.info, footprintSqft: footprint, stories },
        };
      }
      return {
        project: p,
        result: `Whole-house takeoff (${num(footprint)} sf footprint × ${stories} stories): materials ${money(range.low)}–${money(range.high)}.\n${summary}${insert ? "\nInserted into the sheet as EST sections." : ""}`,
        event: insert
          ? `⌂ takeoff inserted — ${money(range.low)}–${money(range.high)} materials`
          : null,
      };
    }

    case "estimate_wall": {
      const lengthFt = numIn("length_ft");
      const heightFt = numIn("height_ft");
      if (!lengthFt || !heightFt) return fail(project, "length_ft and height_ft are required");
      const w = {
        lengthFt,
        heightFt,
        exterior: boolIn("exterior") ?? false,
        bothSides: boolIn("drywall_both_sides") ?? true,
      };
      const lines = estimateWall(w);
      const range = estimateTotal(lines);
      const summary = lines
        .map((l) => `${l.name}: ${num(l.qty)} ${l.unit} (${money(l.lowUnit)}–${money(l.highUnit)}/${l.unit})`)
        .join("\n");
      const insert = boolIn("insert") ?? false;
      let p = project;
      if (insert) {
        const [section] = linesToSections(lines);
        section.name = `EST — Wall ${lengthFt}×${heightFt}`;
        p = { ...p, sections: [...p.sections, section] };
      }
      return {
        project: p,
        result: `Wall ${lengthFt}×${heightFt} ft (${w.exterior ? "exterior" : "interior"}): materials ${money(range.low)}–${money(range.high)}.\n${summary}${insert ? "\nAdded to the sheet." : ""}`,
        event: insert ? `⌐ wall ${lengthFt}×${heightFt} added — ${money(range.low)}–${money(range.high)}` : null,
      };
    }

    default:
      return fail(project, `unknown tool ${name}`);
  }
}

/* ── sheet snapshot for the model ────────────────────────────────── */

export function sheetSnapshot(project: Project): string {
  const t = computeTotals(project);
  const lines: string[] = [];
  lines.push(
    `PROJECT "${project.name}" — ${project.type === "new-build" ? "new build" : "remodel"}`,
  );
  const inf = project.info;
  const infoBits = [
    inf.client && `client ${inf.client}`,
    inf.address && `at ${inf.address}`,
    inf.sqft && `${num(inf.sqft)} finished sf`,
    inf.footprintSqft && `${num(inf.footprintSqft)} sf footprint`,
    `${inf.stories} stories`,
    inf.bedrooms && `${inf.bedrooms} bed`,
    inf.bathrooms && `${inf.bathrooms} bath`,
  ].filter(Boolean);
  lines.push(`INFO: ${infoBits.join(", ")}`);
  for (const s of project.sections) {
    const secTotal = s.items.reduce((a, i) => a + (lineTotal(i) ?? 0), 0);
    lines.push(`SECTION "${s.name}" [${s.id}] — ${money(secTotal)}`);
    for (const i of s.items) {
      const active = i.options.find((o) => o.id === i.activeOptionId) ?? i.options[0];
      const price = active?.unitPrice;
      const extra = i.options.length > 1 ? ` (+${i.options.length - 1} alt options)` : "";
      lines.push(
        `  [${i.id}] ${i.name} — ${num(i.qty)} ${i.unit} @ ${price == null ? "UNPRICED" : money(price)}${i.done ? " ✓done" : ""}${extra}`,
      );
    }
  }
  lines.push(
    `TOTALS: materials ${money(t.materials)}; waste ${project.settings.wastePct}%, tax ${project.settings.taxPct}%, labor ${project.settings.laborPct}%, contingency ${project.settings.contingencyPct}%; GRAND ${money(t.grand)}; ${t.unpricedItems} items unpriced.`,
  );
  return lines.join("\n");
}
