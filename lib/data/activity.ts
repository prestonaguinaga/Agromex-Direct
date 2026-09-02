"use client";

import { supabase } from "./client";
import type { AuditLogRow } from "./database.types";

export async function loadProjectActivity(projectId: string, limit = 200, includeMinor = false): Promise<AuditLogRow[]> {
  let q = supabase()
    .from("audit_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!includeMinor) q = q.eq("kind", "major");
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function loadCompanyActivity(companyId: string, limit = 200): Promise<AuditLogRow[]> {
  const { data, error } = await supabase()
    .from("audit_log")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Coarse grouping for filters and icons. */
export function activityKind(row: AuditLogRow): "budget" | "estimate" | "task" | "note" | "file" | "team" | "project" | "other" {
  switch (row.entity_type) {
    case "budgets":
    case "budget_lines":
      return "budget";
    case "estimates":
    case "estimate_sections":
    case "estimate_items":
    case "estimate_item_options":
      return "estimate";
    case "tasks":
    case "task_lists":
      return "task";
    case "notes":
      return "note";
    case "files":
      return "file";
    case "memberships":
    case "project_members":
    case "role_permissions":
    case "invitations":
      return "team";
    case "projects":
    case "project_phases":
      return "project";
    default:
      return "other";
  }
}
