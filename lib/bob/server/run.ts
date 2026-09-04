import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { BobStreamEvent } from "../protocol";
import { findTool, runTool, toAnthropicTool, type ToolLogEntry } from "./registry";
import type { ToolCtx, ToolDef } from "./types";

/**
 * One turn of Bob: ask the model → it may call tools → run them through the
 * registry (permissions, confirmation gate) → feed results back → repeat,
 * streaming text to the person as it arrives.
 */

const MAX_ROUNDS = 12;
const MAX_TOKENS = 8192;

export interface TurnArgs {
  client: Anthropic;
  model: string;
  effort: "low" | "medium" | "high";
  stableBrief: string;
  dynamicContext: string;
  history: Anthropic.MessageParam[];
  userText: string;
  defs: ToolDef[];
  serverTools: Anthropic.Messages.ToolUnion[];
  ctx: ToolCtx;
  signal?: AbortSignal;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface TurnOutcome {
  text: string;
  usage: Usage;
  toolLog: ToolLogEntry[];
  stopReason: string;
}

const REFUSAL_TEXT = "I can't help with that one. Anything else on the projects?";
const LIMIT_TEXT = "I hit my per-message action limit — the changes so far are applied. Send the rest as a new message.";

export async function runBobTurn(a: TurnArgs): Promise<TurnOutcome> {
  const emit = (e: BobStreamEvent) => a.ctx.emit(e);
  const tools: Anthropic.Messages.ToolUnion[] = [...a.defs.map(toAnthropicTool), ...a.serverTools];
  const messages: Anthropic.MessageParam[] = [...a.history, { role: "user", content: a.userText }];
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const toolLog: ToolLogEntry[] = [];
  const texts: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = a.client.messages.stream(
      {
        model: a.model,
        max_tokens: MAX_TOKENS,
        output_config: { effort: a.effort },
        system: [
          { type: "text", text: a.stableBrief, cache_control: { type: "ephemeral" } },
          { type: "text", text: a.dynamicContext },
        ],
        tools,
        messages,
      },
      { signal: a.signal },
    );
    stream.on("text", (delta) => emit({ type: "delta", text: delta }));
    const message = await stream.finalMessage();

    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;

    const roundText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (roundText) texts.push(roundText);

    if (message.stop_reason === "refusal") {
      emit({ type: "delta", text: texts.length ? `\n${REFUSAL_TEXT}` : REFUSAL_TEXT });
      texts.push(REFUSAL_TEXT);
      return { text: texts.join("\n"), usage, toolLog, stopReason: "refusal" };
    }

    if (message.stop_reason === "pause_turn") {
      // A server-side tool (web search) paused a long turn: hand the partial content back unchanged.
      if (message.content.some((b) => b.type === "server_tool_use")) emit({ type: "status", text: "searching the web…" });
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    if (message.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        const def = findTool(block.name);
        if (!def) {
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify({ error: `Unknown tool ${block.name}` }), is_error: true });
          continue;
        }
        emit({ type: "status", text: def.status });
        const out = await runTool(def, a.ctx, block.input);
        toolLog.push(out.log);
        const content = out.attachments?.length ? [{ type: "text" as const, text: out.content }, ...out.attachments] : out.content;
        results.push({ type: "tool_result", tool_use_id: block.id, content, is_error: out.isError });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    if (message.stop_reason === "max_tokens") {
      return { text: `${texts.join("\n")}\n(I ran out of room — ask me to continue.)`.trim(), usage, toolLog, stopReason: "max_tokens" };
    }
    return { text: texts.join("\n"), usage, toolLog, stopReason: message.stop_reason ?? "end_turn" };
  }
  emit({ type: "delta", text: `\n${LIMIT_TEXT}` });
  texts.push(LIMIT_TEXT);
  return { text: texts.join("\n"), usage, toolLog, stopReason: "round_limit" };
}
