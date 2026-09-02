"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/data/client";
import type { ProjectPhaseRow, ProjectSummaryRow, SubcontractorRow } from "@/lib/data/database.types";
import { loadPhases } from "@/lib/data/phases";
import { currentPhase, nextPhase } from "@/lib/data/progress";
import { useSession } from "@/lib/data/session";
import { listSubcontractors } from "@/lib/data/subcontractors";
import { listMembers, type Member } from "@/lib/data/team";
import { useLiveRows } from "@/lib/data/use-live-rows";

/**
 * Data every tab of a project workspace shares: the live summary row,
 * phases, the company's members and subcontractors. Loaded once per
 * workspace so tabs don't each refetch the same lookups.
 */
export interface ProjectData {
  projectId: string;
  companyId: string;
  summary: ProjectSummaryRow | null;
  summaryLoading: boolean;
  reloadSummary: () => Promise<void>;
  phases: ProjectPhaseRow[];
  phasesLoading: boolean;
  reloadPhases: () => Promise<void>;
  current: ProjectPhaseRow | null;
  next: ProjectPhaseRow | null;
  members: Member[];
  subcontractors: SubcontractorRow[];
  reloadSubcontractors: () => Promise<void>;
  memberName: (id: string | null | undefined) => string;
  subName: (id: string | null | undefined) => string;
  phaseName: (id: string | null | undefined) => string;
}

const Ctx = createContext<ProjectData | null>(null);

export function ProjectDataProvider({
  projectId,
  companyId,
  children,
}: {
  projectId: string;
  companyId: string;
  children: React.ReactNode;
}) {
  const session = useSession();

  const summary = useLiveRows<ProjectSummaryRow>(
    `summary:${projectId}`,
    async () => {
      const { data, error } = await supabase().from("project_summary").select("*").eq("id", projectId);
      if (error) throw error;
      return data ?? [];
    },
    [
      { table: "projects", filter: `id=eq.${projectId}` },
      { table: "tasks", filter: `project_id=eq.${projectId}` },
      { table: "project_phases", filter: `project_id=eq.${projectId}` },
      { table: "budgets", filter: `project_id=eq.${projectId}` },
      { table: "budget_lines", filter: `project_id=eq.${projectId}` },
    ],
  );

  const phases = useLiveRows<ProjectPhaseRow>(
    `phases:${projectId}`,
    () => loadPhases(projectId),
    [{ table: "project_phases", filter: `project_id=eq.${projectId}` }],
  );

  const subs = useLiveRows<SubcontractorRow>(
    `subs:${companyId}`,
    () => listSubcontractors(companyId),
    [{ table: "subcontractors", filter: `company_id=eq.${companyId}` }],
    Boolean(companyId) && session.can("subcontractors.view"),
  );

  const [members, setMembers] = useState<Member[]>([]);
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    listMembers(companyId)
      .then((m) => {
        if (!cancelled) setMembers(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const value = useMemo<ProjectData>(() => {
    const current = currentPhase(phases.rows);
    const memberName = (id: string | null | undefined) => {
      if (!id) return "";
      const m = members.find((x) => x.membership.user_id === id);
      return m?.profile?.full_name || m?.profile?.email || "";
    };
    return {
      projectId,
      companyId,
      summary: summary.rows[0] ?? null,
      summaryLoading: summary.loading,
      reloadSummary: summary.reload,
      phases: phases.rows,
      phasesLoading: phases.loading,
      reloadPhases: phases.reload,
      current,
      next: nextPhase(phases.rows, current),
      members,
      subcontractors: subs.rows,
      reloadSubcontractors: subs.reload,
      memberName,
      subName: (id) => (id ? (subs.rows.find((s) => s.id === id)?.name ?? "") : ""),
      phaseName: (id) => (id ? (phases.rows.find((p) => p.id === id)?.name ?? "") : ""),
    };
  }, [projectId, companyId, summary.rows, summary.loading, summary.reload, phases.rows, phases.loading, phases.reload, members, subs.rows, subs.reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjectData(): ProjectData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProjectData must be used inside ProjectDataProvider");
  return v;
}
