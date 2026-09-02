import { fmtMoney } from "../bob/guard.ts";
import type { BriefDoc, BriefFacts, BriefGroup, BriefItem, BriefSection, TaskFact } from "./types.ts";

/**
 * Facts → the brief document. Pure and deterministic: the same facts always
 * give the same document, and every line comes from a fact. The order is
 * the owner's reading order: what needs attention first, then the state of
 * the active projects, schedule, money, progress, photos and the inboxes.
 */

export interface ComposeOptions {
  siteUrl: string;
  /** False strips every money figure (for recipients whose role may not see money). */
  includeMoney: boolean;
  narrative?: string;
}

const MAX_ITEMS = 12;

export function dateLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function capped<T>(rows: T[], toItem: (r: T) => BriefItem, max = MAX_ITEMS): BriefItem[] {
  const items = rows.slice(0, max).map(toItem);
  if (rows.length > max) items.push({ text: `…and ${rows.length - max} more`, severity: "info" });
  return items;
}

function taskItem(t: TaskFact, showProject: boolean): BriefItem {
  const bits = [
    showProject ? t.projectName : null,
    t.due ? (t.daysOverdue ? `due ${t.due}, ${t.daysOverdue} day${t.daysOverdue === 1 ? "" : "s"} overdue` : `due ${t.due}`) : null,
    t.assigned ?? "unassigned",
    t.trade,
    t.priority !== "normal" ? t.priority : null,
    t.checklist ? "checklist item" : null,
  ].filter(Boolean);
  return { text: t.title, detail: bits.join(" · "), href: t.href, severity: t.daysOverdue && t.daysOverdue > 7 ? "high" : t.daysOverdue ? "medium" : undefined };
}

function doneItem(t: TaskFact, showProject: boolean): BriefItem {
  const bits = [showProject ? t.projectName : null, t.completedBy ? `by ${t.completedBy}` : null, t.completedAt ? shortDate(t.completedAt) : null].filter(Boolean);
  return { text: t.title, detail: bits.join(" · "), href: t.href };
}

export function summaryLine(f: Omit<BriefFacts, "attention"> & { attention: BriefFacts["attention"] }, includeMoney: boolean): string {
  const bits = [`${f.projects.length} active project${f.projects.length === 1 ? "" : "s"}`];
  if (f.schedule.dueToday.length) bits.push(`${f.schedule.dueToday.length} due today`);
  if (f.schedule.overdue.length) bits.push(`${f.schedule.overdue.length} overdue`);
  if (f.schedule.blocked.length) bits.push(`${f.schedule.blocked.length} blocked`);
  if (includeMoney && f.budget && f.budget.negativeVariance.length) bits.push(`${f.budget.negativeVariance.length} over budget`);
  if (f.progress.completedTasks.length + f.progress.completedChecklist.length) bits.push(`${f.progress.completedTasks.length + f.progress.completedChecklist.length} completed`);
  if (f.photos.length) bits.push(`new photos on ${f.photos.length} project${f.photos.length === 1 ? "" : "s"}`);
  bits.push(f.attention.length ? `${f.attention.length} thing${f.attention.length === 1 ? "" : "s"} to look at` : "nothing needs attention");
  return bits.join(" · ");
}

export function composeBrief(f: BriefFacts, o: ComposeOptions): BriefDoc {
  const money = o.includeMoney && f.settings.includeBudget && f.budget !== null;
  const sections: BriefSection[] = [];

  // ── Bob says you should look at ─────────────────────────────────────────
  sections.push({
    key: "attention",
    heading: "Bob says you should look at",
    items: f.attention
      .filter((a) => money || !["variance", "over_line", "over_contract"].includes(a.kind))
      .map((a) => ({ text: a.text, detail: a.evidence, href: a.href ?? undefined, severity: a.severity })),
    empty: "Nothing needs your attention today — every check came back clean.",
  });

  // ── Active projects ─────────────────────────────────────────────────────
  const projectItems: BriefItem[] = f.projects.map((p) => {
    const delta = p.progressPrev === null ? "" : p.progress - p.progressPrev === 0 ? "" : ` (${p.progress - p.progressPrev > 0 ? "+" : ""}${p.progress - p.progressPrev} since last brief)`;
    const head = [
      p.phase ? `Phase: ${p.phase}${p.nextPhase ? ` → next ${p.nextPhase}` : ""}` : p.phasesTotal ? "All phases complete" : "No phases set up",
      `${p.progress}%${delta} ${p.progressSource === "manual" ? "(project manager's figure)" : "(calculated)"}`,
      p.schedule.status === "no_dates" ? "no schedule dates" : p.schedule.label,
      p.tasks.overdue ? `${p.tasks.overdue} overdue` : null,
      p.tasks.blocked ? `${p.tasks.blocked} blocked` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const changes = p.changes.slice(0, 3).map((c) => `${c.who} ${c.what}${c.via === "bob" ? " (via Bob)" : ""}`);
    const more = p.changesTotal > 3 ? `…and ${p.changesTotal - 3} more change${p.changesTotal - 3 === 1 ? "" : "s"}` : null;
    const moneyLine = money && p.money ? `Budget: approved ${fmtMoney(p.money.budgeted)} · spent ${fmtMoney(p.money.spent)} · remaining ${fmtMoney(p.money.remaining)} · variance ${p.money.variance < 0 ? `−${fmtMoney(-p.money.variance)} (over)` : fmtMoney(p.money.variance)}` : null;
    const quiet = [p.newNotes ? `${p.newNotes} new note${p.newNotes === 1 ? "" : "s"}` : null, p.newPhotos ? `${p.newPhotos} new photo${p.newPhotos === 1 ? "" : "s"}` : null].filter(Boolean).join(", ");
    const detail = [head, changes.length ? `Since the last brief: ${changes.join("; ")}${more ? `; ${more}` : ""}` : "No important changes since the last brief", quiet || null, moneyLine].filter(Boolean).join("\n");
    return { text: `${p.number ? `${p.number} ` : ""}${p.name}`, detail, href: p.href };
  });
  const otherOpen = f.otherOpen.length ? `Also open: ${f.otherOpen.map((x) => `${x.count} ${x.status.replace("_", " ")}`).join(", ")}.` : undefined;
  sections.push({ key: "projects", heading: "Active projects", intro: otherOpen, items: projectItems, empty: "No active projects." });
  if (f.settings.includeCompletedProjects && f.completedRecently.length) {
    sections.push({ key: "completed_projects", heading: "Completed projects", items: f.completedRecently.map((c) => ({ text: c.name, detail: `marked complete ${shortDate(c.when)}`, href: c.href })) });
  }

  // ── Schedule ────────────────────────────────────────────────────────────
  const many = f.projects.length > 1;
  const scheduleGroups: BriefGroup[] = [
    { label: `Due today · ${f.schedule.dueToday.length}`, items: capped(f.schedule.dueToday, (t) => taskItem(t, many)), empty: "Nothing due today." },
    { label: `Due in the next 7 days · ${f.schedule.dueSoon.length}`, items: capped(f.schedule.dueSoon, (t) => taskItem(t, many)), empty: "Nothing else due this week." },
    { label: `Overdue · ${f.schedule.overdue.length}`, items: capped(f.schedule.overdue, (t) => taskItem(t, many)), empty: "Nothing overdue." },
    { label: `Blocked · ${f.schedule.blocked.length}`, items: capped(f.schedule.blocked, (t) => taskItem(t, many)), empty: "Nothing blocked." },
    { label: `Behind schedule · ${f.schedule.behind.length}`, items: f.schedule.behind.map((b) => ({ text: b.projectName, detail: b.label, href: b.href, severity: "medium" as const })), empty: "No project appears behind its straight-line schedule." },
  ];
  sections.push({ key: "schedule", heading: "Schedule", items: [], groups: scheduleGroups });

  // ── Budget ──────────────────────────────────────────────────────────────
  if (money && f.budget) {
    const b = f.budget;
    sections.push({
      key: "budget",
      heading: "Budget",
      items: [],
      groups: [
        {
          label: `Over budget lines · ${b.overLines.length}`,
          items: capped(b.overLines, (l) => ({ text: `${l.projectName} · ${l.category}`, detail: `${fmtMoney(-l.remaining)} over — budgeted ${fmtMoney(l.budgeted)}, committed ${fmtMoney(l.committed)}, spent ${fmtMoney(l.spent)}`, href: l.href, severity: "medium" as const })),
          empty: "No budget line is over.",
        },
        {
          label: `Significant changes since the last brief · ${b.changes.length}`,
          items: capped(b.changes, (c) => ({ text: `${c.projectName}: ${c.who} ${c.what}${c.via === "bob" ? " (via Bob)" : ""}`, detail: `${shortDate(c.when)}${c.from !== null && c.to !== null ? ` · ${fmtMoney(c.from)} → ${fmtMoney(c.to)}` : ""}${c.large ? " · large change" : ""}`, href: c.href })),
          empty: "No significant budget changes.",
        },
        {
          label: "Remaining budgets",
          items: capped(b.remaining, (r) => ({ text: r.projectName, detail: `approved ${fmtMoney(r.budgeted)} · committed ${fmtMoney(r.committed)} · spent ${fmtMoney(r.spent)} · remaining ${fmtMoney(r.remaining)}${r.contract !== null ? ` · contract ${fmtMoney(r.contract)}` : ""}`, href: r.href })),
          empty: "No project has a budget yet.",
        },
        {
          label: `Negative variance · ${b.negativeVariance.length}`,
          items: capped(b.negativeVariance, (r) => ({ text: r.projectName, detail: `−${fmtMoney(-r.variance)} (budgeted − committed − spent)`, href: r.href, severity: "high" as const })),
          empty: "No project shows a negative variance.",
        },
      ],
    });
  }

  // ── Progress ────────────────────────────────────────────────────────────
  const pr = f.progress;
  sections.push({
    key: "progress",
    heading: "Progress",
    items: [],
    groups: [
      { label: `Completed tasks · ${pr.completedTasks.length}`, items: capped(pr.completedTasks, (t) => doneItem(t, many)), empty: "No tasks completed in this period." },
      { label: `Completed checklist items · ${pr.completedChecklist.length}`, items: capped(pr.completedChecklist, (t) => doneItem(t, many)), empty: "No checklist items completed in this period." },
      { label: `Progress changes · ${pr.progressChanges.length}`, items: pr.progressChanges.map((c) => ({ text: c.projectName, detail: `${c.from}% → ${c.to}%`, href: c.href })), empty: f.window.previousBriefDate ? "No project's progress figure changed." : "First brief — no previous figures to compare." },
      { label: `Recent notes · ${pr.notes.length}`, items: capped(pr.notes, (n) => ({ text: n.text, detail: `${n.who} · ${n.projectName} · ${shortDate(n.when)}`, href: n.href }), 8), empty: "No new notes." },
    ],
  });

  // ── Photos ──────────────────────────────────────────────────────────────
  sections.push({
    key: "photos",
    heading: "Photos",
    items: f.photos.map((p) => ({ text: `${p.projectName}: ${p.count} new progress photo${p.count === 1 ? "" : "s"}`, detail: p.latestAt ? `latest ${shortDate(p.latestAt)} · open the Photos sheet to view` : "open the Photos sheet to view", href: p.href, images: p.previews.length ? p.previews : undefined })),
    empty: "No new progress photos.",
  });

  // ── Leads ───────────────────────────────────────────────────────────────
  if (f.settings.includeLeads && f.leads) {
    sections.push({
      key: "leads",
      heading: "Leads",
      intro: f.leads.waiting ? `${f.leads.waiting} inquir${f.leads.waiting === 1 ? "y" : "ies"} still marked New.` : undefined,
      items: f.leads.fresh.map((l) => ({ text: `${l.name}${l.contact ? ` · ${l.contact}` : ""}`, detail: `${l.source} · ${shortDate(l.when)}${l.message ? ` · "${l.message.slice(0, 120)}${l.message.length > 120 ? "…" : ""}"` : ""}` })),
      empty: "No new customer inquiries recorded.",
    });
  }

  // ── Subcontractor applications ──────────────────────────────────────────
  if (f.settings.includeApplications && f.applications) {
    sections.push({
      key: "applications",
      heading: "Subcontractor applications",
      items: [],
      groups: [
        { label: `New · ${f.applications.fresh.length}`, items: f.applications.fresh.map((a) => ({ text: `${a.company}${a.trade ? ` · ${a.trade}` : ""}`, detail: `${a.contact || "no contact name"} · ${shortDate(a.when)}` })), empty: "No new applications received." },
        { label: `Waiting for review · ${f.applications.waiting.length}`, items: f.applications.waiting.map((a) => ({ text: `${a.company}${a.trade ? ` · ${a.trade}` : ""}`, detail: `${a.status} · waiting ${a.waitingDays} day${a.waitingDays === 1 ? "" : "s"}`, severity: a.waitingDays > 7 ? ("medium" as const) : undefined })), empty: "Nothing waiting for review." },
      ],
    });
  }

  const summary = summaryLine(f, money);
  return {
    title: "Bob's Daily Brief",
    companyName: f.company.name,
    date: f.date,
    dateLabel: dateLabel(f.date),
    windowLabel: f.window.previousBriefDate ? `Since the previous brief (${dateLabel(f.window.previousBriefDate)})` : "Covering the last 24 hours",
    siteUrl: o.siteUrl,
    summary,
    narrative: o.narrative ?? "",
    attentionCount: sections[0].items.length,
    includesMoney: money,
    generatedAt: f.generatedAt,
    sections,
  };
}
