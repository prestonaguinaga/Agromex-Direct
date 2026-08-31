"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar, Modal, Label, EmptyMark } from "@/components/ui";
import { useProjects, exportJson, importJson, loadProjects } from "@/lib/store";
import { TEMPLATES, createProject } from "@/lib/templates";
import { computeTotals, formatDate, money, moneyWhole } from "@/lib/format";
import type { Project, ProjectType } from "@/lib/types";

export default function Dashboard() {
  const { projects, ready, mutate, storageError } = useProjects();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const totals = useMemo(
    () => projects.map((p) => ({ p, t: computeTotals(p) })),
    [projects],
  );
  const portfolioTotal = totals.reduce((a, x) => a + x.t.grand, 0);

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importJson(String(reader.result));
      if (res.ok) mutate(() => loadProjects());
      else alert(`Import failed: ${res.error}`);
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `agromex-quotes-backup.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const duplicate = (p: Project) => {
    const copy: Project = JSON.parse(JSON.stringify(p));
    copy.id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    copy.name = `${p.name} (copy)`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    mutate((prev) => [copy, ...prev]);
  };

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="projects" />

      <main className="mx-auto max-w-7xl px-4 pb-24">
        {/* ── Title block ─────────────────────────────────────────── */}
        <section className="rise-in grid grid-cols-1 border-x border-b bg-paper md:grid-cols-[1fr_auto]">
          <div className="border-b p-6 md:border-b-0 md:border-r md:p-10">
            <p className="microlabel">Sheet 01 · Project index</p>
            <h1 className="font-display mt-3 text-3xl leading-tight md:text-5xl">
              Quote
              <br />
              Sheet
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
              Itemized material quotes with product links, price options and
              takeoff math. Everything saves in this browser — export a backup
              anytime.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn btn-solid" onClick={() => setWizardOpen(true)}>
                + New project
              </button>
              <button className="btn btn-ghost" onClick={handleExport}>
                Export backup
              </button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                Import
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:w-72 md:grid-cols-1">
            <div className="border-r p-6 md:border-b md:border-r-0">
              <p className="microlabel">Projects on file</p>
              <p className="tnum mt-2 font-mono text-3xl">
                {ready ? String(projects.length).padStart(2, "0") : "··"}
              </p>
            </div>
            <div className="p-6">
              <p className="microlabel">Combined quote value</p>
              <p className="tnum mt-2 font-mono text-3xl">
                {ready ? moneyWhole(portfolioTotal) : "···"}
              </p>
            </div>
          </div>
        </section>

        {storageError && (
          <p className="mt-3 border border-ink bg-paper-2 px-4 py-2 font-mono text-xs">
            ⚠ {storageError}
          </p>
        )}

        {/* ── Project cards ───────────────────────────────────────── */}
        <section className="mt-8">
          {ready && projects.length === 0 && (
            <div className="panel bg-paper">
              <EmptyMark text="No projects yet — start one above" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {totals.map(({ p, t }, i) => (
              <article
                key={p.id}
                className="panel rise-in group flex flex-col bg-paper"
                style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
              >
                <button
                  className="flex-1 cursor-pointer p-5 text-left"
                  onClick={() => router.push(`/project/?id=${p.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="microlabel">
                      {p.type === "new-build" ? "New build" : "Remodel"}
                    </span>
                    <span className="microlabel tnum">{formatDate(p.updatedAt)}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold leading-snug group-hover:underline">
                    {p.name}
                  </h2>
                  {p.info.client && (
                    <p className="mt-0.5 text-xs text-mute">{p.info.client}</p>
                  )}
                  <div className="tnum mt-5 font-mono text-2xl">{money(t.grand)}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1 flex-1 border">
                      <div
                        className="h-full bg-ink transition-all"
                        style={{
                          width: `${t.totalItems ? (t.doneItems / t.totalItems) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="microlabel tnum">
                      {t.doneItems}/{t.totalItems}
                    </span>
                  </div>
                </button>
                <div className="flex border-t">
                  <button
                    className="flex-1 py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper"
                    onClick={() => router.push(`/project/?id=${p.id}`)}
                  >
                    Open
                  </button>
                  <button
                    className="flex-1 border-l py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper"
                    onClick={() => duplicate(p)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="flex-1 border-l py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper"
                    onClick={() => setConfirmDelete(p)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {wizardOpen && (
        <NewProjectWizard
          onClose={() => setWizardOpen(false)}
          onCreate={(p) => {
            mutate((prev) => [p, ...prev]);
            router.push(`/project/?id=${p.id}`);
          }}
        />
      )}

      {confirmDelete && (
        <Modal title="Delete project" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm leading-relaxed">
            Delete <strong>{confirmDelete.name}</strong> and its whole sheet?
            This can&apos;t be undone (export a backup first if unsure).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
              Keep it
            </button>
            <button
              className="btn btn-solid"
              onClick={() => {
                mutate((prev) => prev.filter((x) => x.id !== confirmDelete.id));
                setConfirmDelete(null);
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── New-project wizard: name → build type → template ─────────────── */
function NewProjectWizard({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: Project) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("remodel");
  const [templateId, setTemplateId] = useState("kitchen");

  const options = TEMPLATES.filter(
    (t) => t.type === type || t.id === "blank",
  );

  const pickType = (t: ProjectType) => {
    setType(t);
    setTemplateId(t === "new-build" ? "new-build" : "kitchen");
  };

  const create = () => {
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
                  type === val
                    ? "border-ink bg-ink text-paper"
                    : "border-line hover:border-ink"
                }`}
              >
                <span className="font-display block text-sm">{label}</span>
                <span
                  className={`mt-1 block text-xs ${type === val ? "text-paper/60" : "text-mute"}`}
                >
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
                  templateId === t.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line hover:border-ink"
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
          <button className="btn btn-solid" onClick={create}>
            Create project →
          </button>
        </div>
      </div>
    </Modal>
  );
}
