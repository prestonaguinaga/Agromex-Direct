"use client";

import { uid } from "../format";
import { supabase } from "./client";
import type { NoteRow, ProfileRow } from "./database.types";

export interface NoteWithAuthor {
  note: NoteRow;
  author: ProfileRow | null;
}

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
  const ids = [...new Set(rows.map((n) => n.author_id).filter((x): x is string => Boolean(x)))];
  const profiles = new Map<string, ProfileRow>();
  if (ids.length) {
    const { data: ps, error: pErr } = await sb.from("profiles").select("*").in("id", ids);
    if (pErr) throw pErr;
    for (const p of ps ?? []) profiles.set(p.id, p);
  }
  return rows.map((note) => ({ note, author: note.author_id ? (profiles.get(note.author_id) ?? null) : null }));
}

export async function addNote(input: { companyId: string; projectId: string; authorId: string; body: string }): Promise<NoteRow> {
  const { data, error } = await supabase()
    .from("notes")
    .insert({
      id: uid(),
      company_id: input.companyId,
      project_id: input.projectId,
      author_id: input.authorId,
      body: input.body,
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
