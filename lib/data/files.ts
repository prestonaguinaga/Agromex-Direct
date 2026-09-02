"use client";

import { uid } from "../format";
import { supabase } from "./client";
import type { FileKind, FileRow } from "./database.types";

const MAX_EDGE = 2560;
const THUMB_EDGE = 480;
const SIGNED_TTL_S = 3600;

export async function loadFiles(projectId: string): Promise<FileRow[]> {
  const { data, error } = await supabase()
    .from("files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function bucketFor(kind: FileKind): "plans" | "photos" {
  return kind === "photo" ? "photos" : "plans";
}

export function kindForFile(file: File | Blob, hint?: FileKind): FileKind {
  if (hint) return hint;
  return file.type.startsWith("image/") ? "photo" : "plan";
}

function extensionOf(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName && fromName.length <= 5) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  thumb: Blob | null;
}

/**
 * Resize a photo in the browser before upload (phones produce 5–12 MB
 * originals) and make a thumbnail for grids. Falls back to the original
 * bytes when the browser can't decode the format (e.g. HEIC on desktop).
 */
export async function prepareImage(file: File): Promise<PreparedImage | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const draw = (edge: number, quality: number): Promise<{ blob: Blob; width: number; height: number } | null> => {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return Promise.resolve(null);
      ctx.drawImage(bitmap, 0, 0, w, h);
      return new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b ? { blob: b, width: w, height: h } : null), "image/jpeg", quality),
      );
    };
    const main = await draw(MAX_EDGE, 0.86);
    if (!main) return null;
    const thumb = await draw(THUMB_EDGE, 0.8);
    return { blob: main.blob, width: main.width, height: main.height, thumb: thumb?.blob ?? null };
  } finally {
    bitmap.close();
  }
}

/** EXIF DateTimeOriginal (0x9003) from a JPEG, without a library. */
export async function readExifDate(file: File): Promise<Date | null> {
  if (file.type !== "image/jpeg") return null;
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off + 4 <= v.byteLength) {
      if (v.getUint8(off) !== 0xff) return null;
      const marker = v.getUint8(off + 1);
      const len = v.getUint16(off + 2);
      if (marker === 0xe1) {
        const start = off + 4;
        if (v.getUint32(start) !== 0x45786966) return null; // "Exif"
        const tiff = start + 6;
        const little = v.getUint16(tiff) === 0x4949;
        const u16 = (p: number) => v.getUint16(p, little);
        const u32 = (p: number) => v.getUint32(p, little);
        const ifd0 = tiff + u32(tiff + 4);
        const readIfd = (ifd: number, wanted: number): number | null => {
          const n = u16(ifd);
          for (let i = 0; i < n; i++) {
            const e = ifd + 2 + i * 12;
            if (u16(e) === wanted) return e;
          }
          return null;
        };
        const exifPtr = readIfd(ifd0, 0x8769);
        if (!exifPtr) return null;
        const exifIfd = tiff + u32(exifPtr + 8);
        const dt = readIfd(exifIfd, 0x9003);
        if (!dt) return null;
        const count = u32(dt + 4);
        const valOff = tiff + u32(dt + 8);
        let s = "";
        for (let i = 0; i < Math.min(count, 19); i++) s += String.fromCharCode(v.getUint8(valOff + i));
        const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      }
      if (marker === 0xda) return null; // start of scan — no EXIF ahead
      off += 2 + len;
    }
  } catch {
    /* unreadable */
  }
  return null;
}

export interface UploadInput {
  file: File;
  kind: FileKind;
  projectId: string;
  companyId: string;
  userId: string;
  caption?: string;
  /** Legacy attachment id (import) so a retried import never duplicates. */
  clientId?: string;
  /** Pre-chosen id so a retried upload lands on the same row and object. */
  id?: string;
  /** Construction phase / category the photo belongs to. */
  phaseId?: string | null;
  /** Related task or checklist item. */
  taskId?: string | null;
  /** Override the EXIF / file date (e.g. when re-uploading old photos). */
  takenAt?: string | null;
}

/**
 * Upload to Storage, then record the row. Both steps are idempotent for the
 * same id, so retrying after a network drop never creates duplicates.
 */
export async function uploadProjectFile(input: UploadInput): Promise<FileRow> {
  const sb = supabase();
  const id = input.id ?? uid();
  const bucket = bucketFor(input.kind);
  const isImage = input.file.type.startsWith("image/");
  const prepared = isImage ? await prepareImage(input.file) : null;
  const body: Blob = prepared?.blob ?? input.file;
  const mime = prepared ? "image/jpeg" : input.file.type || "application/octet-stream";
  const ext = prepared ? "jpg" : extensionOf(input.file.name, mime);
  const base = `${input.companyId}/${input.projectId}/${id}`;
  const path = `${base}.${ext}`;

  const up = await sb.storage.from(bucket).upload(path, body, { upsert: true, contentType: mime });
  if (up.error) throw up.error;

  let thumbPath: string | null = null;
  if (prepared?.thumb) {
    thumbPath = `${base}.thumb.jpg`;
    const t = await sb.storage.from(bucket).upload(thumbPath, prepared.thumb, { upsert: true, contentType: "image/jpeg" });
    if (t.error) thumbPath = null; // a missing thumbnail is cosmetic
  }

  const takenAt = input.takenAt
    ? new Date(input.takenAt)
    : isImage
      ? ((await readExifDate(input.file)) ?? new Date(input.file.lastModified))
      : null;
  const row = {
    id,
    company_id: input.companyId,
    project_id: input.projectId,
    kind: input.kind,
    bucket,
    storage_path: path,
    thumb_path: thumbPath,
    name: input.file.name,
    mime,
    size_bytes: body.size,
    width: prepared?.width ?? null,
    height: prepared?.height ?? null,
    taken_at: takenAt ? takenAt.toISOString() : null,
    caption: input.caption ?? "",
    uploaded_by: input.userId,
    phase_id: input.phaseId ?? null,
    task_id: input.taskId ?? null,
    client_id: input.clientId ?? null,
  };
  const { data, error } = await sb.from("files").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateFileCaption(id: string, caption: string): Promise<void> {
  return updateFile(id, { caption });
}

export async function updateFile(
  id: string,
  patch: Partial<Pick<FileRow, "caption" | "phase_id" | "task_id" | "kind" | "taken_at">>,
): Promise<void> {
  const { error } = await supabase().from("files").update(patch).eq("id", id);
  if (error) throw error;
}

/** Soft-delete the row (history kept), then remove the bytes best-effort. */
export async function deleteProjectFile(row: FileRow): Promise<void> {
  const sb = supabase();
  const { error } = await sb.from("files").update({ deleted_at: new Date().toISOString() }).eq("id", row.id);
  if (error) throw error;
  const paths = [row.storage_path, ...(row.thumb_path ? [row.thumb_path] : [])];
  await sb.storage.from(row.bucket).remove(paths).catch(() => {});
}

// ── Signed URLs (private buckets) with a small in-memory cache ─────────────
const urlCache = new Map<string, { url: string; expires: number }>();

export async function signedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const missing: string[] = [];
  for (const p of paths) {
    const hit = urlCache.get(`${bucket}:${p}`);
    if (hit && hit.expires > now + 60_000) out.set(p, hit.url);
    else missing.push(p);
  }
  if (missing.length) {
    const { data, error } = await supabase().storage.from(bucket).createSignedUrls(missing, SIGNED_TTL_S);
    if (error) throw error;
    for (const d of data ?? []) {
      if (d.signedUrl && d.path) {
        out.set(d.path, d.signedUrl);
        urlCache.set(`${bucket}:${d.path}`, { url: d.signedUrl, expires: now + SIGNED_TTL_S * 1000 });
      }
    }
  }
  return out;
}

export async function signedUrl(bucket: string, path: string): Promise<string | null> {
  const m = await signedUrls(bucket, [path]);
  return m.get(path) ?? null;
}
