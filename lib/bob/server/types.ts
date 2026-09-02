import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RoleKey } from "../../data/database.types";
import type { GuardDecision } from "../guard";
import type { BobContext, BobStreamEvent } from "../protocol";

/**
 * The contracts every Bob tool is written against. Tools never see raw SQL,
 * the API key, or a service-role client: they get the person's own Supabase
 * client (row-level security applies), their capabilities, and where they
 * are in the app.
 */

export type Db = SupabaseClient<Database>;

export interface BobSettings {
  /** Turns per person per day before Bob rests (company settings → bob.dailyTurnCap). */
  dailyTurnCap: number;
  /** Model override (company settings → bob.model), else BOB_MODEL, else the default. */
  model: string | null;
}

export interface BobSession {
  sb: Db;
  userId: string;
  email: string | null;
  displayName: string;
  companyId: string;
  companyName: string;
  timezone: string;
  role: RoleKey;
  capabilities: ReadonlySet<string>;
  can: (capability: string) => boolean;
  settings: BobSettings;
}

export interface ToolCtx {
  session: BobSession;
  /** Where the person is (page, project, tab). */
  context: BobContext;
  conversationId: string | null;
  /** True only when a pending action is being executed after the person confirmed it. */
  confirmed: boolean;
  emit: (e: BobStreamEvent) => void;
  now: Date;
  /** Local calendar date in the company timezone (YYYY-MM-DD). */
  today: string;
}

export type Input = Record<string, unknown>;

export interface ToolResult {
  /** What the model sees (JSON-serialised by the loop). */
  data: unknown;
  /** One transcript line for the person; null/undefined for read-only tools. */
  event?: string | null;
  /** Tables that changed, so open screens reload. */
  refresh?: string[];
  navigate?: { href: string; label: string };
  projectId?: string | null;
}

export type ToolKind = "read" | "write" | "navigate" | "memory";

export interface GuardOutcome extends GuardDecision {
  projectId?: string | null;
  /** Resolved input to store with the pending action (ids instead of names). */
  input?: Input;
}

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  /** The person needs ANY of these capabilities; [] = anyone who may use Bob. */
  requires: string[];
  kind: ToolKind;
  /** Shown in the chat while the tool runs, e.g. "reading the budget…". */
  status: string;
  /** Guarded tools: return what needs confirming (null = run now). */
  guard?: (ctx: ToolCtx, input: Input) => Promise<GuardOutcome | null>;
  execute: (ctx: ToolCtx, input: Input) => Promise<ToolResult>;
}

/** A tool's own, explainable failure (wrong name, ambiguous match, no permission). */
export class ToolError extends Error {
  readonly extra: Record<string, unknown> | undefined;
  constructor(message: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = "ToolError";
    this.extra = extra;
  }
}

// ── input helpers ───────────────────────────────────────────────────────────
export function str(input: Input, key: string): string | undefined {
  const v = input[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function num(input: Input, key: string): number | undefined {
  const v = input[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/[$,\s]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function bool(input: Input, key: string): boolean | undefined {
  const v = input[key];
  return typeof v === "boolean" ? v : undefined;
}

export function intIn(input: Input, key: string, fallback: number, min: number, max: number): number {
  const v = num(input, key);
  if (v === undefined) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

/** JSON schema for an object with no extra properties. */
export function schema(properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> {
  return { type: "object", properties, required, additionalProperties: false };
}

export const PROJECT_PROPS = {
  project_id: { type: "string", description: "Project id (uuid) when known" },
  project: { type: "string", description: "Project name, client or number when the id is not known, e.g. \"Smith\", \"P-0007\". Omit inside a project to mean the current one." },
};

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
