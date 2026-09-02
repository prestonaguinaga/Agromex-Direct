import "server-only";
import { PREFERENCE_KEYS, loadPreferences, savePreferences, type PreferenceKey } from "../memory";
import { ToolError, schema, str, type ToolDef } from "../types";

export const memoryTools: ToolDef[] = [
  {
    name: "remember_preference",
    description:
      "Remember how THIS person likes to work with you: preferred_name (what to call them), answer_style (e.g. 'short', 'detailed'), default_project (a project name to assume when none is open), note (one short standing instruction). Only for personal preferences — never for project or company information; that goes into a note or a task.",
    input_schema: schema({ key: { type: "string", enum: [...PREFERENCE_KEYS] }, value: { type: "string", description: "≤ 200 characters" } }, ["key", "value"]),
    requires: [],
    kind: "memory",
    status: "remembering that…",
    execute: async (ctx, input) => {
      const key = str(input, "key") as PreferenceKey | undefined;
      const value = str(input, "value");
      if (!key || !PREFERENCE_KEYS.includes(key)) throw new ToolError(`key must be one of ${PREFERENCE_KEYS.join(", ")}`);
      if (!value) throw new ToolError("value is required");
      if (/\b(budget|contract|\$|invoice|password|api key|token)\b/i.test(value) && key !== "note") {
        throw new ToolError("That looks like project or secret information, not a preference. Put project facts in a project note instead.");
      }
      const prefs = await loadPreferences(ctx.session);
      prefs[key] = value.slice(0, 200);
      await savePreferences(ctx.session, prefs);
      return { data: { ok: true, preferences: prefs }, event: `☆ remembered ${key.replace("_", " ")}: ${value.slice(0, 60)}` };
    },
  },
  {
    name: "forget_preference",
    description: "Forget one of this person's stored preferences (preferred_name, answer_style, default_project, note) or all of them (key = all).",
    input_schema: schema({ key: { type: "string", enum: [...PREFERENCE_KEYS, "all"] } }, ["key"]),
    requires: [],
    kind: "memory",
    status: "forgetting that…",
    execute: async (ctx, input) => {
      const key = str(input, "key");
      const prefs = await loadPreferences(ctx.session);
      if (key === "all") {
        await savePreferences(ctx.session, {});
        return { data: { ok: true, preferences: {} }, event: "☆ forgot all preferences" };
      }
      if (!key || !PREFERENCE_KEYS.includes(key as PreferenceKey)) throw new ToolError(`key must be one of ${PREFERENCE_KEYS.join(", ")} or all`);
      delete prefs[key as PreferenceKey];
      await savePreferences(ctx.session, prefs);
      return { data: { ok: true, preferences: prefs }, event: `☆ forgot ${key.replace("_", " ")}` };
    },
  },
];
