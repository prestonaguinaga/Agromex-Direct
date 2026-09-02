"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyMark, ErrorMark, Label, LoadingMark, Modal, PanelBar } from "@/components/ui";
import { BUILTIN_CHECKLISTS } from "@/lib/checklists";
import { describeError } from "@/lib/data/client";
import type { TaskListRow, TaskRow, TaskStatus } from "@/lib/data/database.types";
import { addStandardPhases } from "@/lib/data/phases";
import { useSession } from "@/lib/data/session";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  addTask,
  applyChecklistTemplate,
  deleteCompanyTemplate,
  deleteTaskList,
  loadCompanyTemplates,
  loadTaskLists,
  loadTasks,
  saveListAsTemplate,
  setTaskStatus,
  updateTask,
  updateTaskList,
  type CompanyTemplate,
} from "@/lib/data/tasks";
import { useLiveRows } from "@/lib/data/use-live-rows";
import { useProjectData } from "./ProjectContext";
import { TaskEditor } from "./TaskEditor";

type View = "checklists" | "board";

export function TasksPanel({ openTask, onOpenTaskHandled }: { openTask?: TaskRow | null; onOpenTaskHandled?: () => void }) {
  const session = useSession();
  const data = useProjectData();
  const { projectId, companyId } = data;
  const canManage = session.can("tasks.manage");
  const canComplete = session.can("tasks.complete");

  const lists = useLiveRows<TaskListRow>(`task-lists:${projectId}`, () => loadTaskLists(projectId), [{ table: "task_lists", filter: `project_id=eq.${projectId}` }]);
  const tasks = useLiveRows<TaskRow>(`tasks:${projectId}`, () => loadTasks(projectId), [{ table: "tasks", filter: `project_id=eq.${projectId}` }]);
  const templates = useLiveRows<CompanyTemplate>(`templates:${companyId}`, () => loadCompanyTemplates(companyId), [{ table: "checklist_templates", filter: `company_id=eq.${companyId}` }], Boolean(companyId));

  const [view, setView] = useState<View>("checklists");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ task: TaskRow | null; listId?: string | null } | null>(openTask ? { task: openTask } : null);
  const [picker, setPicker] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [filterMine, setFilterMine] = useState(false);

  // A task handed over from another sheet (Progress / Overview) opens the editor.
  useEffect(() => {
    if (!openTask) return;
    setEditing({ task: openTask });
    onOpenTaskHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTask]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([lists.reload(), tasks.reload(), data.reloadSummary()]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const reloadAll = () => void Promise.all([lists.reload(), tasks.reload(), data.reloadSummary()]);

  const toggle = (t: TaskRow) => {
    const next: TaskStatus = t.status === "done" ? "todo" : "done";
    tasks.setRows((rows) => rows.map((r) => (r.id === t.id ? { ...r, status: next } : r))); // optimistic
    void run(() => setTaskStatus(t.id, next));
  };

  const visible = useMemo(
    () => tasks.rows.filter((t) => (filterStatus === "all" || t.status === filterStatus) && (!filterMine || t.assignee_id === session.userId)),
    [tasks.rows, filterStatus, filterMine, session.userId],
  );
  const done = tasks.rows.filter((t) => t.status === "done").length;
  const loading = lists.loading || tasks.loading;
  const unlisted = visible.filter((t) => !t.task_list_id || !lists.rows.some((l) => l.id === t.task_list_id));

  return (
    <div className="grid gap-4">
      <section className="panel bg-paper">
        <PanelBar
          title="Tasks & checklist"
          right={
            <span className="flex flex-wrap items-center gap-2">
              {tasks.refreshing && <span className="microlabel">syncing…</span>}
              <span className="microlabel tnum">
                {done}/{tasks.rows.length} complete
              </span>
              <span className="flex border">
                {(["checklists", "board"] as View[]).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${view === v ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
                    {v}
                  </button>
                ))}
              </span>
            </span>
          }
        />
        <div className="h-1 border-b">
          <div className="h-full bg-ink transition-all" style={{ width: `${tasks.rows.length ? (done / tasks.rows.length) * 100 : 0}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          {canManage && (
            <>
              <button className="btn btn-xs btn-solid" onClick={() => setEditing({ task: null })}>
                + Task
              </button>
              <button className="btn btn-xs" onClick={() => setPicker(true)}>
                + Checklist
              </button>
            </>
          )}
          <span className="ml-auto flex flex-wrap items-center gap-1">
            <button onClick={() => setFilterMine((m) => !m)} className={`border px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] ${filterMine ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"}`}>
              Mine
            </button>
            {(["all", ...STATUS_ORDER] as const).map((st) => (
              <button key={st} onClick={() => setFilterStatus(st)} className={`border px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] ${filterStatus === st ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"}`}>
                {st === "all" ? "All" : STATUS_LABELS[st]}
              </button>
            ))}
          </span>
        </div>
        {(error || lists.error || tasks.error) && <ErrorMark text={error ?? lists.error ?? tasks.error ?? ""} onRetry={reloadAll} />}
        {loading && <LoadingMark text="Loading tasks…" />}
        {!loading && tasks.rows.length === 0 && lists.rows.length === 0 && (
          <div className="pb-6">
            <EmptyMark text="No tasks or checklists yet" />
            {canManage && (
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn btn-solid" disabled={busy} onClick={() => void run(() => addStandardPhases({ companyId, projectId, withChecklists: true, existing: data.phases }).then(() => {}))}>
                  Set up standard phases &amp; checklists
                </button>
                <button className="btn" onClick={() => setPicker(true)}>
                  Add one checklist
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {view === "checklists" &&
        lists.rows.map((list) => (
          <ChecklistBlock
            key={list.id}
            list={list}
            tasks={visible.filter((t) => t.task_list_id === list.id)}
            allTasks={tasks.rows.filter((t) => t.task_list_id === list.id)}
            canManage={canManage}
            canComplete={canComplete}
            busy={busy}
            onToggle={toggle}
            onEdit={(t) => setEditing({ task: t })}
            onAdd={(title) => run(() => addTask({ companyId, projectId, taskListId: list.id, phaseId: list.phase_id, title, position: tasks.rows.length }).then(() => {}))}
            onRename={(name) => run(() => updateTaskList(list.id, { name }))}
            onPhase={(phaseId) => run(() => updateTaskList(list.id, { phase_id: phaseId }))}
            onSaveTemplate={() => {
              const name = prompt("Template name:", list.name);
              if (name) void run(() => saveListAsTemplate({ companyId, name, phaseKey: data.phases.find((p) => p.id === list.phase_id)?.key ?? null, tasks: tasks.rows.filter((t) => t.task_list_id === list.id) }).then(() => {}));
            }}
            onDelete={() => {
              if (confirm(`Delete checklist "${list.name}"? Its tasks stay on the project.`)) void run(() => deleteTaskList(list.id));
            }}
          />
        ))}
      {view === "checklists" && unlisted.length > 0 && (
        <ChecklistBlock
          list={{ id: "__unlisted", name: "Other tasks", phase_id: null } as TaskListRow}
          tasks={unlisted}
          allTasks={unlisted}
          canManage={canManage}
          canComplete={canComplete}
          busy={busy}
          onToggle={toggle}
          onEdit={(t) => setEditing({ task: t })}
          onAdd={(title) => run(() => addTask({ companyId, projectId, taskListId: null, title, position: tasks.rows.length }).then(() => {}))}
        />
      )}

      {view === "board" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((st) => {
            const col = visible.filter((t) => t.status === st);
            return (
              <section key={st} className="panel bg-paper">
                <PanelBar title={`${STATUS_LABELS[st]} · ${col.length}`} />
                <ul className="grid gap-1.5 p-2">
                  {col.length === 0 && <li className="px-2 py-3 text-xs text-mute">—</li>}
                  {col.map((t) => (
                    <li key={t.id} className={`border p-2 ${t.priority === "urgent" || t.priority === "high" ? "border-ink" : "border-line"}`}>
                      <button className="block w-full text-left text-sm font-medium leading-snug hover:underline" onClick={() => setEditing({ task: t })}>
                        {t.title}
                      </button>
                      <p className="microlabel tnum mt-1 !normal-case !tracking-normal">
                        {[t.trade, data.memberName(t.assignee_id) || data.subName(t.subcontractor_id), t.due_date ? `due ${t.due_date}` : null, t.priority !== "normal" ? PRIORITY_LABELS[t.priority] : null]
                          .filter(Boolean)
                          .join(" · ") || data.phaseName(t.phase_id) || "—"}
                      </p>
                      {(canManage || canComplete) && (
                        <select className="field field-quiet mt-1 w-full font-mono text-[0.625rem]" value={t.status} disabled={busy} onChange={(e) => void run(() => updateTask(t.id, { status: e.target.value as TaskStatus }))}>
                          {STATUS_ORDER.map((s2) => (
                            <option key={s2} value={s2}>
                              → {STATUS_LABELS[s2]}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <TaskEditor
          task={editing.task}
          lists={lists.rows}
          defaultListId={editing.listId}
          onClose={() => setEditing(null)}
          onSaved={reloadAll}
        />
      )}

      {picker && (
        <ChecklistPicker
          companyTemplates={templates.rows}
          onClose={() => setPicker(false)}
          onPick={(tpl) =>
            void run(async () => {
              const phaseId = data.phases.find((p) => p.key === tpl.phaseKey)?.id ?? null;
              await applyChecklistTemplate({ companyId, projectId, name: tpl.name, templateKey: tpl.key ?? null, phaseId, items: tpl.items, listPosition: lists.rows.length });
            }).then(() => setPicker(false))
          }
          onDeleteCompany={(id) => void run(() => deleteCompanyTemplate(id)).then(() => templates.reload())}
        />
      )}
    </div>
  );
}

function ChecklistBlock({
  list,
  tasks,
  allTasks,
  canManage,
  canComplete,
  busy,
  onToggle,
  onEdit,
  onAdd,
  onRename,
  onPhase,
  onSaveTemplate,
  onDelete,
}: {
  list: TaskListRow;
  tasks: TaskRow[];
  allTasks: TaskRow[];
  canManage: boolean;
  canComplete: boolean;
  busy: boolean;
  onToggle: (t: TaskRow) => void;
  onEdit: (t: TaskRow) => void;
  onAdd: (title: string) => Promise<void>;
  onRename?: (name: string) => Promise<void>;
  onPhase?: (phaseId: string | null) => Promise<void>;
  onSaveTemplate?: () => void;
  onDelete?: () => void;
}) {
  const data = useProjectData();
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const done = allTasks.filter((t) => t.status === "done").length;
  const today = new Date().toISOString().slice(0, 10);
  const real = list.id !== "__unlisted";

  return (
    <section className="panel bg-paper">
      <div className="bar flex items-center gap-2 border-b px-3 py-2">
        {real && canManage && onRename ? (
          <input
            className="min-w-0 flex-1 bg-transparent font-display text-xs uppercase tracking-[0.08em] outline-none"
            defaultValue={list.name}
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== list.name && void onRename(e.target.value.trim())}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <span className="font-display min-w-0 flex-1 truncate text-xs uppercase tracking-[0.08em]">{list.name}</span>
        )}
        {real && (data.phaseName(list.phase_id) || (canManage && onPhase)) && (
          canManage && onPhase ? (
            <select className="field field-quiet w-36 font-mono text-[0.625rem]" value={list.phase_id ?? ""} disabled={busy} onChange={(e) => void onPhase(e.target.value || null)}>
              <option value="">no phase</option>
              {data.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="microlabel">{data.phaseName(list.phase_id)}</span>
          )
        )}
        <span className="microlabel tnum">
          {done}/{allTasks.length}
        </span>
        {real && canManage && (onSaveTemplate || onDelete) && (
          <span className="relative">
            <button className="px-1 font-mono text-xs text-mute hover:text-ink" onClick={() => setMenu((m) => !m)} aria-label="Checklist menu">
              ⋯
            </button>
            {menu && (
              <span className="panel absolute right-0 top-6 z-20 grid w-48 bg-paper" onMouseLeave={() => setMenu(false)}>
                {onSaveTemplate && (
                  <button className="px-3 py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-mute hover:bg-ink hover:text-paper" onClick={() => { setMenu(false); onSaveTemplate(); }}>
                    Save as template
                  </button>
                )}
                {onDelete && (
                  <button className="px-3 py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-mute hover:bg-ink hover:text-paper" onClick={() => { setMenu(false); onDelete(); }}>
                    Delete checklist
                  </button>
                )}
              </span>
            )}
          </span>
        )}
      </div>
      <div>
        {tasks.map((t) => {
          const overdue = t.status !== "done" && t.due_date && t.due_date < today;
          const who = data.memberName(t.assignee_id) || data.subName(t.subcontractor_id);
          return (
            <div key={t.id} className={`flex items-center gap-2 border-b border-line-soft px-2 py-1.5 last:border-b-0 ${t.status === "done" ? "bg-paper-2" : ""}`}>
              <input
                type="checkbox"
                className="checkbox"
                checked={t.status === "done"}
                disabled={!(canComplete || canManage) || busy}
                onChange={() => onToggle(t)}
                title={t.status === "done" ? "Mark not done" : "Mark complete"}
              />
              <button className="min-w-0 flex-1 text-left" onClick={() => onEdit(t)}>
                <span className={`block truncate text-[0.8125rem] ${t.status === "done" ? "text-mute line-through" : ""}`}>{t.title}</span>
                <span className={`microlabel tnum block truncate !normal-case !tracking-normal ${overdue ? "text-ink" : ""}`}>
                  {[
                    t.status !== "done" && t.status !== "todo" ? STATUS_LABELS[t.status] : null,
                    t.trade || null,
                    who || null,
                    t.due_date ? `due ${t.due_date}${overdue ? " · overdue" : ""}` : null,
                    t.priority === "high" || t.priority === "urgent" ? PRIORITY_LABELS[t.priority] : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              <button className="px-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-mute hover:text-ink" onClick={() => onEdit(t)}>
                edit
              </button>
            </div>
          );
        })}
        {canManage && (
          <div className="flex items-center gap-2 px-2 py-2">
            <span className="microlabel shrink-0">+</span>
            <input
              className="field field-quiet flex-1 text-xs"
              placeholder="Add an item and hit Enter…"
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
        {tasks.length === 0 && !canManage && <p className="px-3 py-3 text-xs text-mute">No items in this list.</p>}
      </div>
    </section>
  );
}

function ChecklistPicker({
  companyTemplates,
  onClose,
  onPick,
  onDeleteCompany,
}: {
  companyTemplates: CompanyTemplate[];
  onClose: () => void;
  onPick: (t: { name: string; key?: string | null; phaseKey?: string | null; items: { title: string; trade?: string }[] }) => void;
  onDeleteCompany: (id: string) => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <Modal title="Add a checklist" onClose={onClose} wide>
      <div className="grid gap-5">
        <div>
          <Label>Blank checklist</Label>
          <div className="flex gap-2">
            <input className="field text-sm" placeholder="Checklist name" value={custom} onChange={(e) => setCustom(e.target.value)} />
            <button className="btn" disabled={!custom.trim()} onClick={() => onPick({ name: custom.trim(), items: [] })}>
              Create
            </button>
          </div>
        </div>
        {companyTemplates.length > 0 && (
          <div>
            <Label>Your company&apos;s templates</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {companyTemplates.map((ct) => (
                <div key={ct.template.id} className="flex items-center gap-2 border p-2">
                  <button className="min-w-0 flex-1 text-left" onClick={() => onPick({ name: ct.template.name, key: ct.template.key, phaseKey: ct.template.phase_key, items: ct.items.map((i) => ({ title: i.title, trade: i.trade })) })}>
                    <span className="block text-sm font-semibold">{ct.template.name}</span>
                    <span className="microlabel">{ct.items.length} items{ct.template.phase_key ? ` · ${ct.template.phase_key.replace("_", " ")}` : ""}</span>
                  </button>
                  <button className="font-mono text-xs text-mute hover:text-ink" title="Delete template" onClick={() => confirm(`Delete template "${ct.template.name}"?`) && onDeleteCompany(ct.template.id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label>Standard construction checklists</Label>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {BUILTIN_CHECKLISTS.map((t) => (
              <button key={t.key} className="border p-2 text-left hover:border-ink" onClick={() => onPick({ name: t.name, key: t.key, phaseKey: t.phaseKey, items: t.items })}>
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="microlabel">{t.items.length} items</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
