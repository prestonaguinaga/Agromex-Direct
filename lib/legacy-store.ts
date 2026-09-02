"use client";

import type { Project } from "./types";

/**
 * Reader for the estimator's old browser-only store (localStorage key
 * `agromex.quotes.v1`) and its JSON backup files. Read-only: the database is
 * the authoritative store now; this exists so nothing already on a computer
 * is lost when moving to Monarch Admin.
 */
export const LEGACY_KEY = "agromex.quotes.v1";

interface LegacyShape {
  version: number;
  projects: Project[];
}

export function parseLegacyBackup(raw: string): Project[] {
  const parsed = JSON.parse(raw) as Partial<LegacyShape>;
  if (!parsed || !Array.isArray(parsed.projects)) throw new Error("Not an estimator backup file.");
  return parsed.projects.filter((p) => p && typeof p.id === "string" && Array.isArray(p.sections));
}

export function readLegacyLocalStorage(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    return raw ? parseLegacyBackup(raw) : [];
  } catch {
    return [];
  }
}

/** Keep the old data on the device but mark it imported so it isn't offered again. */
export function markLegacyImported(): void {
  try {
    window.localStorage.setItem(`${LEGACY_KEY}.imported`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

export function legacyAlreadyImported(): boolean {
  try {
    return Boolean(window.localStorage.getItem(`${LEGACY_KEY}.imported`));
  } catch {
    return false;
  }
}
