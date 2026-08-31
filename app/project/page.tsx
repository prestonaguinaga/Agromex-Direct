"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/ui";
import { SheetTable } from "@/components/SheetTable";
import { TotalsPanel } from "@/components/TotalsPanel";
import { EstimatorPanel } from "@/components/EstimatorPanel";
import { InfoPanel } from "@/components/InfoPanel";
import { PrintSheet } from "@/components/PrintSheet";
import { BobChat } from "@/components/BobChat";
import { useProject } from "@/lib/store";
import { computeTotals, money } from "@/lib/format";
import { mailtoHref } from "@/lib/sheetText";

type Tab = "sheet" | "estimator" | "info";

export default function ProjectPage() {
  return (
    <Suspense fallback={null}>
      <ProjectEditor />
    </Suspense>
  );
}

function ProjectEditor() {
  const params = useSearchParams();
  const id = params.get("id");
  const { project, ready, update, storageError } = useProject(id);
  const [tab, setTab] = useState<Tab>("sheet");

  const totals = useMemo(
    () => (project ? computeTotals(project) : null),
    [project],
  );

  if (!ready) {
    return (
      <div className="sheet-grid min-h-screen">
        <TopBar active="none" />
      </div>
    );
  }

  if (!project || !totals) {
    return (
      <div className="sheet-grid min-h-screen">
        <TopBar active="none" />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="panel bg-paper p-10">
            <p className="font-display text-xl">Sheet not found</p>
            <p className="mt-3 text-sm text-mute">
              This project isn&apos;t in this browser&apos;s storage. It may
              have been deleted, or it lives on another device — import a
              backup from the projects page.
            </p>
            <Link href="/" className="btn btn-solid mt-6">
              ← All projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`border px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
        tab === t
          ? "border-ink bg-ink text-paper"
          : "border-line text-mute hover:border-ink hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="sheet-grid min-h-screen">
      <div className="no-print">
        <TopBar active="none" />

        {/* ── Project header ─────────────────────────────────────── */}
        <div className="border-b bg-paper">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href="/" className="microlabel hover:text-ink">
                ← Projects
              </Link>
              <span className="microlabel">
                / {project.type === "new-build" ? "New build" : "Remodel"}
              </span>
              {storageError && (
                <span className="font-mono text-xs">⚠ {storageError}</span>
              )}
              <span className="tnum ml-auto font-mono text-sm">
                {money(totals.grand)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
              <input
                className="min-w-0 flex-1 bg-transparent font-display text-xl outline-none md:text-2xl"
                value={project.name}
                onChange={(e) =>
                  update((p) => ({ ...p, name: e.target.value }))
                }
                aria-label="Project name"
              />
              <div className="flex gap-2">
                <a className="btn" href={mailtoHref(project, totals)}>
                  ✉ Email
                </a>
                <button className="btn btn-solid" onClick={() => window.print()}>
                  ⎙ Print / PDF
                </button>
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {tabBtn("sheet", "Quote sheet")}
              {tabBtn("estimator", "Estimator")}
              {tabBtn("info", "Info & plans")}
            </div>
          </div>
        </div>

        {/* ── Tab content ───────────────────────────────────────── */}
        <main className="mx-auto max-w-7xl px-4 py-5 pb-24">
          {tab === "sheet" && (
            <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
              <SheetTable project={project} update={update} />
              <div className="lg:sticky lg:top-16">
                <TotalsPanel project={project} totals={totals} update={update} />
              </div>
            </div>
          )}
          {tab === "estimator" && (
            <EstimatorPanel project={project} update={update} />
          )}
          {tab === "info" && <InfoPanel project={project} update={update} />}
        </main>
      </div>

      <BobChat project={project} update={update} />
      <PrintSheet project={project} totals={totals} />
    </div>
  );
}
