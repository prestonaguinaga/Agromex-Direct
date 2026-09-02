import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { PendingActionView } from "../protocol";
import { createPendingAction } from "./confirm";
import { activityTools } from "./tools/activity";
import { budgetTools } from "./tools/budget";
import { estimateTools } from "./tools/estimate";
import { fileTools } from "./tools/files";
import { memoryTools } from "./tools/memory";
import { navigationTools } from "./tools/navigation";
import { noteTools } from "./tools/notes";
import { projectTools } from "./tools/projects";
import { taskTools } from "./tools/tasks";
import { teamTools } from "./tools/team";
import { ToolError, truncate, type Input, type ToolCtx, type ToolDef, type ToolKind } from "./types";

/**
 * The registry is the boundary between Bob and the application. Every tool
 * declares its inputs, the capabilities it needs and what it does; the model
 * is only offered the tools the person's role allows, each call re-checks
 * that, and guarded tools stop at the confirmation gate.
 */
export const ALL_TOOLS: ToolDef[] = [
  ...navigationTools,
  ...projectTools,
  ...budgetTools,
  ...taskTools,
  ...noteTools,
  ...fileTools,
  ...activityTools,
  ...teamTools,
  ...estimateTools,
  ...memoryTools,
];

const byName = new Map(ALL_TOOLS.map((t) => [t.name, t]));

export function findTool(name: string): ToolDef | undefined {
  return byName.get(name);
}

export function allowed(def: ToolDef, can: (c: string) => boolean): boolean {
  return def.requires.length === 0 || def.requires.some(can);
}

/** The tools offered to the model for this person — filtered BEFORE the model sees them. */
export function toolsFor(can: (c: string) => boolean): ToolDef[] {
  return ALL_TOOLS.filter((t) => allowed(t, can));
}

export function toAnthropicTool(def: ToolDef): Anthropic.Tool {
  return { name: def.name, description: def.description, input_schema: def.input_schema as Anthropic.Tool.InputSchema };
}

export interface ToolLogEntry {
  name: string;
  kind: ToolKind;
  input: Input;
  ok: boolean;
  /** One line for the transcript. */
  summary: string;
}

export interface RunOutcome {
  content: string;
  isError: boolean;
  log: ToolLogEntry;
  pending?: PendingActionView;
}

const MAX_RESULT_CHARS = 14_000;

function serialise(data: unknown): string {
  const s = typeof data === "string" ? data : JSON.stringify(data);
  return s.length > MAX_RESULT_CHARS ? `${s.slice(0, MAX_RESULT_CHARS)}\n…(truncated — ask for a narrower query)` : s;
}

/**
 * Run one tool call: permission check → guard (confirmation gate) → execute.
 * Errors become tool results the model can explain; nothing throws out.
 */
export async function runTool(def: ToolDef, ctx: ToolCtx, rawInput: unknown): Promise<RunOutcome> {
  const input = (rawInput && typeof rawInput === "object" ? (rawInput as Input) : {}) as Input;
  const base = { name: def.name, kind: def.kind, input };
  if (!allowed(def, ctx.session.can)) {
    const msg = `Your role can't do this (needs ${def.requires.join(" or ")}).`;
    return { content: JSON.stringify({ error: msg }), isError: true, log: { ...base, ok: false, summary: msg } };
  }
  try {
    if (def.guard && !ctx.confirmed) {
      const decision = await def.guard(ctx, input);
      if (decision) {
        const pending = await createPendingAction(ctx, def, decision.input ?? input, decision);
        ctx.emit({ type: "confirm", action: pending });
        return {
          content: JSON.stringify({
            status: "needs_confirmation",
            action_id: pending.id,
            preview: pending.preview,
            note: "A confirmation card is now in the chat. Tell the person what is queued; it runs only when they press Confirm. Do not call this tool again for the same change.",
          }),
          isError: false,
          pending,
          log: { ...base, ok: true, summary: `⏸ needs confirmation: ${pending.preview}` },
        };
      }
    }
    const result = await def.execute(ctx, input);
    if (result.event) ctx.emit({ type: "event", text: result.event });
    if (result.refresh?.length) ctx.emit({ type: "refresh", projectId: result.projectId ?? ctx.context.projectId, tables: result.refresh });
    if (result.navigate) ctx.emit({ type: "navigate", href: result.navigate.href, label: result.navigate.label });
    return {
      content: serialise(result.data),
      isError: false,
      log: { ...base, ok: true, summary: result.event ?? (result.navigate ? `→ ${result.navigate.label}` : `${def.name} ok`) },
    };
  } catch (e) {
    const msg = describeToolError(e);
    const extra = e instanceof ToolError ? e.extra : undefined;
    return {
      content: JSON.stringify({ error: msg, ...(extra ?? {}) }),
      isError: true,
      log: { ...base, ok: false, summary: truncate(`⚠ ${def.name}: ${msg}`, 300) },
    };
  }
}

export function describeToolError(e: unknown): string {
  if (e instanceof ToolError) return e.message;
  const err = e as { message?: string; code?: string };
  const msg = err?.message ?? String(e);
  if (err?.code === "42501" || /row-level security|permission denied|cannot|not editable|Your role/i.test(msg)) {
    return `The database refused this for your role: ${msg}`;
  }
  if (err?.code === "23505") return "That record already exists.";
  return msg;
}
