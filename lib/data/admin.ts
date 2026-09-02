import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client. SERVER ONLY — the `server-only` import above makes the
 * build fail if this file is ever pulled into a client bundle. Used solely for
 * admin auth operations (inviting a user) after the caller's own permission
 * has been verified with their user-scoped client.
 */
export function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
