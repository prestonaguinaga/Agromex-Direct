import { test } from "node:test";
import assert from "node:assert/strict";
import { contextFromLocation, isUuid } from "./protocol.ts";

const PID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

test("context comes from the location, tab only inside a project", () => {
  assert.deepEqual(contextFromLocation(`/projects/${PID}`, "budget"), { route: `/projects/${PID}`, projectId: PID, tab: "budget" });
  assert.deepEqual(contextFromLocation(`/projects/${PID}`, null), { route: `/projects/${PID}`, projectId: PID, tab: "overview" });
  assert.deepEqual(contextFromLocation(`/projects/${PID}`, "nonsense"), { route: `/projects/${PID}`, projectId: PID, tab: "overview" });
  assert.deepEqual(contextFromLocation("/projects", "budget"), { route: "/projects", projectId: null, tab: null });
  assert.deepEqual(contextFromLocation("/bob", null), { route: "/bob", projectId: null, tab: null });
  assert.equal(contextFromLocation("/projects/not-a-uuid", null).projectId, null);
});

test("uuid check", () => {
  assert.equal(isUuid(PID), true);
  assert.equal(isUuid(PID.toUpperCase()), true);
  assert.equal(isUuid("../x"), false);
  assert.equal(isUuid(42), false);
});
