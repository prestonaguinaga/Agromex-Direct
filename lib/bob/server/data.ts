import "server-only";
import type {
  AuditLogRow,
  BudgetLineRow,
  BudgetRow,
  FileRow,
  MembershipRow,
  NoteRow,
  ProfileRow,
  ProjectPhaseRow,
  ProjectSummaryRow,
  SubcontractorRow,
  TaskListRow,
  TaskRow,
} from "../../data/database.types";
import type { EstimateBundle } from "../../data/estimate-view";
import type { Db } from "./types";

/**
 * Read helpers for Bob's tools. Every query runs as the person (their JWT),
 * so row-level security decides what comes back — an employee asking about a
 * project they are not assigned to simply gets nothing.
 */

export async function listSummaries(sb: Db): Promise<ProjectSummaryRow[]> {
  const { data, error } = await sb.from("project_summary").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSummary(sb: Db, projectId: string): Promise<ProjectSummaryRow | null> {
  const { data, error } = await sb.from("project_summary").select("*").eq("id", projectId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadPhases(sb: Db, projectId: string): Promise<ProjectPhaseRow[]> {
  const { data, error } = await sb.from("project_phases").select("*").eq("project_id", projectId).order("position");
  if (error) throw error;
  return data ?? [];
}

export async function loadTaskLists(sb: Db, projectId: string): Promise<TaskListRow[]> {
  const { data, error } = await sb.from("task_lists").select("*").eq("project_id", projectId).order("position");
  if (error) throw error;
  return data ?? [];
}

/** Tasks of one project, or every task the person may see (capped). */
export async function loadTasks(sb: Db, projectId: string | null, limit = 2000): Promise<TaskRow[]> {
  let q = sb.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false }).order("position").limit(limit);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getTask(sb: Db, id: string): Promise<TaskRow | null> {
  const { data, error } = await sb.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadNotes(sb: Db, projectId: string, limit: number, search?: string): Promise<NoteRow[]> {
  let q = sb.from("notes").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(limit);
  if (search) q = q.ilike("body", `%${search.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getNote(sb: Db, id: string): Promise<NoteRow | null> {
  const { data, error } = await sb.from("notes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadFiles(sb: Db, projectId: string | null, kind: FileRow["kind"] | null, limit = 400): Promise<FileRow[]> {
  let q = sb.from("files").select("*").order("created_at", { ascending: false }).limit(limit);
  if (projectId) q = q.eq("project_id", projectId);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface BudgetBundle {
  budget: BudgetRow | null;
  lines: BudgetLineRow[];
}

export async function loadBudget(sb: Db, projectId: string): Promise<BudgetBundle> {
  const { data: budget, error } = await sb.from("budgets").select("*").eq("project_id", projectId).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!budget) return { budget: null, lines: [] };
  const { data: lines, error: lErr } = await sb.from("budget_lines").select("*").eq("budget_id", budget.id).order("position");
  if (lErr) throw lErr;
  return { budget, lines: lines ?? [] };
}

export async function loadActivity(
  sb: Db,
  opts: { projectId: string | null; fromIso?: string; toIso?: string; includeMinor?: boolean; limit: number },
): Promise<AuditLogRow[]> {
  let q = sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(opts.limit);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.fromIso) q = q.gte("created_at", opts.fromIso);
  if (opts.toIso) q = q.lt("created_at", opts.toIso);
  if (!opts.includeMinor) q = q.eq("kind", "major");
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface Member {
  userId: string;
  name: string;
  email: string | null;
  role: MembershipRow["role"];
  isActive: boolean;
  lastSeen: string | null;
  membershipId: string;
}

export async function profilesById(sb: Db, ids: string[]): Promise<Map<string, ProfileRow>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const { data, error } = await sb.from("profiles").select("*").in("id", uniq);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function loadMembers(sb: Db, companyId: string): Promise<Member[]> {
  const { data, error } = await sb.from("memberships").select("*").eq("company_id", companyId).order("created_at");
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await profilesById(sb, rows.map((m) => m.user_id));
  return rows.map((m) => {
    const p = profiles.get(m.user_id);
    return {
      userId: m.user_id,
      name: p?.full_name?.trim() || p?.email || "Unknown",
      email: p?.email ?? null,
      role: m.role,
      isActive: m.is_active,
      lastSeen: p?.last_seen_at ?? null,
      membershipId: m.id,
    };
  });
}

export async function loadProjectMemberIds(sb: Db, projectId: string): Promise<string[]> {
  const { data, error } = await sb.from("project_members").select("user_id").eq("project_id", projectId);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id);
}

export async function loadSubcontractors(sb: Db, companyId: string): Promise<SubcontractorRow[]> {
  const { data, error } = await sb.from("subcontractors").select("*").eq("company_id", companyId).order("name");
  if (error) throw error;
  return data ?? [];
}

/** Project + its current estimate and every sheet row (null when not visible). */
export async function loadEstimateBundle(sb: Db, projectId: string): Promise<EstimateBundle | null> {
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
  if (!estimate) return null;
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

/** Short-lived links to private files (the storage policies decide access). */
export async function signedUrls(sb: Db, bucket: string, paths: string[], ttlSeconds = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data, error } = await sb.storage.from(bucket).createSignedUrls(paths, ttlSeconds);
  if (error) return out;
  for (const d of data ?? []) if (d.signedUrl && d.path) out.set(d.path, d.signedUrl);
  return out;
}

export function nameOf(p: ProfileRow | undefined | null): string {
  return p?.full_name?.trim() || p?.email || "";
}
