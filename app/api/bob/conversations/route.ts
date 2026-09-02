import { NextResponse, type NextRequest } from "next/server";
import { isUuid, type ConversationPayload } from "@/lib/bob/protocol";
import { loadBobSession } from "@/lib/bob/server/auth";
import { listPendingActions } from "@/lib/bob/server/confirm";
import { findActiveConversation, loadMessages, startNewConversation, toConversationView, toMessageView } from "@/lib/bob/server/memory";
import type { BobSession } from "@/lib/bob/server/types";

/**
 * GET  /api/bob/conversations?projectId=…  → the open thread for that page (or none)
 * POST /api/bob/conversations {projectId}  → "New conversation": closes the open
 *      thread and starts a fresh one. Nothing is deleted — company records are
 *      never touched by this, and the old thread stays on disk.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function payload(session: BobSession, projectId: string | null): Promise<ConversationPayload> {
  const c = await findActiveConversation(session, projectId);
  if (!c) return { conversation: null, messages: [], pending: [] };
  const [rows, pending] = await Promise.all([loadMessages(session, c.id), listPendingActions(session, c.id)]);
  return { conversation: toConversationView(c), messages: rows.map(toMessageView), pending };
}

function projectIdFrom(v: string | null | undefined): string | null {
  return isUuid(v) ? v.toLowerCase() : null;
}

export async function GET(request: NextRequest) {
  const auth = await loadBobSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json(await payload(auth.session, projectIdFrom(request.nextUrl.searchParams.get("projectId"))));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load the conversation." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await loadBobSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => ({}))) as { projectId?: unknown };
  const projectId = projectIdFrom(typeof body.projectId === "string" ? body.projectId : null);
  try {
    const c = await startNewConversation(auth.session, projectId);
    const out: ConversationPayload = { conversation: toConversationView(c), messages: [], pending: [] };
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start a new conversation." }, { status: 500 });
  }
}
