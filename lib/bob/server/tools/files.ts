import "server-only";
import type { FileRow } from "../../../data/database.types";
import { matchByName } from "../../match";
import { instantRange, parsePreset } from "../../time";
import { loadFiles, loadPhases, listSummaries, profilesById, nameOf, signedUrls } from "../data";
import { optionalProject, resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, intIn, schema, str, type Db, type ToolDef } from "../types";

async function withLinks(sb: Db, files: FileRow[]) {
  const byBucket = new Map<string, string[]>();
  for (const f of files) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.storage_path]);
  const urls = new Map<string, string>();
  for (const [bucket, paths] of byBucket) for (const [p, u] of await signedUrls(sb, bucket, paths)) urls.set(`${bucket}:${p}`, u);
  const uploaders = await profilesById(sb, files.map((f) => f.uploaded_by ?? "").filter(Boolean));
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    kind: f.kind,
    caption: f.caption || null,
    taken_or_uploaded: f.taken_at ?? f.created_at,
    uploaded_by: nameOf(uploaders.get(f.uploaded_by ?? "")) || null,
    size_kb: f.size_bytes ? Math.round(f.size_bytes / 1024) : null,
    open_url: urls.get(`${f.bucket}:${f.storage_path}`) ?? null,
  }));
}

const VIEWABLE_MIME = /^image\/(jpeg|png|gif|webp)$/;
const MAX_VIEW_BYTES = 20 * 1024 * 1024;

export const fileTools: ToolDef[] = [
  {
    name: "view_plan",
    description:
      "Open a stored plan, drawing or document (PDF or image) so you can actually look at it — room labels, layout, rough dimensions — before answering something that depends on what it shows, e.g. 'estimate redoing the bathroom' when a floor plan is on file. Only PDF and JPEG/PNG/GIF/WEBP files can be opened this way; .dwg/.dxf/Office files cannot — say so and ask for a PDF or image export instead. The plan is only visible for the rest of this turn, not remembered later — call this again in a future message if you need to look at it again.",
    input_schema: schema({ ...PROJECT_PROPS, file: { type: "string", description: "Which plan/document, e.g. 'floor plan', 'bathroom plan'. Omit to open the most recently uploaded one." } }),
    requires: ["files.view"],
    kind: "read",
    status: "opening the plan…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const { sb } = ctx.session;
      const all = await loadFiles(sb, s.id, null, 500);
      const candidates = all.filter((f) => f.kind === "plan" || f.kind === "document");
      if (candidates.length === 0) throw new ToolError(`No plans or documents are on file for ${s.name} yet.`);

      const query = str(input, "file");
      let file: FileRow;
      if (query) {
        const m = matchByName(query, candidates, (f) => `${f.name} ${f.caption}`);
        if (m.length === 0) throw new ToolError(`No plan/document matches "${query}" on ${s.name}. On file: ${candidates.map((f) => f.name).join(", ")}`);
        const [top, second] = m;
        if (!(top.score >= 40 && (!second || top.score - second.score >= 15 || top.score === 100))) {
          throw new ToolError(
            `Several files match "${query}": ${m.slice(0, 5).map((x) => x.project.name).join("; ")} — ask which one.`,
            { candidates: m.slice(0, 5).map((x) => ({ id: x.project.id, name: x.project.name })) },
          );
        }
        file = top.project;
      } else {
        file = [...candidates].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      }

      const mime = file.mime ?? "";
      const isImage = VIEWABLE_MIME.test(mime);
      const isPdf = mime === "application/pdf";
      if (!isImage && !isPdf) {
        throw new ToolError(`"${file.name}" is a ${mime || "file"} Bob can't open visually — only PDF or JPEG/PNG/GIF/WEBP images. Ask for a PDF or image export.`);
      }
      if (file.size_bytes && file.size_bytes > MAX_VIEW_BYTES) {
        throw new ToolError(`"${file.name}" is ${Math.round(file.size_bytes / 1024 / 1024)} MB — too large to open here. Ask for a smaller export, or just the relevant sheet.`);
      }

      const urls = await signedUrls(sb, file.bucket, [file.storage_path]);
      const url = urls.get(file.storage_path);
      if (!url) throw new ToolError(`Couldn't get a link to "${file.name}" — try again in a moment.`);

      return {
        data: { opened: file.name, kind: file.kind, project: s.name },
        event: `👁 opened "${file.name}" to look at it`,
        attachments: [isPdf ? { type: "document", source: { type: "url", url }, title: file.name } : { type: "image", source: { type: "url", url } }],
        projectId: s.id,
      };
    },
  },
  {
    name: "get_project_photos",
    description:
      "Progress photos of a project (newest first): when taken, who uploaded, caption, phase, and a one-hour link to each. Filter by phase name or period (today, yesterday, this_week, last_week, last_7_days, last_30_days). To let the person browse them, also navigate_to photos.",
    input_schema: schema({ ...PROJECT_PROPS, phase: { type: "string" }, since: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "last_7_days", "last_30_days"] }, limit: { type: "number", description: "default 12" } }),
    requires: ["files.view"],
    kind: "read",
    status: "looking at the photos…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const { sb, timezone } = ctx.session;
      let photos = await loadFiles(sb, s.id, "photo", 500);
      const total = photos.length;
      const phases = await loadPhases(sb, s.id);
      const phaseName = new Map(phases.map((p) => [p.id, p.name]));
      const phase = str(input, "phase");
      if (phase) {
        const m = matchByName(phase, phases, (p) => p.name);
        if (!m.length || m[0].score < 60) throw new ToolError(`No phase matches "${phase}". Phases: ${phases.map((p) => p.name).join(", ") || "none"}`);
        photos = photos.filter((f) => f.phase_id === m[0].project.id);
      }
      const since = str(input, "since");
      if (since) {
        const preset = parsePreset(since);
        if (!preset) throw new ToolError("since must be today, yesterday, this_week, last_week, last_7_days or last_30_days");
        const r = instantRange(preset, ctx.now, timezone);
        photos = photos.filter((f) => {
          const when = f.taken_at ?? f.created_at;
          return when >= r.fromIso && when < r.toIso;
        });
      }
      const limit = intIn(input, "limit", 12, 1, 40);
      const shown = photos.slice(0, limit);
      const linked = await withLinks(sb, shown);
      return {
        data: {
          project: s.name,
          total_photos: total,
          matching: photos.length,
          photos: linked.map((p, i) => ({ ...p, phase: phaseName.get(shown[i].phase_id ?? "") ?? null })),
          hint: "Links expire in an hour. navigate_to photos opens the Photos sheet for browsing.",
        },
      };
    },
  },
  {
    name: "search_files",
    description:
      "Find plans, documents, receipts or photos by words in the file name or caption — in the current/named project or across every visible project. Returns a one-hour link to open each match. For 'find the electrical plan', 'where is the permit', 'find the photo of the north wall'.",
    input_schema: schema({ ...PROJECT_PROPS, query: { type: "string" }, all_projects: { type: "boolean" }, kind: { type: "string", enum: ["plan", "document", "photo", "receipt"] }, limit: { type: "number", description: "default 10" } }, ["query"]),
    requires: ["files.view"],
    kind: "read",
    status: "searching files…",
    execute: async (ctx, input) => {
      const q = str(input, "query") ?? "";
      const all = input.all_projects === true;
      const project = all ? null : await optionalProject(ctx, input);
      const { sb } = ctx.session;
      const kind = str(input, "kind") as FileRow["kind"] | undefined;
      const files = await loadFiles(sb, project?.id ?? null, kind ?? null, 1500);
      const matches = matchByName(q, files, (f) => `${f.name} ${f.caption}`)
        .filter((m) => m.score >= 30)
        .slice(0, intIn(input, "limit", 10, 1, 30))
        .map((m) => m.project);
      const projectNames = project ? new Map([[project.id, project.name]]) : new Map((await listSummaries(sb)).map((s) => [s.id, s.name]));
      const linked = await withLinks(sb, matches);
      return {
        data: {
          query: q,
          scope: project ? project.name : "all visible projects",
          count: matches.length,
          files: linked.map((f, i) => ({ ...f, project: projectNames.get(matches[i].project_id) ?? "?" })),
          hint: matches.length === 0 ? "Nothing matched. Try other words, or navigate_to plans / photos to browse." : "Links expire in an hour.",
        },
      };
    },
  },
];
