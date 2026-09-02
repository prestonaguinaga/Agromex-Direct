"use client";

import { BUILTIN_CHECKLISTS, STANDARD_PHASES } from "../checklists";
import { uid } from "../format";
import { supabase } from "./client";
import type { PhaseStatus, ProjectPhaseRow } from "./database.types";

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  blocked: "Blocked",
};

export async function loadPhases(projectId: string): Promise<ProjectPhaseRow[]> {
  const { data, error } = await supabase()
    .from("project_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function addPhase(input: {
  companyId: string;
  projectId: string;
  name: string;
  key?: string | null;
  position: number;
}): Promise<ProjectPhaseRow> {
  const { data, error } = await supabase()
    .from("project_phases")
    .insert({ id: uid(), company_id: input.companyId, project_id: input.projectId, name: input.name, key: input.key ?? null, position: input.position })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePhase(
  id: string,
  patch: Partial<Pick<ProjectPhaseRow, "name" | "status" | "planned_start" | "planned_end" | "notes" | "position" | "weight">>,
): Promise<void> {
  const { error } = await supabase().from("project_phases").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePhase(id: string): Promise<void> {
  const { error } = await supabase().from("project_phases").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Add the 13 standard construction phases (skipping ones already present),
 * optionally with a built-in checklist per phase. Idempotent per phase key.
 */
export async function addStandardPhases(input: {
  companyId: string;
  projectId: string;
  withChecklists: boolean;
  existing: ProjectPhaseRow[];
}): Promise<{ phases: number; checklists: number; items: number }> {
  const sb = supabase();
  const have = new Set(input.existing.map((p) => p.key).filter(Boolean));
  let position = input.existing.length;
  const phaseRows = STANDARD_PHASES.filter((p) => !have.has(p.key)).map((p) => ({
    id: uid(),
    company_id: input.companyId,
    project_id: input.projectId,
    key: p.key,
    name: p.name,
    position: position++,
    weight: p.share,
  }));
  if (phaseRows.length === 0) return { phases: 0, checklists: 0, items: 0 };
  const { error } = await sb.from("project_phases").upsert(phaseRows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;

  let checklists = 0;
  let items = 0;
  if (input.withChecklists) {
    const { data: lists } = await sb.from("task_lists").select("template_key").eq("project_id", input.projectId);
    const haveLists = new Set((lists ?? []).map((l) => l.template_key).filter(Boolean));
    let listPos = (lists ?? []).length;
    for (const phase of phaseRows) {
      const tpl = BUILTIN_CHECKLISTS.find((c) => c.phaseKey === phase.key);
      if (!tpl || haveLists.has(tpl.key)) continue;
      const listId = uid();
      const { error: lErr } = await sb.from("task_lists").insert({
        id: listId,
        company_id: input.companyId,
        project_id: input.projectId,
        name: tpl.name,
        kind: "checklist",
        phase_id: phase.id,
        template_key: tpl.key,
        position: listPos++,
      });
      if (lErr) throw lErr;
      checklists += 1;
      const taskRows = tpl.items.map((it, i) => ({
        id: uid(),
        company_id: input.companyId,
        project_id: input.projectId,
        task_list_id: listId,
        phase_id: phase.id,
        title: it.title,
        trade: it.trade,
        position: i,
      }));
      const { error: tErr } = await sb.from("tasks").insert(taskRows);
      if (tErr) throw tErr;
      items += taskRows.length;
    }
  }
  return { phases: phaseRows.length, checklists, items };
}
