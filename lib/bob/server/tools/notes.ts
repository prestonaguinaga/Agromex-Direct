import "server-only";
import { uid } from "../../../format";
import { matchByName } from "../../match";
import { isUuid } from "../../protocol";
import { getNote, loadNotes, loadPhases, loadTasks, profilesById, nameOf } from "../data";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, ToolError, intIn, schema, str, truncate, type ToolDef } from "../types";

export const noteTools: ToolDef[] = [
  {
    name: "get_project_notes",
    description: "Recent project notes (newest first) with author and time; optional search words. For 'any notes on…', 'what did the crew say', 'latest note'.",
    input_schema: schema({ ...PROJECT_PROPS, search: { type: "string" }, limit: { type: "number", description: "default 10" } }),
    requires: [],
    kind: "read",
    status: "reading notes…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const notes = await loadNotes(ctx.session.sb, s.id, intIn(input, "limit", 10, 1, 50), str(input, "search"));
      const authors = await profilesById(ctx.session.sb, notes.map((n) => n.author_id ?? "").filter(Boolean));
      return {
        data: {
          project: s.name,
          count: notes.length,
          notes: notes.map((n) => ({ id: n.id, when: n.created_at, by: nameOf(authors.get(n.author_id ?? "")) || "Unknown", pinned: n.pinned, text: truncate(n.body, 1200), edited: Boolean(n.edited_at) })),
        },
      };
    },
  },
  {
    name: "create_project_note",
    description:
      "Add a timestamped, author-stamped note to a project (current project by default) — the right place to keep information for the team ('note that the framing inspection passed', 'log that trusses arrive Thursday'). Write the note in the person's words; optionally link it to a task (by title) or a phase (by name).",
    input_schema: schema({ ...PROJECT_PROPS, body: { type: "string" }, task: { type: "string", description: "task title to link" }, phase: { type: "string", description: "phase name to link" } }, ["body"]),
    requires: ["notes.create"],
    kind: "write",
    status: "adding the note…",
    execute: async (ctx, input) => {
      const s = await resolveProject(ctx, input);
      const body = str(input, "body");
      if (!body) throw new ToolError("body is required");
      const { sb, companyId, userId } = ctx.session;
      let taskId: string | null = null;
      let phaseId: string | null = null;
      const links: string[] = [];
      const task = str(input, "task");
      if (task) {
        const m = matchByName(task, await loadTasks(sb, s.id), (t) => t.title);
        if (!m.length || m[0].score < 60) throw new ToolError(`No task matches "${task}" on ${s.name}.`);
        taskId = m[0].project.id;
        links.push(`task "${m[0].project.title}"`);
      }
      const phase = str(input, "phase");
      if (phase) {
        const m = matchByName(phase, await loadPhases(sb, s.id), (p) => p.name);
        if (!m.length || m[0].score < 60) throw new ToolError(`No phase matches "${phase}" on ${s.name}.`);
        phaseId = m[0].project.id;
        links.push(`phase ${m[0].project.name}`);
      }
      const { data, error } = await sb
        .from("notes")
        .insert({ id: uid(), company_id: companyId, project_id: s.id, author_id: userId, body, task_id: taskId, phase_id: phaseId })
        .select("*")
        .single();
      if (error) throw error;
      return { data: { ok: true, note_id: data.id, project: s.name, when: data.created_at, links }, event: `✎ note on ${s.name}: "${truncate(body, 80)}"${links.length ? ` (${links.join(", ")})` : ""}`, refresh: ["notes"], projectId: s.id };
    },
  },
  {
    name: "delete_note",
    description: "Delete a project note (soft delete; history keeps it). Guarded: always needs confirmation. note_id comes from get_project_notes.",
    input_schema: schema({ note_id: { type: "string" } }, ["note_id"]),
    requires: ["notes.create", "notes.manage"],
    kind: "write",
    status: "preparing the deletion…",
    guard: async (ctx, input) => {
      const id = str(input, "note_id");
      if (!id || !isUuid(id)) throw new ToolError("note_id must be a uuid from get_project_notes");
      const n = await getNote(ctx.session.sb, id);
      if (!n) throw new ToolError("No note with that id is visible to you.");
      if (n.author_id !== ctx.session.userId && !ctx.session.can("notes.manage")) throw new ToolError("Only the author or a role with notes.manage can delete this note.");
      return { sensitivity: "delete", preview: `Delete note "${truncate(n.body, 70)}"`, projectId: n.project_id, input: { note_id: n.id } };
    },
    execute: async (ctx, input) => {
      const id = str(input, "note_id");
      if (!id || !isUuid(id)) throw new ToolError("note_id must be a uuid");
      const n = await getNote(ctx.session.sb, id);
      if (!n) throw new ToolError("No note with that id is visible to you.");
      const { error } = await ctx.session.sb.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { data: { ok: true }, event: `✕ deleted note "${truncate(n.body, 60)}"`, refresh: ["notes"], projectId: n.project_id };
    },
  },
];
