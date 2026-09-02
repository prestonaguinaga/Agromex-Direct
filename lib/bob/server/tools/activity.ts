import "server-only";
import type { AuditLogRow } from "../../../data/database.types";
import { groupActivity } from "../../../data/progress";
import { instantRange, parsePreset } from "../../time";
import { listSummaries, loadActivity } from "../data";
import { optionalProject } from "../resolve";
import { PROJECT_PROPS, ToolError, intIn, schema, str, type ToolDef } from "../types";

const KINDS = ["all", "budget", "task", "note", "file", "estimate", "project", "team"] as const;

function kindOf(row: AuditLogRow): (typeof KINDS)[number] {
  switch (row.entity_type) {
    case "budgets":
    case "budget_lines":
      return "budget";
    case "estimates":
    case "estimate_sections":
    case "estimate_items":
    case "estimate_item_options":
      return "estimate";
    case "tasks":
    case "task_lists":
      return "task";
    case "notes":
      return "note";
    case "files":
      return "file";
    case "memberships":
    case "project_members":
    case "role_permissions":
    case "invitations":
      return "team";
    case "projects":
    case "project_phases":
      return "project";
    default:
      return "all";
  }
}

export const activityTools: ToolDef[] = [
  {
    name: "get_recent_activity",
    description:
      "The activity log (who changed what, when, and through what): for one project or all visible projects, over a period (today, yesterday, this_week, last_week, last_7_days, last_30_days), optionally one kind (budget, task, note, file, estimate, project, team). Answers 'what changed this week', 'who changed this budget', 'what did Johnny do yesterday'. Money changes carry the old and new values.",
    input_schema: schema({
      ...PROJECT_PROPS,
      all_projects: { type: "boolean" },
      since: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "last_7_days", "last_30_days"] },
      kind: { type: "string", enum: [...KINDS] },
      include_minor: { type: "boolean", description: "also line-level estimate edits (hidden by default)" },
      limit: { type: "number", description: "default 40" },
    }),
    requires: ["audit.view_project", "audit.view_all"],
    kind: "read",
    status: "reading the activity log…",
    execute: async (ctx, input) => {
      const all = input.all_projects === true;
      const project = all ? null : await optionalProject(ctx, input);
      const preset = parsePreset(str(input, "since") ?? "last_7_days");
      if (!preset) throw new ToolError("since must be today, yesterday, this_week, last_week, last_7_days or last_30_days");
      const r = instantRange(preset, ctx.now, ctx.session.timezone);
      const kind = (str(input, "kind") ?? "all") as (typeof KINDS)[number];
      const limit = intIn(input, "limit", 40, 1, 200);
      const rows = await loadActivity(ctx.session.sb, { projectId: project?.id ?? null, fromIso: r.fromIso, toIso: r.toIso, includeMinor: input.include_minor === true, limit: 600 });
      const filtered = kind === "all" ? rows : rows.filter((x) => kindOf(x) === kind);
      const names = project ? new Map([[project.id, project.name]]) : new Map((await listSummaries(ctx.session.sb)).map((s) => [s.id, s.name]));
      const items = groupActivity(filtered).slice(0, limit);
      const money = (v: unknown) => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : v);
      return {
        data: {
          scope: project ? project.name : "all visible projects",
          period: `${r.label} (${r.fromIso.slice(0, 10)} → ${r.toIso.slice(0, 10)})`,
          kind,
          count: items.length,
          changes: items.map((i) => {
            const row = i.rows[0];
            const isMoney = row.action === "update" && ["budgeted", "committed", "actual", "unit_price", "contract_amount"].includes(row.field ?? "");
            return {
              when: i.createdAt,
              who: i.actorName,
              what: i.summary,
              project: row.project_id ? (names.get(row.project_id) ?? null) : null,
              kind: kindOf(row),
              via: row.source === "bob" ? "Bob" : row.source === "ui" ? "app" : row.source,
              ...(isMoney ? { field: row.field, from: money(row.old_value), to: money(row.new_value) } : {}),
            };
          }),
        },
      };
    },
  },
];
