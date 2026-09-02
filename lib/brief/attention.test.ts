import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionItems } from "./attention.ts";
import { composeBrief } from "./compose.ts";
import { renderEmailHtml, renderText } from "./render.ts";
import { DEFAULT_BRIEF_SETTINGS, emptyFacts, type ProjectFact, type TaskFact } from "./types.ts";

const SITE = "https://admin.example.com";
const P1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const P2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function project(over: Partial<ProjectFact>): ProjectFact {
  return {
    id: P1,
    number: "P-0007",
    name: "Smith kitchen",
    status: "active",
    type: "remodel",
    href: `${SITE}/projects/${P1}`,
    phase: "Framing",
    nextPhase: "Roofing",
    phasesDone: 3,
    phasesTotal: 13,
    progress: 62,
    progressSource: "calculated",
    progressPrev: 58,
    schedule: { status: "on_track", label: "On schedule", daysRemaining: 50, target: "2026-10-22" },
    manager: "Johnny",
    tasks: { open: 18, overdue: 2, blocked: 1, dueToday: 1, dueSoon: 3, done: 12, total: 30 },
    money: { contract: 185000, budgeted: 190000, committed: 20000, spent: 175000, remaining: 15000, variance: -5000, overLines: 1 },
    changes: [{ when: "2026-09-01T15:00:00Z", who: "Johnny", what: "completed Set trusses", via: "ui" }],
    changesTotal: 1,
    newNotes: 1,
    newPhotos: 4,
    lastActivityAt: "2026-09-01T15:00:00Z",
    ...over,
  };
}

function task(over: Partial<TaskFact>): TaskFact {
  return {
    id: "t1",
    title: "Pass framing inspection",
    projectId: P1,
    projectName: "Smith kitchen",
    due: "2026-08-25",
    assigned: "Cruz",
    priority: "normal",
    trade: "Inspection",
    status: "todo",
    checklist: true,
    milestone: false,
    daysOverdue: 8,
    completedAt: null,
    completedBy: null,
    href: `${SITE}/projects/${P1}?tab=tasks`,
    ...over,
  };
}

function facts() {
  const f = emptyFacts({ company: { id: "c", name: "Monarch Development LLC" }, date: "2026-09-02", settings: { ...DEFAULT_BRIEF_SETTINGS, enabled: true } });
  f.generatedAt = "2026-09-02T12:00:00Z";
  f.window = { start: "2026-09-01T12:00:00Z", end: "2026-09-02T12:00:00Z", previousBriefDate: "2026-09-01" };
  f.projects = [
    project({}),
    project({ id: P2, number: "P-0009", name: "Hampton Lot 14", href: `${SITE}/projects/${P2}`, money: null, lastActivityAt: "2026-08-20T10:00:00Z", changes: [], changesTotal: 0, tasks: { open: 5, overdue: 0, blocked: 0, dueToday: 0, dueSoon: 0, done: 1, total: 6 }, schedule: { status: "behind", label: "Behind by about 12 days", daysRemaining: 30, target: "2026-10-02" }, progress: 20, progressPrev: 20 }),
  ];
  f.schedule.overdue = [task({}), task({ id: "t2", title: "Order trusses", trade: "Framing", due: "2026-09-01", daysOverdue: 1, priority: "urgent", checklist: false })];
  f.schedule.blocked = [task({ id: "t3", title: "Set windows", status: "blocked", due: null, daysOverdue: null })];
  f.schedule.dueToday = [task({ id: "t4", title: "Sheathing complete", due: "2026-09-02", daysOverdue: null })];
  f.schedule.behind = [{ projectId: P2, projectName: "Hampton Lot 14", label: "Behind by about 12 days", href: `${SITE}/projects/${P2}?tab=progress` }];
  f.budget = {
    overLines: [{ projectId: P1, projectName: "Smith kitchen", category: "Electrical", budgeted: 26000, committed: 5000, spent: 22200, remaining: -1200, href: `${SITE}/projects/${P1}?tab=budget` }],
    changes: [{ when: "2026-09-01T16:00:00Z", who: "Alma Owner", projectId: P1, projectName: "Smith kitchen", what: "changed Electrical budget from $26,000 to $28,500", from: 26000, to: 28500, large: true, via: "bob", href: `${SITE}/projects/${P1}?tab=budget` }],
    remaining: [{ projectId: P1, projectName: "Smith kitchen", contract: 185000, budgeted: 190000, committed: 20000, spent: 175000, remaining: 15000, variance: -5000, href: `${SITE}/projects/${P1}?tab=budget` }],
    negativeVariance: [{ projectId: P1, projectName: "Smith kitchen", contract: 185000, budgeted: 190000, committed: 20000, spent: 175000, remaining: 15000, variance: -5000, href: `${SITE}/projects/${P1}?tab=budget` }],
  };
  f.progress.completedTasks = [task({ id: "t5", title: "Set trusses", status: "done", due: null, daysOverdue: null, checklist: false, completedAt: "2026-09-01T15:00:00Z", completedBy: "Johnny" })];
  f.progress.notes = [{ when: "2026-09-01T17:00:00Z", who: "Cruz", projectId: P1, projectName: "Smith kitchen", text: "Trusses arrive Thursday.", href: `${SITE}/projects/${P1}?tab=notes` }];
  f.photos = [{ projectId: P1, projectName: "Smith kitchen", count: 4, latestAt: "2026-09-01T18:00:00Z", href: `${SITE}/projects/${P1}?tab=photos`, previews: [] }];
  f.applications = { fresh: [], waiting: [{ id: "a1", when: "2026-08-20T00:00:00Z", company: "Ace Drywall", contact: "Ana", trade: "Drywall", status: "new", waitingDays: 13 }] };
  f.leads = { fresh: [{ id: "l1", when: "2026-09-01T20:00:00Z", name: "Pat Lead", contact: "pat@example.com", source: "website", message: "Need a kitchen remodel", status: "new" }], waiting: 1 };
  return f;
}

test("attention rules only fire on evidence, high severity first", () => {
  const items = attentionItems(facts());
  const kinds = items.map((i) => i.kind);
  assert.ok(kinds.includes("overdue"), "overdue");
  assert.ok(kinds.includes("blocked"), "blocked");
  assert.ok(kinds.includes("variance"), "variance");
  assert.ok(kinds.includes("over_contract"), "over contract");
  assert.ok(kinds.includes("behind"), "behind");
  assert.ok(kinds.includes("stale"), "stale project");
  assert.ok(kinds.includes("important_item"), "important item");
  assert.ok(kinds.includes("applications"), "applications waiting");
  assert.ok(kinds.includes("leads"), "leads waiting");
  assert.ok(!kinds.includes("over_line"), "over_line folded into variance for the same project");
  assert.equal(items[0].severity, "high");
  for (let i = 1; i < items.length; i++) assert.ok(!(items[i - 1].severity === "medium" && items[i].severity === "high"), "sorted by severity");
  const stale = items.find((i) => i.kind === "stale")!;
  assert.equal(stale.projectName, "Hampton Lot 14");
  assert.match(stale.text, /13 days/);
  assert.ok(items.every((i) => i.evidence.length > 0), "every item carries evidence");
});

test("a clean company produces no attention items", () => {
  const f = emptyFacts({ company: { id: "c", name: "X" }, date: "2026-09-02" });
  f.generatedAt = "2026-09-02T12:00:00Z";
  f.projects = [project({ lastActivityAt: "2026-09-02T09:00:00Z", money: { contract: 100, budgeted: 100, committed: 0, spent: 10, remaining: 90, variance: 90, overLines: 0 } })];
  assert.deepEqual(attentionItems(f), []);
});

test("composer builds every section, and strips money for roles that may not see it", () => {
  const f = facts();
  f.attention = attentionItems(f);
  const full = composeBrief(f, { siteUrl: SITE, includeMoney: true, narrative: "Two things need you today." });
  assert.deepEqual(
    full.sections.map((s) => s.key),
    ["attention", "projects", "schedule", "budget", "progress", "photos", "leads", "applications"],
  );
  assert.equal(full.attentionCount, f.attention.length);
  assert.match(full.summary, /2 active projects/);
  assert.match(full.summary, /2 overdue/);
  assert.match(full.summary, /1 over budget/);
  const text = renderText(full);
  assert.match(text, /BOB SAYS YOU SHOULD LOOK AT/);
  assert.match(text, /\+4 since last brief/);
  assert.match(text, /\$28,500/);
  assert.match(text, /https:\/\/admin\.example\.com\/projects\/aaaaaaaa/);
  assert.match(text, /Trusses arrive Thursday/);

  const noMoney = composeBrief(f, { siteUrl: SITE, includeMoney: false });
  assert.ok(!noMoney.sections.some((s) => s.key === "budget"), "no budget section");
  const t2 = renderText(noMoney);
  assert.ok(!/\$/.test(t2), `no dollar figures: ${t2.match(/.*\$.*/)?.[0]}`);
  assert.ok(!noMoney.sections[0].items.some((i) => /over its approved budget/.test(i.text)), "money attention items dropped");
  assert.ok(noMoney.sections[0].items.some((i) => /overdue/.test(i.text)), "non-money attention items kept");
});

test("email html is a single column with links back into the app, and escapes content", () => {
  const f = facts();
  f.progress.notes[0].text = 'Client said "<script>alert(1)</script>"';
  f.attention = attentionItems(f);
  const doc = composeBrief(f, { siteUrl: SITE, includeMoney: true });
  const html = renderEmailHtml(doc, { briefUrl: `${SITE}/briefs/x` });
  assert.match(html, /max-width:600px/);
  assert.match(html, /viewport/);
  assert.match(html, new RegExp(`${SITE}/briefs/x`));
  assert.match(html, new RegExp(`${SITE}/settings`));
  assert.ok(!html.includes("<script>"), "script tags escaped");
  assert.match(html, /&lt;script&gt;/);
});
