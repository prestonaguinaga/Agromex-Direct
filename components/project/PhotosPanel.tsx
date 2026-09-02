"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyMark, ErrorMark, Label, LoadingMark, Modal, PanelBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { FileRow, TaskRow } from "@/lib/data/database.types";
import { deleteProjectFile, loadFiles, signedUrl, updateFile, uploadProjectFile } from "@/lib/data/files";
import { dayBucket } from "@/lib/data/progress";
import { useSession } from "@/lib/data/session";
import { loadTasks } from "@/lib/data/tasks";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { useProjectData } from "./ProjectContext";
import { thumbUrl, useThumbs } from "./bits";

interface Upload {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

const LATEST_DAYS = 14;

export function PhotosPanel() {
  const session = useSession();
  const data = useProjectData();
  const canUpload = session.can("files.upload");
  const canDeleteAny = session.can("files.delete");

  const live = useLiveRows<FileRow>(
    `photos:${data.projectId}`,
    async () => (await loadFiles(data.projectId)).filter((f) => f.kind === "photo"),
    [{ table: "files", filter: `project_id=eq.${data.projectId}` }],
  );
  const tasks = useLiveRows<TaskRow>(`photo-tasks:${data.projectId}`, () => loadTasks(data.projectId), [{ table: "tasks", filter: `project_id=eq.${data.projectId}` }]);
  const urls = useThumbs(live.rows);

  // ── upload form ──────────────────────────────────────────────────────
  const [phaseId, setPhaseId] = useState<string | "">("");
  const [taskId, setTaskId] = useState<string | "">("");
  const [caption, setCaption] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const effectivePhase = phaseId || data.current?.id || "";

  // ── filters ──────────────────────────────────────────────────────────
  const [view, setView] = useState<"latest" | "all">("latest");
  const [phaseFilter, setPhaseFilter] = useState<string>("all"); // all | none | <phaseId>
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [open, setOpen] = useState<FileRow | null>(null);

  const dateOf = (f: FileRow) => f.taken_at ?? f.created_at;
  const months = useMemo(() => {
    const set = new Map<string, string>();
    for (const f of live.rows) {
      const d = new Date(dateOf(f));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      set.set(key, d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
    }
    return [...set.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [live.rows]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - LATEST_DAYS * 86_400_000;
    return live.rows
      .filter((f) => (view === "all" ? true : Date.parse(dateOf(f)) >= cutoff))
      .filter((f) => (phaseFilter === "all" ? true : phaseFilter === "none" ? !f.phase_id : f.phase_id === phaseFilter))
      .filter((f) => {
        if (monthFilter === "all") return true;
        const d = new Date(dateOf(f));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === monthFilter;
      })
      .sort((a, b) => Date.parse(dateOf(b)) - Date.parse(dateOf(a)));
  }, [live.rows, view, phaseFilter, monthFilter]);

  const groups = useMemo(() => {
    const out: { label: string; photos: FileRow[] }[] = [];
    for (const f of filtered) {
      const label = dayBucket(dateOf(f));
      const last = out[out.length - 1];
      if (last && last.label === label) last.photos.push(f);
      else out.push({ label, photos: [f] });
    }
    return out;
  }, [filtered]);

  const addFiles = async (list: FileList) => {
    setError(null);
    for (const file of Array.from(list)) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      try {
        await uploadProjectFile({
          id,
          file,
          kind: "photo",
          projectId: data.projectId,
          companyId: data.companyId,
          userId: session.userId,
          caption: caption.trim(),
          phaseId: effectivePhase || null,
          taskId: taskId || null,
        });
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "error", error: describeError(e) } : x)));
      }
    }
    setCaption("");
    await live.reload();
    setTimeout(() => setUploads((u) => u.filter((x) => x.status !== "done")), 3000);
  };

  return (
    <div className="grid gap-4">
      {canUpload && (
        <section className="panel bg-paper">
          <PanelBar title="Add progress photos" right={<span className="microlabel">phone or desktop</span>} />
          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr]">
            <div>
              <Label>Construction phase</Label>
              <select className="field" value={effectivePhase} onChange={(e) => setPhaseId(e.target.value)}>
                <option value="">No phase</option>
                {data.phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.id === data.current?.id ? " · current" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Related task (optional)</Label>
              <select className="field" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">—</option>
                {tasks.rows
                  .filter((t) => !effectivePhase || t.phase_id === effectivePhase || !t.phase_id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Caption (applies to every photo in this batch)</Label>
              <input className="field text-sm" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. North wall sheathing complete, ready for wrap" />
            </div>
            <button className="btn btn-solid justify-center py-4 text-sm" onClick={() => cameraRef.current?.click()}>
              📷 Take photo
            </button>
            <button className="btn justify-center py-4 text-sm" onClick={() => pickRef.current?.click()}>
              ⇪ Choose photos
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ""; }} />
            <input ref={pickRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          {uploads.length > 0 && (
            <ul className="border-t px-4 py-2">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-0.5 font-mono text-[0.6875rem]">
                  <span className="truncate">{u.name}</span>
                  <span className={u.status === "error" ? "text-ink" : "text-mute"}>
                    {u.status === "uploading" && (
                      <>
                        <span className="cursor-blink mr-1 inline-block h-2 w-1 bg-ink align-middle" />
                        uploading…
                      </>
                    )}
                    {u.status === "done" && "✓ on the project for everyone"}
                    {u.status === "error" && `⚠ ${u.error}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="microlabel border-t px-4 py-2 !normal-case !tracking-normal">
            Photos are resized on your device before upload, tagged with the phase, your name and the time taken.
          </p>
        </section>
      )}

      <section className="panel bg-paper">
        <PanelBar
          title={`Progress photos · ${filtered.length}${filtered.length !== live.rows.length ? ` of ${live.rows.length}` : ""}`}
          right={
            <span className="flex gap-1">
              {(["latest", "all"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${view === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
                  {v === "latest" ? `Latest (${LATEST_DAYS}d)` : "All"}
                </button>
              ))}
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <span className="microlabel">Phase</span>
          <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
            {[{ id: "all", name: "All" }, ...data.phases, { id: "none", name: "No phase" }].map((p) => (
              <button key={p.id} onClick={() => setPhaseFilter(p.id)} className={`shrink-0 border px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] ${phaseFilter === p.id ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"}`}>
                {p.name}
              </button>
            ))}
          </div>
          <span className="microlabel ml-auto">Date</span>
          <select className="field field-quiet w-40 font-mono text-[0.6875rem]" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">All dates</option>
            {months.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {(error || live.error) && <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />}
        {live.loading && <LoadingMark text="Loading photos…" />}
        {!live.loading && filtered.length === 0 && <EmptyMark text={live.rows.length === 0 ? "No photos yet — the jobsite is waiting for its first picture" : "No photos match these filters"} />}
        {groups.map((g) => (
          <div key={g.label}>
            <p className="microlabel border-b bg-paper-2 px-4 py-1.5">
              {g.label} · {g.photos.length}
            </p>
            <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {g.photos.map((f) => (
                <button key={f.id} className="group relative block border text-left" onClick={() => setOpen(f)}>
                  {thumbUrl(urls, f) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(urls, f)} alt={f.caption || f.name} className="aspect-square w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center font-mono text-xs text-mute">…</div>
                  )}
                  <span className="absolute inset-x-0 bottom-0 truncate bg-paper/85 px-1.5 py-0.5 font-mono text-[0.625rem]">
                    {f.caption || data.phaseName(f.phase_id) || formatWhen(f.taken_at ?? f.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {open && (
        <PhotoDetail
          photo={open}
          tasks={tasks.rows}
          canEdit={canDeleteAny || open.uploaded_by === session.userId}
          onClose={() => setOpen(null)}
          onChanged={() => void live.reload()}
        />
      )}
    </div>
  );
}

function PhotoDetail({
  photo,
  tasks,
  canEdit,
  onClose,
  onChanged,
}: {
  photo: FileRow;
  tasks: TaskRow[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const data = useProjectData();
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState(photo.caption);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    signedUrl(photo.bucket, photo.storage_path)
      .then((u) => !cancelled && setUrl(u ?? ""))
      .catch(() => !cancelled && setUrl(""));
    return () => {
      cancelled = true;
    };
  }, [photo.bucket, photo.storage_path]);

  const patch = async (p: Parameters<typeof updateFile>[1]) => {
    setBusy(true);
    setError(null);
    try {
      await updateFile(photo.id, p);
      onChanged();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={photo.name} onClose={onClose} wide>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="grid min-h-48 place-items-center border bg-paper-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={photo.caption || photo.name} className="max-h-[60vh] w-full object-contain" />
          ) : (
            <span className="microlabel">{url === "" ? "Couldn't load the image" : "Loading…"}</span>
          )}
        </div>
        <div className="grid content-start gap-3">
          <div>
            <Label>Taken</Label>
            <p className="tnum font-mono text-sm">{formatWhen(photo.taken_at ?? photo.created_at)}</p>
          </div>
          <div>
            <Label>Uploaded by</Label>
            <p className="text-sm">{data.memberName(photo.uploaded_by) || "—"}</p>
          </div>
          <div>
            <Label>Caption</Label>
            <textarea className="field min-h-16 resize-y text-sm" value={caption} disabled={!canEdit} onChange={(e) => setCaption(e.target.value)} onBlur={() => caption !== photo.caption && void patch({ caption })} />
          </div>
          <div>
            <Label>Phase / category</Label>
            <select className="field" value={photo.phase_id ?? ""} disabled={!canEdit || busy} onChange={(e) => void patch({ phase_id: e.target.value || null })}>
              <option value="">No phase</option>
              {data.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Related task</Label>
            <select className="field" value={photo.task_id ?? ""} disabled={!canEdit || busy} onChange={(e) => void patch({ task_id: e.target.value || null })}>
              <option value="">—</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}
          <div className="flex gap-2 border-t pt-3">
            {url && (
              <a className="btn btn-xs" href={url} target="_blank" rel="noreferrer">
                Open full size ↗
              </a>
            )}
            {canEdit && (
              <button
                className="btn btn-xs btn-ghost"
                disabled={busy}
                onClick={async () => {
                  if (!confirm("Delete this photo for everyone?")) return;
                  try {
                    await deleteProjectFile(photo);
                    onChanged();
                    onClose();
                  } catch (e) {
                    setError(describeError(e));
                  }
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
