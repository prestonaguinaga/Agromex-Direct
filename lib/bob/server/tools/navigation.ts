import "server-only";
import { DESTINATIONS, DESTINATION_KEYS, isDestination, resolveNavigation } from "../../routes";
import { resolveProject } from "../resolve";
import { PROJECT_PROPS, schema, str, type ToolDef } from "../types";

export const navigationTools: ToolDef[] = [
  {
    name: "navigate_to",
    description:
      "Open a page for the person: 'take me to the estimator', 'open projects', 'open the Smith project', 'show me the budget', 'show me progress pictures'. destination must be one of the known destinations; project pages use the current project unless project / project_id is given. The app decides the URL — never write one yourself. If it answers needs_project, ask which project (or search_projects).",
    input_schema: schema(
      {
        destination: {
          type: "string",
          enum: DESTINATION_KEYS,
          description: DESTINATION_KEYS.map((k) => `${k}: ${DESTINATIONS[k].aliases.slice(0, 2).join(" / ")}`).join("; "),
        },
        ...PROJECT_PROPS,
      },
      ["destination"],
    ),
    requires: [],
    kind: "navigate",
    status: "opening the page…",
    execute: async (ctx, input) => {
      const destination = str(input, "destination") ?? "";
      const spec = isDestination(destination) ? DESTINATIONS[destination] : null;
      let projectId: string | null = null;
      let projectName: string | null = null;
      if (spec && !spec.path && !spec.unavailable && (str(input, "project_id") || str(input, "project") || ctx.context.projectId)) {
        const p = await resolveProject(ctx, input);
        projectId = p.id;
        projectName = p.name;
      }
      const r = resolveNavigation({ destination, projectId, projectName }, { currentProjectId: ctx.context.projectId, can: ctx.session.can });
      if (!r.ok) return { data: { navigated: false, reason: r.reason, needs_project: r.needsProject ?? false } };
      return {
        data: { navigated: true, href: r.href, label: r.label, project_id: r.projectId },
        navigate: { href: r.href, label: r.label },
        event: `→ Opened ${r.label}`,
        projectId: r.projectId,
      };
    },
  },
];
