"use client";

import { uid } from "../format";
import { supabase } from "./client";
import type { NoteRow, ProfileRow } from "./database.types";

export interface NoteLinks {
  task?: { id: string; title: string; status: string } | null;
  budgetLine?: { id: string; category: string } | null;
  file?: { id: string; name: string; kind: string } | null;
  phase?: { id: string; name: string } | null;
}

export interface NoteWithAuthor {
  note: NoteRow;
  author: ProfileRow | null;
  links: NoteLinks;
}

const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))];

export async function loadNotes(projectId: string): Promise<NoteWithAuthor[]> {
  const sb = supabase();
  const { data, error } = await sb
    .from("notes")
    .select("*")
    .eq("project_id", projectId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const authorIds = uniq(rows.map((n) => n.author_id));
  const taskIds = uniq(rows.map((n) => n.task_id));
  const lineIds = uniq(rows.map((n) => n.budget_line_id));
  const fileIds = uniq(rows.map((n) => n.file_id));
  const phaseIds = uniq(rows.map((n) => n.phase_id));

  const [profiles, tasks, lines, files, phases] = await Promise.all([
    authorIds.length ? sb.from("profiles").select("*").in("id", authorIds) : Promise.resolve({ data: [], error: null }),
    taskIds.length ? sb.from("tasks").select("id,title,status").in("id", taskIds) : Promise.resolve({ data: [], error: null }),
    lineIds.length ? sb.from("budget_lines").select("id,category").in("id", lineIds) : Promise.resolve({ data: [], error: null }),
    fileIds.length ? sb.from("files").select("id,name,kind").in("id", fileIds) : Promise.resolve({ data: [], error: null }),
    phaseIds.length ? sb.from("project_phases").select("id,name").in("id", phaseIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error) throw profiles.error;
  // Links a role cannot see (e.g. budget lines for employees) simply resolve to null.
  const pMap = new Map((profiles.data ?? []).map((p) => [p.id, p as ProfileRow]));
  const tMap = new Map(((tasks.data ?? []) as { id: string; title: string; status: string }[]).map((t) => [t.id, t]));
  const lMap = new Map(((lines.data ?? []) as { id: string; category: string }[]).map((l) => [l.id, l]));
  const fMap = new Map(((files.data ?? []) as { id: string; name: string; kind: string }[]).map((f) => [f.id, f]));
  const phMap = new Map(((phases.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p]));

  return rows.map((note) => ({
    note,
    author: note.author_id ? (pMap.get(note.author_id) ?? null) : null,
    links: {
      task: note.task_id ? (tMap.get(note.task_id) ?? null) : null,
      budgetLine: note.budget_line_id ? (lMap.get(note.budget_line_id) ?? null) : null,
      file: note.file_id ? (fMap.get(note.file_id) ?? null) : null,
      phase: note.phase_id ? (phMap.get(note.phase_id) ?? null) : null,
    },
  }));
}

export async function addNote(input: {
  companyId: string;
  projectId: string;
  authorId: string;
  body: string;
  taskId?: string | null;
  budgetLineId?: string | null;
  fileId?: string | null;
  phaseId?: string | null;
}): Promise<NoteRow> {
  const { data, error } = await supabase()
    .from("notes")
    .insert({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      author_id: input.authorId,
      body: input.body,
      task_id: input.taskId ?? null,
      budget_line_id: input.budgetLineId ?? null,
      file_id: input.fileId ?? null,
      phase_id: input.phaseId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase().from("notes").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function editNote(id: string, body: string): Promise<void> {
  const { error } = await supabase().from("notes").update({ body, edited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Soft delete — history keeps the fact that a note existed. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase().from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
