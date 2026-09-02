"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "./client";
import { subscribeRows, type TableSub } from "./realtime";

export interface LiveRows<T> {
  rows: T[];
  /** true until the first load for this key resolves */
  loading: boolean;
  /** true while a reload is in flight after the first load */
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Optimistic local edit; the next reload (or realtime echo) reconciles. */
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Load a list from the database and keep it current: reloads when any row
 * on the subscribed tables changes (own writes included — the echo is the
 * confirmation that the save landed on every other device too).
 */
export function useLiveRows<T>(
  key: string,
  load: () => Promise<T[]>,
  subs: TableSub[],
  enabled = true,
): LiveRows<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  const subsRef = useRef(subs);
  const alive = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest loader / subscriptions without re-subscribing every render.
  useEffect(() => {
    loadRef.current = load;
    subsRef.current = subs;
  });

  const reload = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      const next = await loadRef.current();
      if (!alive.current) return;
      setRows(next);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setError(describeError(e));
    } finally {
      if (alive.current) {
        setLoadedKey(key);
        setRefreshing(false);
      }
    }
  }, [enabled, key]);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    void reload();
    const unsubscribe = subscribeRows(`live:${key}`, subsRef.current, () => {
      // Coalesce bursts (a bulk insert fires one event per row).
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void reload(), 150);
    });
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      unsubscribe();
    };
  }, [key, enabled, reload]);

  return { rows, loading: enabled && loadedKey !== key, refreshing, error, reload, setRows };
}
