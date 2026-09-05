import { NextResponse, type NextRequest } from "next/server";
import { buildStableBrief } from "@/lib/bob/knowledge";
import { BOB_TABS, isUuid, type BobContext, type BobStreamEvent } from "@/lib/bob/protocol";
import { anthropicClient, bobEffort, bobModel, serverTools } from "@/lib/bob/server/anthropic";
import { loadBobSession } from "@/lib/bob/server/auth";
import { buildDynamicContext } from "@/lib/bob/server/context";
import { appendMessages, countTodayTurns, getOrCreateConversation, historyForModel, loadMessages, loadPreferences, maybeSummarise, type NewMessage } from "@/lib/bob/server/memory";
import { toolsFor } from "@/lib/bob/server/registry";
import { runBobTurn } from "@/lib/bob/server/run";
import type { ToolCtx } from "@/lib/bob/server/types";
import { localYmd } from "@/lib/bob/time";

/**
 * POST /api/bob — one turn with Bob, streamed back as NDJSON (one JSON event
 * per line; see BobStreamEvent). Everything AI-related happens here, on the
 * server, with the person's own database session: the browser never holds
 * a provider key and never talks to the provider.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_MESSAGE_CHARS = 4000;

function parseContext(raw: unknown): BobContext {
  const c = (raw ?? {}) as Partial<BobContext>;
  const projectId = isUuid(c.projectId) ? c.projectId.toLowerCase() : null;
  const tab = projectId && typeof c.tab === "string" && (BOB_TABS as string[]).includes(c.tab) ? (c.tab as BobContext["tab"]) : projectId ? "overview" : null;
  const route = typeof c.route === "string" && c.route.startsWith("/") ? c.route.slice(0, 200) : "/";
  return { route, projectId, tab };
}

export async function POST(request: NextRequest) {
  const auth = await loadBobSession();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { session } = auth;

  const client = anthropicClient();
  if (!client) {
    return NextResponse.json({ error: "Bob isn't configured on the server yet: ANTHROPIC_API_KEY is missing. The owner sets it in the deployment's environment variables." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: unknown; conversationId?: unknown; context?: unknown };
  const userText = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : "";
  if (!userText) return NextResponse.json({ error: "Say something first." }, { status: 400 });
  const context = parseContext(body.context);
  const conversationId = isUuid(body.conversationId) ? body.conversationId : null;

  const now = new Date();
  const today = localYmd(now, session.timezone);

  const used = await countTodayTurns(session, now).catch(() => 0);
  if (used >= session.settings.dailyTurnCap) {
    return NextResponse.json(
      { error: `Bob is resting until tomorrow — today's limit of ${session.settings.dailyTurnCap} messages is used up. The owner can raise it in the company settings (bob.dailyTurnCap).`, code: "limit" },
      { status: 429 },
    );
  }

  const conversation = await getOrCreateConversation(session, context.projectId, conversationId, userText);
  const [rows, preferences] = await Promise.all([loadMessages(session, conversation.id), loadPreferences(session).catch(() => ({}))]);
  const history = historyForModel(rows, conversation.summary_through);

  const model = bobModel(session.settings);
  const defs = toolsFor(session.can);
  const web = session.can("estimates.edit");
  const stableBrief = buildStableBrief({ estimatesView: session.can("estimates.view"), estimatesEdit: session.can("estimates.edit"), web, plansEdit: session.can("plans.edit") });
  const dynamicContext = await buildDynamicContext({ session, context, now, today, preferences, conversationSummary: conversation.summary || null });

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (e: BobStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          closed = true;
        }
      };
      send({ type: "conversation", id: conversation.id });
      const ctx: ToolCtx = { session, context, conversationId: conversation.id, confirmed: false, emit: send, now, today };
      const pending: NewMessage[] = [{ role: "user", text: userText }];
      try {
        const outcome = await runBobTurn({
          client,
          model,
          effort: bobEffort(),
          stableBrief,
          dynamicContext,
          history,
          userText,
          defs,
          serverTools: web ? serverTools(model) : [],
          ctx,
          signal: abort.signal,
        });
        for (const t of outcome.toolLog) {
          pending.push({ role: "tool", text: t.summary, toolName: t.name, toolInput: t.input, toolOk: t.ok });
        }
        pending.push({ role: "assistant", text: outcome.text || "Done.", inputTokens: outcome.usage.input, outputTokens: outcome.usage.output });
        send({ type: "done", text: outcome.text || "Done." });
      } catch (e) {
        const msg = describeFailure(e);
        pending.push({ role: "event", text: `⚠ ${msg}` });
        send({ type: "error", text: msg, code: "server" });
      } finally {
        try {
          await appendMessages(session, conversation.id, pending);
          const all = await loadMessages(session, conversation.id);
          await maybeSummarise(client, model, session, conversation, all);
        } catch {
          // The person already has the answer; memory bookkeeping is best-effort.
        }
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function describeFailure(e: unknown): string {
  const err = e as { status?: number; message?: string; name?: string };
  if (err?.name === "AbortError") return "Stopped.";
  if (err?.status === 401) return "The server's AI key was rejected — the owner needs to check ANTHROPIC_API_KEY.";
  if (err?.status === 429) return "The AI provider is rate-limiting right now — try again in a moment.";
  if (err?.status === 529 || err?.status === 503) return "The AI provider is overloaded — try again in a moment.";
  return err?.message ? `Something went wrong: ${err.message}` : "Something went wrong — try again.";
}
