/**
 * Hand-maintained mirror of supabase/migrations. Regenerate with
 * `supabase gen types typescript --linked > lib/data/database.types.ts`
 * once a project is linked; until then keep this file in step with the SQL.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RoleKey = "owner" | "admin" | "project_manager" | "estimator" | "employee" | "read_only";
export type ProjectStatus = "lead" | "estimating" | "active" | "on_hold" | "complete" | "archived";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type FileKind = "plan" | "document" | "photo" | "receipt";

export type CompanyRow = {
  id: string;
  name: string;
  short_name: string;
  timezone: string;
  settings: Json;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_path: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MembershipRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: RoleKey;
  is_active: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type InvitationRow = {
  id: string;
  company_id: string;
  email: string;
  role: RoleKey;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
}

export type RolePermissionRow = {
  company_id: string;
  role: RoleKey;
  capability: string;
  allowed: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type ProjectRow = {
  id: string;
  company_id: string;
  number: number | null;
  name: string;
  type: "new-build" | "remodel";
  status: ProjectStatus;
  template: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  address: string;
  notes: string;
  plan_notes: string;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  progress_pct: number;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  company_id: string;
  project_role: "lead" | "member" | "viewer";
  created_at: string;
  created_by: string | null;
}

export type EstimateRow = {
  id: string;
  company_id: string;
  project_id: string;
  version: number;
  status: "draft" | "sent" | "accepted" | "superseded";
  tax_pct: number;
  waste_pct: number;
  labor_pct: number;
  contingency_pct: number;
  sqft: number | null;
  footprint_sqft: number | null;
  stories: number;
  ceiling_ft: number;
  bedrooms: number | null;
  bathrooms: number | null;
  roof_pitch: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export type EstimateSectionRow = {
  id: string;
  company_id: string;
  estimate_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type EstimateItemRow = {
  id: string;
  company_id: string;
  estimate_id: string;
  section_id: string;
  name: string;
  qty: number;
  unit: string;
  done: boolean;
  note: string | null;
  active_option_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type EstimateItemOptionRow = {
  id: string;
  company_id: string;
  estimate_id: string;
  item_id: string;
  label: string;
  url: string;
  unit_price: number | null;
  note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type BudgetRow = {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  status: "active" | "archived";
  notes: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type BudgetLineRow = {
  id: string;
  company_id: string;
  budget_id: string;
  project_id: string;
  category: string;
  source_section_id: string | null;
  budgeted: number;
  committed: number;
  actual: number;
  notes: string;
  position: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type TaskListRow = {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  kind: "checklist" | "punch_list" | "inspection" | "custom";
  position: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type TaskRow = {
  id: string;
  company_id: string;
  project_id: string;
  task_list_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  is_milestone: boolean;
  position: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type NoteRow = {
  id: string;
  company_id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

export type FileRow = {
  id: string;
  company_id: string;
  project_id: string;
  kind: FileKind;
  bucket: string;
  storage_path: string;
  thumb_path: string | null;
  name: string;
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  caption: string;
  uploaded_by: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export type AuditLogRow = {
  id: number;
  company_id: string;
  project_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string | null;
  action: "insert" | "update" | "delete" | "event";
  field: string | null;
  old_value: Json | null;
  new_value: Json | null;
  summary: string;
  source: string;
  created_at: string;
}

export type ProjectSummaryRow = {
  id: string;
  company_id: string;
  number: number | null;
  name: string;
  type: "new-build" | "remodel";
  status: ProjectStatus;
  template: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  address: string;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  progress_pct: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  estimate_id: string | null;
  materials: number;
  waste: number;
  tax: number;
  labor: number;
  contingency: number;
  grand: number;
  priced_items: number;
  unpriced_items: number;
  done_items: number;
  total_items: number;
  tasks_total: number;
  tasks_done: number;
}

/** What my_context() returns for the signed-in user. */
export interface MyContext {
  user_id: string | null;
  companies_exist: boolean;
  profile: ProfileRow | null;
  membership: MembershipRow | null;
  company: CompanyRow | null;
  capabilities: string[];
}

type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: never[] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      companies: Table<CompanyRow>;
      profiles: Table<ProfileRow>;
      memberships: Table<MembershipRow>;
      invitations: Table<InvitationRow>;
      role_permissions: Table<RolePermissionRow>;
      projects: Table<ProjectRow>;
      project_members: Table<ProjectMemberRow>;
      estimates: Table<EstimateRow>;
      estimate_sections: Table<EstimateSectionRow>;
      estimate_items: Table<EstimateItemRow>;
      estimate_item_options: Table<EstimateItemOptionRow>;
      budgets: Table<BudgetRow>;
      budget_lines: Table<BudgetLineRow>;
      task_lists: Table<TaskListRow>;
      tasks: Table<TaskRow>;
      notes: Table<NoteRow>;
      files: Table<FileRow>;
      audit_log: Table<AuditLogRow>;
    };
    Views: {
      project_summary: { Row: ProjectSummaryRow; Relationships: never[] };
    };
    Functions: {
      bootstrap_company: {
        Args: { p_name: string; p_short_name?: string; p_timezone?: string };
        Returns: string;
      };
      my_context: { Args: Record<string, never>; Returns: Json };
      apply_estimate_changes: { Args: { p: Json }; Returns: Json };
      create_project: { Args: { p: Json }; Returns: Json };
      log_activity: {
        Args: {
          p_project_id: string | null;
          p_entity_type: string;
          p_entity_id: string | null;
          p_summary: string;
          p_source?: string;
        };
        Returns: number;
      };
    };
    Enums: { role_key: RoleKey };
    CompositeTypes: Record<string, never>;
  };
}
