import { redirect } from "next/navigation";
import { supabaseEnv } from "@/lib/data/env";
import { loadMyContext } from "@/lib/data/server";
import { SessionProvider } from "@/lib/data/session";
import { BootstrapCompany, NoAccess, NotConfigured } from "@/components/shell/Gates";
import { Presence } from "@/components/shell/Presence";
import { BobChat } from "@/components/BobChat";

/**
 * The signed-in shell. Runs on the server per request: loads the user's
 * profile, membership, company and capabilities in one RPC and hands them to
 * every client component through SessionProvider.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnv().configured) return <NotConfigured />;

  const { user, ctx } = await loadMyContext();
  if (!user) redirect("/login");

  if (!ctx?.membership) {
    if (ctx?.companies_exist) return <NoAccess email={user.email ?? null} />;
    return <BootstrapCompany email={user.email ?? null} />;
  }

  return (
    <SessionProvider userId={user.id} email={user.email ?? null} ctx={ctx}>
      <Presence userId={user.id} />
      {children}
      {/* Bob rides along on every page; the /bob sheet renders him full width instead. */}
      <BobChat mode="floating" />
    </SessionProvider>
  );
}
