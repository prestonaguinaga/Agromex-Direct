"use client";

import { useEffect, useState } from "react";
import type { FileRow, PhaseStatus, ProjectPhaseRow, TaskRow } from "@/lib/data/database.types";
import { signedUrls } from "@/lib/data/files";
import { scheduleHealth, type ScheduleHealth } from "@/lib/data/progress";
import { STATUS_LABELS } from "@/lib/data/tasks";
import { formatWhen } from "@/components/ui";

/* ── Progress meter with its source spelled out ─────────────────────────── */
export function ProgressMeter({
  displayPct,
  calculatedPct,
  manualPct,
  manualBy,
  manualAt,
  manualNote,
  compact = false,
}: {
  displayPct: number;
  calculatedPct: number;
  manualPct: number | null;
  manualBy?: string;
  manualAt?: string | null;
  manualNote?: string;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Number(displayPct) || 0));
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <span className={`tnum font-mono ${compact ? "text-2xl" : "text-4xl md:text-5xl"}`}>{pct.toFixed(0)}%</span>
        <span className="microlabel text-right">
          {manualPct === null ? "calculated from checklists" : "project manager's figure"}
        </span>
      </div>
      <div className={`mt-2 border ${compact ? "h-1.5" : "h-2.5"}`}>
        <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
        {manualPct !== null && (
          <div
            className="relative -mt-[1px] h-[1px] bg-transparent"
            style={{ width: `${Math.max(0, Math.min(100, calculatedPct))}%` }}
            aria-hidden
          >
            <span className="absolute -right-[3px] -top-[8px] font-mono text-[9px] text-mute">▲</span>
          </div>
        )}
      </div>
      <div className={`mt-1.5 grid gap-x-4 gap-y-0.5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <span className="microlabel tnum !normal-case !tracking-normal">
          Calculated progress: <span className="text-ink">{Number(calculatedPct).toFixed(0)}%</span>
        </span>
        <span className="microlabel tnum !normal-case !tracking-normal">
          {manualPct === null ? (
            "No manual override"
          ) : (
            <>
              Manual project-manager progress: <span className="text-ink">{Number(manualPct).toFixed(0)}%</span>
              {manualBy && ` · ${manualBy}`}
              {manualAt && ` · ${formatWhen(manualAt)}`}
              {manualNote && ` · “${manualNote}”`}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/* ── Schedule health chip ───────────────────────────────────────────────── */
export function ScheduleChip({ health }: { health: ScheduleHealth }) {
  const tone =
    health.status === "behind" || health.status === "past_due"
      ? "border-ink bg-ink text-paper"
      : health.status === "ahead" || health.status === "complete"
        ? "border-ink"
        : "border-line text-mute";
  const glyph =
    health.status === "ahead" ? "▲" : health.status === "behind" || health.status === "past_due" ? "▼" : health.status === "complete" ? "✓" : "•";
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${tone}`}>
      <span aria-hidden>{glyph}</span>
      {health.label}
    </span>
  );
}

export function useSchedule(summary: { start_date: string | null; target_end_date: string | null; display_progress_pct: number } | null) {
  return scheduleHealth({
    startDate: summary?.start_date,
    targetDate: summary?.target_end_date,
    progressPct: Number(summary?.display_progress_pct ?? 0),
  });
}

/* ── Phase rail ─────────────────────────────────────────────────────────── */
export const PHASE_GLYPH: Record<PhaseStatus, string> = {
  not_started: "○",
  in_progress: "◐",
  complete: "●",
  blocked: "✕",
};

export function PhaseRail({
  phases,
  tasks,
  canManage,
  onStatus,
  onSelect,
  selectedId,
}: {
  phases: ProjectPhaseRow[];
  tasks: TaskRow[];
  canManage: boolean;
  onStatus?: (phase: ProjectPhaseRow, status: PhaseStatus) => void;
  onSelect?: (phase: ProjectPhaseRow | null) => void;
  selectedId?: string | null;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <ol className="flex min-w-max gap-2">
        {phases.map((p, i) => {
          const inPhase = tasks.filter((t) => t.phase_id === p.id);
          const done = inPhase.filter((t) => t.status === "done").length;
          const pct = p.status === "complete" ? 100 : inPhase.length ? (done / inPhase.length) * 100 : 0;
          const active = p.status === "in_progress";
          const selected = selectedId === p.id;
          return (
            <li
              key={p.id}
              className={`w-40 shrink-0 border p-2.5 ${active ? "border-ink" : "border-line"} ${selected ? "bg-paper-2" : "bg-paper"} ${p.status === "complete" ? "text-mute" : ""}`}
            >
              <button className="block w-full text-left" onClick={() => onSelect?.(selected ? null : p)} disabled={!onSelect}>
                <div className="flex items-center justify-between">
                  <span className="microlabel tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`font-mono text-xs ${active ? "text-ink" : ""}`} title={p.status.replace("_", " ")}>
                    {PHASE_GLYPH[p.status]}
                  </span>
                </div>
                <p className={`mt-1 text-sm font-semibold leading-snug ${p.status === "complete" ? "line-through" : ""}`}>{p.name}</p>
                <div className="mt-2 h-1 border">
                  <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                </div>
                <p className="microlabel tnum mt-1">
                  {inPhase.length ? `${done}/${inPhase.length} items` : "no checklist"}
                </p>
              </button>
              {canManage && onStatus && (
                <select
                  className="field field-quiet mt-1 w-full font-mono text-[0.625rem]"
                  value={p.status}
                  onChange={(e) => onStatus(p, e.target.value as PhaseStatus)}
                >
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="complete">Complete</option>
                </select>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Task line (shared by Overview / Progress lists) ───────────────────── */
export function TaskLine({
  task,
  who,
  onOpen,
}: {
  task: TaskRow;
  who: string;
  onOpen?: (t: TaskRow) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.status !== "done" && task.due_date && task.due_date < today;
  return (
    <li className="flex items-baseline justify-between gap-3 px-4 py-1.5 text-xs">
      <button className="min-w-0 flex-1 truncate text-left hover:underline disabled:no-underline" onClick={() => onOpen?.(task)} disabled={!onOpen}>
        <span className={task.status === "done" ? "text-mute line-through" : ""}>{task.title}</span>
        {task.trade && <span className="microlabel ml-2">{task.trade}</span>}
      </button>
      <span className={`microlabel tnum shrink-0 ${overdue ? "text-ink" : ""}`}>
        {who && `${who} · `}
        {task.status === "done" ? "done" : task.due_date ? `due ${task.due_date}${overdue ? " · overdue" : ""}` : STATUS_LABELS[task.status]}
      </span>
    </li>
  );
}

/* ── Signed thumbnails for private buckets ─────────────────────────────── */
export function thumbPath(f: FileRow): string | null {
  return f.thumb_path ?? (f.mime?.startsWith("image/") ? f.storage_path : null);
}

export function useThumbs(files: FileRow[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const key = files.map((f) => f.id).join(",");
  useEffect(() => {
    const byBucket = new Map<string, string[]>();
    for (const f of files) {
      const p = thumbPath(f);
      if (!p) continue;
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), p]);
    }
    let cancelled = false;
    (async () => {
      const next = new Map<string, string>();
      for (const [bucket, paths] of byBucket) {
        try {
          const m = await signedUrls(bucket, paths);
          for (const [p, u] of m) next.set(`${bucket}:${p}`, u);
        } catch {
          /* thumbnails are cosmetic */
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export function thumbUrl(urls: Map<string, string>, f: FileRow): string | undefined {
  const p = thumbPath(f);
  return p ? urls.get(`${f.bucket}:${p}`) : undefined;
}
