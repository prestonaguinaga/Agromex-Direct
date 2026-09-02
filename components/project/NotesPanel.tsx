"use client";

import { useState } from "react";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import { addNote, deleteNote, loadNotes, setNotePinned, type NoteWithAuthor } from "@/lib/data/notes";
import { useLiveRows } from "@/lib/data/use-live-rows";

export function NotesPanel({
  projectId,
  companyId,
  userId,
  canCreate,
  canManage,
}: {
  projectId: string;
  companyId: string;
  userId: string;
  canCreate: boolean;
  canManage: boolean;
}) {
  const live = useLiveRows<NoteWithAuthor>(
    `notes:${projectId}`,
    () => loadNotes(projectId),
    [{ table: "notes", filter: `project_id=eq.${projectId}` }],
  );
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await live.reload();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    void run(() => addNote({ companyId, projectId, authorId: userId, body }).then(() => {}));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="panel bg-paper">
        <PanelBar title="Notes" right={live.refreshing && <span className="microlabel">syncing…</span>} />
        {(error || live.error) && <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />}
        {live.loading && <LoadingMark text="Loading notes…" />}
        {!live.loading && !live.error && live.rows.length === 0 && <EmptyMark text="No notes yet" />}
        <ul className="divide-y divide-line-soft">
          {live.rows.map(({ note, author }) => {
            const mine = note.author_id === userId;
            return (
              <li key={note.id} className={`px-4 py-3 ${note.pinned ? "bg-paper-2" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold">
                    {author?.full_name || author?.email || "Unknown"}
                    {note.pinned && <span className="microlabel ml-2">pinned</span>}
                  </span>
                  <span className="microlabel tnum">
                    {formatWhen(note.created_at)}
                    {note.edited_at && " · edited"}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
                {(mine || canManage) && (
                  <div className="mt-2 flex gap-3">
                    <button className="microlabel hover:text-ink" disabled={busy} onClick={() => void run(() => setNotePinned(note.id, !note.pinned))}>
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      className="microlabel hover:text-ink"
                      disabled={busy}
                      onClick={() => {
                        if (confirm("Delete this note?")) void run(() => deleteNote(note.id));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel h-fit bg-paper lg:sticky lg:top-16">
        <PanelBar title="Add a note" />
        <div className="p-4">
          {canCreate ? (
            <>
              <textarea
                className="field min-h-32 resize-y text-sm leading-relaxed"
                placeholder="What happened on site, decisions, inspections, calls with the client…"
                value={draft}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="microlabel">Saved with your name and time · ⌘/Ctrl+Enter</span>
                <button className="btn btn-solid btn-xs" disabled={busy || !draft.trim()} onClick={post}>
                  Post note
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-mute">Your role can read notes but not add them.</p>
          )}
        </div>
      </section>
    </div>
  );
}
