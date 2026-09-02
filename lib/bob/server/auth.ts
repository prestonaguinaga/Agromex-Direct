import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, MyContext } from "../../data/database.types";
import { supabaseEnv } from "../../data/env";
import type { BobSession, BobSettings, Db } from "./types";

/**
 * Bob's Supabase client is the PERSON's client (their session cookie, their
 * JWT), so every read and write goes through the same row-level security as
 * the screens. The only difference is the x-app-source header, which the
 * audit trigger turns into source = 'bob' on the activity log.
 */
export async function createBobSupabase(): Promise<Db | null> {
  const { url, key, configured } = supabaseEnv();
  if (!configured) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    global: { headers: { "x-app-source": "bob" } },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Route handlers may refresh cookies; proxy.ts does it for pages.
        }
      },
    },
  });
}

export type SessionResult = { ok: true; session: BobSession } | { ok: false; status: number; error: string };

const DEFAULT_DAILY_CAP = 200;

function settingsOf(companySettings: unknown): BobSettings {
  const bob = (companySettings as { bob?: { dailyTurnCap?: unknown; model?: unknown } } | null)?.bob;
  const cap = Number(bob?.dailyTurnCap);
  return {
    dailyTurnCap: Number.isFinite(cap) && cap > 0 ? Math.round(cap) : DEFAULT_DAILY_CAP,
    model: typeof bob?.model === "string" && bob.model.trim() ? bob.model.trim() : null,
  };
}

/** Who is asking, what they may do — loaded fresh on every request (never cached). */
export async function loadBobSession(): Promise<SessionResult> {
  const sb = await createBobSupabase();
  if (!sb) return { ok: false, status: 503, error: "Supabase is not configured." };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in." };

  const { data, error } = await sb.rpc("my_context");
  if (error) return { ok: false, status: 500, error: error.message };
  const ctx = data as unknown as MyContext;
  if (!ctx.membership || !ctx.company) return { ok: false, status: 403, error: "No access yet — ask the owner for an invitation." };
  const caps = new Set(ctx.capabilities ?? []);
  if (!caps.has("bob.use")) return { ok: false, status: 403, error: "Your role can't use Bob. Ask the owner to enable it." };

  const displayName = ctx.profile?.full_name?.trim() || user.email || "there";
  return {
    ok: true,
    session: {
      sb,
      userId: user.id,
      email: user.email ?? null,
      displayName,
      companyId: ctx.company.id,
      companyName: ctx.company.name,
      timezone: ctx.company.timezone || "America/Chicago",
      role: ctx.membership.role,
      capabilities: caps,
      can: (c) => caps.has(c),
      settings: settingsOf(ctx.company.settings),
    },
  };
}
