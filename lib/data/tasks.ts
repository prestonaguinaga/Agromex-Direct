"use client";

import { uid } from "../format";
import { supabase } from "./client";
import type { TaskListRow, TaskRow, TaskStatus } from "./database.types";

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
      position: input.position,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addTask(input: {
  companyId: string;
  projectId: string;
  taskListId: string | null;
  title: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  position: number;
}): Promise<TaskRow> {
  const { data, error } = await supabase()
    .from("tasks")
    .insert({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      task_list_id: input.taskListId,
      title: input.title,
      due_date: input.dueDate ?? null,
      assignee_id: input.assigneeId ?? null,
      position: input.position,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(
  id: string,
  patch: Partial<Pick<TaskRow, "title" | "description" | "status" | "priority" | "assignee_id" | "due_date" | "is_milestone" | "position" | "task_list_id">>,
): Promise<void> {
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

export async function renameTaskList(id: string, name: string): Promise<void> {
  const { error } = await supabase().from("task_lists").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteTaskList(id: string): Promise<void> {
  // Tasks in the list keep existing (task_list_id → null) so nothing is lost by accident.
  const { error } = await supabase().from("task_lists").delete().eq("id", id);
  if (error) throw error;
}

/** Starter checklists so a new project isn't an empty screen. */
export const STARTER_CHECKLISTS: Record<"new-build" | "remodel", { name: string; tasks: string[] }[]> = {
  "new-build": [
    { name: "Pre-construction", tasks: ["Permits pulled", "Plans approved", "Site staked", "Temporary power set"] },
    { name: "Inspections", tasks: ["Foundation inspection", "Framing inspection", "Rough-in inspections (plumbing / electrical / HVAC)", "Insulation inspection", "Final inspection"] },
    { name: "Close-out", tasks: ["Punch list complete", "Final clean", "Certificate of occupancy", "Client walkthrough"] },
  ],
  remodel: [
    { name: "Kick-off", tasks: ["Scope confirmed with client", "Permit (if required)", "Surface protection in place", "Demo complete"] },
    { name: "Inspections", tasks: ["Rough-in inspection", "Final inspection"] },
    { name: "Close-out", tasks: ["Punch list complete", "Final clean", "Client walkthrough"] },
  ],
};
