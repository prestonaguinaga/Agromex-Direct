"use client";

import type { ChecklistTemplate } from "../checklists";
import { uid } from "../format";
import { supabase } from "./client";
import type { ChecklistTemplateItemRow, ChecklistTemplateRow, TaskListRow, TaskRow, TaskStatus } from "./database.types";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Complete",
};
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export const PRIORITY_LABELS: Record<TaskRow["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export async function loadTaskLists(projectId: string): Promise<TaskListRow[]> {
  const { data, error } = await supabase()
    .from("task_lists")
    .select("*")
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function loadTasks(projectId: string): Promise<TaskRow[]> {
  const { data, error } = await supabase()
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addTaskList(input: {
  companyId: string;
  projectId: string;
  name: string;
  kind?: TaskListRow["kind"];
  phaseId?: string | null;
  templateKey?: string | null;
  position: number;
}): Promise<TaskListRow> {
  const { data, error } = await supabase()
    .from("task_lists")
    .insert({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      name: input.name,
      kind: input.kind ?? "checklist",
      phase_id: input.phaseId ?? null,
      template_key: input.templateKey ?? null,
      position: input.position,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface NewTask {
  companyId: string;
  projectId: string;
  taskListId?: string | null;
  title: string;
  description?: string;
  notes?: string;
  trade?: string;
  status?: TaskStatus;
  priority?: TaskRow["priority"];
  assigneeId?: string | null;
  subcontractorId?: string | null;
  phaseId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  position: number;
}

export async function addTask(input: NewTask): Promise<TaskRow> {
  const { data, error } = await supabase()
    .from("tasks")
    .insert({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      task_list_id: input.taskListId ?? null,
      title: input.title,
      description: input.description ?? "",
      notes: input.notes ?? "",
      trade: input.trade ?? "",
      status: input.status ?? "todo",
      priority: input.priority ?? "normal",
      assignee_id: input.assigneeId ?? null,
      subcontractor_id: input.subcontractorId ?? null,
      phase_id: input.phaseId ?? null,
      start_date: input.startDate ?? null,
      due_date: input.dueDate ?? null,
      position: input.position,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export type TaskPatch = Partial<
  Pick<
    TaskRow,
    | "title"
    | "description"
    | "notes"
    | "trade"
    | "status"
    | "priority"
    | "assignee_id"
    | "subcontractor_id"
    | "phase_id"
    | "start_date"
    | "due_date"
    | "is_milestone"
    | "position"
    | "task_list_id"
  >
>;

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const { error } = await supabase().from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  return updateTask(id, { status });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTaskList(id: string, patch: Partial<Pick<TaskListRow, "name" | "phase_id" | "position">>): Promise<void> {
  const { error } = await supabase().from("task_lists").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTaskList(id: string): Promise<void> {
  // Tasks in the list keep existing (task_list_id → null) so nothing is lost by accident.
  const { error } = await supabase().from("task_lists").delete().eq("id", id);
  if (error) throw error;
}

// ── Checklist templates ─────────────────────────────────────────────────────

export interface CompanyTemplate {
  template: ChecklistTemplateRow;
  items: ChecklistTemplateItemRow[];
}

export async function loadCompanyTemplates(companyId: string): Promise<CompanyTemplate[]> {
  const sb = supabase();
  const { data: templates, error } = await sb
    .from("checklist_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("position")
    .order("name");
  if (error) throw error;
  if (!templates?.length) return [];
  const { data: items, error: iErr } = await sb
    .from("checklist_template_items")
    .select("*")
    .in("template_id", templates.map((t) => t.id))
    .order("position");
  if (iErr) throw iErr;
  return templates.map((t) => ({ template: t, items: (items ?? []).filter((i) => i.template_id === t.id) }));
}

/** Create a checklist (task list + tasks) on a project from any template shape. */
export async function applyChecklistTemplate(input: {
  companyId: string;
  projectId: string;
  name: string;
  templateKey?: string | null;
  phaseId?: string | null;
  items: { title: string; trade?: string }[];
  listPosition: number;
}): Promise<TaskListRow> {
  const list = await addTaskList({
    companyId: input.companyId,
    projectId: input.projectId,
    name: input.name,
    phaseId: input.phaseId ?? null,
    templateKey: input.templateKey ?? null,
    position: input.listPosition,
  });
  if (input.items.length) {
    const rows = input.items.map((it, i) => ({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      task_list_id: list.id,
      phase_id: input.phaseId ?? null,
      title: it.title,
      trade: it.trade ?? "",
      position: i,
    }));
    const { error } = await supabase().from("tasks").insert(rows);
    if (error) throw error;
  }
  return list;
}

/** Save an existing checklist as a reusable company template. */
export async function saveListAsTemplate(input: {
  companyId: string;
  name: string;
  phaseKey?: string | null;
  tasks: TaskRow[];
}): Promise<ChecklistTemplateRow> {
  const sb = supabase();
  const { data: template, error } = await sb
    .from("checklist_templates")
    .insert({ id: uid(), company_id: input.companyId, name: input.name, phase_key: input.phaseKey ?? null, key: null })
    .select("*")
    .single();
  if (error) throw error;
  if (input.tasks.length) {
    const { error: iErr } = await sb.from("checklist_template_items").insert(
      input.tasks.map((t, i) => ({ id: uid(), company_id: input.companyId, template_id: template.id, title: t.title, trade: t.trade, position: i })),
    );
    if (iErr) throw iErr;
  }
  return template;
}

export async function deleteCompanyTemplate(id: string): Promise<void> {
  const { error } = await supabase().from("checklist_templates").delete().eq("id", id);
  if (error) throw error;
}

export function builtinAsTemplate(t: ChecklistTemplate) {
  return { name: t.name, templateKey: t.key, items: t.items };
}
