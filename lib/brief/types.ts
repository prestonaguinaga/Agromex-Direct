/**
 * Bob's Daily Brief — the data model. Pure types plus small constructors so
 * the composer, renderers, tests and the server all speak the same shapes.
 *
 * Facts are what the database said at generation time (stored with the brief
 * so the next brief can compute "since the previous briefing" deltas). The
 * doc is the rendered document: sections of short items with links back into
 * Monarch Admin. Every item in the doc traces back to a fact.
 */

export interface BriefSettings {
  enabled: boolean;
  /** "HH:MM" in the brief's timezone — never hard-coded. */
  deliveryTime: string;
  timezone: string;
  recipients: string[];
  includeBudget: boolean;
  includeApplications: boolean;
  includeLeads: boolean;
  includeCompletedProjects: boolean;
  /** Embed thumbnail links of new photos in the email (off: a link to the Photos sheet only). */
  includePhotoPreviews: boolean;
}

export const DEFAULT_BRIEF_SETTINGS: BriefSettings = {
  enabled: false,
  deliveryTime: "07:00",
  timezone: "America/Chicago",
  recipients: [],
  includeBudget: true,
  includeApplications: true,
  includeLeads: true,
  includeCompletedProjects: false,
  includePhotoPreviews: false,
};

export interface BriefWindow {
  /** Instants; the brief covers [start, end). */
  start: string;
  end: string;
  previousBriefDate: string | null;
}

export type Severity = "high" | "medium";

export interface ProjectFact {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  href: string;
  phase: string | null;
  nextPhase: string | null;
  phasesDone: number;
  phasesTotal: number;
  progress: number;
  progressSource: "calculated" | "manual";
  progressPrev: number | null;
  schedule: { status: string; label: string; daysRemaining: number | null; target: string | null };
  manager: string | null;
  tasks: { open: number; overdue: number; blocked: number; dueToday: number; dueSoon: number; done: number; total: number };
  money: { contract: number | null; budgeted: number; committed: number; spent: number; remaining: number; variance: number; overLines: number } | null;
  /** Important changes since the previous brief (verb-first sentences with actor). */
  changes: { when: string; who: string; what: string; via: string }[];
  changesTotal: number;
  newNotes: number;
  newPhotos: number;
  lastActivityAt: string | null;
}

export interface TaskFact {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  due: string | null;
  assigned: string | null;
  priority: string;
  trade: string | null;
  status: string;
  checklist: boolean;
  milestone: boolean;
  daysOverdue: number | null;
  completedAt: string | null;
  completedBy: string | null;
  href: string;
}

export interface BudgetChangeFact {
  when: string;
  who: string;
  projectId: string;
  projectName: string;
  what: string;
  from: number | null;
  to: number | null;
  large: boolean;
  via: string;
  href: string;
}

export interface OverLineFact {
  projectId: string;
  projectName: string;
  category: string;
  budgeted: number;
  committed: number;
  spent: number;
  remaining: number;
  href: string;
}

export interface RemainingFact {
  projectId: string;
  projectName: string;
  contract: number | null;
  budgeted: number;
  committed: number;
  spent: number;
  remaining: number;
  variance: number;
  href: string;
}

export interface NoteFact {
  when: string;
  who: string;
  projectId: string;
  projectName: string;
  text: string;
  href: string;
}

export interface PhotoFact {
  projectId: string;
  projectName: string;
  count: number;
  latestAt: string | null;
  href: string;
  previews: string[];
}

export interface LeadFact {
  id: string;
  when: string;
  name: string;
  contact: string;
  source: string;
  message: string;
  status: string;
}

export interface ApplicationFact {
  id: string;
  when: string;
  company: string;
  contact: string;
  trade: string;
  status: string;
  waitingDays: number;
}

export interface AttentionItem {
  severity: Severity;
  kind: string;
  projectId: string | null;
  projectName: string | null;
  text: string;
  /** The data that supports the statement, in words. */
  evidence: string;
  href: string | null;
}

export interface BriefFacts {
  company: { id: string; name: string };
  /** Local calendar date the brief is for. */
  date: string;
  timezone: string;
  generatedAt: string;
  window: BriefWindow;
  settings: BriefSettings;
  projects: ProjectFact[];
  otherOpen: { status: string; count: number }[];
  completedRecently: { id: string; name: string; when: string; href: string }[];
  schedule: {
    dueToday: TaskFact[];
    dueSoon: TaskFact[];
    overdue: TaskFact[];
    blocked: TaskFact[];
    behind: { projectId: string; projectName: string; label: string; href: string }[];
  };
  budget: {
    overLines: OverLineFact[];
    changes: BudgetChangeFact[];
    remaining: RemainingFact[];
    negativeVariance: RemainingFact[];
  } | null;
  progress: {
    completedTasks: TaskFact[];
    completedChecklist: TaskFact[];
    progressChanges: { projectId: string; projectName: string; from: number; to: number; href: string }[];
    notes: NoteFact[];
  };
  photos: PhotoFact[];
  leads: { fresh: LeadFact[]; waiting: number } | null;
  applications: { fresh: ApplicationFact[]; waiting: ApplicationFact[] } | null;
  attention: AttentionItem[];
}

export interface BriefItem {
  text: string;
  detail?: string;
  href?: string;
  severity?: Severity | "info";
  images?: string[];
}

export interface BriefGroup {
  label: string;
  items: BriefItem[];
  empty?: string;
}

export interface BriefSection {
  key: string;
  heading: string;
  intro?: string;
  items: BriefItem[];
  groups?: BriefGroup[];
  empty?: string;
}

export interface BriefDoc {
  title: string;
  companyName: string;
  date: string;
  dateLabel: string;
  windowLabel: string;
  siteUrl: string;
  summary: string;
  narrative: string;
  attentionCount: number;
  includesMoney: boolean;
  generatedAt: string;
  sections: BriefSection[];
}

/** A facts object with every list empty — the starting point for the server and for tests. */
export function emptyFacts(over: Partial<BriefFacts> & { company: BriefFacts["company"]; date: string; settings?: BriefSettings }): BriefFacts {
  const settings = over.settings ?? DEFAULT_BRIEF_SETTINGS;
  return {
    timezone: settings.timezone,
    generatedAt: new Date(0).toISOString(),
    window: { start: new Date(0).toISOString(), end: new Date(0).toISOString(), previousBriefDate: null },
    projects: [],
    otherOpen: [],
    completedRecently: [],
    schedule: { dueToday: [], dueSoon: [], overdue: [], blocked: [], behind: [] },
    budget: settings.includeBudget ? { overLines: [], changes: [], remaining: [], negativeVariance: [] } : null,
    progress: { completedTasks: [], completedChecklist: [], progressChanges: [], notes: [] },
    photos: [],
    leads: settings.includeLeads ? { fresh: [], waiting: 0 } : null,
    applications: settings.includeApplications ? { fresh: [], waiting: [] } : null,
    attention: [],
    ...over,
    settings,
  };
}
