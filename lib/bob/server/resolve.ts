import "server-only";
import type { ProjectSummaryRow, TaskRow } from "../../data/database.types";
import { matchByName, matchProjects, pickProject } from "../match";
import { isUuid } from "../protocol";
import { getSummary, getTask, listSummaries, loadTasks } from "./data";
import { ToolError, str, type Input, type ToolCtx } from "./types";
import { projectNumber } from "../digest";

/**
 * Turning what people say ("the Smith job", "the trusses task") into rows —
 * with the current page as the default and a clarifying error when several
 * things match. Every lookup runs as the person, so only visible rows match.
 */

export function candidateList(rows: ProjectSummaryRow[]): string {
  return rows.map((p) => `${projectNumber(p)} ${p.name}${p.client_name ? ` (${p.client_name})` : ""} [${p.id}]`).join("; ");
}

export async function resolveProject(ctx: ToolCtx, input: Input): Promise<ProjectSummaryRow> {
  const sb = ctx.session.sb;
  const id = str(input, "project_id");
  if (id) {
    if (!isUuid(id)) throw new ToolError("project_id must be a uuid — use search_projects to find the project first.");
    const s = await getSummary(sb, id);
    if (!s) throw new ToolError("No project with that id is visible to you.");
    return s;
  }
  const name = str(input, "project");
  if (name) {
    const all = await listSummaries(sb);
    const pick = pickProject(matchProjects(name, all));
    if (pick.kind === "one") return pick.project;
    if (pick.kind === "ambiguous") {
      throw new ToolError(`Several projects match "${name}" — ask the person which one: ${candidateList(pick.candidates)}`, {
        candidates: pick.candidates.map((p) => ({ id: p.id, number: projectNumber(p), name: p.name, client: p.client_name })),
      });
    }
    throw new ToolError(`No visible project matches "${name}". Projects you can see: ${candidateList(all.slice(0, 12))}${all.length > 12 ? "; …" : ""}`);
  }
  if (ctx.context.projectId) {
    const s = await getSummary(sb, ctx.context.projectId);
    if (s) return s;
  }
  throw new ToolError("Which project? Name it (search_projects finds it) or open it first.", { needs_project: true });
}

/** Like resolveProject but null when nothing points at a project (company-wide questions). */
export async function optionalProject(ctx: ToolCtx, input: Input): Promise<ProjectSummaryRow | null> {
  if (str(input, "project_id") || str(input, "project") || ctx.context.projectId) return resolveProject(ctx, input);
  return null;
}

export async function resolveTask(ctx: ToolCtx, input: Input, projectId: string | null): Promise<TaskRow> {
  const sb = ctx.session.sb;
  const id = str(input, "task_id");
  if (id) {
    if (!isUuid(id)) throw new ToolError("task_id must be a uuid — use get_project_tasks to find it.");
    const t = await getTask(sb, id);
    if (!t) throw new ToolError("No task with that id is visible to you.");
    return t;
  }
  const title = str(input, "task") ?? str(input, "title");
  if (!title) throw new ToolError("Give task_id or the task title.");
  const tasks = await loadTasks(sb, projectId);
  const matches = matchByName(title, tasks, (t) => t.title);
  if (matches.length === 0) throw new ToolError(`No task matches "${title}"${projectId ? " on this project" : ""}.`);
  const [top, second] = matches;
  if (top.score >= 60 && (!second || top.score - second.score >= 15 || top.score === 100)) return top.project;
  throw new ToolError(`Several tasks match "${title}" — ask which one: ${matches.slice(0, 5).map((m) => `"${m.project.title}" [${m.project.id}]`).join("; ")}`, {
    candidates: matches.slice(0, 5).map((m) => ({ id: m.project.id, title: m.project.title, status: m.project.status })),
  });
}
