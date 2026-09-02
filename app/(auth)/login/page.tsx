"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appConfig } from "@/app.config";
import { Wordmark } from "@/components/ui";
import { Label } from "@/components/ui";
import { describeError, supabase } from "@/lib/data/client";
import { supabaseEnv } from "@/lib/data/env";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function Login() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") || "/projects";
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [sent, setSent] = useState(false);
  const configured = supabaseEnv().configured;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "password") {
        const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      } else {
        const { error } = await supabase().auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        setSent(true);
      }
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
          <span className="microlabel">Sheet 00 · Sign in</span>
        </div>
        <div className="panel rise-in bg-paper">
          <div className="bar border-b px-4 py-2.5">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
              {appConfig.appName}
            </span>
          </div>

          {!configured ? (
            <div className="p-5 text-sm leading-relaxed text-mute">
              This deployment isn&apos;t connected to Supabase yet. Set{" "}
              <code className="font-mono text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono text-ink">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> and
              redeploy — see PROJECT_STATUS.md.
            </div>
          ) : sent ? (
            <div className="p-5">
              <p className="font-display text-sm">Check your email</p>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                A sign-in link is on its way to <span className="text-ink">{email}</span>. Open it on this
                device to continue.
              </p>
              <button className="btn btn-ghost mt-4" onClick={() => setSent(false)}>
                ← Back
              </button>
            </div>
          ) : (
            <form className="grid gap-4 p-5" onSubmit={submit}>
              <div>
                <Label>Email</Label>
                <input
                  className="field"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              {mode === "password" && (
                <div>
                  <Label>Password</Label>
                  <input
                    className="field field-mono"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              {error && (
                <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>
              )}
              <button className="btn btn-solid" type="submit" disabled={busy}>
                {busy ? "Signing in…" : mode === "password" ? "Sign in →" : "Email me a sign-in link →"}
              </button>
              <button
                type="button"
                className="microlabel text-left hover:text-ink"
                onClick={() => setMode(mode === "password" ? "link" : "password")}
              >
                {mode === "password" ? "Use an email link instead" : "Use a password instead"}
              </button>
            </form>
          )}
        </div>
        <p className="microlabel mt-4 text-center">
          Private system · access by invitation from {appConfig.company.name}
        </p>
      </div>
    </div>
  );
}
