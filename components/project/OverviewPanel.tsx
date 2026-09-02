"use client";

import { useMemo, useState } from "react";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { loadProjectActivity } from "@/lib/data/activity";
import { budgetFigures, loadBudget, type BudgetBundle } from "@/lib/data/budgets";
import { describeError } from "@/lib/data/client";
import type { AuditLogRow, FileRow, ProjectStatus, TaskRow } from "@/lib/data/database.types";
import { loadFiles } from "@/lib/data/files";
import { loadNotes, type NoteWithAuthor } from "@/lib/data/notes";
import { groupActivity } from "@/lib/data/progress";
import { updateProjectFields } from "@/lib/data/projects";
import { useSession } from "@/lib/data/session";
import { loadTasks } from "@/lib/data/tasks";
import { addProjectMember, listProjectMembers, removeProjectMember, type ProjectMember } from "@/lib/data/team";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { money } from "@/lib/format";
import type { Project, Totals } from "@/lib/types";
import { useProjectData } from "./ProjectContext";
import { ProgressMeter, ScheduleChip, TaskLine, thumbUrl, useSchedule, useThumbs } from "./bits";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "estimating", label: "Estimating" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "complete", label: "Complete" },
  { value: "archived", label: "Archived" },
];

const UPCOMING_DAYS = 14;

export function OverviewPanel({
  project,
  totals,
  onOpenTab,
}: {
  project: Project;
  totals: Totals | null;
  onOpenTab: (tab: string) => void;
}) {
  const session = useSession();
  const data = useProjectData();
  const { projectId, companyId, summary: s } = data;
  const canEditProject = session.can("projects.edit");
  const canMoney = session.can("budgets.view");
  const [error, setError] = useState<string | null>(null);

  const tasks = useLiveRows<TaskRow>(`ov-tasks:${projectId}`, () => loadTasks(projectId), [{ table: "tasks", filter: `project_id=eq.${projectId}` }]);
  const notes = useLiveRows<NoteWithAuthor>(`ov-notes:${projectId}`, () => loadNotes(projectId), [{ table: "notes", filter: `project_id=eq.${projectId}` }]);
  const photos = useLiveRows<FileRow>(
    `ov-photos:${projectId}`,
    async () => (await loadFiles(projectId)).filter((f) => f.kind === "photo").slice(0, 6),
    [{ table: "files", filter: `project_id=eq.${projectId}` }],
    session.can("files.view"),
  );
  const budget = useLiveRows<BudgetBundle>(
    `ov-budget:${projectId}`,
    async () => [await loadBudget(projectId)],
    [{ table: "budgets", filter: `project_id=eq.${projectId}` }, { table: "budget_lines", filter: `project_id=eq.${projectId}` }],
    canMoney,
  );
  const activity = useLiveRows<AuditLogRow>(
    `ov-activity:${projectId}`,
    () => loadProjectActivity(projectId, 12),
    [{ table: "audit_log", filter: `project_id=eq.${projectId}` }],
    session.can("audit.view_project"),
  );
  const urls = useThumbs(photos.rows);
  const health = useSchedule(s);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const horizonDate = new Date(now);
  horizonDate.setDate(horizonDate.getDate() + UPCOMING_DAYS);
  const horizon = horizonDate.toISOString().slice(0, 10);
  const inProgress = tasks.rows.filter((t) => t.status === "in_progress");
  const overdue = tasks.rows.filter((t) => t.status !== "done" && t.due_date && t.due_date < today);
  const upcoming = tasks.rows
    .filter((t) => t.status === "todo" && (!t.due_date || (t.due_date >= today && t.due_date <= horizon)))
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 6);
  const figures = useMemo(() => budgetFigures(budget.rows[0]?.budget ?? null, budget.rows[0]?.lines ?? []), [budget.rows]);
  const feed = useMemo(() => groupActivity(activity.rows).slice(0, 6), [activity.rows]);
  const latestNote = notes.rows.find((n) => !n.note.deleted_at) ?? null;

  const patch = async (fields: Parameters<typeof updateProjectFields>[1]) => {
    setError(null);
    try {
      await updateProjectFields(projectId, fields);
      await data.reloadSummary();
    } catch (e) {
      setError(describeError(e));
    }
  };

  const contractShown = figures.contract ?? (totals ? totals.grand : null);

  return (
    <div className="grid gap-4">
      {error && <ErrorMark text={error} />}

      {/* ── Where are we ────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <PanelBar
          title="Where are we"
          right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("progress")}>Progress sheet →</button>}
        />
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="microlabel">Current construction phase</p>
            <p className="font-display mt-1 text-lg leading-tight md:text-xl">
              {data.current?.name ?? (data.phases.length ? "All phases complete" : "No phases set up")}
            </p>
            {data.next && <p className="microlabel mt-1 !normal-case !tracking-normal">Next: {data.next.name}</p>}
            {data.phases.length > 0 && (
              <p className="microlabel tnum mt-1">
                {s?.phases_complete ?? 0}/{s?.phases_total ?? 0} phases complete
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ScheduleChip health={health} />
              <span className="microlabel tnum">
                {s?.start_date ?? "start —"} → {s?.target_end_date ?? "target —"}
              </span>
            </div>
          </div>
          <div>
            <ProgressMeter
              compact
              displayPct={Number(s?.display_progress_pct ?? 0)}
              calculatedPct={Number(s?.progress_pct ?? 0)}
              manualPct={s?.manual_progress_pct == null ? null : Number(s.manual_progress_pct)}
              manualBy={data.memberName(s?.manual_progress_by)}
              manualAt={s?.manual_progress_at}
              manualNote={s?.manual_progress_note}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x border-t sm:grid-cols-4">
          {[
            ["Being worked on", inProgress.length],
            ["Overdue", overdue.length],
            [`Coming up · ${UPCOMING_DAYS}d`, upcoming.length],
            ["Complete", s?.tasks_done ?? 0],
          ].map(([k, v]) => (
            <div key={String(k)} className="px-4 py-2">
              <p className="microlabel">{k}</p>
              <p className="tnum font-mono text-lg">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ── Project facts ───────────────────────────────────────── */}
        <section className="panel bg-paper">
          <PanelBar title="Project" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Project name" value={s?.name ?? project.name} onCommit={(v) => void patch({ name: v })} editable={canEditProject} />
            <div>
              <Label>Status</Label>
              <select className="field" value={s?.status ?? "estimating"} disabled={!canEditProject} onChange={(e) => void patch({ status: e.target.value as ProjectStatus })}>
                {STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Field label="Project address" value={s?.address ?? project.info.address} onCommit={(v) => void patch({ address: v })} editable={canEditProject} placeholder="Street, city" />
            </div>
            <Field label="Customer" value={s?.client_name ?? project.info.client} onCommit={(v) => void patch({ client_name: v })} editable={canEditProject} />
            <Field label="Customer phone" value={s?.client_phone ?? project.info.phone} onCommit={(v) => void patch({ client_phone: v })} editable={canEditProject} />
            <div>
              <Label>Project manager</Label>
              <select className="field" value={s?.manager_id ?? ""} disabled={!canEditProject} onChange={(e) => void patch({ manager_id: e.target.value || null })}>
                <option value="">—</option>
                {data.members
                  .filter((m) => m.membership.is_active)
                  .map((m) => (
                    <option key={m.membership.user_id} value={m.membership.user_id}>
                      {m.profile?.full_name || m.profile?.email}
                    </option>
                  ))}
              </select>
            </div>
            <Field label="Customer email" value={s?.client_email ?? ""} onCommit={(v) => void patch({ client_email: v })} editable={canEditProject} />
            <DateField label="Start date" value={s?.start_date ?? null} disabled={!canEditProject} onCommit={(v) => void patch({ start_date: v })} />
            <DateField label="Target completion" value={s?.target_end_date ?? null} disabled={!canEditProject} onCommit={(v) => void patch({ target_end_date: v })} />
          </div>
        </section>

        {/* ── Money ───────────────────────────────────────────────── */}
        {canMoney ? (
          <section className="panel bg-paper">
            <PanelBar title="Money" right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("budget")}>Budget sheet →</button>} />
            {budget.loading ? (
              <LoadingMark />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 sm:grid-cols-3">
                <Money label={figures.contract == null ? "Estimate total (no contract set)" : "Original contract"} value={contractShown} />
                <Money label="Current approved budget" value={figures.budgeted} />
                <Money label="Committed" value={figures.committed} />
                <Money label="Paid / spent" value={figures.actual} />
                <Money label="Remaining budget" value={figures.remaining} />
                <Money label="Budget variance" value={figures.variance} signed hint="budget − committed − spent" />
              </div>
            )}
            {!budget.loading && !budget.rows[0]?.budget && (
              <p className="microlabel border-t px-4 py-2 !normal-case !tracking-normal">
                No budget yet — open the Budget sheet to create one from the estimate.
              </p>
            )}
          </section>
        ) : (
          <ProjectTeamCard projectId={projectId} companyId={companyId} />
        )}
      </div>

      {/* ── Work ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WorkList title="Being worked on now" tasks={inProgress} empty="Nothing marked in progress" who={data.memberName} subName={data.subName} onOpen={() => onOpenTab("tasks")} />
        <WorkList title={`Coming up · next ${UPCOMING_DAYS} days`} tasks={upcoming} empty="Nothing scheduled" who={data.memberName} subName={data.subName} onOpen={() => onOpenTab("tasks")} />
        <WorkList title="Overdue" tasks={overdue} empty="Nothing overdue" who={data.memberName} subName={data.subName} onOpen={() => onOpenTab("tasks")} emphasis />
      </div>
      {tasks.loading && <LoadingMark text="Loading tasks…" />}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ── Latest note ─────────────────────────────────────────── */}
        <section className="panel bg-paper">
          <PanelBar title="Latest note" right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("notes")}>All notes →</button>} />
          {notes.loading && <LoadingMark />}
          {!notes.loading && !latestNote && <EmptyMark text="No notes yet" />}
          {latestNote && (
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold">{latestNote.author?.full_name || latestNote.author?.email || "Unknown"}</span>
                <span className="microlabel tnum">{formatWhen(latestNote.note.created_at)}</span>
              </div>
              <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed">{latestNote.note.body}</p>
            </div>
          )}
        </section>

        {/* ── Latest photos ───────────────────────────────────────── */}
        <section className="panel bg-paper">
          <PanelBar title="What the jobsite looks like" right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("photos")}>All photos →</button>} />
          {photos.loading && <LoadingMark />}
          {!photos.loading && photos.rows.length === 0 && <EmptyMark text="No progress photos yet" />}
          {photos.rows.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 p-2">
              {photos.rows.map((f) => (
                <button key={f.id} className="relative block border" onClick={() => onOpenTab("photos")}>
                  {thumbUrl(urls, f) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(urls, f)} alt={f.caption || f.name} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center font-mono text-xs text-mute">…</div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-paper/85 px-1 py-0.5 font-mono text-[0.5625rem]">
                    {formatWhen(f.taken_at ?? f.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Recent changes ──────────────────────────────────────── */}
      {session.can("audit.view_project") && (
        <section className="panel bg-paper">
          <PanelBar title="What changed recently" right={<button className="microlabel hover:text-ink" onClick={() => onOpenTab("activity")}>Full activity →</button>} />
          {activity.loading && <LoadingMark />}
          {!activity.loading && feed.length === 0 && <EmptyMark text="Nothing yet" />}
          <ul className="divide-y divide-line-soft">
            {feed.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-xs">
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{item.actorName}</span> {item.summary}.
                </span>
                <span className="microlabel tnum shrink-0">{formatWhen(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canMoney && <ProjectTeamCard projectId={projectId} companyId={companyId} />}
    </div>
  );
}

function Field({ label, value, onCommit, editable, placeholder }: { label: string; value: string; onCommit: (v: string) => void; editable: boolean; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <TextInput value={value} onCommit={onCommit} className={editable ? "" : "pointer-events-none"} placeholder={placeholder} />
    </div>
  );
}

function DateField({ label, value, disabled, onCommit }: { label: string; value: string | null; disabled: boolean; onCommit: (v: string | null) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type="date" className="field field-mono" value={value ?? ""} disabled={disabled} onChange={(e) => onCommit(e.target.value || null)} />
    </div>
  );
}

function Money({ label, value, signed = false, hint }: { label: string; value: number | null; signed?: boolean; hint?: string }) {
  const negative = signed && value !== null && value < 0;
  return (
    <div title={hint}>
      <p className="microlabel">{label}</p>
      <p className={`tnum font-mono text-base ${negative ? "font-semibold" : ""}`}>
        {value === null ? "—" : negative ? `(${money(-value)})` : money(value)}
      </p>
      {signed && value !== null && <p className="microlabel !normal-case !tracking-normal">{negative ? "over budget" : "under budget"}</p>}
    </div>
  );
}

function WorkList({
  title,
  tasks,
  empty,
  who,
  subName,
  onOpen,
  emphasis = false,
}: {
  title: string;
  tasks: TaskRow[];
  empty: string;
  who: (id: string | null) => string;
  subName: (id: string | null) => string;
  onOpen: () => void;
  emphasis?: boolean;
}) {
  return (
    <section className={`panel bg-paper ${emphasis && tasks.length ? "border-ink" : ""}`}>
      <PanelBar title={`${title} · ${tasks.length}`} right={<button className="microlabel hover:text-ink" onClick={onOpen}>Tasks →</button>} />
      {tasks.length === 0 ? (
        <p className="px-4 py-3 text-xs text-mute">{empty}</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {tasks.slice(0, 6).map((t) => (
            <TaskLine key={t.id} task={t} who={who(t.assignee_id) || subName(t.subcontractor_id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectTeamCard({ projectId, companyId }: { projectId: string; companyId: string }) {
  const session = useSession();
  const data = useProjectData();
  const canAssign = session.can("projects.edit") || session.can("team.manage");
  const assigned = useLiveRows<ProjectMember>(`project-members:${projectId}`, () => listProjectMembers(projectId), [{ table: "project_members", filter: `project_id=eq.${projectId}` }]);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const assignedIds = new Set(assigned.rows.map((r) => r.assignment.user_id));
  const candidates = data.members.filter((m) => m.membership.is_active && !assignedIds.has(m.membership.user_id));

  return (
    <section className="panel bg-paper">
      <PanelBar title="Team on this project" />
      <p className="px-4 pt-3 text-[0.6875rem] leading-snug text-mute">
        Owners, admins, project managers and estimators see every project; employees and read-only members see the projects listed here.
      </p>
      {error && <ErrorMark text={error} />}
      <ul className="mt-2 divide-y divide-line-soft">
        {assigned.rows.map((m) => (
          <li key={m.assignment.user_id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
            <span className="min-w-0 truncate">
              {m.profile?.full_name || m.profile?.email || m.assignment.user_id}
              <span className="microlabel ml-2">{m.assignment.project_role}</span>
            </span>
            {canAssign && (
              <button className="font-mono text-xs text-mute hover:text-ink" title="Remove from project" onClick={() => void removeProjectMember(projectId, m.assignment.user_id).then(() => assigned.reload()).catch((e) => setError(describeError(e)))}>
                ✕
              </button>
            )}
          </li>
        ))}
        {!assigned.loading && assigned.rows.length === 0 && <li className="px-4 py-3 text-xs text-mute">Nobody assigned yet.</li>}
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
          <button
            className="btn btn-xs"
            disabled={!pick}
            onClick={() =>
              void addProjectMember(projectId, pick, companyId)
                .then(() => {
                  setPick("");
                  return assigned.reload();
                })
                .catch((e) => setError(describeError(e)))
            }
          >
            Add
          </button>
        </div>
      )}
    </section>
  );
}
