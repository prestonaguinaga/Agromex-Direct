"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { loadProjectActivity } from "@/lib/data/activity";
import { describeError, supabase } from "@/lib/data/client";
import type { AuditLogRow, ProjectStatus, ProjectSummaryRow } from "@/lib/data/database.types";
import { updateProjectFields } from "@/lib/data/projects";
import { useSession } from "@/lib/data/session";
import { addProjectMember, listMembers, listProjectMembers, removeProjectMember, type Member, type ProjectMember } from "@/lib/data/team";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { money } from "@/lib/format";
import type { Project, Totals } from "@/lib/types";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "estimating", label: "Estimating" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

export function OverviewPanel({
  projectId,
  companyId,
  project,
  totals,
  onOpenTab,
}: {
  projectId: string;
  companyId: string;
  project: Project;
  totals: Totals | null;
  onOpenTab: (tab: string) => void;
}) {
  const session = useSession();
  const canEditProject = session.can("projects.edit");
  const canAssign = canEditProject || session.can("team.manage");
  const [error, setError] = useState<string | null>(null);

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
    ],
  );
  const s = summary.rows[0];

  const activity = useLiveRows<AuditLogRow>(
    `activity-recent:${projectId}`,
    () => loadProjectActivity(projectId, 8),
    [{ table: "audit_log", filter: `project_id=eq.${projectId}` }],
    session.can("audit.view_project"),
  );

  const patch = async (fields: Parameters<typeof updateProjectFields>[1]) => {
    setError(null);
    try {
      await updateProjectFields(projectId, fields);
    } catch (e) {
      setError(describeError(e));
    }
  };

  const pct = Number(s?.progress_pct ?? 0);
  const doneAll = (s?.done_items ?? 0) + (s?.tasks_done ?? 0);
  const totalAll = (s?.total_items ?? 0) + (s?.tasks_total ?? 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid content-start gap-4">
        {/* ── Status & schedule ─────────────────────────────────── */}
        <section className="panel bg-paper">
          <PanelBar title="Project status" right={summary.refreshing && <span className="microlabel">syncing…</span>} />
          {error && <ErrorMark text={error} />}
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <div>
              <Label>Status</Label>
              <select
                className="field"
                value={s?.status ?? "estimating"}
                disabled={!canEditProject}
                onChange={(e) => void patch({ status: e.target.value as ProjectStatus })}
              >
                {STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <DateField label="Start date" value={s?.start_date ?? null} disabled={!canEditProject} onCommit={(v) => void patch({ start_date: v })} />
            <DateField label="Target completion" value={s?.target_end_date ?? null} disabled={!canEditProject} onCommit={(v) => void patch({ target_end_date: v })} />
          </div>
          <div className="border-t px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="microlabel">Progress · checklist items and tasks</span>
              <span className="microlabel tnum">
                {doneAll}/{totalAll} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 border">
              <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </section>

        {/* ── Client ────────────────────────────────────────────── */}
        <section className="panel bg-paper">
          <PanelBar title="Client" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <Label>Client</Label>
              <TextInput value={s?.client_name ?? project.info.client} onCommit={(v) => void patch({ client_name: v })} className={canEditProject ? "" : "pointer-events-none"} placeholder="Client name" />
            </div>
            <div>
              <Label>Phone</Label>
              <TextInput value={s?.client_phone ?? project.info.phone} onCommit={(v) => void patch({ client_phone: v })} className={canEditProject ? "" : "pointer-events-none"} placeholder="(___) ___-____" />
            </div>
            <div>
              <Label>Email</Label>
              <TextInput value={s?.client_email ?? ""} onCommit={(v) => void patch({ client_email: v })} className={canEditProject ? "" : "pointer-events-none"} placeholder="client@email.com" />
            </div>
            <div>
              <Label>Job address</Label>
              <TextInput value={s?.address ?? project.info.address} onCommit={(v) => void patch({ address: v })} className={canEditProject ? "" : "pointer-events-none"} placeholder="Street, city" />
            </div>
          </div>
        </section>

        {/* ── Recent activity ───────────────────────────────────── */}
        {session.can("audit.view_project") && (
          <section className="panel bg-paper">
            <PanelBar
              title="Recent activity"
              right={
                <button className="microlabel hover:text-ink" onClick={() => onOpenTab("activity")}>
                  All activity →
                </button>
              }
            />
            {activity.loading && <LoadingMark />}
            {activity.error && <ErrorMark text={activity.error} onRetry={() => void activity.reload()} />}
            {!activity.loading && !activity.error && activity.rows.length === 0 && <EmptyMark text="Nothing yet" />}
            <ul className="divide-y divide-line-soft">
              {activity.rows.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-xs">
                  <span className="min-w-0 truncate">{a.summary}</span>
                  <span className="microlabel tnum shrink-0">
                    {a.actor_name ?? "system"} · {formatWhen(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="grid content-start gap-4">
        {/* ── Money ─────────────────────────────────────────────── */}
        {totals && (
          <section className="panel bg-paper">
            <PanelBar title="Estimate" right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("estimate")}>Open →</button>} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-4">
              <span className="microlabel">Materials</span>
              <span className="tnum text-right font-mono text-sm">{money(totals.materials)}</span>
              <span className="microlabel">Quote total</span>
              <span className="tnum text-right font-mono text-lg">{money(totals.grand)}</span>
              <span className="microlabel">Priced lines</span>
              <span className="tnum text-right font-mono text-xs">
                {totals.pricedItems}/{totals.totalItems}
              </span>
            </div>
          </section>
        )}

        {/* ── Team on this project ──────────────────────────────── */}
        <ProjectTeam projectId={projectId} companyId={companyId} canAssign={canAssign} />
      </div>
    </div>
  );
}

function DateField({ label, value, disabled, onCommit }: { label: string; value: string | null; disabled: boolean; onCommit: (v: string | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="date"
        className="field field-mono"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onCommit(e.target.value || null)}
      />
    </div>
  );
}

function ProjectTeam({ projectId, companyId, canAssign }: { projectId: string; companyId: string; canAssign: boolean }) {
  const assigned = useLiveRows<ProjectMember>(
    `project-members:${projectId}`,
    () => listProjectMembers(projectId),
    [{ table: "project_members", filter: `project_id=eq.${projectId}` }],
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");

  useEffect(() => {
    if (!canAssign || !companyId) return;
    listMembers(companyId).then(setMembers).catch((e) => setError(describeError(e)));
  }, [canAssign, companyId]);

  const assignedIds = new Set(assigned.rows.map((r) => r.assignment.user_id));
  const candidates = members.filter((m) => m.membership.is_active && !assignedIds.has(m.membership.user_id));

  const add = async () => {
    if (!pick) return;
    setError(null);
    try {
      await addProjectMember(projectId, pick, companyId);
      setPick("");
      await assigned.reload();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <section className="panel bg-paper">
      <PanelBar title="Team on this project" />
      <p className="px-4 pt-3 text-[0.6875rem] leading-snug text-mute">
        Owners, admins, project managers and estimators see every project. Employees and read-only
        members see only the projects listed here.
      </p>
      {error && <ErrorMark text={error} />}
      {assigned.loading && <LoadingMark />}
      <ul className="mt-2 divide-y divide-line-soft">
        {assigned.rows.map((m) => (
          <li key={m.assignment.user_id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
            <span className="min-w-0 truncate">
              {m.profile?.full_name || m.profile?.email || m.assignment.user_id}
              <span className="microlabel ml-2">{m.assignment.project_role}</span>
            </span>
            {canAssign && (
              <button
                className="font-mono text-xs text-mute hover:text-ink"
                title="Remove from project"
                onClick={() =>
                  void removeProjectMember(projectId, m.assignment.user_id)
                    .then(() => assigned.reload())
                    .catch((e) => setError(describeError(e)))
                }
              >
                ✕
              </button>
            )}
          </li>
        ))}
        {!assigned.loading && assigned.rows.length === 0 && (
          <li className="px-4 py-3 text-xs text-mute">Nobody assigned yet.</li>
        )}
      </ul>
      {canAssign && (
        <div className="flex gap-2 border-t p-3">
          <select className="field flex-1 text-xs" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Assign a team member…</option>
            {candidates.map((m) => (
              <option key={m.membership.user_id} value={m.membership.user_id}>
                {m.profile?.full_name || m.profile?.email} · {m.membership.role.replace("_", " ")}
              </option>
            ))}
          </select>
          <button className="btn btn-xs" disabled={!pick} onClick={() => void add()}>
            Add
          </button>
        </div>
      )}
    </section>
  );
}
