"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ErrorMark, Label, LoadingMark, PanelBar, TopBar, formatWhen } from "@/components/ui";
import { COMMON_TIMEZONES, isValidTimezone, normalizeRecipients, parseTime } from "@/lib/brief/schedule";
import { DEFAULT_BRIEF_SETTINGS, type BriefSettings } from "@/lib/brief/types";
import { loadBriefSettings, runBriefNow, saveBriefSettings, type ManualRunResult } from "@/lib/data/briefs";
import { describeError } from "@/lib/data/client";
import type { DailyBriefSettingsRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";

/** Sheet 14 · Settings — today: Bob's Daily Brief. */
export default function SettingsPage() {
  const session = useSession();
  const companyId = session.company?.id ?? "";
  const canManage = session.can("settings.manage");
  const [row, setRow] = useState<DailyBriefSettingsRow | null | undefined>(undefined);
  const [s, setS] = useState<BriefSettings>({ ...DEFAULT_BRIEF_SETTINGS, timezone: session.company?.timezone ?? DEFAULT_BRIEF_SETTINGS.timezone });
  const [recipientsText, setRecipientsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [testResult, setTestResult] = useState<ManualRunResult | null>(null);

  useEffect(() => {
    if (!companyId) return;
    loadBriefSettings(companyId)
      .then((r) => {
        setRow(r);
        if (r) {
          const next: BriefSettings = {
            enabled: r.enabled,
            deliveryTime: String(r.delivery_time).slice(0, 5),
            timezone: r.timezone,
            recipients: r.recipients ?? [],
            includeBudget: r.include_budget,
            includeApplications: r.include_applications,
            includeLeads: r.include_leads,
            includeCompletedProjects: r.include_completed_projects,
            includePhotoPreviews: r.include_photo_previews,
          };
          setS(next);
          setRecipientsText(next.recipients.join("\n"));
        }
      })
      .catch((e) => {
        setRow(null);
        setError(describeError(e));
      });
  }, [companyId]);

  const set = <K extends keyof BriefSettings>(k: K, v: BriefSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setError(null);
    setNotice(null);
    const r = normalizeRecipients(recipientsText);
    if (r.invalid.length) return setError(`These don't look like email addresses: ${r.invalid.join(", ")}`);
    if (parseTime(s.deliveryTime) === null) return setError("Delivery time must be HH:MM.");
    if (!isValidTimezone(s.timezone)) return setError("That timezone isn't recognised (use an IANA name such as America/Chicago).");
    if (s.enabled && r.valid.length === 0) setNotice("Saved. No recipients yet — the brief will be generated and shown here, but not emailed.");
    setBusy("save");
    try {
      const next = { ...s, recipients: r.valid };
      await saveBriefSettings(companyId, next);
      setS(next);
      setRecipientsText(r.valid.join("\n"));
      setRow(await loadBriefSettings(companyId));
      setNotice((n) => n ?? "Saved.");
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setError(null);
    setTestResult(null);
    setBusy("test");
    try {
      setTestResult(await runBriefNow());
      setRow(await loadBriefSettings(companyId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="none" sheet="Sheet 14 · Settings" />
      <main className="mx-auto max-w-4xl px-4 pb-24">
        <section className="rise-in border-x border-b bg-paper p-6 md:p-10">
          <p className="microlabel">Sheet 14 · Settings · {session.company?.name}</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">Bob&apos;s Daily Brief</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            A server-side process — it does not need anyone&apos;s browser open — reads the company database at the delivery time,
            writes the brief, keeps it under <Link href="/briefs" className="underline hover:text-ink">Briefs</Link> and emails it to the
            recipients below. Sensitive sections are switches, not assumptions.
          </p>
        </section>

        {error && <div className="mt-3"><ErrorMark text={error} /></div>}
        {notice && <p className="mt-3 border border-line bg-paper-2 px-4 py-2 font-mono text-xs">{notice}</p>}
        {row === undefined && !error && (
          <div className="panel mt-6 bg-paper">
            <LoadingMark text="Loading settings…" />
          </div>
        )}

        {row !== undefined && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <section className="panel bg-paper">
              <PanelBar title="Daily brief" right={!canManage && <span className="microlabel">read only · needs settings.manage</span>} />
              <div className="grid gap-5 p-4">
                <Toggle checked={s.enabled} disabled={!canManage} onChange={(v) => set("enabled", v)} label="Enable the daily brief" hint="When on, the scheduler generates one brief per day at the delivery time." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Delivery time</Label>
                    <input type="time" className="field field-mono" value={s.deliveryTime} disabled={!canManage} onChange={(e) => set("deliveryTime", e.target.value)} />
                    <p className="microlabel mt-1 !normal-case !tracking-normal">The scheduler ticks every 15 minutes; the brief arrives within that window.</p>
                  </div>
                  <div>
                    <Label>Timezone</Label>
                    <input className="field field-mono" list="tz-list" value={s.timezone} disabled={!canManage} onChange={(e) => set("timezone", e.target.value)} />
                    <datalist id="tz-list">
                      {COMMON_TIMEZONES.map((tz) => (
                        <option key={tz} value={tz} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div>
                  <Label>Email recipients (one per line or comma-separated)</Label>
                  <textarea className="field min-h-24 resize-y font-mono text-xs" value={recipientsText} disabled={!canManage} onChange={(e) => setRecipientsText(e.target.value)} placeholder={"owner@company.com\npm@company.com"} />
                  <p className="microlabel mt-1 !normal-case !tracking-normal">
                    Team members whose role can&apos;t see money get a copy without budget figures. Addresses outside the team get the full brief.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle checked={s.includeBudget} disabled={!canManage} onChange={(v) => set("includeBudget", v)} label="Include budget information" hint="Over-budget lines, significant changes, remaining budgets, negative variance." />
                  <Toggle checked={s.includeApplications} disabled={!canManage} onChange={(v) => set("includeApplications", v)} label="Include subcontractor applications" hint="New applications and items waiting for review." />
                  <Toggle checked={s.includeLeads} disabled={!canManage} onChange={(v) => set("includeLeads", v)} label="Include leads" hint="New customer inquiries." />
                  <Toggle checked={s.includeCompletedProjects} disabled={!canManage} onChange={(v) => set("includeCompletedProjects", v)} label="Include completed projects" hint="Recently completed projects, and completed projects in the lists." />
                  <Toggle checked={s.includePhotoPreviews} disabled={!canManage} onChange={(v) => set("includePhotoPreviews", v)} label="Attach photo previews to the email" hint="Off: a link to the Photos sheet only. On: up to four thumbnails per project." />
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <button className="btn btn-solid" disabled={busy !== null} onClick={() => void save()}>
                      {busy === "save" ? "Saving…" : "Save settings"}
                    </button>
                    <button className="btn" disabled={busy !== null} onClick={() => void test()} title="Generates a brief now and emails it to you only">
                      {busy === "test" ? "Generating…" : "Generate & send me a test brief"}
                    </button>
                  </div>
                )}
                {testResult && (
                  <div className="border border-dashed p-3 text-xs leading-relaxed">
                    {testResult.error ? (
                      <p>⚠ {testResult.error}</p>
                    ) : (
                      <>
                        <p>
                          Brief for {testResult.date} generated · {testResult.attention} to look at ·{" "}
                          {testResult.briefId && (
                            <Link href={`/briefs/${testResult.briefId}`} className="underline hover:text-ink">
                              read it
                            </Link>
                          )}
                        </p>
                        {testResult.deliveries.map((d) => (
                          <p key={d.to} className="text-mute">
                            {d.to}: {d.status}
                            {d.detail ? ` · ${d.detail}` : ""}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="panel h-fit bg-paper">
              <PanelBar title="Scheduler" />
              <div className="grid gap-2 p-4 text-xs leading-relaxed">
                <p className="microlabel">Last check-in</p>
                <p>{row?.last_run_at ? formatWhen(row.last_run_at) : "The scheduler has not called in yet."}</p>
                {row?.last_run_note && <p className="text-mute">{row.last_run_note}</p>}
                <p className="mt-2 text-mute">
                  A scheduler (Supabase pg_cron or Vercel Cron) calls <span className="font-mono">/api/brief/run</span> with the server&apos;s secret every 15
                  minutes. If the check-in above stays empty after deploying, the scheduler is not configured yet — PROJECT_STATUS.md has the
                  exact steps.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Toggle({ checked, disabled, onChange, label, hint }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input type="checkbox" className="checkbox mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-mute">{hint}</span>}
      </span>
    </label>
  );
}
