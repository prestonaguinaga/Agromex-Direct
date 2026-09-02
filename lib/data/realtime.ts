"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "./client";

export type RowChange = RealtimePostgresChangesPayload<Record<string, unknown>>;

export interface TableSub {
  table: string;
  /** PostgREST-style filter, e.g. `project_id=eq.<uuid>` */
  filter?: string;
}

/**
 * Subscribe to row changes on one or more tables. Realtime honours RLS, so a
 * user only ever receives rows they could read. Returns an unsubscribe.
 */
export function subscribeRows(
  channel: string,
  subs: TableSub[],
  onChange: (table: string, payload: RowChange) => void,
): () => void {
  let ch;
  try {
    ch = supabase().channel(channel);
  } catch {
    return () => {};
  }
  for (const s of subs) {
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
      (payload: RowChange) => onChange(s.table, payload),
    );
  }
  ch.subscribe();
  const client = supabase();
  return () => {
    void client.removeChannel(ch);
  };
}
