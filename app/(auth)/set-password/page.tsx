"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appConfig } from "@/app.config";
import { Label, Wordmark } from "@/components/ui";
import { describeError, supabase } from "@/lib/data/client";

/** Where an invitation link lands: choose a password (and confirm your name). */
export default function SetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) {
          router.replace("/login?error=Your%20link%20has%20expired.%20Ask%20for%20a%20new%20invitation.");
          return;
        }
        setEmail(data.user.email ?? null);
        setName((data.user.user_metadata?.full_name as string | undefined) ?? "");
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      const sb = supabase();
      const { data, error } = await sb.auth.updateUser({ password, data: { full_name: name.trim() } });
      if (error) throw error;
      if (data.user && name.trim()) {
        await sb.from("profiles").update({ full_name: name.trim() }).eq("id", data.user.id);
      }
      router.replace("/projects");
      router.refresh();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-grid grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <Wordmark />
          <span className="microlabel">Sheet 00 · Welcome</span>
        </div>
        <form className="panel rise-in bg-paper" onSubmit={submit}>
          <div className="bar border-b px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              Set up your {appConfig.appName} access
            </span>
          </div>
          <div className="grid gap-4 p-5">
            <p className="text-sm text-mute">
              Signed in as <span className="font-mono text-ink">{email ?? "…"}</span>
            </p>
            <div>
              <Label>Your name</Label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" />
            </div>
            <div>
              <Label>Password (10+ characters)</Label>
              <input className="field field-mono" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirm password</Label>
              <input className="field field-mono" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}
            <button className="btn btn-solid" type="submit" disabled={busy || !email}>
              {busy ? "Saving…" : "Save and continue →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
