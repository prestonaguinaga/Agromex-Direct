"use client";

import { useMemo, useState } from "react";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { PhaseStatus, ProjectPhaseRow, TaskRow } from "@/lib/data/database.types";
import { addPhase, addStandardPhases, deletePhase, updatePhase } from "@/lib/data/phases";
import { setManualProgress } from "@/lib/data/projects";
import { useSession } from "@/lib/data/session";
import { loadTasks } from "@/lib/data/tasks";
import { useLiveRows } from "@/lib/data/use-live-rows";
import type { Totals } from "@/lib/types";
import { useProjectData } from "./ProjectContext";
import { PhaseRail, ProgressMeter, ScheduleChip, TaskLine, useSchedule } from "./bits";

export function ProgressPanel({ totals, onOpenTask }: { totals: Totals | null; onOpenTask: (t: TaskRow) => void }) {
  const session = useSession();
  const data = useProjectData();
  const { projectId, companyId, summary: s, phases } = data;
  const canManage = session.can("tasks.manage") || session.can("projects.edit");
  const canOverride = session.can("progress.override");

  const tasks = useLiveRows<TaskRow>(`pr-tasks:${projectId}`, () => loadTasks(projectId), [{ table: "tasks", filter: `project_id=eq.${projectId}` }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ProjectPhaseRow | null>(null);
  const [newPhase, setNewPhase] = useState("");
  const [override, setOverride] = useState<{ pct: string; note: string } | null>(null);
  const health = useSchedule(s);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([data.reloadPhases(), data.reloadSummary(), tasks.reload()]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const byPhase = (t: TaskRow) => (selected ? t.phase_id === selected.id : true);
  const current = tasks.rows.filter((t) => t.status === "in_progress").filter(byPhase);
  const blocked = tasks.rows.filter((t) => t.status === "blocked").filter(byPhase);
  const overdue = tasks.rows.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).filter(byPhase);
  const upcoming = tasks.rows
    .filter((t) => t.status === "todo" && !(t.due_date && t.due_date < today))
    .filter(byPhase)
    .sort((a, b) => (a.due_date ?? a.start_date ?? "9999").localeCompare(b.due_date ?? b.start_date ?? "9999"))
    .slice(0, 10);
  const completedPhases = phases.filter((p) => p.status === "complete");
  const doneCount = tasks.rows.filter((t) => t.status === "done").length;
  const materials = useMemo(() => (totals ? { done: totals.doneItems, total: totals.totalItems } : null), [totals]);

  return (
    <div className="grid gap-4">
      {error && <ErrorMark text={error} />}

      {/* ── Completion ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="panel bg-paper">
          <PanelBar title="Overall completion" right={data.summaryLoading && <span className="microlabel">syncing…</span>} />
          <div className="p-4">
            <ProgressMeter
              displayPct={Number(s?.display_progress_pct ?? 0)}
              calculatedPct={Number(s?.progress_pct ?? 0)}
              manualPct={s?.manual_progress_pct == null ? null : Number(s.manual_progress_pct)}
              manualBy={data.memberName(s?.manual_progress_by)}
              manualAt={s?.manual_progress_at}
              manualNote={s?.manual_progress_note}
            />
            <p className="microlabel tnum mt-3 !normal-case !tracking-normal">
              Calculated from tasks and checklist items: {doneCount} of {tasks.rows.length} complete
              {materials && materials.total > 0 && ` · Estimate materials handled: ${materials.done} of ${materials.total} (not counted)`}
            </p>
          </div>
          {canOverride && (
            <div className="border-t p-4">
              {override ? (
                <div className="grid gap-2 sm:grid-cols-[100px_1fr_auto_auto]">
                  <div>
                    <Label>Percent</Label>
                    <input type="number" min={0} max={100} className="field field-mono" value={override.pct} onChange={(e) => setOverride({ ...override, pct: e.target.value })} />
                  </div>
                  <div>
                    <Label>Why (shown next to the figure)</Label>
                    <input className="field text-sm" value={override.note} onChange={(e) => setOverride({ ...override, note: e.target.value })} placeholder="e.g. Framing ahead of the checklist" />
                  </div>
                  <button
                    className="btn btn-solid self-end"
                    disabled={busy || override.pct === ""}
                    onClick={() => void run(() => setManualProgress(projectId, Math.max(0, Math.min(100, Number(override.pct))), override.note)).then(() => setOverride(null))}
                  >
                    Set
                  </button>
                  <button className="btn btn-ghost self-end" onClick={() => setOverride(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-xs" onClick={() => setOverride({ pct: String(Math.round(Number(s?.display_progress_pct ?? 0))), note: s?.manual_progress_note ?? "" })}>
                    {s?.manual_progress_pct == null ? "Set project-manager progress" : "Change manual progress"}
                  </button>
                  {s?.manual_progress_pct != null && (
                    <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => void run(() => setManualProgress(projectId, null, ""))}>
                      Clear override · use calculated
                    </button>
                  )}
                  <span className="microlabel !normal-case !tracking-normal">Both figures stay visible; the manual one is displayed when set.</span>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="panel bg-paper">
          <PanelBar title="Schedule" />
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ScheduleChip health={health} />
              <span className="microlabel tnum">
                {s?.start_date ?? "start —"} → {s?.target_end_date ?? "target —"}
                {health.daysRemaining !== null && health.status !== "complete" && ` · ${health.daysRemaining >= 0 ? `${health.daysRemaining} days left` : `${-health.daysRemaining} days over`}`}
              </span>
            </div>
            <div className="mt-4 grid gap-1">
              <div className="flex justify-between">
                <span className="microlabel">Schedule elapsed</span>
                <span className="microlabel tnum">{health.elapsedPct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 border">
                <div className="h-full bg-mute" style={{ width: `${health.elapsedPct}%` }} />
              </div>
              <div className="mt-2 flex justify-between">
                <span className="microlabel">Work complete</span>
                <span className="microlabel tnum">{Number(s?.display_progress_pct ?? 0).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 border">
                <div className="h-full bg-ink" style={{ width: `${Math.min(100, Number(s?.display_progress_pct ?? 0))}%` }} />
              </div>
            </div>
            <p className="microlabel mt-3 !normal-case !tracking-normal">
              {health.status === "no_dates"
                ? "Set the start and target dates on Overview to see ahead / behind."
                : `Expected ${health.expectedPct.toFixed(0)}% by today on a straight-line schedule; ${health.deltaPts >= 0 ? "+" : ""}${health.deltaPts.toFixed(0)} points.`}
            </p>
          </div>
        </section>
      </div>

      {/* ── Phases ──────────────────────────────────────────────── */}
      <section className="panel bg-paper">
        <PanelBar
          title={`Construction phases · ${phases.length}`}
          right={
            <span className="microlabel">
              {data.current ? `current: ${data.current.name}` : phases.length ? "all complete" : ""}
              {selected && ` · filtering lists by ${selected.name}`}
            </span>
          }
        />
        <div className="p-3">
          {data.phasesLoading && <LoadingMark text="Loading phases…" />}
          {!data.phasesLoading && phases.length === 0 && (
            <div className="py-6 text-center">
              <p className="microlabel">No construction phases yet</p>
              {canManage && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button className="btn btn-solid" disabled={busy} onClick={() => void run(() => addStandardPhases({ companyId, projectId, withChecklists: true, existing: phases }).then(() => {}))}>
                    Add standard phases + checklists
                  </button>
                  <button className="btn" disabled={busy} onClick={() => void run(() => addStandardPhases({ companyId, projectId, withChecklists: false, existing: phases }).then(() => {}))}>
                    Phases only
                  </button>
                </div>
              )}
              <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-mute">
                Preconstruction → Sitework → Foundation → Framing → Roofing → MEP Rough → Insulation → Drywall → Interior Finish → Exterior → Final Inspections → Punch List → Complete
              </p>
            </div>
          )}
          {phases.length > 0 && (
            <PhaseRail
              phases={phases}
              tasks={tasks.rows}
              canManage={canManage}
              selectedId={selected?.id}
              onSelect={setSelected}
              onStatus={(p, status) => void run(() => updatePhase(p.id, { status }))}
            />
          )}
        </div>
        {canManage && phases.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t p-3">
            <input className="field flex-1 text-sm" placeholder="Add a phase (e.g. Pool, Detached garage)…" value={newPhase} onChange={(e) => setNewPhase(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newPhase.trim()) void run(() => addPhase({ companyId, projectId, name: newPhase.trim(), position: phases.length }).then(() => setNewPhase(""))); }} />
            <button className="btn btn-xs" disabled={busy || !newPhase.trim()} onClick={() => void run(() => addPhase({ companyId, projectId, name: newPhase.trim(), position: phases.length }).then(() => setNewPhase("")))}>
              + Phase
            </button>
            {phases.length < 13 && (
              <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => void run(() => addStandardPhases({ companyId, projectId, withChecklists: true, existing: phases }).then(() => {}))}>
                Add missing standard phases
              </button>
            )}
            {selected && (
              <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => { if (confirm(`Remove phase "${selected.name}"? Its tasks and photos stay on the project.`)) void run(() => deletePhase(selected.id)).then(() => setSelected(null)); }}>
                Remove {selected.name}
              </button>
            )}
          </div>
        )}
        {selected && (
          <div className="grid gap-3 border-t p-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <p className="microlabel">Selected phase</p>
              <p className="font-display text-sm">{selected.name}</p>
              <p className="microlabel tnum mt-1 !normal-case !tracking-normal">
                {selected.actual_start ? `Started ${selected.actual_start}` : "Not started"}
                {selected.actual_end && ` · finished ${selected.actual_end}`}
              </p>
            </div>
            <div>
              <Label>Planned start</Label>
              <input type="date" className="field field-mono" value={selected.planned_start ?? ""} disabled={!canManage} onChange={(e) => void run(() => updatePhase(selected.id, { planned_start: e.target.value || null }))} />
            </div>
            <div>
              <Label>Planned end</Label>
              <input type="date" className="field field-mono" value={selected.planned_end ?? ""} disabled={!canManage} onChange={(e) => void run(() => updatePhase(selected.id, { planned_end: e.target.value || null }))} />
            </div>
          </div>
        )}
      </section>

      {/* ── Work lists ──────────────────────────────────────────── */}
      {tasks.error && <ErrorMark text={tasks.error} onRetry={() => void tasks.reload()} />}
      <div className="grid gap-4 lg:grid-cols-3">
        <Work title="Current work" tasks={current} empty="Nothing marked in progress" who={data.memberName} sub={data.subName} onOpen={onOpenTask} />
        <Work title="Upcoming work" tasks={upcoming} empty="Nothing queued" who={data.memberName} sub={data.subName} onOpen={onOpenTask} />
        <Work title="Delayed / blocked" tasks={[...blocked, ...overdue.filter((t) => t.status !== "blocked")]} empty="Nothing blocked or overdue" who={data.memberName} sub={data.subName} onOpen={onOpenTask} emphasis />
      </div>

      {/* ── Completed phases ────────────────────────────────────── */}
      <section className="panel bg-paper">
        <PanelBar title={`Completed phases · ${completedPhases.length}`} />
        {completedPhases.length === 0 ? (
          <EmptyMark text="No phase has been completed yet" />
        ) : (
          <ul className="divide-y divide-line-soft">
            {completedPhases.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-xs">
                <span>● {p.name}</span>
                <span className="microlabel tnum">
                  {p.actual_start ?? "—"} → {p.actual_end ?? "—"}
                  {p.updated_at && ` · ${formatWhen(p.updated_at)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Work({ title, tasks, empty, who, sub, onOpen, emphasis = false }: { title: string; tasks: TaskRow[]; empty: string; who: (id: string | null) => string; sub: (id: string | null) => string; onOpen: (t: TaskRow) => void; emphasis?: boolean }) {
  return (
    <section className={`panel bg-paper ${emphasis && tasks.length ? "border-ink" : ""}`}>
      <PanelBar title={`${title} · ${tasks.length}`} />
      {tasks.length === 0 ? (
        <p className="px-4 py-3 text-xs text-mute">{empty}</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {tasks.map((t) => (
            <TaskLine key={t.id} task={t} who={who(t.assignee_id) || sub(t.subcontractor_id)} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  );
}

export type { PhaseStatus };
