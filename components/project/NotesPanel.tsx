"use client";

import { useState } from "react";
import { EmptyMark, ErrorMark, Label, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { loadBudget, type BudgetBundle } from "@/lib/data/budgets";
import { describeError } from "@/lib/data/client";
import type { FileRow, TaskRow } from "@/lib/data/database.types";
import { loadFiles } from "@/lib/data/files";
import { addNote, deleteNote, loadNotes, setNotePinned, type NoteWithAuthor } from "@/lib/data/notes";
import { useSession } from "@/lib/data/session";
import { loadTasks } from "@/lib/data/tasks";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { useProjectData } from "./ProjectContext";

export function NotesPanel() {
  const session = useSession();
  const data = useProjectData();
  const { projectId, companyId } = data;
  const canCreate = session.can("notes.create");
  const canManage = session.can("notes.manage");
  const canMoney = session.can("budgets.view");

  const live = useLiveRows<NoteWithAuthor>(`notes:${projectId}`, () => loadNotes(projectId), [{ table: "notes", filter: `project_id=eq.${projectId}` }]);
  const tasks = useLiveRows<TaskRow>(`notes-tasks:${projectId}`, () => loadTasks(projectId), [{ table: "tasks", filter: `project_id=eq.${projectId}` }], canCreate);
  const files = useLiveRows<FileRow>(`notes-files:${projectId}`, () => loadFiles(projectId), [{ table: "files", filter: `project_id=eq.${projectId}` }], canCreate && session.can("files.view"));
  const budget = useLiveRows<BudgetBundle>(`notes-budget:${projectId}`, async () => [await loadBudget(projectId)], [{ table: "budget_lines", filter: `project_id=eq.${projectId}` }], canCreate && canMoney);

  const [draft, setDraft] = useState("");
  const [links, setLinks] = useState({ taskId: "", budgetLineId: "", fileId: "", phaseId: "" });
  const [showLinks, setShowLinks] = useState(false);
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
    void run(() =>
      addNote({
        companyId,
        projectId,
        authorId: session.userId,
        body,
        taskId: links.taskId || null,
        budgetLineId: links.budgetLineId || null,
        fileId: links.fileId || null,
        phaseId: links.phaseId || data.current?.id || null,
      }).then(() => setLinks({ taskId: "", budgetLineId: "", fileId: "", phaseId: "" })),
    );
  };

  const linkCount = Object.values(links).filter(Boolean).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <section className="panel order-2 bg-paper lg:order-1">
        <PanelBar title={`Notes · ${live.rows.length}`} right={live.refreshing && <span className="microlabel">syncing…</span>} />
        {(error || live.error) && <ErrorMark text={error ?? live.error ?? ""} onRetry={() => void live.reload()} />}
        {live.loading && <LoadingMark text="Loading notes…" />}
        {!live.loading && !live.error && live.rows.length === 0 && <EmptyMark text="No notes yet" />}
        <ul className="divide-y divide-line-soft">
          {live.rows.map(({ note, author, links: l }) => {
            const mine = note.author_id === session.userId;
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
                {(l.task || l.budgetLine || l.file || l.phase || note.task_id || note.budget_line_id || note.file_id) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {l.phase && <Chip>◐ {l.phase.name}</Chip>}
                    {l.task ? <Chip>☐ Task · {l.task.title}</Chip> : note.task_id && <Chip>☐ Task</Chip>}
                    {l.budgetLine ? <Chip>$ Budget · {l.budgetLine.category}</Chip> : note.budget_line_id && <Chip>$ Budget item</Chip>}
                    {l.file ? <Chip>{l.file.kind === "photo" ? "📷" : "📐"} {l.file.name}</Chip> : note.file_id && <Chip>📎 File</Chip>}
                  </div>
                )}
                {(mine || canManage) && (
                  <div className="mt-2 flex gap-3">
                    <button className="microlabel hover:text-ink" disabled={busy} onClick={() => void run(() => setNotePinned(note.id, !note.pinned))}>
                      {note.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button className="microlabel hover:text-ink" disabled={busy} onClick={() => { if (confirm("Delete this note?")) void run(() => deleteNote(note.id)); }}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel order-1 h-fit bg-paper lg:order-2 lg:sticky lg:top-16">
        <PanelBar title="Add a note" />
        <div className="p-4">
          {canCreate ? (
            <>
              <textarea
                className="field min-h-28 resize-y text-sm leading-relaxed"
                placeholder="What happened on site, decisions, inspections, calls with the client…"
                value={draft}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post();
                }}
              />
              <button className="microlabel mt-2 hover:text-ink" onClick={() => setShowLinks((s) => !s)}>
                {showLinks ? "▾" : "▸"} Link to something {linkCount ? `(${linkCount})` : ""}
              </button>
              {showLinks && (
                <div className="mt-2 grid gap-2">
                  <div>
                    <Label>Phase</Label>
                    <select className="field text-xs" value={links.phaseId || data.current?.id || ""} onChange={(e) => setLinks({ ...links, phaseId: e.target.value })}>
                      <option value="">—</option>
                      {data.phases.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Task / checklist item</Label>
                    <select className="field text-xs" value={links.taskId} onChange={(e) => setLinks({ ...links, taskId: e.target.value })}>
                      <option value="">—</option>
                      {tasks.rows.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {canMoney && (
                    <div>
                      <Label>Budget item</Label>
                      <select className="field text-xs" value={links.budgetLineId} onChange={(e) => setLinks({ ...links, budgetLineId: e.target.value })}>
                        <option value="">—</option>
                        {(budget.rows[0]?.lines ?? []).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.category}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <Label>Photo or file</Label>
                    <select className="field text-xs" value={links.fileId} onChange={(e) => setLinks({ ...links, fileId: e.target.value })}>
                      <option value="">—</option>
                      {files.rows.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.kind === "photo" ? "📷 " : "📐 "}
                          {f.caption || f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="microlabel">Saved with your name and time</span>
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

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-mute">{children}</span>;
}
