import { BOB_TABS, isUuid, type BobTab } from "./protocol.ts";

/**
 * The only way Bob moves people around the app: a fixed map of destinations
 * → routes. The model names a destination; this file decides the URL. No
 * string from the model ever becomes part of a path except a project id,
 * and that is validated as a UUID.
 */

export type Destination =
  | "dashboard"
  | "projects"
  | "project"
  | "overview"
  | "estimator"
  | "estimate"
  | "budget"
  | "plan"
  | "progress"
  | "tasks"
  | "checklists"
  | "plans"
  | "files"
  | "photos"
  | "notes"
  | "activity"
  | "team"
  | "subcontractors"
  | "applications"
  | "briefs"
  | "settings"
  | "guide"
  | "bob";

export interface DestinationSpec {
  label: string;
  /** Static path, or a project tab (the path is /projects/{id}?tab=…). */
  path?: string;
  tab?: BobTab;
  /** Capability the person needs to open it (checked here and by the page). */
  requires?: string;
  /** Not built yet: navigation refuses and explains. */
  unavailable?: string;
  /** Words people use for it (helps the model and the tests). */
  aliases: string[];
}

export const DESTINATIONS: Record<Destination, DestinationSpec> = {
  dashboard: { label: "Projects", path: "/projects", aliases: ["home", "dashboard", "start"] },
  projects: { label: "Projects", path: "/projects", aliases: ["projects", "project list", "all projects"] },
  project: { label: "Overview", tab: "overview", aliases: ["project", "open project"] },
  overview: { label: "Overview", tab: "overview", aliases: ["overview", "summary"] },
  estimator: { label: "Estimate", tab: "estimate", requires: "estimates.view", aliases: ["estimator", "quote sheet", "quote", "sheet"] },
  estimate: { label: "Estimate", tab: "estimate", requires: "estimates.view", aliases: ["estimate"] },
  budget: { label: "Budget", tab: "budget", requires: "budgets.view", aliases: ["budget", "money", "costs"] },
  plan: { label: "Plan", tab: "plan", aliases: ["house plan", "floor plan", "plan view", "layout"] },
  progress: { label: "Progress", tab: "progress", aliases: ["progress", "schedule", "phases"] },
  tasks: { label: "Tasks & checklist", tab: "tasks", aliases: ["tasks", "task list", "to-do"] },
  checklists: { label: "Tasks & checklist", tab: "tasks", aliases: ["checklist", "checklists", "punch list"] },
  plans: { label: "Plans & files", tab: "files", requires: "files.view", aliases: ["plans", "drawings", "documents"] },
  files: { label: "Plans & files", tab: "files", requires: "files.view", aliases: ["files", "attachments", "receipts"] },
  photos: { label: "Photos", tab: "photos", requires: "files.view", aliases: ["photos", "pictures", "progress pictures", "jobsite photos"] },
  notes: { label: "Notes", tab: "notes", aliases: ["notes", "site notes", "log"] },
  activity: { label: "Activity", tab: "activity", requires: "audit.view_project", aliases: ["activity", "history", "changes", "audit"] },
  team: { label: "Team", path: "/team", requires: "team.view", aliases: ["team", "people", "members", "users"] },
  subcontractors: { label: "Subcontractors", path: "/subcontractors", requires: "subcontractors.view", aliases: ["subcontractors", "subs", "trades directory"] },
  applications: {
    label: "Applications",
    unavailable:
      "Subcontractor applications aren't part of Monarch Admin yet — that inbox is a planned phase. The subcontractor directory is available.",
    aliases: ["applications", "applicants", "subcontractor applications", "onboarding"],
  },
  briefs: { label: "Daily briefs", path: "/briefs", requires: "briefs.view", aliases: ["daily brief", "brief", "briefing", "morning report"] },
  settings: { label: "Settings", path: "/settings", requires: "settings.manage", aliases: ["settings", "brief settings", "configuration"] },
  guide: { label: "Cost guide", path: "/guide", aliases: ["cost guide", "guide", "reference", "research"] },
  bob: { label: "Bob", path: "/bob", aliases: ["bob", "assistant", "chat"] },
};

export const DESTINATION_KEYS = Object.keys(DESTINATIONS) as Destination[];

/** Capability needed to open a project tab (mirrors the workspace's tab strip). */
export const TAB_REQUIRES: Partial<Record<BobTab, string>> = {
  budget: "budgets.view",
  estimate: "estimates.view",
  files: "files.view",
  photos: "files.view",
  activity: "audit.view_project",
};

export function isDestination(v: unknown): v is Destination {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(DESTINATIONS, v);
}

export function projectHref(projectId: string, tab?: BobTab | null): string {
  if (!isUuid(projectId)) throw new Error("projectHref: not a project id");
  const t = tab && tab !== "overview" && BOB_TABS.includes(tab) ? `?tab=${tab}` : "";
  return `/projects/${projectId.toLowerCase()}${t}`;
}

export interface NavInput {
  destination: string;
  projectId?: string | null;
  projectName?: string | null;
}

export interface NavContext {
  currentProjectId: string | null;
  can: (capability: string) => boolean;
}

export type NavResult =
  | { ok: true; href: string; label: string; projectId: string | null; tab: BobTab | null }
  | { ok: false; reason: string; needsProject?: boolean };

/** Turn a destination (+ optional project) into a route, or say why not. */
export function resolveNavigation(input: NavInput, ctx: NavContext): NavResult {
  if (!isDestination(input.destination)) {
    return { ok: false, reason: `Unknown destination "${input.destination}". Known: ${DESTINATION_KEYS.join(", ")}.` };
  }
  const spec = DESTINATIONS[input.destination];
  if (spec.unavailable) return { ok: false, reason: spec.unavailable };
  if (spec.requires && !ctx.can(spec.requires)) {
    return { ok: false, reason: `Your role can't open ${spec.label} (needs ${spec.requires}).` };
  }
  if (spec.path) return { ok: true, href: spec.path, label: spec.label, projectId: null, tab: null };

  const tab = spec.tab ?? "overview";
  const tabCap = TAB_REQUIRES[tab];
  if (tabCap && !ctx.can(tabCap)) {
    return { ok: false, reason: `Your role can't open the ${spec.label} sheet (needs ${tabCap}).` };
  }
  const raw = input.projectId ?? ctx.currentProjectId;
  if (!raw) {
    return {
      ok: false,
      needsProject: true,
      reason: `${spec.label} belongs to a project. Which project? (Use search_projects to find it, or open /projects.)`,
    };
  }
  if (!isUuid(raw)) return { ok: false, reason: "That project id isn't valid — find the project with search_projects first." };
  const label = input.projectName ? `${input.projectName} · ${spec.label}` : spec.label;
  return { ok: true, href: projectHref(raw, tab), label, projectId: raw.toLowerCase(), tab };
}
