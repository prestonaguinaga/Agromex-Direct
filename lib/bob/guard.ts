import type { BobSensitivity } from "./protocol";

/**
 * The confirmation gate's vocabulary: which kinds of action need a yes from
 * the person before Bob may do them, and how the preview is worded. Pure.
 */

export interface GuardDecision {
  sensitivity: BobSensitivity;
  preview: string;
}

export const SENSITIVITY_LABEL: Record<BobSensitivity, string> = {
  delete: "Deletes information",
  money: "Changes project financial information",
  permissions: "Changes someone's access",
  email: "Sends an external email",
  applicant: "Changes an applicant's final status",
  other: "Significant change",
};

/** "Large" money change: at least $1,000 or 10 % — used for the wording; every money change is confirmed. */
export const LARGE_CHANGE_ABS = 1000;
export const LARGE_CHANGE_PCT = 10;

export function isLargeMoneyChange(from: number | null | undefined, to: number): boolean {
  if (from === null || from === undefined) return to >= LARGE_CHANGE_ABS;
  const delta = Math.abs(to - from);
  if (delta >= LARGE_CHANGE_ABS) return true;
  if (from !== 0 && (delta / Math.abs(from)) * 100 >= LARGE_CHANGE_PCT) return true;
  return false;
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const whole = Math.abs(n - Math.round(n)) < 0.005;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export function moneyChangePreview(what: string, from: number | null | undefined, to: number): string {
  const size = isLargeMoneyChange(from, to) ? " (large change)" : "";
  if (from === null || from === undefined) return `Set ${what} to ${fmtMoney(to)}${size}`;
  const pct = from !== 0 ? Math.round(((to - from) / Math.abs(from)) * 100) : null;
  const pctTxt = pct === null ? "" : `, ${pct >= 0 ? "+" : ""}${pct}%`;
  return `Change ${what} from ${fmtMoney(from)} to ${fmtMoney(to)}${pctTxt}${size}`;
}

export function deletePreview(what: string, name: string): string {
  return `Delete ${what} "${name}"`;
}
