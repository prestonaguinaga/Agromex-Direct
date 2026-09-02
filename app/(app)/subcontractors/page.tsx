"use client";

import { useState } from "react";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, TopBar } from "@/components/ui";
import { TRADES } from "@/lib/checklists";
import { describeError } from "@/lib/data/client";
import type { SubcontractorRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";
import { addSubcontractor, listSubcontractors, updateSubcontractor } from "@/lib/data/subcontractors";
import { useLiveRows } from "@/lib/data/use-live-rows";

/** Sheet 06 · Subcontractor directory. Applications and onboarding arrive in a later phase. */
export default function SubcontractorsPage() {
  const session = useSession();
  const companyId = session.company?.id ?? "";
  const canManage = session.can("subcontractors.manage");
  const live = useLiveRows<SubcontractorRow>(`subs-page:${companyId}`, () => listSubcontractors(companyId), [{ table: "subcontractors", filter: `company_id=eq.${companyId}` }], Boolean(companyId));
  const [draft, setDraft] = useState({ name: "", trade: "", contactName: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await live.reload();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const q = filter.trim().toLowerCase();
  const rows = live.rows.filter((s) => !q || `${s.name} ${s.trade} ${s.contact_name} ${s.email} ${s.phone}`.toLowerCase().includes(q));

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="subcontractors" sheet="Sheet 06 · Subcontractors" />
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <section className="rise-in border-x border-b bg-paper p-6 md:p-10">
          <p className="microlabel">Sheet 06 · Subcontractor directory · {session.company?.name}</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">Subcontractors</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            The trades the company works with. Tasks and checklist items can be assigned to a subcontractor; Bob can look them
            up (&ldquo;who does our electrical?&rdquo;). Applications and onboarding are a later phase.
          </p>
        </section>

        {error && <p className="mt-3 border border-ink bg-paper-2 px-4 py-2 font-mono text-xs">⚠ {error}</p>}

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="panel bg-paper">
            <PanelBar
              title={`Directory · ${rows.length}`}
              right={<input className="field field-quiet w-44 text-xs" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />}
            />
            {live.error && <ErrorMark text={live.error} onRetry={() => void live.reload()} />}
            {live.loading && <LoadingMark text="Loading the directory…" />}
            {!live.loading && rows.length === 0 && <EmptyMark text={live.rows.length ? "No match" : "No subcontractors yet"} />}
            <ul className="divide-y divide-line-soft">
              {rows.map((s) => (
                <li key={s.id} className={`grid gap-x-4 gap-y-1 px-4 py-3 text-xs sm:grid-cols-[1fr_140px_1fr_auto] ${s.status === "inactive" ? "text-mute" : ""}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="microlabel truncate !normal-case !tracking-normal">{s.contact_name || "—"}</p>
                  </div>
                  <p className="self-center">{s.trade || "—"}</p>
                  <p className="microlabel min-w-0 truncate self-center !normal-case !tracking-normal">
                    {[s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="self-center">
                    {canManage ? (
                      <button className="btn btn-xs btn-ghost" disabled={busy} onClick={() => void run(() => updateSubcontractor(s.id, { status: s.status === "active" ? "inactive" : "active" }))}>
                        {s.status === "active" ? "Set inactive" : "Set active"}
                      </button>
                    ) : (
                      <span className="microlabel">{s.status}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {canManage && (
            <section className="panel h-fit bg-paper lg:sticky lg:top-16">
              <PanelBar title="Add a subcontractor" />
              <div className="grid gap-3 p-4">
                <div>
                  <Label>Company / name</Label>
                  <TextInput value={draft.name} onCommit={(v) => setDraft({ ...draft, name: v })} placeholder="Lone Star Electric" />
                </div>
                <div>
                  <Label>Trade</Label>
                  <select className="field" value={draft.trade} onChange={(e) => setDraft({ ...draft, trade: e.target.value })}>
                    <option value="">—</option>
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Contact name</Label>
                  <TextInput value={draft.contactName} onCommit={(v) => setDraft({ ...draft, contactName: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <TextInput value={draft.phone} onCommit={(v) => setDraft({ ...draft, phone: v })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <TextInput value={draft.email} onCommit={(v) => setDraft({ ...draft, email: v })} />
                  </div>
                </div>
                <button
                  className="btn btn-solid"
                  disabled={busy || !draft.name.trim()}
                  onClick={() =>
                    void run(async () => {
                      await addSubcontractor({ companyId, name: draft.name.trim(), trade: draft.trade, contactName: draft.contactName, phone: draft.phone, email: draft.email });
                      setDraft({ name: "", trade: "", contactName: "", phone: "", email: "" });
                    })
                  }
                >
                  {busy ? "Saving…" : "Add to directory"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
