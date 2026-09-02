"use client";

import type { PlanFile, Project } from "../types";
import { uid } from "../format";
import { remapProjectIds } from "./estimate-view";
import { uploadProjectFile } from "./files";
import { createProjectInDb } from "./projects";

export interface ImportReport {
  created: number;
  skipped: number;
  files: number;
  errors: string[];
}

function dataUrlToFile(pf: PlanFile): File | null {
  try {
    const [head, b64] = pf.dataUrl.split(",", 2);
    if (!b64) return null;
    const mime = /data:([^;]+)/.exec(head)?.[1] ?? pf.type ?? "application/octet-stream";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], pf.name || "attachment", { type: mime });
  } catch {
    return null;
  }
}

/**
 * Move legacy browser projects into the database. Idempotent: a project's old
 * id becomes `projects.client_id`, an attachment's old id `files.client_id`,
 * so running the import twice (or after a failure) never duplicates.
 */
export async function importLegacyProjects(
  projects: Project[],
  ctx: { companyId: string; userId: string },
  onProgress?: (done: number, total: number, label: string) => void,
): Promise<ImportReport> {
  const report: ImportReport = { created: 0, skipped: 0, files: 0, errors: [] };
  let n = 0;
  for (const legacy of projects) {
    n += 1;
    onProgress?.(n, projects.length, legacy.name);
    try {
      const fresh = remapProjectIds(legacy, uid);
      const result = await createProjectInDb(fresh, {
        companyId: ctx.companyId,
        clientId: legacy.id,
        createdAt: legacy.createdAt,
      });
      if (result.existing) {
        report.skipped += 1;
        continue;
      }
      report.created += 1;
      for (const pf of legacy.plans ?? []) {
        const file = dataUrlToFile(pf);
        if (!file) continue;
        try {
          await uploadProjectFile({
            file,
            kind: file.type.startsWith("image/") ? "photo" : "plan",
            projectId: result.projectId,
            companyId: ctx.companyId,
            userId: ctx.userId,
            clientId: pf.id,
          });
          report.files += 1;
        } catch (e) {
          report.errors.push(`${legacy.name} › ${pf.name}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      report.errors.push(`${legacy.name}: ${(e as Error).message}`);
    }
  }
  return report;
}
