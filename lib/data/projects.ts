"use client";

import type { Project } from "../types";
import { uid } from "../format";
import { supabase } from "./client";
import type { Json, ProjectRow, ProjectSummaryRow } from "./database.types";
import { diffProject, remapProjectIds, rowsToProject, type EstimateBundle } from "./estimate-view";

export async function listProjectSummaries(): Promise<ProjectSummaryRow[]> {
  const { data, error } = await supabase()
    .from("project_summary")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function loadProjectRow(id: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase().from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Project + its current estimate and every sheet row. Null when not visible. */
export async function loadEstimateBundle(projectId: string): Promise<EstimateBundle | null> {
  const sb = supabase();
  const { data: project, error: pErr } = await sb.from("projects").select("*").eq("id", projectId).maybeSingle();
  if (pErr) throw pErr;
  if (!project) return null;
  const { data: estimate, error: eErr } = await sb
    .from("estimates")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!estimate) {
    return { project, estimate: null as unknown as EstimateBundle["estimate"], sections: [], items: [], options: [] };
  }
  const [s, i, o] = await Promise.all([
    sb.from("estimate_sections").select("*").eq("estimate_id", estimate.id).order("position"),
    sb.from("estimate_items").select("*").eq("estimate_id", estimate.id).order("position"),
    sb.from("estimate_item_options").select("*").eq("estimate_id", estimate.id).order("position"),
  ]);
  if (s.error) throw s.error;
  if (i.error) throw i.error;
  if (o.error) throw o.error;
  return { project, estimate, sections: s.data ?? [], items: i.data ?? [], options: o.data ?? [] };
}

export interface CreateResult {
  projectId: string;
  estimateId: string | null;
  existing: boolean;
}

/**
 * Persist an in-memory Project (from lib/templates createProject, a duplicate,
 * or a legacy import) as project + estimate + sheet in one atomic RPC.
 * Idempotent: the same Project id, or the same legacy `clientId`, never
 * creates a second record.
 */
export async function createProjectInDb(
  p: Project,
  opts: { companyId: string; clientId?: string; createdAt?: number },
): Promise<CreateResult> {
  const estimateId = uid();
  const cs = diffProject(null, p, estimateId);
  const payload = {
    id: p.id,
    estimate_id: estimateId,
    company_id: opts.companyId,
    client_id: opts.clientId ?? null,
    project: {
      ...cs.project,
      created_at: opts.createdAt ? new Date(opts.createdAt).toISOString() : undefined,
    },
    estimate: cs.estimate ?? {},
    sections: cs.sections,
    items: cs.items,
    options: cs.options,
  };
  const { data, error } = await supabase().rpc("create_project", { p: payload as unknown as Json });
  if (error) throw error;
  const r = data as { project_id: string; estimate_id?: string; existing: boolean };
  return { projectId: r.project_id, estimateId: r.estimate_id ?? null, existing: Boolean(r.existing) };
}

export async function duplicateProject(projectId: string, companyId: string): Promise<CreateResult> {
  const bundle = await loadEstimateBundle(projectId);
  if (!bundle || !bundle.estimate) throw new Error("Project not found or you can't view its estimate.");
  const copy = remapProjectIds(rowsToProject(bundle), uid);
  copy.name = `${copy.name} (copy)`;
  return createProjectInDb(copy, { companyId });
}

/** Soft delete: hidden everywhere at once, history kept. */
export async function softDeleteProject(id: string): Promise<void> {
  const { error } = await supabase()
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateProjectFields(
  id: string,
  patch: Partial<
    Pick<
      ProjectRow,
      | "name"
      | "status"
      | "client_name"
      | "client_phone"
      | "client_email"
      | "address"
      | "start_date"
      | "target_end_date"
      | "actual_end_date"
      | "notes"
      | "plan_notes"
      | "manager_id"
      | "type"
    >
  >,
): Promise<void> {
  const { error } = await supabase().from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

/** Set (or clear with null) the manager's override; the calculated figure is untouched. */
export async function setManualProgress(id: string, pct: number | null, note: string): Promise<void> {
  const { error } = await supabase()
    .from("projects")
    .update({ manual_progress_pct: pct, manual_progress_note: pct === null ? "" : note })
    .eq("id", id);
  if (error) throw error;
}
