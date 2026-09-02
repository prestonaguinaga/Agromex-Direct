import { test } from "node:test";
import assert from "node:assert/strict";
import { currentPhase, dayBucket, groupActivity, nextPhase, scheduleHealth } from "./progress.ts";

const today = new Date(2026, 8, 2); // Sep 2, 2026

test("scheduleHealth: no dates", () => {
  const h = scheduleHealth({ startDate: null, targetDate: null, progressPct: 40, today });
  assert.equal(h.status, "no_dates");
});

test("scheduleHealth: on track / ahead / behind", () => {
  // 100-day schedule, day 50 → expected 50 %
  const base = { startDate: "2026-07-14", targetDate: "2026-10-22", today };
  assert.equal(scheduleHealth({ ...base, progressPct: 52 }).status, "on_track");
  const ahead = scheduleHealth({ ...base, progressPct: 62 });
  assert.equal(ahead.status, "ahead");
  assert.equal(ahead.daysDelta, 12);
  const behind = scheduleHealth({ ...base, progressPct: 30 });
  assert.equal(behind.status, "behind");
  assert.equal(behind.daysDelta, -20);
  assert.equal(behind.label, "Behind by about 20 days");
});

test("scheduleHealth: not started, past due, complete", () => {
  assert.equal(scheduleHealth({ startDate: "2026-09-10", targetDate: "2026-12-01", progressPct: 0, today }).status, "not_started");
  const late = scheduleHealth({ startDate: "2026-05-01", targetDate: "2026-08-30", progressPct: 80, today });
  assert.equal(late.status, "past_due");
  assert.equal(late.daysDelta, -3);
  assert.equal(scheduleHealth({ startDate: "2026-05-01", targetDate: "2026-08-30", progressPct: 100, today }).status, "complete");
});

test("currentPhase prefers in-progress, then blocked, then next not started", () => {
  const phases = [
    { id: "a", name: "Foundation", status: "complete" as const, position: 0 },
    { id: "b", name: "Framing", status: "not_started" as const, position: 1 },
    { id: "c", name: "Roofing", status: "in_progress" as const, position: 2 },
  ];
  assert.equal(currentPhase(phases)?.name, "Roofing");
  assert.equal(nextPhase(phases, currentPhase(phases)), null);
  phases[2].status = "complete";
  assert.equal(currentPhase(phases)?.name, "Framing");
  assert.equal(currentPhase(phases.map((p) => ({ ...p, status: "complete" as const }))), null);
});

test("groupActivity folds photo bursts by the same person", () => {
  const mk = (id: number, minutesAgo: number, actor: string, kind: "photo" | "plan") => ({
    id,
    actor_id: actor,
    actor_name: actor === "u1" ? "Sarah" : "Mike",
    entity_type: "files",
    action: "insert",
    field: null,
    summary: `uploaded a progress photo "p${id}.jpg"`,
    created_at: new Date(today.getTime() - minutesAgo * 60_000).toISOString(),
    new_value: { kind },
  });
  const rows = [
    mk(8, 1, "u1", "photo"),
    mk(7, 2, "u1", "photo"),
    mk(6, 3, "u1", "photo"),
    mk(5, 40, "u1", "photo"), // outside the window → separate line
    mk(4, 41, "u2", "photo"),
    mk(3, 42, "u2", "plan"),
  ];
  const feed = groupActivity(rows);
  assert.equal(feed.length, 4);
  assert.equal(feed[0].summary, "uploaded 3 progress photos");
  assert.equal(feed[0].actorName, "Sarah");
  assert.equal(feed[1].count, 1);
  assert.equal(feed[2].actorName, "Mike");
  assert.equal(feed[3].summary.startsWith("uploaded a progress photo"), true);
});

test("dayBucket", () => {
  assert.equal(dayBucket(new Date(2026, 8, 2, 9).toISOString(), today), "Today");
  assert.equal(dayBucket(new Date(2026, 8, 1, 23).toISOString(), today), "Yesterday");
  assert.equal(dayBucket(new Date(2026, 7, 28).toISOString(), today), "Fri, Aug 28");
});
