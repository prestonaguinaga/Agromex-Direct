"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { appConfig } from "@/app.config";
import { EmptyMark, ErrorMark, Label, LoadingMark, Modal, TopBar } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { ProjectSummaryRow } from "@/lib/data/database.types";
import { importLegacyProjects, type ImportReport } from "@/lib/data/import";
import { createProjectInDb, duplicateProject, listProjectSummaries, softDeleteProject } from "@/lib/data/projects";
import { useSession } from "@/lib/data/session";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { formatDate, money, moneyWhole } from "@/lib/format";
import { legacyAlreadyImported, markLegacyImported, parseLegacyBackup, readLegacyLocalStorage } from "@/lib/legacy-store";
import { TEMPLATES, createProject } from "@/lib/templates";
import type { Project, ProjectType } from "@/lib/types";

const STATUS_LABEL: Record<ProjectSummaryRow["status"], string> = {
  lead: "Lead",
  estimating: "Estimating",
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  archived: "Archived",
};

export default function ProjectsPage() {
  const session = useSession();
  const router = useRouter();
  const { rows, loading, error, reload } = useLiveRows<ProjectSummaryRow>(
    "projects",
    listProjectSummaries,
    [{ table: "projects" }, { table: "estimate_item_options" }, { table: "estimate_items" }, { table: "tasks" }],
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProjectSummaryRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importing, setImporting] = useState<{ projects: Project[]; label: string } | null>(null);
  const [legacyCount, setLegacyCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const canCreate = session.can("projects.create");
  const canDelete = session.can("projects.delete");
  const canSeeMoney = session.can("estimates.view");
  const companyId = session.company?.id ?? "";

  useEffect(() => {
    // localStorage is only readable after hydration; read it after paint so the
    // server and client markup match.
    if (!canCreate || legacyAlreadyImported()) return;
    const t = setTimeout(() => setLegacyCount(readLegacyLocalStorage().length), 0);
    return () => clearTimeout(t);
  }, [canCreate]);

  const portfolioTotal = useMemo(() => rows.reduce((a, r) => a + Number(r.grand), 0), [rows]);
  const active = rows.filter((r) => r.status !== "archived" && r.status !== "complete");

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const onBackupFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const projects = parseLegacyBackup(String(reader.result));
        setImporting({ projects, label: file.name });
      } catch (e) {
        setActionError(describeError(e));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="projects" sheet="Sheet 02 · Projects" />

      <main className="mx-auto max-w-7xl px-4 pb-24">
        {/* ── Title block ─────────────────────────────────────────── */}
        <section className="rise-in grid grid-cols-1 border-x border-b bg-paper md:grid-cols-[1fr_auto]">
          <div className="border-b p-6 md:border-b-0 md:border-r md:p-10">
            <p className="microlabel">Sheet 02 · Project index · {session.company?.name ?? appConfig.company.name}</p>
            <h1 className="font-display mt-3 text-3xl leading-tight md:text-5xl">
              Projects
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Every project, estimate, budget, checklist, note and photo lives in the shared company
              database. Open one on any device and you see what the team sees.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {canCreate && (
                <button className="btn btn-solid" onClick={() => setWizardOpen(true)}>
                  + New project
                </button>
              )}
              {canCreate && (
                <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                  Import backup
                </button>
              )}
              {legacyCount > 0 && (
                <button
                  className="btn"
                  onClick={() => setImporting({ projects: readLegacyLocalStorage(), label: "this browser" })}
                  title="Projects the old quote sheet saved in this browser"
                >
                  ⇪ Import {legacyCount} project{legacyCount > 1 ? "s" : ""} from this browser
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onBackupFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:w-72 md:grid-cols-1">
            <div className="border-r p-6 md:border-b md:border-r-0">
              <p className="microlabel">Active projects</p>
              <p className="tnum mt-2 font-mono text-3xl">
                {loading ? "··" : String(active.length).padStart(2, "0")}
              </p>
            </div>
            <div className="p-6">
              <p className="microlabel">{canSeeMoney ? "Combined quote value" : "Projects on file"}</p>
              <p className="tnum mt-2 font-mono text-3xl">
                {loading ? "···" : canSeeMoney ? moneyWhole(portfolioTotal) : String(rows.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </section>

        {actionError && (
          <p className="mt-3 border border-ink bg-paper-2 px-4 py-2 font-mono text-xs">⚠ {actionError}</p>
        )}

        {/* ── Project cards ───────────────────────────────────────── */}
        <section className="mt-8">
          {error && (
            <div className="panel bg-paper">
              <ErrorMark text={error} onRetry={() => void reload()} />
            </div>
          )}
          {loading && !error && (
            <div className="panel bg-paper">
              <LoadingMark text="Loading projects from the company database…" />
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="panel bg-paper">
              <EmptyMark
                text={canCreate ? "No projects yet — start one above" : "No projects have been shared with you yet"}
              />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((p, i) => {
              const pct = Number(p.progress_pct) || 0;
              return (
                <article
                  key={p.id}
                  className="panel rise-in group flex flex-col bg-paper"
                  style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
                >
                  <Link href={`/projects/${p.id}`} className="flex-1 cursor-pointer p-5 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <span className="microlabel tnum">
                        {p.number ? `P-${String(p.number).padStart(4, "0")} · ` : ""}
                        {p.type === "new-build" ? "New build" : "Remodel"} · {STATUS_LABEL[p.status]}
                      </span>
                      <span className="microlabel tnum">{formatDate(Date.parse(p.updated_at))}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:underline">{p.name}</h2>
                    {p.client_name && <p className="mt-0.5 text-xs text-mute">{p.client_name}</p>}
                    <div className="tnum mt-5 font-mono text-2xl">
                      {canSeeMoney ? money(Number(p.grand)) : `${pct.toFixed(0)}%`}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1 flex-1 border">
                        <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="microlabel tnum">
                        {p.done_items + p.tasks_done}/{p.total_items + p.tasks_total}
                      </span>
                    </div>
                  </Link>
                  <div className="flex border-t">
                    <button
                      className="flex-1 py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper"
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      Open
                    </button>
                    {canCreate && canSeeMoney && (
                      <button
                        className="flex-1 border-l py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper disabled:opacity-40"
                        disabled={busy === `dup:${p.id}`}
                        onClick={() =>
                          void run(`dup:${p.id}`, async () => {
                            const r = await duplicateProject(p.id, companyId);
                            router.push(`/projects/${r.projectId}`);
                          })
                        }
                      >
                        {busy === `dup:${p.id}` ? "Copying…" : "Duplicate"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="flex-1 border-l py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper"
                        onClick={() => setConfirmDelete(p)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {wizardOpen && (
        <NewProjectWizard
          busy={busy === "create"}
          onClose={() => setWizardOpen(false)}
          onCreate={(p) =>
            void run("create", async () => {
              const r = await createProjectInDb(p, { companyId });
              setWizardOpen(false);
              router.push(`/projects/${r.projectId}`);
            })
          }
        />
      )}

      {confirmDelete && (
        <Modal title="Delete project" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm leading-relaxed">
            Delete <strong>{confirmDelete.name}</strong> for everyone? It disappears from every device; the
            activity history is kept.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </button>
            <button
              className="btn btn-solid"
              disabled={busy === "delete"}
              onClick={() =>
                void run("delete", async () => {
                  await softDeleteProject(confirmDelete.id);
                  setConfirmDelete(null);
                  await reload();
                })
              }
            >
              {busy === "delete" ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {importing && (
        <ImportModal
          projects={importing.projects}
          label={importing.label}
          companyId={companyId}
          userId={session.userId}
          onClose={() => {
            setImporting(null);
            void reload();
          }}
          onDone={() => {
            if (importing.label === "this browser") {
              markLegacyImported();
              setLegacyCount(0);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── New-project wizard: name → build type → template ─────────────── */
function NewProjectWizard({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean;
  onClose: () => void;
  onCreate: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("remodel");
  const [templateId, setTemplateId] = useState("kitchen");

  const options = TEMPLATES.filter((t) => t.type === type || t.id === "blank");

  const pickType = (t: ProjectType) => {
    setType(t);
    setTemplateId(t === "new-build" ? "new-build" : "kitchen");
  };

  const create = () => {
    if (busy) return;
    onCreate(
      createProject({
        name: name.trim() || "Untitled project",
        type,
        templateId,
      }),
    );
  };

  return (
    <Modal title="New project" onClose={onClose} wide>
      <div className="grid gap-5">
        <div>
          <Label>Project name</Label>
          <input
            autoFocus
            className="field"
            placeholder="e.g. Maple St kitchen, Lot 14 build…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
        </div>

        <div>
          <Label>Is this a remodel or a new build?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["remodel", "Remodel", "Working inside an existing home"],
                ["new-build", "New build", "Ground-up construction"],
              ] as const
            ).map(([val, label, blurb]) => (
              <button
                key={val}
                onClick={() => pickType(val)}
                className={`border p-4 text-left transition-colors ${
                  type === val ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                }`}
              >
                <span className="font-display block text-sm">{label}</span>
                <span className={`mt-1 block text-xs ${type === val ? "text-paper/60" : "text-mute"}`}>
                  {blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Start from a premade checklist</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`border p-3 text-left transition-colors ${
                  templateId === t.id ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                }`}
              >
                <span className="block text-sm font-semibold">{t.name}</span>
                <span
                  className={`mt-0.5 block text-xs leading-snug ${
                    templateId === t.id ? "text-paper/60" : "text-mute"
                  }`}
                >
                  {t.blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-solid" onClick={create} disabled={busy}>
            {busy ? "Creating…" : "Create project →"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Import of the old browser-only data ──────────────────────────── */
function ImportModal({
  projects,
  label,
  companyId,
  userId,
  onClose,
  onDone,
}: {
  projects: Project[];
  label: string;
  companyId: string;
  userId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    try {
      const r = await importLegacyProjects(projects, { companyId, userId }, (done, total, l) =>
        setProgress({ done, total, label: l }),
      );
      setReport(r);
      onDone();
    } catch (e) {
      setError(describeError(e));
    }
  };

  return (
    <Modal title={`Import from ${label}`} onClose={onClose}>
      {!progress && !report && (
        <>
          <p className="text-sm leading-relaxed">
            {projects.length} project{projects.length === 1 ? "" : "s"} found. They will be copied into the
            company database with their sheets, prices, checklists and attached plan files.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-mute">
            Safe to run more than once — a project already imported is skipped, not duplicated. Nothing is
            removed from the source.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-solid" onClick={() => void start()}>
              Import →
            </button>
          </div>
        </>
      )}
      {progress && !report && (
        <div>
          <p className="microlabel">
            <span className="cursor-blink mr-1.5 inline-block h-2.5 w-1.5 bg-ink align-middle" />
            Importing {progress.done}/{progress.total} · {progress.label}
          </p>
          <div className="mt-3 h-1 border">
            <div className="h-full bg-ink transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          {error && <p className="mt-3 border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}
        </div>
      )}
      {report && (
        <div>
          <div className="grid grid-cols-3 divide-x border">
            {[
              ["Imported", report.created],
              ["Skipped", report.skipped],
              ["Files", report.files],
            ].map(([k, v]) => (
              <div key={String(k)} className="p-3 text-center">
                <p className="microlabel">{k}</p>
                <p className="tnum mt-1 font-mono text-xl">{v}</p>
              </div>
            ))}
          </div>
          {report.errors.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto border border-dashed p-2 font-mono text-[0.6875rem] text-mute">
              {report.errors.map((e, i) => (
                <p key={i}>⚠ {e}</p>
              ))}
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <button className="btn btn-solid" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
