"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { EstimatorPanel } from "@/components/EstimatorPanel";
import { InfoPanel } from "@/components/InfoPanel";
import { PrintSheet } from "@/components/PrintSheet";
import { SheetTable } from "@/components/SheetTable";
import { TotalsPanel } from "@/components/TotalsPanel";
import { ActivityPanel } from "@/components/project/ActivityPanel";
import { BudgetPanel } from "@/components/project/BudgetPanel";
import { FilesPanel } from "@/components/project/FilesPanel";
import { NotesPanel } from "@/components/project/NotesPanel";
import { OverviewPanel } from "@/components/project/OverviewPanel";
import { PhotosPanel } from "@/components/project/PhotosPanel";
import { ProgressPanel } from "@/components/project/ProgressPanel";
import { ProjectDataProvider } from "@/components/project/ProjectContext";
import { SaveIndicator } from "@/components/project/SaveIndicator";
import { TasksPanel } from "@/components/project/TasksPanel";
import { LoadingMark, TopBar } from "@/components/ui";
import type { TaskRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";
import { useProject } from "@/lib/data/use-project";
import { computeTotals, money } from "@/lib/format";
import { mailtoHref } from "@/lib/sheetText";

type Tab = "overview" | "budget" | "estimate" | "progress" | "files" | "photos" | "tasks" | "notes" | "activity";
type SheetTab = "sheet" | "estimator" | "info";

const TABS: { id: Tab; label: string; short: string; cap?: string }[] = [
  { id: "overview", label: "Overview", short: "Overview" },
  { id: "budget", label: "Budget", short: "Budget", cap: "budgets.view" },
  { id: "estimate", label: "Estimate", short: "Estimate", cap: "estimates.view" },
  { id: "progress", label: "Progress", short: "Progress" },
  { id: "files", label: "Plans & files", short: "Plans", cap: "files.view" },
  { id: "photos", label: "Photos", short: "Photos", cap: "files.view" },
  { id: "tasks", label: "Tasks & checklist", short: "Tasks" },
  { id: "notes", label: "Notes", short: "Notes" },
  { id: "activity", label: "Activity", short: "Activity", cap: "audit.view_project" },
];

export default function ProjectWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <ProjectWorkspace />
    </Suspense>
  );
}

function ProjectWorkspace() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const session = useSession();
  const id = params.id;
  const canEditEstimate = session.can("estimates.edit");
  const handle = useProject(id, { canEdit: canEditEstimate, userId: session.userId });
  const { project, ready, update, storageError, saveState, lastSavedAt, retry, estimateId, projectMeta } = handle;

  const visibleTabs = useMemo(() => TABS.filter((t) => !t.cap || session.can(t.cap)), [session]);
  const initial = (search.get("tab") as Tab | null) ?? "overview";
  const [tab, setTab] = useState<Tab>(visibleTabs.some((t) => t.id === initial) ? initial : "overview");
  const [sheetTab, setSheetTab] = useState<SheetTab>("sheet");
  const [openTask, setOpenTask] = useState<TaskRow | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url.toString());
  }, [tab]);

  const totals = useMemo(() => (project ? computeTotals(project) : null), [project]);
  const canSeeMoney = session.can("estimates.view");

  if (!ready) {
    return (
      <div className="sheet-grid min-h-screen">
        <TopBar active="none" />
        <main className="mx-auto max-w-7xl px-4 py-10">
          <div className="panel bg-paper">
            <LoadingMark text="Opening project…" />
          </div>
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="sheet-grid min-h-screen">
        <TopBar active="none" />
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <div className="panel bg-paper p-10">
            <p className="font-display text-xl">Project not found</p>
            <p className="mt-3 text-sm text-mute">{storageError ?? "It may have been deleted, or it hasn't been shared with you."}</p>
            <Link href="/projects" className="btn btn-solid mt-6">
              ← All projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const subTab = (t: SheetTab, label: string) => (
    <button
      onClick={() => setSheetTab(t)}
      className={`px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] transition-colors ${sheetTab === t ? "bg-ink text-paper" : "text-mute hover:bg-ink/10 hover:text-ink"}`}
    >
      {label}
    </button>
  );

  const number = projectMeta?.number ? `P-${String(projectMeta.number).padStart(4, "0")}` : "";
  const companyId = projectMeta?.companyId ?? session.company?.id ?? "";
  const goTask = (t: TaskRow) => {
    setOpenTask(t);
    setTab("tasks");
  };

  return (
    <ProjectDataProvider projectId={id} companyId={companyId}>
      <div className="sheet-grid min-h-screen">
        <div className="no-print">
          <TopBar active="none" sheet={`Sheet 02 · ${number || "Project"}`} />

          {/* ── Project header ─────────────────────────────────────── */}
          <div className="border-b bg-paper">
            <div className="mx-auto max-w-7xl px-4 py-3 md:py-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href="/projects" className="microlabel hover:text-ink">
                  ← Projects
                </Link>
                <span className="microlabel tnum">
                  / {number && `${number} · `}
                  {project.type === "new-build" ? "New build" : "Remodel"}
                  {projectMeta?.status ? ` · ${projectMeta.status.replace("_", " ")}` : ""}
                </span>
                <SaveIndicator saveState={saveState} lastSavedAt={lastSavedAt} error={storageError} onRetry={retry} />
                {canSeeMoney && totals && <span className="tnum ml-auto font-mono text-sm">{money(totals.grand)}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                {canEditEstimate && tab === "estimate" ? (
                  <input className="min-w-0 flex-1 bg-transparent font-display text-xl outline-none md:text-2xl" value={project.name} onChange={(e) => update((p) => ({ ...p, name: e.target.value }))} aria-label="Project name" />
                ) : (
                  <h1 className="font-display min-w-0 flex-1 truncate text-xl md:text-2xl">{project.name}</h1>
                )}
                {tab === "estimate" && totals && (
                  <div className="flex gap-2">
                    <a className="btn" href={mailtoHref(project, totals)}>
                      ✉ Email
                    </a>
                    <button className="btn btn-solid" onClick={() => window.print()}>
                      ⎙ Print / PDF
                    </button>
                  </div>
                )}
              </div>
              {/* Tab strip scrolls sideways on a phone instead of wrapping into a wall. */}
              <div className="-mx-4 mt-3 overflow-x-auto px-4">
                <div className="flex min-w-max gap-1.5">
                  {visibleTabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`border px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${tab === t.id ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"}`}
                    >
                      <span className="sm:hidden">{t.short}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab content ───────────────────────────────────────── */}
          <main className="mx-auto max-w-7xl px-4 py-4 pb-24 md:py-5">
            {tab === "overview" && <OverviewPanel project={project} totals={canSeeMoney ? totals : null} onOpenTab={(t) => setTab(t as Tab)} />}
            {tab === "budget" && <BudgetPanel projectId={id} companyId={companyId} project={project} totals={canSeeMoney ? totals : null} canEdit={session.can("budgets.edit")} />}
            {tab === "estimate" && (
              <>
                <div className="mb-4 flex items-center gap-1 border-b pb-3">
                  {subTab("sheet", "Quote sheet")}
                  {subTab("estimator", "Estimator")}
                  {subTab("info", "Job info")}
                  {!canEditEstimate && <span className="microlabel ml-auto">Read only · your role can view but not edit</span>}
                </div>
                {!estimateId && <p className="mb-4 border border-dashed px-3 py-2 text-xs text-mute">This project has no estimate sheet yet.</p>}
                {sheetTab === "sheet" && totals && (
                  <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
                    <SheetTable project={project} update={update} />
                    <div className="lg:sticky lg:top-16">
                      <TotalsPanel project={project} totals={totals} update={update} />
                    </div>
                  </div>
                )}
                {sheetTab === "estimator" && <EstimatorPanel project={project} update={update} />}
                {sheetTab === "info" && <InfoPanel project={project} update={update} />}
              </>
            )}
            {tab === "progress" && <ProgressPanel totals={canSeeMoney ? totals : null} onOpenTask={goTask} />}
            {tab === "files" && <FilesPanel />}
            {tab === "photos" && <PhotosPanel />}
            {tab === "tasks" && <TasksPanel openTask={openTask} onOpenTaskHandled={() => setOpenTask(null)} />}
            {tab === "notes" && <NotesPanel />}
            {tab === "activity" && <ActivityPanel projectId={id} />}
          </main>
        </div>

        {totals && canSeeMoney && <PrintSheet project={project} totals={totals} />}
      </div>
    </ProjectDataProvider>
  );
}
