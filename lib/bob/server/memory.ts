import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { BobConversationRow, BobMessageRow, Json } from "../../data/database.types";
import type { BobMessageView, ConversationView } from "../protocol";
import { localYmd, startOfLocalDay } from "../time";
import type { BobSession, Input } from "./types";

/**
 * Bob's three memories, kept apart on purpose:
 *   1. Conversation context — bob_conversations / bob_messages (this file).
 *      Private to the person; "New conversation" ends a thread, never deletes.
 *   2. User preferences — bob_user_preferences (how this person likes Bob).
 *   3. Verified company information — the project tables, read through tools
 *      on every turn. Never written from chat history.
 */

export const HISTORY_TURNS = 20;
const SUMMARISE_AFTER = 36; // messages beyond the last summary
const KEEP_VERBATIM = 16;

export function toConversationView(c: BobConversationRow): ConversationView {
  return { id: c.id, projectId: c.project_id, title: c.title, startedAt: c.started_at, turns: c.turns };
}

export function toMessageView(m: BobMessageRow): BobMessageView {
  return { id: m.id, role: m.role, text: m.text, toolName: m.tool_name, createdAt: m.created_at };
}

export async function findActiveConversation(session: BobSession, projectId: string | null): Promise<BobConversationRow | null> {
  let q = session.sb
    .from("bob_conversations")
    .select("*")
    .eq("user_id", session.userId)
    .is("ended_at", null)
    .order("last_message_at", { ascending: false })
    .limit(1);
  q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function getConversation(session: BobSession, id: string): Promise<BobConversationRow | null> {
  const { data, error } = await session.sb.from("bob_conversations").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createConversation(session: BobSession, projectId: string | null, title: string): Promise<BobConversationRow> {
  const { data, error } = await session.sb
    .from("bob_conversations")
    .insert({ company_id: session.companyId, user_id: session.userId, project_id: projectId, title: title.slice(0, 120) })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** The thread for this page: the one the client named (if still open), else the open one, else a new one. */
export async function getOrCreateConversation(session: BobSession, projectId: string | null, conversationId: string | null, title: string): Promise<BobConversationRow> {
  if (conversationId) {
    const c = await getConversation(session, conversationId);
    if (c && !c.ended_at && (c.project_id ?? null) === projectId) return c;
  }
  const open = await findActiveConversation(session, projectId);
  if (open) return open;
  return createConversation(session, projectId, title);
}

/** "New conversation": close the open thread(s) for this page and start a fresh one. Nothing is deleted. */
export async function startNewConversation(session: BobSession, projectId: string | null): Promise<BobConversationRow> {
  let q = session.sb.from("bob_conversations").update({ ended_at: new Date().toISOString() }).eq("user_id", session.userId).is("ended_at", null);
  q = projectId ? q.eq("project_id", projectId) : q.is("project_id", null);
  const { error } = await q;
  if (error) throw error;
  return createConversation(session, projectId, "");
}

export async function loadMessages(session: BobSession, conversationId: string, limit = 200): Promise<BobMessageRow[]> {
  const { data, error } = await session.sb
    .from("bob_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface NewMessage {
  role: BobMessageRow["role"];
  text: string;
  toolName?: string | null;
  toolInput?: Input | null;
  toolOk?: boolean | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export async function appendMessages(session: BobSession, conversationId: string, rows: NewMessage[]): Promise<void> {
  if (rows.length === 0) return;
  const base = Date.now();
  const { error } = await session.sb.from("bob_messages").insert(
    rows.map((r, i) => ({
      company_id: session.companyId,
      conversation_id: conversationId,
      user_id: session.userId,
      role: r.role,
      text: r.text,
      tool_name: r.toolName ?? null,
      tool_input: (r.toolInput ?? null) as Json | null,
      tool_ok: r.toolOk ?? null,
      input_tokens: r.inputTokens ?? null,
      output_tokens: r.outputTokens ?? null,
      // Keep the order stable even when several rows land in the same millisecond.
      created_at: new Date(base + i).toISOString(),
    })),
  );
  if (error) throw error;
}

/** Prior user/assistant turns for the model: after the summary cut-off, last N, first one a user turn. */
export function historyForModel(rows: BobMessageRow[], summaryThrough: string | null): Anthropic.MessageParam[] {
  const cutoff = summaryThrough ? Date.parse(summaryThrough) : -Infinity;
  const turns = rows
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.text.trim() && Date.parse(m.created_at) > cutoff)
    .slice(-HISTORY_TURNS)
    .map((m): Anthropic.MessageParam => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

/** Turns used today by this person (for the daily cap). */
export async function countTodayTurns(session: BobSession, now: Date): Promise<number> {
  const start = startOfLocalDay(localYmd(now, session.timezone), session.timezone).toISOString();
  const { count, error } = await session.sb
    .from("bob_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.userId)
    .eq("role", "user")
    .gte("created_at", start);
  if (error) throw error;
  return count ?? 0;
}

// ── Rolling summary (conversation context only) ────────────────────────────

/**
 * When a thread grows long, fold the older turns into a short summary so the
 * prompt stays small. The summary is explicitly conversation context: the
 * model is told it may contain the person's earlier questions and Bob's
 * answers, never verified facts.
 */
export async function maybeSummarise(client: Anthropic, model: string, session: BobSession, conversation: BobConversationRow, rows: BobMessageRow[]): Promise<void> {
  const cutoff = conversation.summary_through ? Date.parse(conversation.summary_through) : -Infinity;
  const fresh = rows.filter((m) => (m.role === "user" || m.role === "assistant") && Date.parse(m.created_at) > cutoff);
  if (fresh.length < SUMMARISE_AFTER) return;
  const toFold = fresh.slice(0, fresh.length - KEEP_VERBATIM);
  if (toFold.length === 0) return;
  const transcript = toFold.map((m) => `${m.role === "user" ? "Person" : "Bob"}: ${m.text.slice(0, 1200)}`).join("\n");
  try {
    const res = await client.messages.create({
      model,
      max_tokens: 700,
      output_config: { effort: "low" },
      system:
        "Summarise the conversation below in at most 12 short lines for the assistant's own memory. Keep: what the person asked about, which projects and records were discussed, decisions and open requests. Do not restate numbers as facts — write 'asked about the Smith budget', not the figures. Plain text.",
      messages: [{ role: "user", content: `${conversation.summary ? `Earlier summary:\n${conversation.summary}\n\nNew turns:\n` : ""}${transcript}` }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return;
    const through = toFold[toFold.length - 1].created_at;
    await session.sb.from("bob_conversations").update({ summary: text, summary_through: through }).eq("id", conversation.id);
  } catch {
    // Summaries are a convenience; the verbatim history still works without one.
  }
}

// ── User preferences ────────────────────────────────────────────────────────

export const PREFERENCE_KEYS = ["preferred_name", "answer_style", "default_project", "note"] as const;
export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];
export type Preferences = Partial<Record<PreferenceKey, string>>;

export async function loadPreferences(session: BobSession): Promise<Preferences> {
  const { data, error } = await session.sb.from("bob_user_preferences").select("*").eq("user_id", session.userId).maybeSingle();
  if (error) throw error;
  const raw = (data?.preferences ?? {}) as Record<string, unknown>;
  const out: Preferences = {};
  for (const k of PREFERENCE_KEYS) if (typeof raw[k] === "string" && raw[k]) out[k] = raw[k] as string;
  return out;
}

export async function savePreferences(session: BobSession, prefs: Preferences): Promise<void> {
  const { error } = await session.sb
    .from("bob_user_preferences")
    .upsert({ user_id: session.userId, company_id: session.companyId, preferences: prefs as Json }, { onConflict: "user_id" });
  if (error) throw error;
}
