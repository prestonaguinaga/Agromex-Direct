import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dateRange, instantRange, isYmd, localYmd, startOfLocalDay, startOfWeek } from "./time.ts";

const TZ = "America/Chicago";
// 2026-09-02 03:30 UTC is still Sep 1 in Chicago (UTC-5 in September).
const now = new Date("2026-09-02T03:30:00Z");

test("local date respects the company timezone", () => {
  assert.equal(localYmd(now, TZ), "2026-09-01");
  assert.equal(localYmd(now, "UTC"), "2026-09-02");
  assert.equal(localYmd(now, "Not/AZone"), "2026-09-02");
});

test("week and day arithmetic", () => {
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
  assert.equal(startOfWeek("2026-09-01"), "2026-08-31"); // Tuesday → Monday
  assert.equal(startOfWeek("2026-09-06"), "2026-08-31"); // Sunday belongs to the week that started Monday
  assert.equal(isYmd("2026-02-30"), true); // shape only; Date.parse accepts it
  assert.equal(isYmd("yesterday"), false);
});

test("presets produce inclusive local ranges", () => {
  assert.deepEqual(dateRange("today", now, TZ), { from: "2026-09-01", to: "2026-09-01", label: "today" });
  assert.deepEqual(dateRange("yesterday", now, TZ), { from: "2026-08-31", to: "2026-08-31", label: "yesterday" });
  assert.deepEqual(dateRange("this_week", now, TZ), { from: "2026-08-31", to: "2026-09-06", label: "this week (Mon–Sun)" });
  assert.equal(dateRange("next_7_days", now, TZ).to, "2026-09-08");
  assert.equal(dateRange("this_month", now, TZ).to, "2026-09-30");
});

test("instants convert through the timezone offset", () => {
  assert.equal(startOfLocalDay("2026-09-01", TZ).toISOString(), "2026-09-01T05:00:00.000Z");
  assert.equal(startOfLocalDay("2026-01-15", TZ).toISOString(), "2026-01-15T06:00:00.000Z"); // CST
  const r = instantRange("yesterday", now, TZ);
  assert.equal(r.fromIso, "2026-08-31T05:00:00.000Z");
  assert.equal(r.toIso, "2026-09-01T05:00:00.000Z");
});
