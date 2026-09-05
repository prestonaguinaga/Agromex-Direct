/**
 * Types shared by Bob's server route and the chat panel. Pure: no imports,
 * safe for the browser bundle and for node --test.
 */

export type BobTab =
  | "overview"
  | "budget"
  | "estimate"
  | "progress"
  | "files"
  | "photos"
  | "tasks"
  | "notes"
  | "activity"
  | "plan";

export const BOB_TABS: BobTab[] = ["overview", "budget", "estimate", "plan", "progress", "files", "photos", "tasks", "notes", "activity"];

/** Where the person is in the app when they talk to Bob. */
export interface BobContext {
  /** Pathname only (no query string). */
  route: string;
  projectId: string | null;
  tab: BobTab | null;
}

export type BobSensitivity = "delete" | "money" | "permissions" | "email" | "applicant" | "other";

/** A guarded action waiting for the person's yes or no. */
export interface PendingActionView {
  id: string;
  toolName: string;
  preview: string;
  sensitivity: BobSensitivity;
  expiresAt: string;
  projectId: string | null;
}

/** One line of the NDJSON stream from POST /api/bob. */
export type BobStreamEvent =
  | { type: "conversation"; id: string }
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "event"; text: string }
  | { type: "navigate"; href: string; label: string }
  | { type: "confirm"; action: PendingActionView }
  | { type: "refresh"; projectId: string | null; tables: string[] }
  | { type: "done"; text: string }
  | { type: "error"; text: string; code?: "limit" | "unauthorized" | "unavailable" | "server" };

export interface BobMessageView {
  id: string;
  role: "user" | "assistant" | "tool" | "event";
  text: string;
  toolName: string | null;
  createdAt: string;
}

export interface ConversationView {
  id: string;
  projectId: string | null;
  title: string;
  startedAt: string;
  turns: number;
}

/** Response of GET /api/bob/conversations. */
export interface ConversationPayload {
  conversation: ConversationView | null;
  messages: BobMessageView[];
  pending: PendingActionView[];
}

/** Response of POST /api/bob/confirm. */
export interface ConfirmResponse {
  ok: boolean;
  status: "executed" | "declined" | "expired" | "failed";
  text: string;
  events: string[];
  refresh?: { projectId: string | null; tables: string[] };
  navigate?: { href: string; label: string };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** Derive Bob's context from the browser location. */
export function contextFromLocation(pathname: string, tab: string | null): BobContext {
  const m = /^\/projects\/([0-9a-f-]{36})(?:\/|$)/i.exec(pathname);
  const projectId = m && isUuid(m[1]) ? m[1].toLowerCase() : null;
  const t = projectId && tab && (BOB_TABS as string[]).includes(tab) ? (tab as BobTab) : projectId ? "overview" : null;
  return { route: pathname, projectId, tab: t };
}
