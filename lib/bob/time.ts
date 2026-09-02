/**
 * Timezone-aware date ranges for questions like "what is due this week" or
 * "what did we finish yesterday". Dates are compared as YYYY-MM-DD strings in
 * the company's timezone; timestamps as instants. Pure; no libraries.
 */

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "next_7_days"
  | "next_14_days"
  | "last_7_days"
  | "last_30_days"
  | "this_month";

export const RANGE_PRESETS: RangePreset[] = [
  "today", "yesterday", "this_week", "last_week", "next_7_days", "next_14_days", "last_7_days", "last_30_days", "this_month",
];

export function parsePreset(v: unknown): RangePreset | null {
  return typeof v === "string" && (RANGE_PRESETS as string[]).includes(v) ? (v as RangePreset) : null;
}

function safeTz(tz: string | null | undefined): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz ?? undefined });
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

/** Local calendar date (YYYY-MM-DD) of an instant in a timezone. */
export function localYmd(now: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

/** Monday of the week containing ymd. */
export function startOfWeek(ymd: string): string {
  const w = weekday(ymd);
  return addDays(ymd, w === 0 ? -6 : 1 - w);
}

export interface DateRange {
  /** Inclusive local dates. */
  from: string;
  to: string;
  label: string;
}

export function dateRange(preset: RangePreset, now: Date, tz: string): DateRange {
  const today = localYmd(now, tz);
  switch (preset) {
    case "today":
      return { from: today, to: today, label: "today" };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y, label: "yesterday" };
    }
    case "this_week": {
      const s = startOfWeek(today);
      return { from: s, to: addDays(s, 6), label: "this week (Mon–Sun)" };
    }
    case "last_week": {
      const s = addDays(startOfWeek(today), -7);
      return { from: s, to: addDays(s, 6), label: "last week" };
    }
    case "next_7_days":
      return { from: today, to: addDays(today, 7), label: "the next 7 days" };
    case "next_14_days":
      return { from: today, to: addDays(today, 14), label: "the next 14 days" };
    case "last_7_days":
      return { from: addDays(today, -7), to: today, label: "the last 7 days" };
    case "last_30_days":
      return { from: addDays(today, -30), to: today, label: "the last 30 days" };
    case "this_month": {
      const s = `${today.slice(0, 7)}-01`;
      const next = new Date(`${s}T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return { from: s, to: addDays(next.toISOString().slice(0, 10), -1), label: "this month" };
    }
  }
}

/** The instant at which a local calendar day starts in a timezone. */
export function startOfLocalDay(ymd: string, tz: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"), n("second"));
  const offset = wall - guess.getTime();
  return new Date(guess.getTime() - offset);
}

/** Half-open instant range [fromIso, toIso) covering the local dates of a preset. */
export function instantRange(preset: RangePreset, now: Date, tz: string): { fromIso: string; toIso: string; label: string } {
  const r = dateRange(preset, now, tz);
  return {
    fromIso: startOfLocalDay(r.from, tz).toISOString(),
    toIso: startOfLocalDay(addDays(r.to, 1), tz).toISOString(),
    label: r.label,
  };
}

export function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}
