import "server-only";
import type { BobPendingActionRow, Json } from "../../data/database.types";
import type { BobStreamEvent, ConfirmResponse, PendingActionView } from "../protocol";
import { localYmd } from "../time";
import type { BobSession, GuardOutcome, Input, ToolCtx, ToolDef } from "./types";

/**
 * The confirmation gate. A guarded tool never executes inside the chat loop:
 * it records what Bob intends to do, in plain English, and waits. Confirming
 * is a separate authenticated request that re-checks the person's
 * capabilities at that moment, executes, and records the outcome. Actions
 * expire after ten minutes.
 */

export const ACTION_TTL_MINUTES = 10;

export function toView(row: BobPendingActionRow): PendingActionView {
  return {
    id: row.id,
    toolName: row.tool_name,
    preview: row.preview,
    sensitivity: row.sensitivity,
    expiresAt: row.expires_at,
    projectId: row.project_id,
  };
}

export async function createPendingAction(ctx: ToolCtx, def: ToolDef, input: Input, decision: GuardOutcome): Promise<PendingActionView> {
  const { sb, companyId, userId } = ctx.session;
  const { data, error } = await sb
    .from("bob_pending_actions")
    .insert({
      company_id: companyId,
      user_id: userId,
      conversation_id: ctx.conversationId,
      project_id: decision.projectId ?? ctx.context.projectId ?? null,
      tool_name: def.name,
      tool_input: input as Json,
      preview: decision.preview,
      sensitivity: decision.sensitivity,
      expires_at: new Date(Date.now() + ACTION_TTL_MINUTES * 60_000).toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toView(data);
}

export async function listPendingActions(session: BobSession, conversationId: string): Promise<PendingActionView[]> {
  const { data, error } = await session.sb
    .from("bob_pending_actions")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(toView);
}

/** Resolve a pending action after the person pressed Confirm or Cancel. */
export async function resolvePendingAction(
  session: BobSession,
  actionId: string,
  decision: "confirm" | "decline",
  deps: {
    findTool: (name: string) => ToolDef | undefined;
    allowed: (def: ToolDef, can: (c: string) => boolean) => boolean;
    describeError: (e: unknown) => string;
  },
): Promise<ConfirmResponse> {
  const { sb } = session;
  const { data: row, error } = await sb.from("bob_pending_actions").select("*").eq("id", actionId).maybeSingle();
  if (error) throw error;
  if (!row) return { ok: false, status: "failed", text: "That action no longer exists.", events: [] };
  if (row.status !== "pending") {
    return { ok: false, status: row.status === "declined" ? "declined" : row.status === "executed" ? "executed" : "failed", text: `This action was already ${row.status}.`, events: [] };
  }

  const finish = async (status: BobPendingActionRow["status"], result: string) => {
    await sb.from("bob_pending_actions").update({ status, result, resolved_at: new Date().toISOString() }).eq("id", actionId);
  };

  if (decision === "decline") {
    await finish("declined", "Declined by the person.");
    await logToConversation(session, row, `✕ Declined: ${row.preview}`);
    return { ok: true, status: "declined", text: `Cancelled — nothing changed. (${row.preview})`, events: [`✕ Declined: ${row.preview}`] };
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    await finish("expired", "Expired before confirmation.");
    return { ok: false, status: "expired", text: "That confirmation expired (10 minutes). Ask Bob again and confirm sooner.", events: [] };
  }

  const def = deps.findTool(row.tool_name);
  if (!def) {
    await finish("failed", "Tool no longer exists.");
    return { ok: false, status: "failed", text: "That action is no longer available.", events: [] };
  }
  // Permissions are re-checked NOW, with a freshly loaded session, not when Bob proposed it.
  if (!deps.allowed(def, session.can)) {
    await finish("failed", "Permission missing at confirmation time.");
    return { ok: false, status: "failed", text: `Your role can no longer do this (needs ${def.requires.join(" or ")}).`, events: [] };
  }

  const events: string[] = [];
  let refresh: ConfirmResponse["refresh"];
  let navigate: ConfirmResponse["navigate"];
  const now = new Date();
  const ctx: ToolCtx = {
    session,
    context: { route: "", projectId: row.project_id, tab: null },
    conversationId: row.conversation_id,
    confirmed: true,
    emit: (e: BobStreamEvent) => {
      if (e.type === "event") events.push(e.text);
      if (e.type === "refresh") refresh = { projectId: e.projectId, tables: e.tables };
      if (e.type === "navigate") navigate = { href: e.href, label: e.label };
    },
    now,
    today: localYmd(now, session.timezone),
  };
  try {
    const result = await def.execute(ctx, (row.tool_input ?? {}) as Input);
    if (result.event) events.push(result.event);
    if (result.refresh?.length) refresh = { projectId: result.projectId ?? row.project_id, tables: result.refresh };
    if (result.navigate) navigate = result.navigate;
    const text = result.event ?? `Done: ${row.preview}`;
    await finish("executed", text);
    await logToConversation(session, row, `✓ Confirmed and done: ${text}`);
    return { ok: true, status: "executed", text, events, refresh, navigate };
  } catch (e) {
    const msg = deps.describeError(e);
    await finish("failed", msg);
    await logToConversation(session, row, `⚠ Confirmed but failed: ${msg}`);
    return { ok: false, status: "failed", text: `Couldn't do it: ${msg}`, events };
  }
}

async function logToConversation(session: BobSession, row: BobPendingActionRow, text: string): Promise<void> {
  if (!row.conversation_id) return;
  await session.sb.from("bob_messages").insert({
    company_id: session.companyId,
    conversation_id: row.conversation_id,
    user_id: session.userId,
    role: "event",
    text,
    tool_name: row.tool_name,
    tool_input: row.tool_input,
    tool_ok: text.startsWith("✓"),
  });
}
