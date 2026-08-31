import Anthropic from "@anthropic-ai/sdk";
import type { ToolSpec } from "./tools";

/**
 * Provider adapters for Bob. Both run the same tool loop:
 * ask → model may call tools → execute locally → feed results back → repeat.
 * Calls go straight from the user's browser with their own key (no server) —
 * Anthropic supports this via dangerouslyAllowBrowser; OpenAI via CORS.
 */

export type BobProvider = "anthropic" | "openai";

export interface BobConfig {
  provider: BobProvider;
  apiKey: string;
  model: string;
}

export const PROVIDER_INFO: Record<
  BobProvider,
  { label: string; models: string[]; keyUrl: string; keyHint: string }
> = {
  anthropic: {
    label: "Claude (Anthropic)",
    models: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "console.anthropic.com → API keys. Pay-as-you-go; a chat costs cents. Claude can also search the web for real product links.",
  },
  openai: {
    label: "OpenAI (GPT)",
    models: ["gpt-5.2", "gpt-5.1", "gpt-5-mini"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyHint:
      "platform.openai.com → API keys. Needs API credits — a ChatGPT Plus subscription does NOT include API access.",
  },
};

export const DEFAULT_MODEL: Record<BobProvider, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-5.1",
};

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface RunTurnArgs {
  config: BobConfig;
  /** Stable system text (cached by Anthropic across turns). */
  systemStable: string;
  /** Per-call context: the live sheet snapshot. */
  systemDynamic: string;
  history: ChatTurn[];
  user: string;
  tools: ToolSpec[];
  /** Execute one tool call synchronously; returns the tool result text. */
  onTool: (name: string, input: unknown) => string;
  onStatus?: (status: string) => void;
}

const MAX_ROUNDS = 8;

export async function runTurn(args: RunTurnArgs): Promise<string> {
  if (args.config.provider === "anthropic") return runAnthropic(args);
  return runOpenAI(args);
}

/* ── Anthropic ───────────────────────────────────────────────────── */

/**
 * Anthropic's web search/fetch run server-side, so Bob can find real
 * product pages (and read links the user pastes) straight from a static
 * site. Newer models take the 20260209 variants; Haiku 4.5 the basic ones.
 */
function serverTools(model: string): Anthropic.Messages.ToolUnion[] {
  const modern = !model.includes("haiku-4-5");
  return modern
    ? [
        { type: "web_search_20260209", name: "web_search", max_uses: 6 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 },
      ]
    : [
        { type: "web_search_20250305", name: "web_search", max_uses: 6 },
        { type: "web_fetch_20250910", name: "web_fetch", max_uses: 6 },
      ];
}

async function runAnthropic(args: RunTurnArgs): Promise<string> {
  const client = new Anthropic({
    apiKey: args.config.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const tools: Anthropic.Messages.ToolUnion[] = [
    ...args.tools.map(
      (t): Anthropic.Tool => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool.InputSchema,
      }),
    ),
    ...serverTools(args.config.model),
  ];

  const messages: Anthropic.MessageParam[] = [
    ...args.history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user" as const, content: args.user },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.messages.create({
      model: args.config.model,
      max_tokens: 8192,
      output_config: { effort: "medium" },
      system: [
        {
          type: "text",
          text: args.systemStable,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: args.systemDynamic },
      ],
      tools,
      messages,
    });

    if (response.stop_reason === "refusal") {
      return "I can't help with that one. Anything else on the quote?";
    }

    // Server-side tools (web search/fetch) can pause a long turn — resume
    // by handing the partial content back unchanged.
    if (response.stop_reason === "pause_turn") {
      if (response.content.some((b) => b.type === "server_tool_use")) {
        args.onStatus?.("searching the web…");
      }
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        args.onStatus?.(`running ${block.name}…`);
        let result: string;
        try {
          result = args.onTool(block.name, block.input);
        } catch (e) {
          result = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
        }
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
  return "I hit my per-message action limit — the changes so far are applied. Send the rest as a new message.";
}

/* ── OpenAI ──────────────────────────────────────────────────────── */

interface OAToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface OAMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OAToolCall[];
  tool_call_id?: string;
}

async function runOpenAI(args: RunTurnArgs): Promise<string> {
  const messages: OAMessage[] = [
    { role: "system", content: `${args.systemStable}\n\n${args.systemDynamic}` },
    ...args.history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user", content: args.user },
  ];

  const tools = args.tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.config.apiKey}`,
      },
      body: JSON.stringify({
        model: args.config.model,
        max_completion_tokens: 8192,
        messages,
        tools,
      }),
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try {
        const err = (await res.json()) as { error?: { message?: string } };
        detail = err.error?.message ?? detail;
      } catch {
        /* keep status */
      }
      throw new Error(`OpenAI API error: ${detail}`);
    }
    const data = (await res.json()) as {
      choices: { message: OAMessage; finish_reason: string }[];
    };
    const msg = data.choices[0]?.message;
    if (!msg) throw new Error("OpenAI returned no choices");

    if (msg.tool_calls?.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        args.onStatus?.(`running ${tc.function.name}…`);
        let result: string;
        try {
          result = args.onTool(tc.function.name, JSON.parse(tc.function.arguments || "{}"));
        } catch (e) {
          result = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
        }
        messages.push({ role: "tool", content: result, tool_call_id: tc.id });
      }
      continue;
    }

    return (msg.content ?? "").trim();
  }
  return "I hit my per-message action limit — the changes so far are applied. Send the rest as a new message.";
}
