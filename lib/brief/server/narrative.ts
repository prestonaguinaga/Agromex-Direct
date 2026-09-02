import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { renderText } from "../render";
import type { BriefDoc } from "../types";

/**
 * Bob's take: two to four sentences written from the brief's own text and
 * nothing else. The brief is complete without it — if the model is not
 * configured or fails, the narrative is simply empty.
 */
export async function writeNarrative(client: Anthropic, model: string, doc: BriefDoc): Promise<string> {
  const res = await client.messages.create({
    model,
    max_tokens: 400,
    output_config: { effort: "low" },
    system:
      "You are Bob, the site assistant of a construction company's admin system, writing the opening of the owner's daily brief. " +
      "Write 2 to 4 short sentences, plain text, direct and calm. Use ONLY facts that appear in the brief below; never add numbers, names, causes or predictions that are not there. " +
      "Lead with what needs attention today; if nothing does, say that plainly. Do not repeat the whole brief and do not use headings, bullets or markdown.",
    messages: [{ role: "user", content: renderText(doc) }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}
