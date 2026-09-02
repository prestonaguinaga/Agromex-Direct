"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { FileKind, FileRow } from "@/lib/data/database.types";
import { deleteProjectFile, kindForFile, loadFiles, signedUrl, signedUrls, updateFileCaption, uploadProjectFile } from "@/lib/data/files";
import { useLiveRows } from "@/lib/data/use-live-rows";

interface Upload {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
}

export function FilesPanel({
  projectId,
  companyId,
  userId,
  canUpload,
  canDeleteAny,
}: {
  projectId: string;
  companyId: string;
  userId: string;
  canUpload: boolean;
  canDeleteAny: boolean;
}) {
  const live = useLiveRows<FileRow>(
    `files:${projectId}`,
    () => loadFiles(projectId),
    [{ table: "files", filter: `project_id=eq.${projectId}` }],
  );
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const photos = useMemo(() => live.rows.filter((f) => f.kind === "photo"), [live.rows]);
  const docs = useMemo(() => live.rows.filter((f) => f.kind !== "photo"), [live.rows]);

  // Thumbnails need signed URLs (buckets are private).
  useEffect(() => {
    const byBucket = new Map<string, string[]>();
    for (const f of live.rows) {
      const p = f.thumb_path ?? (f.mime?.startsWith("image/") ? f.storage_path : null);
      if (!p) continue;
      byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), p]);
    }
    let cancelled = false;
    (async () => {
      const next = new Map<string, string>();
      for (const [bucket, paths] of byBucket) {
        try {
          const m = await signedUrls(bucket, paths);
          for (const [p, u] of m) next.set(`${bucket}:${p}`, u);
        } catch {
          /* thumbnails are cosmetic */
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [live.rows]);

  const thumbOf = (f: FileRow) => {
    const p = f.thumb_path ?? (f.mime?.startsWith("image/") ? f.storage_path : null);
    return p ? urls.get(`${f.bucket}:${p}`) : undefined;
  };

  const open = async (f: FileRow) => {
    try {
      const u = await signedUrl(f.bucket, f.storage_path);
      if (u) window.open(u, "_blank", "noopener");
    } catch (e) {
      setError(describeError(e));
    }
  };

  const addFiles = async (list: FileList | File[], hint?: FileKind) => {
    setError(null);
    const files = Array.from(list);
    for (const file of files) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      try {
        await uploadProjectFile({ id, file, kind: kindForFile(file, hint), projectId, companyId, userId });
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "done" } : x)));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: "error", error: describeError(e) } : x)));
      }
    }
    await live.reload();
    setTimeout(() => setUploads((u) => u.filter((x) => x.status !== "done")), 2500);
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

  const mayDelete = (f: FileRow) => canDeleteAny || f.uploaded_by === userId;

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
          <PanelBar title="Add to this project" />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <button className="grid cursor-pointer place-items-center border border-dashed border-ink/40 px-4 py-6 text-center transition-colors hover:border-ink hover:bg-paper-2" onClick={() => photoRef.current?.click()}>
              <span className="microlabel">📷 Progress photos</span>
              <span className="mt-1 text-xs text-mute">Take or choose photos · resized on your device before upload</span>
            </button>
            <button className="grid cursor-pointer place-items-center border border-dashed border-ink/40 px-4 py-6 text-center transition-colors hover:border-ink hover:bg-paper-2" onClick={() => docRef.current?.click()}>
              <span className="microlabel">📐 Plans &amp; documents</span>
              <span className="mt-1 text-xs text-mute">PDF plan sets, drawings, contracts, receipts · up to 50 MB</span>
            </button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files, "photo"); e.target.value = ""; }} />
          <input ref={docRef} type="file" accept="image/*,application/pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) void addFiles(e.target.files); e.target.value = ""; }} />
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
                    {u.status === "done" && "✓ saved for the team"}
                    {u.status === "error" && `⚠ ${u.error}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(error || live.error) && (
        <div className="panel bg-paper">
          <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />
        </div>
      )}
      {live.loading && (
        <div className="panel bg-paper">
          <LoadingMark text="Loading files…" />
        </div>
      )}

      {/* ── Photos ────────────────────────────────────────────── */}
      {!live.loading && (
        <section className="panel bg-paper">
          <PanelBar title={`Progress photos · ${photos.length}`} right={live.refreshing && <span className="microlabel">syncing…</span>} />
          {photos.length === 0 ? (
            <EmptyMark text="No photos yet" />
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5">
              {photos.map((f) => (
                <figure key={f.id} className="group relative border">
                  <button className="block w-full" onClick={() => void open(f)} title="Open full size">
                    {thumbOf(f) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbOf(f)} alt={f.caption || f.name} className="aspect-square w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid aspect-square w-full place-items-center font-mono text-xs text-mute">…</div>
                    )}
                  </button>
                  <figcaption className="border-t px-1.5 py-1">
                    <TextInput
                      value={f.caption}
                      onCommit={(v) => void updateFileCaption(f.id, v).then(() => live.reload()).catch((e) => setError(describeError(e)))}
                      placeholder="Caption…"
                      className={`field-quiet !px-0 !py-0 text-[0.6875rem] ${mayDelete(f) ? "" : "pointer-events-none"}`}
                    />
                    <span className="microlabel tnum block truncate">{formatWhen(f.taken_at ?? f.created_at)}</span>
                  </figcaption>
                  {mayDelete(f) && (
                    <button className="absolute right-1 top-1 hidden border border-ink bg-paper px-1.5 py-0.5 font-mono text-xs group-hover:block" onClick={() => void remove(f)} title="Delete">
                      ✕
                    </button>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Plans & documents ─────────────────────────────────── */}
      {!live.loading && (
        <section className="panel bg-paper">
          <PanelBar title={`Plans & documents · ${docs.length}`} />
          {docs.length === 0 ? (
            <EmptyMark text="No plans or documents yet" />
          ) : (
            <ul className="divide-y divide-line-soft">
              {docs.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                  {thumbOf(f) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbOf(f)} alt="" className="h-10 w-10 shrink-0 border object-cover" />
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
          )}
        </section>
      )}
    </div>
  );
}
