"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { appConfig } from "@/app.config";
import { Label, Wordmark } from "@/components/ui";
import { describeError, supabase } from "@/lib/data/client";

function Frame({ title, sheet, children }: { title: string; sheet: string; children: React.ReactNode }) {
  return (
    <div className="sheet-grid grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Wordmark />
          <span className="microlabel">{sheet}</span>
        </div>
        <div className="panel rise-in bg-paper">
          <div className="bar border-b px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">{title}</span>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function NotConfigured() {
  return (
    <Frame title="Setup required" sheet="Sheet 00 · Configuration">
      <p className="text-sm leading-relaxed text-mute">
        {appConfig.appName} needs its Supabase connection. Add these environment variables to the
        deployment and redeploy:
      </p>
      <pre className="mt-3 border border-line bg-paper-2 p-3 font-mono text-xs">
        NEXT_PUBLIC_SUPABASE_URL{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY{"\n"}SUPABASE_SERVICE_ROLE_KEY (server only, for invitations)
      </pre>
      <p className="mt-3 text-xs text-mute">Step-by-step instructions are in PROJECT_STATUS.md.</p>
    </Frame>
  );
}

export function NoAccess({ email }: { email: string | null }) {
  const router = useRouter();
  return (
    <Frame title="No access yet" sheet="Sheet 00 · Access">
      <p className="text-sm leading-relaxed">
        <span className="font-mono">{email}</span> is signed in but hasn&apos;t been added to the{" "}
        {appConfig.company.name} team.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Ask the owner or an administrator to invite this email from Team. Access appears here the moment
        they do — no need to sign out.
      </p>
      <div className="mt-5 flex gap-2">
        <button className="btn" onClick={() => router.refresh()}>
          Check again
        </button>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await supabase().auth.signOut();
            router.replace("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </Frame>
  );
}

/** First run: the very first signed-in person creates the company and becomes Owner. */
export function BootstrapCompany({ email }: { email: string | null }) {
  const router = useRouter();
  const [name, setName] = useState<string>(appConfig.company.name);
  const [short, setShort] = useState<string>(appConfig.company.wordmark);
  const [tz, setTz] = useState<string>(appConfig.defaultTimezone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase().rpc("bootstrap_company", {
        p_name: name.trim(),
        p_short_name: short.trim().toUpperCase(),
        p_timezone: tz.trim(),
      });
      if (error) throw error;
      router.refresh();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Frame title="Create the company" sheet="Sheet 00 · First run">
      <p className="text-sm leading-relaxed text-mute">
        No company exists yet. <span className="font-mono text-ink">{email}</span> will become its Owner
        and can invite everyone else from Team.
      </p>
      <div className="mt-4 grid gap-3">
        <div>
          <Label>Company name</Label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Wordmark</Label>
            <input className="field font-display" value={short} onChange={(e) => setShort(e.target.value)} />
          </div>
          <div>
            <Label>Timezone</Label>
            <input className="field field-mono" value={tz} onChange={(e) => setTz(e.target.value)} />
          </div>
        </div>
        {error && <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}
        <button className="btn btn-solid" onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create company and continue →"}
        </button>
      </div>
    </Frame>
  );
}
