import { localYmd } from "../bob/time.ts";
import type { BriefSettings } from "./types.ts";

/**
 * When is a brief due? Pure, so it is unit-tested against fixed instants.
 * The scheduler may tick as often as it likes (every 15 minutes is the
 * recommendation): a brief is due once the local time in the brief's
 * timezone has passed the delivery time and no brief exists yet for that
 * local date. A late tick (the app was down) still produces exactly one.
 */

export function parseTime(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Minutes since local midnight in a timezone. */
export function localMinutes(now: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).formatToParts(now);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return (n("hour") % 24) * 60 + n("minute");
}

export interface DueCheck {
  due: boolean;
  localDate: string;
  localTime: string;
  reason: string;
}

export function isDue(settings: Pick<BriefSettings, "enabled" | "deliveryTime" | "timezone">, now: Date, alreadyHave: (localDate: string) => boolean): DueCheck {
  const tz = isValidTimezone(settings.timezone) ? settings.timezone : "UTC";
  const localDate = localYmd(now, tz);
  const minutes = localMinutes(now, tz);
  const localTime = formatTime(minutes);
  if (!settings.enabled) return { due: false, localDate, localTime, reason: "disabled" };
  const target = parseTime(settings.deliveryTime);
  if (target === null) return { due: false, localDate, localTime, reason: "invalid delivery time" };
  if (minutes < target) return { due: false, localDate, localTime, reason: `before delivery time ${formatTime(target)}` };
  if (alreadyHave(localDate)) return { due: false, localDate, localTime, reason: `already generated for ${localDate}` };
  return { due: true, localDate, localTime, reason: "due" };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "a@x.com, b@y.com\nc@z.com" → valid + invalid lists (lower-cased, de-duplicated). */
export function normalizeRecipients(input: string | string[]): { valid: string[]; invalid: string[] } {
  const raw = Array.isArray(input) ? input : input.split(/[\s,;]+/);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const r of raw) {
    const e = r.trim().toLowerCase();
    if (!e) continue;
    if (EMAIL_RE.test(e)) {
      if (!valid.includes(e)) valid.push(e);
    } else invalid.push(r.trim());
  }
  return { valid, invalid };
}

export const COMMON_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Mexico_City",
  "UTC",
];
