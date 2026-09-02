"use client";

/**
 * A tiny in-page signal: "rows in these tables just changed, reload if you
 * show them". Bob's server-side writes arrive through it (the estimate hook
 * ignores its own realtime echoes on purpose, and realtime can lag), and any
 * screen may raise it after a bulk change.
 */
export interface RefreshDetail {
  projectId: string | null;
  tables: string[];
}

const EVENT = "monarch:refresh";

export function emitRefresh(detail: RefreshDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RefreshDetail>(EVENT, { detail }));
}

export function onRefresh(cb: (d: RefreshDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent<RefreshDetail>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
