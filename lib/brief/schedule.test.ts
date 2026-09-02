import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, isDue, localMinutes, normalizeRecipients, parseTime } from "./schedule.ts";

const TZ = "America/Chicago";
const settings = { enabled: true, deliveryTime: "07:00", timezone: TZ };

test("parseTime accepts HH:MM and HH:MM:SS, rejects nonsense", () => {
  assert.equal(parseTime("07:00"), 420);
  assert.equal(parseTime("06:30:00"), 390);
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("seven"), null);
  assert.equal(formatTime(390), "06:30");
});

test("local minutes follow the timezone", () => {
  // 12:05 UTC on Sep 2 = 07:05 in Chicago (CDT)
  assert.equal(localMinutes(new Date("2026-09-02T12:05:00Z"), TZ), 425);
  assert.equal(localMinutes(new Date("2026-09-02T12:05:00Z"), "UTC"), 725);
});

test("a brief is due once the local time passes the delivery time, exactly once per local day", () => {
  const have = new Set<string>();
  const before = isDue(settings, new Date("2026-09-02T11:30:00Z"), (d) => have.has(d)); // 06:30 Chicago
  assert.equal(before.due, false);
  assert.equal(before.localDate, "2026-09-02");
  const at = isDue(settings, new Date("2026-09-02T12:00:00Z"), (d) => have.has(d)); // 07:00
  assert.equal(at.due, true);
  have.add(at.localDate);
  const later = isDue(settings, new Date("2026-09-02T20:00:00Z"), (d) => have.has(d)); // 15:00, already generated
  assert.equal(later.due, false);
  assert.match(later.reason, /already generated/);
  // A late tick the next day (the app was down all morning) still produces the day's brief once.
  const lateNextDay = isDue(settings, new Date("2026-09-03T22:00:00Z"), (d) => have.has(d)); // 17:00 next day
  assert.equal(lateNextDay.due, true);
  assert.equal(lateNextDay.localDate, "2026-09-03");
});

test("disabled or invalid settings are never due; a bad timezone falls back to UTC", () => {
  assert.equal(isDue({ ...settings, enabled: false }, new Date("2026-09-02T12:00:00Z"), () => false).due, false);
  assert.equal(isDue({ ...settings, deliveryTime: "x" }, new Date("2026-09-02T12:00:00Z"), () => false).due, false);
  const utc = isDue({ ...settings, timezone: "Nowhere/City" }, new Date("2026-09-02T07:30:00Z"), () => false);
  assert.equal(utc.due, true);
  assert.equal(utc.localTime, "07:30");
});

test("recipients are normalised and de-duplicated", () => {
  const r = normalizeRecipients("Owner@Example.com, pm@example.com\nowner@example.com; not-an-email");
  assert.deepEqual(r.valid, ["owner@example.com", "pm@example.com"]);
  assert.deepEqual(r.invalid, ["not-an-email"]);
});
