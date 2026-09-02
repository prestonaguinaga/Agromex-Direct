import "server-only";
import { renderText } from "../../../brief/render";
import type { BriefDoc } from "../../../brief/types";
import { isYmd } from "../../time";
import { ToolError, schema, str, truncate, type ToolDef } from "../types";

export const briefTools: ToolDef[] = [
  {
    name: "get_daily_brief",
    description:
      "Bob's Daily Brief for a day (default: the latest one): the attention list, active projects, schedule, budget, progress, photos, leads and applications as they stood when the brief was generated. For 'what was in this morning's brief', 'what did the brief say about Smith', 'any briefs this week'. For live figures use the other tools.",
    input_schema: schema({ date: { type: "string", description: "YYYY-MM-DD; omit for the latest" }, section: { type: "string", description: "optional: attention, projects, schedule, budget, progress, photos, leads, applications" } }),
    requires: ["briefs.view"],
    kind: "read",
    status: "reading the daily brief…",
    execute: async (ctx, input) => {
      const { sb, companyId } = ctx.session;
      const date = str(input, "date");
      if (date && !isYmd(date)) throw new ToolError("date must be YYYY-MM-DD");
      let q = sb.from("daily_briefs").select("*").eq("company_id", companyId).eq("status", "ready").order("brief_date", { ascending: false }).order("generated_at", { ascending: false }).limit(1);
      if (date) q = q.eq("brief_date", date);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return { data: { found: false, note: date ? `No brief was generated for ${date}.` : "No brief has been generated yet. Settings turns the daily brief on." } };
      const doc = data.doc as unknown as BriefDoc;
      const section = str(input, "section");
      const sections = section ? doc.sections.filter((s) => s.key === section) : doc.sections;
      if (section && sections.length === 0) throw new ToolError(`No section "${section}". Sections: ${doc.sections.map((s) => s.key).join(", ")}`);
      const text = renderText({ ...doc, sections });
      return { data: { found: true, date: data.brief_date, kind: data.kind, generated_at: data.generated_at, summary: doc.summary, narrative: doc.narrative || null, text: truncate(text, 12_000), open: `${doc.siteUrl}/briefs/${data.id}` } };
    },
  },
];
