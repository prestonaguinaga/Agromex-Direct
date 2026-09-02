import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, MyContext } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Server-side Supabase client bound to the request's auth cookies. Used by
 * server components, route handlers and server actions. It acts AS THE USER
 * (their JWT), so row-level security applies exactly as in the browser.
 */
export async function createServerSupabase() {
  const { url, key, configured } = supabaseEnv();
  if (!configured) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a server component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

/** The signed-in user's profile, membership, company and capabilities in one call. */
export async function loadMyContext(): Promise<{ user: { id: string; email?: string } | null; ctx: MyContext | null }> {
  const sb = await createServerSupabase();
  if (!sb) return { user: null, ctx: null };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { user: null, ctx: null };
  const { data, error } = await sb.rpc("my_context");
  if (error) throw new Error(error.message);
  return { user: { id: user.id, email: user.email }, ctx: data as unknown as MyContext };
}
