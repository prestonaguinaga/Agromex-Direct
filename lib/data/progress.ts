/**
 * Pure helpers behind the Progress and Overview sheets: schedule health,
 * the current phase, and the activity-feed grouping. No I/O; unit-tested.
 */

export type ScheduleStatus =
  | "no_dates"
  | "not_started"
  | "ahead"
  | "on_track"
  | "behind"
  | "past_due"
  | "complete";

export interface ScheduleHealth {
  status: ScheduleStatus;
  /** Percent of the schedule elapsed (0–100). */
  elapsedPct: number;
  /** Percent complete the schedule expects today. */
  expectedPct: number;
  /** Progress minus expected, in percentage points (positive = ahead). */
  deltaPts: number;
  /** Same delta expressed in working days of schedule (positive = ahead). */
  daysDelta: number;
  daysRemaining: number | null;
  durationDays: number | null;
  label: string;
}

const DAY = 86_400_000;
const TOLERANCE_PTS = 5;

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function scheduleHealth(input: {
  startDate: string | null | undefined;
  targetDate: string | null | undefined;
  progressPct: number;
  today?: Date;
}): ScheduleHealth {
  const today = input.today ?? new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = parseDate(input.startDate);
  const target = parseDate(input.targetDate);
  const progress = Math.max(0, Math.min(100, Number(input.progressPct) || 0));

  if (progress >= 100) {
    return { status: "complete", elapsedPct: 100, expectedPct: 100, deltaPts: 0, daysDelta: 0, daysRemaining: 0, durationDays: null, label: "Complete" };
  }
  if (!start || !target || target <= start) {
    return { status: "no_dates", elapsedPct: 0, expectedPct: 0, deltaPts: 0, daysDelta: 0, daysRemaining: null, durationDays: null, label: "Set start and target dates to track the schedule" };
  }
  const durationDays = Math.max(1, Math.round((target.getTime() - start.getTime()) / DAY));
  const elapsedDays = Math.round((t0.getTime() - start.getTime()) / DAY);
  const daysRemaining = Math.round((target.getTime() - t0.getTime()) / DAY);

  if (elapsedDays < 0) {
    return { status: "not_started", elapsedPct: 0, expectedPct: 0, deltaPts: progress, daysDelta: 0, daysRemaining, durationDays, label: `Starts in ${-elapsedDays} day${-elapsedDays === 1 ? "" : "s"}` };
  }
  const elapsedPct = Math.min(100, (elapsedDays / durationDays) * 100);
  const expectedPct = elapsedPct;
  const deltaPts = progress - expectedPct;
  const daysDelta = Math.round((deltaPts / 100) * durationDays);

  if (daysRemaining < 0) {
    const late = -daysRemaining;
    return { status: "past_due", elapsedPct: 100, expectedPct: 100, deltaPts: progress - 100, daysDelta: -late, daysRemaining, durationDays, label: `${late} day${late === 1 ? "" : "s"} past target` };
  }
  if (deltaPts >= TOLERANCE_PTS) {
    return { status: "ahead", elapsedPct, expectedPct, deltaPts, daysDelta, daysRemaining, durationDays, label: `Ahead by about ${daysDelta} day${daysDelta === 1 ? "" : "s"}` };
  }
  if (deltaPts <= -TOLERANCE_PTS) {
    return { status: "behind", elapsedPct, expectedPct, deltaPts, daysDelta, daysRemaining, durationDays, label: `Behind by about ${-daysDelta} day${-daysDelta === 1 ? "" : "s"}` };
  }
  return { status: "on_track", elapsedPct, expectedPct, deltaPts, daysDelta, daysRemaining, durationDays, label: "On schedule" };
}

export interface PhaseLike {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "complete" | "blocked";
  position: number;
}

/** The phase the crew is on: in progress first, then blocked, then the next not started. */
export function currentPhase<T extends PhaseLike>(phases: T[]): T | null {
  const sorted = [...phases].sort((a, b) => a.position - b.position);
  return (
    sorted.find((p) => p.status === "in_progress") ??
    sorted.find((p) => p.status === "blocked") ??
    sorted.find((p) => p.status === "not_started") ??
    null
  );
}

export function nextPhase<T extends PhaseLike>(phases: T[], current: T | null): T | null {
  const sorted = [...phases].sort((a, b) => a.position - b.position);
  const from = current ? sorted.findIndex((p) => p.id === current.id) + 1 : 0;
  return sorted.slice(from).find((p) => p.status === "not_started") ?? null;
}

// ── Activity feed grouping ─────────────────────────────────────────────────
export interface ActivityRowLike {
  id: number;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string;
  action: string;
  field: string | null;
  summary: string;
  created_at: string;
  kind?: string;
  new_value?: unknown;
}

export interface FeedItem<R extends ActivityRowLike = ActivityRowLike> {
  id: string;
  actorName: string;
  summary: string;
  createdAt: string;
  count: number;
  rows: R[];
}

const GROUP_WINDOW_MS = 15 * 60_000;

function photoKind(row: ActivityRowLike): "photo" | "file" | null {
  if (row.entity_type !== "files" || row.action !== "insert") return null;
  const nv = row.new_value as { kind?: string } | null | undefined;
  return nv?.kind === "photo" ? "photo" : "file";
}

/**
 * Fold bursts of the same kind by the same person into one line, e.g.
 * eight photo inserts within a quarter hour → "uploaded 8 progress photos".
 * Rows must be newest-first (as the queries return them).
 */
export function groupActivity<R extends ActivityRowLike>(rows: R[]): FeedItem<R>[] {
  const out: FeedItem<R>[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    const pk = photoKind(row);
    if (last && pk) {
      const lastPk = photoKind(last.rows[0]);
      const sameActor = last.rows[0].actor_id === row.actor_id;
      const close = Date.parse(last.rows[last.rows.length - 1].created_at) - Date.parse(row.created_at) <= GROUP_WINDOW_MS;
      if (lastPk === pk && sameActor && close) {
        last.rows.push(row);
        last.count += 1;
        last.summary =
          pk === "photo"
            ? `uploaded ${last.count} progress photos`
            : `uploaded ${last.count} files`;
        continue;
      }
    }
    out.push({
      id: String(row.id),
      actorName: row.actor_name ?? "System",
      summary: row.summary,
      createdAt: row.created_at,
      count: 1,
      rows: [row],
    });
  }
  return out;
}

/** "Today", "Yesterday", or "Mon, Sep 1" for feed headers. */
export function dayBucket(iso: string, today: Date = new Date()): string {
  const d = new Date(iso);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((t0.getTime() - d0.getTime()) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}
