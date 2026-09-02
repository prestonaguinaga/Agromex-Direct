"use client";

import { useState } from "react";
import { Label, Modal } from "@/components/ui";
import { TRADES } from "@/lib/checklists";
import { describeError } from "@/lib/data/client";
import type { TaskListRow, TaskRow, TaskStatus } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";
import { addSubcontractor } from "@/lib/data/subcontractors";
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER, addTask, deleteTask, updateTask } from "@/lib/data/tasks";
import { useProjectData } from "./ProjectContext";

/**
 * One editor for every task and checklist item. Roles with tasks.manage edit
 * everything; roles with only tasks.complete get the status control.
 */
export function TaskEditor({
  task,
  lists,
  defaultListId,
  defaultPhaseId,
  onClose,
  onSaved,
}: {
  task: TaskRow | null;
  lists: TaskListRow[];
  defaultListId?: string | null;
  defaultPhaseId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const session = useSession();
  const data = useProjectData();
  const canManage = session.can("tasks.manage");
  const canComplete = session.can("tasks.complete");
  const canSubs = session.can("subcontractors.manage");

  const [f, setF] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    notes: task?.notes ?? "",
    trade: task?.trade ?? "",
    status: (task?.status ?? "todo") as TaskStatus,
    priority: task?.priority ?? ("normal" as TaskRow["priority"]),
    task_list_id: task?.task_list_id ?? defaultListId ?? null,
    phase_id: task?.phase_id ?? defaultPhaseId ?? data.current?.id ?? null,
    assignee_id: task?.assignee_id ?? null,
    subcontractor_id: task?.subcontractor_id ?? null,
    start_date: task?.start_date ?? null,
    due_date: task?.due_date ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSub, setNewSub] = useState<{ name: string; trade: string } | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.title.trim() && canManage) return setError("Give the task a title.");
    setBusy(true);
    setError(null);
    try {
      if (task) {
        if (canManage) {
          await updateTask(task.id, {
            title: f.title.trim(),
            description: f.description,
            notes: f.notes,
            trade: f.trade,
            status: f.status,
            priority: f.priority,
            task_list_id: f.task_list_id,
            phase_id: f.phase_id,
            assignee_id: f.assignee_id,
            subcontractor_id: f.subcontractor_id,
            start_date: f.start_date,
            due_date: f.due_date,
          });
        } else {
          await updateTask(task.id, { status: f.status });
        }
      } else {
        await addTask({
          companyId: data.companyId,
          projectId: data.projectId,
          taskListId: f.task_list_id,
          title: f.title.trim(),
          description: f.description,
          notes: f.notes,
          trade: f.trade,
          status: f.status,
          priority: f.priority,
          phaseId: f.phase_id,
          assigneeId: f.assignee_id,
          subcontractorId: f.subcontractor_id,
          startDate: f.start_date,
          dueDate: f.due_date,
          position: 9999,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!task || !confirm(`Delete task "${task.title}"?`)) return;
    setBusy(true);
    try {
      await deleteTask(task.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  };

  const createSub = async () => {
    if (!newSub?.name.trim()) return;
    setBusy(true);
    try {
      const s = await addSubcontractor({ companyId: data.companyId, name: newSub.name.trim(), trade: newSub.trade || f.trade });
      await data.reloadSubcontractors();
      set("subcontractor_id", s.id);
      setNewSub(null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const ro = !canManage;

  return (
    <Modal title={task ? "Task" : "New task"} onClose={onClose} wide>
      <div className="grid gap-4">
        <div>
          <Label>Title</Label>
          <input className="field text-sm" value={f.title} disabled={ro} autoFocus={!task} onChange={(e) => set("title", e.target.value)} placeholder="What needs to happen" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Status</Label>
            <select className="field" value={f.status} disabled={!(canManage || canComplete)} onChange={(e) => set("status", e.target.value as TaskStatus)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {task?.completed_at && f.status === "done" && (
              <p className="microlabel mt-1 !normal-case !tracking-normal">
                Completed {new Date(task.completed_at).toLocaleDateString()}
                {task.completed_by && ` by ${data.memberName(task.completed_by) || "—"}`}
              </p>
            )}
          </div>
          <div>
            <Label>Priority</Label>
            <select className="field" value={f.priority} disabled={ro} onChange={(e) => set("priority", e.target.value as TaskRow["priority"])}>
              {(Object.keys(PRIORITY_LABELS) as TaskRow["priority"][]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Trade</Label>
            <select className="field" value={TRADES.includes(f.trade as (typeof TRADES)[number]) || f.trade === "" ? f.trade : "__custom"} disabled={ro} onChange={(e) => set("trade", e.target.value === "__custom" ? (prompt("Trade:", f.trade) ?? f.trade) : e.target.value)}>
              <option value="">—</option>
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {f.trade && !TRADES.includes(f.trade as (typeof TRADES)[number]) && <option value="__custom">{f.trade}</option>}
            </select>
          </div>
          <div>
            <Label>Construction phase</Label>
            <select className="field" value={f.phase_id ?? ""} disabled={ro} onChange={(e) => set("phase_id", e.target.value || null)}>
              <option value="">—</option>
              {data.phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Checklist</Label>
            <select className="field" value={f.task_list_id ?? ""} disabled={ro} onChange={(e) => set("task_list_id", e.target.value || null)}>
              <option value="">Not in a checklist</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Assigned to</Label>
            <select className="field" value={f.assignee_id ?? ""} disabled={ro} onChange={(e) => set("assignee_id", e.target.value || null)}>
              <option value="">Unassigned</option>
              {data.members
                .filter((m) => m.membership.is_active)
                .map((m) => (
                  <option key={m.membership.user_id} value={m.membership.user_id}>
                    {m.profile?.full_name || m.profile?.email}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <Label>Subcontractor</Label>
            {newSub ? (
              <div className="grid gap-2">
                <input className="field text-sm" placeholder="Company name" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} />
                <div className="flex gap-2">
                  <input className="field text-sm" placeholder="Trade" value={newSub.trade} onChange={(e) => setNewSub({ ...newSub, trade: e.target.value })} />
                  <button className="btn btn-xs" disabled={busy} onClick={() => void createSub()}>
                    Add
                  </button>
                  <button className="btn btn-xs btn-ghost" onClick={() => setNewSub(null)}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <select
                className="field"
                value={f.subcontractor_id ?? ""}
                disabled={ro}
                onChange={(e) => {
                  if (e.target.value === "__new") setNewSub({ name: "", trade: f.trade });
                  else set("subcontractor_id", e.target.value || null);
                }}
              >
                <option value="">None</option>
                {data.subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.trade ? ` · ${s.trade}` : ""}
                  </option>
                ))}
                {canSubs && <option value="__new">+ Add a subcontractor…</option>}
              </select>
            )}
          </div>
          <div>
            <Label>Start date</Label>
            <input type="date" className="field field-mono" value={f.start_date ?? ""} disabled={ro} onChange={(e) => set("start_date", e.target.value || null)} />
          </div>
          <div>
            <Label>Due date</Label>
            <input type="date" className="field field-mono" value={f.due_date ?? ""} disabled={ro} onChange={(e) => set("due_date", e.target.value || null)} />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <textarea className="field min-h-16 resize-y text-sm" value={f.description} disabled={ro} onChange={(e) => set("description", e.target.value)} placeholder="Scope, location on site, what done looks like…" />
        </div>
        <div>
          <Label>Notes</Label>
          <textarea className="field min-h-16 resize-y text-sm" value={f.notes} disabled={ro} onChange={(e) => set("notes", e.target.value)} placeholder="Running notes, blockers, who was called…" />
        </div>

        {error && <p className="border border-ink bg-paper-2 px-3 py-2 font-mono text-xs">⚠ {error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <div>
            {task && canManage && (
              <button className="btn btn-ghost" disabled={busy} onClick={() => void remove()}>
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-solid" disabled={busy || !(canManage || canComplete)} onClick={() => void save()}>
              {busy ? "Saving…" : task ? "Save" : "Add task"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
