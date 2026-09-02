import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BobSettings } from "./types";

/**
 * The AI provider lives here and only here. The key is a server environment
 * variable; the browser never sees it and never talks to the provider.
 */
export const DEFAULT_MODEL = "claude-opus-5";

export function bobModel(settings: BobSettings): string {
  return settings.model ?? process.env.BOB_MODEL?.trim() ?? DEFAULT_MODEL;
}

export function bobEffort(): "low" | "medium" | "high" {
  const e = process.env.BOB_EFFORT?.trim();
  return e === "low" || e === "high" ? e : "medium";
}

export function anthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

/**
 * Anthropic's web search / fetch run on their servers; Bob only gets them for
 * product-link work. Newer models take the 20260209 variants, Haiku 4.5 the
 * basic ones.
 */
export function serverTools(model: string): Anthropic.Messages.ToolUnion[] {
  const modern = !model.includes("haiku-4-5");
  return modern
    ? [
        { type: "web_search_20260209", name: "web_search", max_uses: 4 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 4 },
      ]
    : [
        { type: "web_search_20250305", name: "web_search", max_uses: 4 },
        { type: "web_fetch_20250910", name: "web_fetch", max_uses: 4 },
      ];
}
