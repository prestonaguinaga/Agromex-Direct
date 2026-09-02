"use client";

import { createContext, useContext, useMemo } from "react";
import type { CompanyRow, MembershipRow, MyContext, ProfileRow, RoleKey } from "./database.types";

export interface Session {
  userId: string;
  email: string | null;
  profile: ProfileRow | null;
  membership: MembershipRow | null;
  company: CompanyRow | null;
  role: RoleKey | null;
  capabilities: ReadonlySet<string>;
  can: (capability: string) => boolean;
  displayName: string;
  initials: string;
}

const Ctx = createContext<Session | null>(null);

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Administrator",
  project_manager: "Project manager",
  estimator: "Estimator",
  employee: "Employee",
  read_only: "Read only",
};

export function buildSession(userId: string, email: string | null, ctx: MyContext | null): Session {
  const caps = new Set(ctx?.capabilities ?? []);
  const name = ctx?.profile?.full_name?.trim() || email || "Signed in";
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return {
    userId,
    email,
    profile: ctx?.profile ?? null,
    membership: ctx?.membership ?? null,
    company: ctx?.company ?? null,
    role: ctx?.membership?.role ?? null,
    capabilities: caps,
    can: (c) => caps.has(c),
    displayName: name,
    initials: initials || "•",
  };
}

export function SessionProvider({
  userId,
  email,
  ctx,
  children,
}: {
  userId: string;
  email: string | null;
  ctx: MyContext | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => buildSession(userId, email, ctx), [userId, email, ctx]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The signed-in session; throws when used outside the app shell. */
export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}

/** Same, but null outside the shell (for components shared with public pages). */
export function useSessionOptional(): Session | null {
  return useContext(Ctx);
}

export function useCan(capability: string): boolean {
  return useContext(Ctx)?.can(capability) ?? false;
}
