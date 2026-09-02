"use client";

import { useRef, useState } from "react";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { FileKind, FileRow } from "@/lib/data/database.types";
import { deleteProjectFile, loadFiles, signedUrl, uploadProjectFile } from "@/lib/data/files";
import { useSession } from "@/lib/data/session";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { useProjectData } from "./ProjectContext";
import { thumbUrl, useThumbs } from "./bits";

interface Upload {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

const KIND_LABEL: Record<Exclude<FileKind, "photo">, string> = { plan: "Plan", document: "Document", receipt: "Receipt" };

/** Plans, drawings, contracts, receipts. Photos have their own sheet. */
export function FilesPanel() {
  const session = useSession();
  const data = useProjectData();
  const canUpload = session.can("files.upload");
  const canDeleteAny = session.can("files.delete");

  const live = useLiveRows<FileRow>(
    `files:${data.projectId}`,
    async () => (await loadFiles(data.projectId)).filter((f) => f.kind !== "photo"),
    [{ table: "files", filter: `project_id=eq.${data.projectId}` }],
  );
  const urls = useThumbs(live.rows);
  const [kind, setKind] = useState<Exclude<FileKind, "photo">>("plan");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Exclude<FileKind, "photo">>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(list)) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      try {
        await uploadProjectFile({ id, file, kind, projectId: data.projectId, companyId: data.companyId, userId: session.userId, phaseId: data.current?.id ?? null });
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "error", error: describeError(e) } : x)));
      }
    }
    await live.reload();
    setTimeout(() => setUploads((u) => u.filter((x) => x.status !== "done")), 2500);
  };

  const open = async (f: FileRow) => {
    try {
      const u = await signedUrl(f.bucket, f.storage_path);
      if (u) window.open(u, "_blank", "noopener");
    } catch (e) {
      setError(describeError(e));
    }
  };

  const remove = async (f: FileRow) => {
    if (!confirm(`Delete "${f.name}" for everyone?`)) return;
    try {
      await deleteProjectFile(f);
      await live.reload();
    } catch (e) {
      setError(describeError(e));
    }
  };

  const rows = live.rows.filter((f) => filter === "all" || f.kind === filter);
  const mayDelete = (f: FileRow) => canDeleteAny || f.uploaded_by === session.userId;

  return (
    <div className="grid gap-4">
      {canUpload && (
        <section
          className="panel bg-paper"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
        >
          <PanelBar title="Add plans & files" />
          <div className="grid gap-3 p-4 sm:grid-cols-[200px_1fr]">
            <div>
              <Label>File type</Label>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as Exclude<FileKind, "photo">)}>
                {(Object.keys(KIND_LABEL) as Exclude<FileKind, "photo">[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <button className="grid cursor-pointer place-items-center border border-dashed border-ink/40 px-4 py-5 text-center transition-colors hover:border-ink hover:bg-paper-2" onClick={() => inputRef.current?.click()}>
              <span className="microlabel">📐 Drop files here or tap to choose</span>
              <span className="mt-1 text-xs text-mute">PDF plan sets, drawings, contracts, receipts · up to 50 MB each</span>
            </button>
            <input ref={inputRef} type="file" accept="image/*,application/pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.csv" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ""; }} />
          </div>
          {uploads.length > 0 && (
            <ul className="border-t px-4 py-2">
              {uploads.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-0.5 font-mono text-[0.6875rem]">
                  <span className="truncate">{u.name}</span>
                  <span className={u.status === "error" ? "text-ink" : "text-mute"}>
                    {u.status === "uploading" && "uploading…"}
                    {u.status === "done" && "✓ saved for the team"}
                    {u.status === "error" && `⚠ ${u.error}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="panel bg-paper">
        <PanelBar
          title={`Plans & files · ${rows.length}`}
          right={
            <span className="flex gap-1">
              {(["all", "plan", "document", "receipt"] as const).map((k) => (
                <button key={k} onClick={() => setFilter(k)} className={`px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${filter === k ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
                  {k === "all" ? "All" : KIND_LABEL[k]}
                </button>
              ))}
            </span>
          }
        />
        {(error || live.error) && <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />}
        {live.loading && <LoadingMark text="Loading files…" />}
        {!live.loading && rows.length === 0 && <EmptyMark text="No plans or documents yet" />}
        <ul className="divide-y divide-line-soft">
          {rows.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              {thumbUrl(urls, f) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl(urls, f)} alt="" className="h-10 w-10 shrink-0 border object-cover" />
              ) : (
                <span className="grid h-10 w-10 shrink-0 place-items-center border font-mono text-[0.625rem] uppercase text-mute">
                  {f.mime?.includes("pdf") ? "PDF" : (f.name.split(".").pop() ?? "file").slice(0, 4)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <button className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => void open(f)}>
                  {f.name} ↗
                </button>
                <span className="microlabel tnum">
                  {f.kind} · {f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB · ` : ""}
                  {data.memberName(f.uploaded_by) ? `${data.memberName(f.uploaded_by)} · ` : ""}
                  {formatWhen(f.created_at)}
                </span>
              </div>
              {mayDelete(f) && (
                <button className="font-mono text-xs text-mute hover:text-ink" onClick={() => void remove(f)} title="Delete">
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
