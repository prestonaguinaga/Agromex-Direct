"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/inputs";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar } from "@/components/ui";
import { describeError } from "@/lib/data/client";
import type { TaskListRow, TaskRow } from "@/lib/data/database.types";
import {
  STARTER_CHECKLISTS,
  addTask,
  addTaskList,
  deleteTask,
  deleteTaskList,
  loadTaskLists,
  loadTasks,
  renameTaskList,
  setTaskStatus,
  updateTask,
} from "@/lib/data/tasks";
import { listMembers, type Member } from "@/lib/data/team";
import { useLiveRows } from "@/lib/data/use-live-rows";

export function TasksPanel({
  projectId,
  companyId,
  projectType,
  canManage,
  canComplete,
}: {
  projectId: string;
  companyId: string;
  projectType: "new-build" | "remodel";
  canManage: boolean;
  canComplete: boolean;
}) {
  const lists = useLiveRows<TaskListRow>(
    `task-lists:${projectId}`,
    () => loadTaskLists(projectId),
    [{ table: "task_lists", filter: `project_id=eq.${projectId}` }],
  );
  const tasks = useLiveRows<TaskRow>(
    `tasks:${projectId}`,
    () => loadTasks(projectId),
    [{ table: "tasks", filter: `project_id=eq.${projectId}` }],
  );
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newList, setNewList] = useState("");

  useEffect(() => {
    if (!companyId) return;
    listMembers(companyId).then(setMembers).catch(() => setMembers([]));
  }, [companyId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([lists.reload(), tasks.reload()]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (t: TaskRow) => {
    const next = t.status === "done" ? "todo" : "done";
    tasks.setRows((rows) => rows.map((r) => (r.id === t.id ? { ...r, status: next } : r))); // optimistic
    void run(() => setTaskStatus(t.id, next));
  };

  const seedStarter = () =>
    run(async () => {
      let pos = lists.rows.length;
      for (const cl of STARTER_CHECKLISTS[projectType]) {
        const list = await addTaskList({ companyId, projectId, name: cl.name, position: pos++ });
        let tp = 0;
        for (const title of cl.tasks) await addTask({ companyId, projectId, taskListId: list.id, title, position: tp++ });
      }
    });

  const done = tasks.rows.filter((t) => t.status === "done").length;
  const total = tasks.rows.length;
  const loading = lists.loading || tasks.loading;
  const unlisted = tasks.rows.filter((t) => !t.task_list_id || !lists.rows.some((l) => l.id === t.task_list_id));
  const nameOf = (id: string | null) => {
    if (!id) return "";
    const m = members.find((x) => x.membership.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || "…";
  };

  return (
    <div className="grid gap-4">
      <section className="panel bg-paper">
        <PanelBar
          title="Tasks & checklist"
          right={
            <span className="flex items-center gap-3">
              {tasks.refreshing && <span className="microlabel">syncing…</span>}
              <span className="microlabel tnum">
                {done}/{total} done
              </span>
            </span>
          }
        />
        <div className="h-1 border-b">
          <div className="h-full bg-ink transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        {(error || lists.error || tasks.error) && (
          <ErrorMark text={error ?? lists.error ?? tasks.error ?? ""} onRetry={() => void Promise.all([lists.reload(), tasks.reload()])} />
        )}
        {loading && <LoadingMark text="Loading tasks…" />}
        {!loading && lists.rows.length === 0 && unlisted.length === 0 && (
          <div>
            <EmptyMark text="No checklists yet" />
            {canManage && (
              <div className="flex flex-wrap justify-center gap-2 pb-6">
                <button className="btn" disabled={busy} onClick={() => void seedStarter()}>
                  Add starter checklists
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {lists.rows.map((list) => (
        <TaskList
          key={list.id}
          list={list}
          tasks={tasks.rows.filter((t) => t.task_list_id === list.id)}
          members={members}
          nameOf={nameOf}
          canManage={canManage}
          canComplete={canComplete}
          busy={busy}
          onToggle={toggle}
          onAdd={(title) => run(() => addTask({ companyId, projectId, taskListId: list.id, title, position: tasks.rows.length }).then(() => {}))}
          onUpdate={(id, patch) => run(() => updateTask(id, patch))}
          onDelete={(id) => run(() => deleteTask(id))}
          onRename={(name) => run(() => renameTaskList(list.id, name))}
          onDeleteList={() => {
            if (confirm(`Delete checklist "${list.name}"? Its tasks stay on the project.`)) void run(() => deleteTaskList(list.id));
          }}
        />
      ))}

      {unlisted.length > 0 && (
        <TaskList
          list={{ id: "__unlisted", name: "Other tasks" } as TaskListRow}
          tasks={unlisted}
          members={members}
          nameOf={nameOf}
          canManage={canManage}
          canComplete={canComplete}
          busy={busy}
          onToggle={toggle}
          onAdd={(title) => run(() => addTask({ companyId, projectId, taskListId: null, title, position: tasks.rows.length }).then(() => {}))}
          onUpdate={(id, patch) => run(() => updateTask(id, patch))}
          onDelete={(id) => run(() => deleteTask(id))}
        />
      )}

      {canManage && (
        <div className="flex gap-2">
          <input
            className="field flex-1 text-sm"
            placeholder="New checklist name (e.g. Inspections, Punch list)…"
            value={newList}
            onChange={(e) => setNewList(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newList.trim()) {
                void run(() => addTaskList({ companyId, projectId, name: newList.trim(), position: lists.rows.length }).then(() => setNewList("")));
              }
            }}
          />
          <button
            className="btn"
            disabled={busy || !newList.trim()}
            onClick={() => void run(() => addTaskList({ companyId, projectId, name: newList.trim(), position: lists.rows.length }).then(() => setNewList("")))}
          >
            + Checklist
          </button>
        </div>
      )}
    </div>
  );
}

function TaskList({
  list,
  tasks,
  members,
  nameOf,
  canManage,
  canComplete,
  busy,
  onToggle,
  onAdd,
  onUpdate,
  onDelete,
  onRename,
  onDeleteList,
}: {
  list: TaskListRow;
  tasks: TaskRow[];
  members: Member[];
  nameOf: (id: string | null) => string;
  canManage: boolean;
  canComplete: boolean;
  busy: boolean;
  onToggle: (t: TaskRow) => void;
  onAdd: (title: string) => Promise<void>;
  onUpdate: (id: string, patch: Parameters<typeof updateTask>[1]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename?: (name: string) => Promise<void>;
  onDeleteList?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const done = tasks.filter((t) => t.status === "done").length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="panel bg-paper">
      <div className="bar flex items-center gap-2 border-b px-3 py-2">
        {onRename && canManage ? (
          <TextInput
            value={list.name}
            onCommit={(v) => void onRename(v)}
            className="field-quiet min-w-0 flex-1 font-display text-xs uppercase tracking-[0.08em]"
          />
        ) : (
          <span className="font-display flex-1 text-xs uppercase tracking-[0.08em]">{list.name}</span>
        )}
        <span className="microlabel tnum">
          {done}/{tasks.length}
        </span>
        {onDeleteList && canManage && (
          <button className="px-1 font-mono text-xs text-mute hover:text-ink" title="Delete checklist" onClick={onDeleteList}>
            ✕
          </button>
        )}
      </div>
      <div>
        {tasks.map((t) => {
          const overdue = t.status !== "done" && t.due_date && t.due_date < today;
          return (
            <div
              key={t.id}
              className={`grid grid-cols-[28px_1fr] items-center gap-1 border-b border-line-soft px-2 py-1 last:border-b-0 sm:grid-cols-[28px_1fr_150px_140px_28px] ${
                t.status === "done" ? "bg-paper-2" : ""
              }`}
            >
              <input
                type="checkbox"
                className="checkbox justify-self-center"
                checked={t.status === "done"}
                disabled={!(canComplete || canManage) || busy}
                onChange={() => onToggle(t)}
                title={t.status === "done" ? `Done · ${t.completed_at ? new Date(t.completed_at).toLocaleDateString() : ""}` : "Mark done"}
              />
              {canManage ? (
                <TextInput
                  value={t.title}
                  onCommit={(v) => void onUpdate(t.id, { title: v })}
                  className={`field-quiet text-[0.8125rem] ${t.status === "done" ? "text-mute line-through" : ""}`}
                />
              ) : (
                <span className={`px-2 text-[0.8125rem] ${t.status === "done" ? "text-mute line-through" : ""}`}>{t.title}</span>
              )}
              {canManage ? (
                <select
                  className="field field-quiet font-mono text-[0.6875rem]"
                  value={t.assignee_id ?? ""}
                  onChange={(e) => void onUpdate(t.id, { assignee_id: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {members
                    .filter((m) => m.membership.is_active)
                    .map((m) => (
                      <option key={m.membership.user_id} value={m.membership.user_id}>
                        {m.profile?.full_name || m.profile?.email}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="microlabel truncate px-2">{nameOf(t.assignee_id) || "unassigned"}</span>
              )}
              {canManage ? (
                <input
                  type="date"
                  className={`field field-quiet font-mono text-[0.6875rem] ${overdue ? "border-ink" : ""}`}
                  value={t.due_date ?? ""}
                  onChange={(e) => void onUpdate(t.id, { due_date: e.target.value || null })}
                />
              ) : (
                <span className={`microlabel tnum px-2 ${overdue ? "text-ink" : ""}`}>{t.due_date ? `due ${t.due_date}${overdue ? " · overdue" : ""}` : ""}</span>
              )}
              {canManage ? (
                <button className="justify-self-center font-mono text-xs text-mute hover:text-ink" title="Delete task" onClick={() => void onDelete(t.id)}>
                  ✕
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
        {canManage && (
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="microlabel shrink-0">+</span>
            <input
              className="field field-quiet flex-1 text-xs"
              placeholder="Add a task and hit Enter…"
              value={draft}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  const title = draft.trim();
                  setDraft("");
                  void onAdd(title);
                }
              }}
            />
          </div>
        )}
        {tasks.length === 0 && !canManage && <p className="px-3 py-3 text-xs text-mute">No tasks in this list.</p>}
      </div>
    </section>
  );
}
