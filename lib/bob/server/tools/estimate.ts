import "server-only";
import type { Json } from "../../../data/database.types";
import { diffProject, isEmptyChangeSet, rowsToProject } from "../../../data/estimate-view";
import { lineTotal } from "../../../format";
import type { Project } from "../../../types";
import { deletePreview } from "../../guard";
import { BOB_TOOLS, applyTool, sheetSnapshot, type ToolSpec } from "../../tools";
import { loadEstimateBundle } from "../data";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, bool, schema, str, type GuardOutcome, type ToolCtx, type ToolDef } from "../types";

/**
 * The estimator tools Bob has always had, now run on the server against the
 * database: load the sheet as the person, apply the pure transition, write
 * the minimal diff through apply_estimate_changes() (RLS-checked, audited),
 * and tell the open screen to refresh.
 */

const ESTIMATE_TABLES = ["projects", "estimates", "estimate_sections", "estimate_items", "estimate_item_options"];
const QUESTION_TOOLS = new Set(["estimate_house", "estimate_wall"]);

async function loadSheet(ctx: ToolCtx, input: Record<string, unknown>) {
  const s = await resolveProject(ctx, input);
  const bundle = await loadEstimateBundle(ctx.session.sb, s.id);
  if (!bundle) throw new ToolError(`${s.name} has no estimate sheet yet (or your role can't see it).`);
  return { s, bundle, project: rowsToProject(bundle) };
}

function stripProject(input: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...input };
  delete rest.project_id;
  delete rest.project;
  return rest;
}

function withProjectProps(spec: ToolSpec): Record<string, unknown> {
  const s = spec.input_schema as { properties?: Record<string, unknown>; required?: string[] };
  return schema({ ...(s.properties ?? {}), ...PROJECT_PROPS }, s.required ?? []);
}

function pricedOrChecked(p: Project, itemId: string): boolean {
  for (const sec of p.sections) for (const i of sec.items) if (i.id === itemId) return i.done || (lineTotal(i) ?? 0) > 0;
  return false;
}

async function guardRemoval(ctx: ToolCtx, input: Record<string, unknown>, name: string): Promise<GuardOutcome | null> {
  const { s, project } = await loadSheet(ctx, input);
  if (name === "remove_item") {
    const id = str(input, "item_id") ?? "";
    const item = project.sections.flatMap((x) => x.items).find((i) => i.id === id);
    if (!item) throw new ToolError(`No item with id ${id} — check the sheet snapshot.`);
    if (!pricedOrChecked(project, id)) return null;
    return { sensitivity: "delete", preview: `${deletePreview("estimate line", item.name)} from ${s.name} (${item.done ? "checked off" : "priced"})`, projectId: s.id, input: { project_id: s.id, item_id: id } };
  }
  const q = str(input, "section") ?? "";
  const section = project.sections.find((x) => x.id === q) ?? project.sections.find((x) => x.name.toLowerCase() === q.toLowerCase()) ?? project.sections.find((x) => x.name.toLowerCase().includes(q.toLowerCase()));
  if (!section) throw new ToolError(`No section matching "${q}".`);
  const priced = section.items.filter((i) => i.done || (lineTotal(i) ?? 0) > 0).length;
  if (priced === 0) return null;
  return { sensitivity: "delete", preview: `Delete section "${section.name}" (${section.items.length} items, ${priced} priced or checked off) from ${s.name}`, projectId: s.id, input: { project_id: s.id, section: section.id } };
}

function wrap(spec: ToolSpec): ToolDef {
  const isQuestion = QUESTION_TOOLS.has(spec.name);
  const removal = spec.name === "remove_item" || spec.name === "remove_section";
  return {
    name: spec.name,
    description: `${spec.description} Works on the project's estimate sheet (current project by default).`,
    input_schema: withProjectProps(spec),
    requires: isQuestion ? ["estimates.view"] : ["estimates.edit"],
    kind: isQuestion ? "read" : "write",
    status: isQuestion ? "running the takeoff…" : "editing the estimate sheet…",
    ...(removal ? { guard: (ctx: ToolCtx, input: Record<string, unknown>) => guardRemoval(ctx, input, spec.name) } : {}),
    execute: async (ctx, input) => {
      const { s, bundle, project } = await loadSheet(ctx, input);
      const out = applyTool(project, spec.name, stripProject(input));
      if (out.result.startsWith("ERROR:")) throw new ToolError(out.result.slice(6).trim());
      const mutated = out.event !== null;
      if (mutated && (isQuestion ? bool(input, "insert") : true) && !ctx.session.can("estimates.edit")) {
        throw new ToolError("Your role can view estimates but not edit them.");
      }
      if (mutated) {
        const cs = diffProject(project, out.project, bundle.estimate.id);
        if (!isEmptyChangeSet(cs)) {
          const { error } = await ctx.session.sb.rpc("apply_estimate_changes", { p: cs as unknown as Json });
          if (error) throw error;
        }
      }
      return { data: { result: out.result, project: s.name }, event: out.event ? `${out.event} (${s.name})` : null, refresh: mutated ? ESTIMATE_TABLES : undefined, projectId: s.id };
    },
  };
}

export const estimateTools: ToolDef[] = [
  {
    name: "get_estimate_sheet",
    description: "The current estimate / quote sheet of a project: sections, line items with ids, quantities, prices and totals. Call before editing when the person is not on the Estimate tab, and for 'what's on the estimate', 'what's the quote total', 'what's unpriced'.",
    input_schema: schema({ ...PROJECT_PROPS }),
    requires: ["estimates.view"],
    kind: "read",
    status: "reading the estimate sheet…",
    execute: async (ctx, input) => {
      const { s, project } = await loadSheet(ctx, input);
      return { data: { project: s.name, sheet: sheetSnapshot(project) } };
    },
  },
  ...BOB_TOOLS.map(wrap),
];
