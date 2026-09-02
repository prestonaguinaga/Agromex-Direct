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
  manager_id: string | null;
  manual_progress_pct: number | null;
  manual_progress_by: string | null;
  manual_progress_at: string | null;
  manual_progress_note: string;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export type PhaseStatus = "not_started" | "in_progress" | "complete" | "blocked";

export type ProjectPhaseRow = {
  id: string;
  company_id: string;
  project_id: string;
  key: string | null;
  name: string;
  status: PhaseStatus;
  position: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  weight: number;
  notes: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type SubcontractorRow = {
  id: string;
  company_id: string;
  name: string;
  trade: string;
  contact_name: string;
  phone: string;
  email: string;
  notes: string;
  status: "active" | "inactive";
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type ChecklistTemplateRow = {
  id: string;
  company_id: string;
  key: string | null;
  name: string;
  phase_key: string | null;
  position: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type ChecklistTemplateItemRow = {
  id: string;
  company_id: string;
  template_id: string;
  title: string;
  trade: string;
  position: number;
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
  contract_amount: number | null;
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
  phase_id: string | null;
  template_key: string | null;
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
  trade: string;
  start_date: string | null;
  notes: string;
  phase_id: string | null;
  subcontractor_id: string | null;
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
  task_id: string | null;
  budget_line_id: string | null;
  file_id: string | null;
  phase_id: string | null;
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
  phase_id: string | null;
  task_id: string | null;
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
  kind: "major" | "minor";
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
  manager_id: string | null;
  progress_pct: number;
  manual_progress_pct: number | null;
  manual_progress_by: string | null;
  manual_progress_at: string | null;
  manual_progress_note: string;
  display_progress_pct: number;
  progress_source: "calculated" | "manual";
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
  tasks_in_progress: number;
  tasks_blocked: number;
  tasks_overdue: number;
  phases_total: number;
  phases_complete: number;
  current_phase_id: string | null;
  current_phase_name: string | null;
  current_phase_status: PhaseStatus | null;
  budget_id: string | null;
  contract_amount: number | null;
  budget_budgeted: number;
  budget_committed: number;
  budget_actual: number;
}

export type BobConversationRow = {
  id: string;
  company_id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  summary: string;
  summary_through: string | null;
  turns: number;
  started_at: string;
  last_message_at: string;
  ended_at: string | null;
}

export type BobMessageRole = "user" | "assistant" | "tool" | "event";

export type BobMessageRow = {
  id: string;
  company_id: string;
  conversation_id: string;
  user_id: string;
  role: BobMessageRole;
  text: string;
  tool_name: string | null;
  tool_input: Json | null;
  tool_ok: boolean | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export type BobSensitivity = "delete" | "money" | "permissions" | "email" | "applicant" | "other";
export type BobActionStatus = "pending" | "executed" | "declined" | "expired" | "failed";

export type BobPendingActionRow = {
  id: string;
  company_id: string;
  user_id: string;
  conversation_id: string | null;
  project_id: string | null;
  tool_name: string;
  tool_input: Json;
  preview: string;
  sensitivity: BobSensitivity;
  status: BobActionStatus;
  result: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}

export type BobUserPreferencesRow = {
  user_id: string;
  company_id: string;
  preferences: Json;
  updated_at: string;
}

export type DailyBriefSettingsRow = {
  company_id: string;
  enabled: boolean;
  delivery_time: string;
  timezone: string;
  recipients: string[];
  include_budget: boolean;
  include_applications: boolean;
  include_leads: boolean;
  include_completed_projects: boolean;
  include_photo_previews: boolean;
  last_run_at: string | null;
  last_run_note: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type DailyBriefRow = {
  id: string;
  company_id: string;
  brief_date: string;
  kind: "scheduled" | "manual";
  timezone: string;
  status: "generating" | "ready" | "failed";
  window_start: string | null;
  window_end: string | null;
  previous_brief_id: string | null;
  settings: Json;
  facts: Json;
  doc: Json;
  narrative: string;
  summary: string;
  attention_count: number;
  error: string | null;
  requested_by: string | null;
  started_at: string;
  generated_at: string | null;
  created_at: string;
}

export type DailyBriefDeliveryRow = {
  id: string;
  company_id: string;
  brief_id: string;
  recipient_email: string;
  status: "pending" | "sent" | "failed" | "skipped";
  provider_id: string | null;
  error: string | null;
  attempts: number;
  attempted_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export type LeadRow = {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  message: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "closed" | "spam";
  assigned_to: string | null;
  project_id: string | null;
  notes: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export type SubcontractorApplicationRow = {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string;
  trade: string;
  phone: string;
  email: string;
  message: string;
  source: string;
  status: "new" | "reviewing" | "accepted" | "declined";
  subcontractor_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
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
      project_phases: Table<ProjectPhaseRow>;
      subcontractors: Table<SubcontractorRow>;
      checklist_templates: Table<ChecklistTemplateRow>;
      checklist_template_items: Table<ChecklistTemplateItemRow>;
      bob_conversations: Table<BobConversationRow>;
      bob_messages: Table<BobMessageRow>;
      bob_pending_actions: Table<BobPendingActionRow>;
      bob_user_preferences: Table<BobUserPreferencesRow>;
      daily_brief_settings: Table<DailyBriefSettingsRow>;
      daily_briefs: Table<DailyBriefRow>;
      daily_brief_deliveries: Table<DailyBriefDeliveryRow>;
      leads: Table<LeadRow>;
      subcontractor_applications: Table<SubcontractorApplicationRow>;
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
          p_source?: string | null;
        };
        Returns: number;
      };
    };
    Enums: { role_key: RoleKey };
    CompositeTypes: Record<string, never>;
  };
}
