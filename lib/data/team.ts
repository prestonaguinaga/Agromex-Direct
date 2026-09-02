"use client";

import { supabase } from "./client";
import type { InvitationRow, MembershipRow, ProfileRow, ProjectMemberRow, RoleKey } from "./database.types";

export interface Member {
  membership: MembershipRow;
  profile: ProfileRow | null;
}

export interface ProjectMember {
  assignment: ProjectMemberRow;
  profile: ProfileRow | null;
}

async function profilesById(ids: string[]): Promise<Map<string, ProfileRow>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase().from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

export async function listMembers(companyId: string): Promise<Member[]> {
  const { data, error } = await supabase()
    .from("memberships")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await profilesById(rows.map((m) => m.user_id));
  return rows.map((m) => ({ membership: m, profile: profiles.get(m.user_id) ?? null }));
}

export async function listPendingInvitations(companyId: string): Promise<InvitationRow[]> {
  const { data, error } = await supabase()
    .from("invitations")
    .select("*")
    .eq("company_id", companyId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateMembership(
  id: string,
  patch: { role?: RoleKey; is_active?: boolean },
): Promise<void> {
  const { error } = await supabase().from("memberships").update(patch).eq("id", id);
  if (error) throw error;
}

export async function cancelInvitation(id: string): Promise<void> {
  const { error } = await supabase().from("invitations").delete().eq("id", id);
  if (error) throw error;
}

export interface InviteResult {
  ok: boolean;
  message: string;
  /** "email" when Supabase sent the invite; "pending" when only the invitation row was stored. */
  delivery: "email" | "pending" | "linked";
}

/** Goes through the server route so the service-role key never reaches the browser. */
export async function inviteMember(input: { email: string; role: RoleKey; fullName?: string }): Promise<InviteResult> {
  const res = await fetch("/api/team/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<InviteResult> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? body.message ?? `Invite failed (${res.status})`);
  return { ok: true, message: body.message ?? "Invitation sent.", delivery: body.delivery ?? "pending" };
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase().from("project_members").select("*").eq("project_id", projectId);
  if (error) throw error;
  const rows = data ?? [];
  const profiles = await profilesById(rows.map((r) => r.user_id));
  return rows.map((a) => ({ assignment: a, profile: profiles.get(a.user_id) ?? null }));
}

export async function addProjectMember(projectId: string, userId: string, companyId: string): Promise<void> {
  const { error } = await supabase()
    .from("project_members")
    .upsert({ project_id: projectId, user_id: userId, company_id: companyId }, { onConflict: "project_id,user_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function updateMyProfile(userId: string, patch: { full_name?: string; phone?: string }): Promise<void> {
  const { error } = await supabase().from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/** Fire-and-forget presence stamp for the team list. */
export function touchLastSeen(userId: string): void {
  try {
    void supabase().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
  } catch {
    /* not configured */
  }
}
