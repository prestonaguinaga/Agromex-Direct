"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

export type Db = SupabaseClient<Database>;

let cached: Db | null = null;

/** Browser Supabase client (one per tab). Sessions ride in cookies via @supabase/ssr. */
export function supabase(): Db {
  if (cached) return cached;
  const { url, key, configured } = supabaseEnv();
  if (!configured) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  cached = createBrowserClient<Database>(url, key);
  return cached;
}

/** Turn a Supabase/PostgREST error into a sentence a person can act on. */
export function describeError(e: unknown): string {
  if (!e) return "Something went wrong.";
  const err = e as { message?: string; code?: string; details?: string; hint?: string };
  const msg = err.message ?? String(e);
  if (err.code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return "You don't have permission to do that.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(msg)) {
    return "Can't reach the server — check your connection.";
  }
  if (err.code === "23505") return "That record already exists.";
  return msg;
}
