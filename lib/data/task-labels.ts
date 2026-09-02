import type { TaskRow, TaskStatus } from "./database.types";

/** Labels shared by the task sheets and Bob. Pure. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Complete",
};
export const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export const PRIORITY_LABELS: Record<TaskRow["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const STATUS_WORDS: Record<string, TaskStatus> = {
  todo: "todo",
  "to do": "todo",
  "to-do": "todo",
  open: "todo",
  pending: "todo",
  "not started": "todo",
  in_progress: "in_progress",
  "in progress": "in_progress",
  started: "in_progress",
  working: "in_progress",
  active: "in_progress",
  blocked: "blocked",
  stuck: "blocked",
  waiting: "blocked",
  done: "done",
  complete: "done",
  completed: "done",
  finished: "done",
  closed: "done",
};

/** "in progress", "finished", "complete" … → a task status, or null. */
export function parseTaskStatus(v: unknown): TaskStatus | null {
  if (typeof v !== "string") return null;
  return STATUS_WORDS[v.trim().toLowerCase()] ?? null;
}

const PRIORITIES: TaskRow["priority"][] = ["low", "normal", "high", "urgent"];
export function parsePriority(v: unknown): TaskRow["priority"] | null {
  return typeof v === "string" && (PRIORITIES as string[]).includes(v.toLowerCase()) ? (v.toLowerCase() as TaskRow["priority"]) : null;
}
