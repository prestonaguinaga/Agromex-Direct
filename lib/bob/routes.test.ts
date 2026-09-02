import { test } from "node:test";
import assert from "node:assert/strict";
import { DESTINATION_KEYS, projectHref, resolveNavigation } from "./routes.ts";

const PID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const allow = () => true;
const deny = (caps: string[]) => (c: string) => !caps.includes(c);

test("static destinations resolve to fixed paths", () => {
  const r = resolveNavigation({ destination: "projects" }, { currentProjectId: null, can: allow });
  assert.deepEqual(r, { ok: true, href: "/projects", label: "Projects", projectId: null, tab: null });
  assert.equal((resolveNavigation({ destination: "team" }, { currentProjectId: null, can: allow }) as { href: string }).href, "/team");
  assert.equal((resolveNavigation({ destination: "guide" }, { currentProjectId: null, can: allow }) as { href: string }).href, "/guide");
});

test("project tabs use the current project by default", () => {
  const r = resolveNavigation({ destination: "budget" }, { currentProjectId: PID, can: allow });
  assert.ok(r.ok);
  assert.equal(r.href, `/projects/${PID}?tab=budget`);
  assert.equal(r.tab, "budget");
  const est = resolveNavigation({ destination: "estimator", projectId: PID, projectName: "Smith kitchen" }, { currentProjectId: null, can: allow });
  assert.ok(est.ok);
  assert.equal(est.href, `/projects/${PID}?tab=estimate`);
  assert.equal(est.label, "Smith kitchen · Estimate");
});

test("a project page without a project asks for one instead of guessing", () => {
  const r = resolveNavigation({ destination: "photos" }, { currentProjectId: null, can: allow });
  assert.equal(r.ok, false);
  assert.equal((r as { needsProject?: boolean }).needsProject, true);
});

test("capabilities gate destinations and tabs", () => {
  const r = resolveNavigation({ destination: "budget" }, { currentProjectId: PID, can: deny(["budgets.view"]) });
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /budgets\.view/);
  const t = resolveNavigation({ destination: "team" }, { currentProjectId: null, can: deny(["team.view"]) });
  assert.equal(t.ok, false);
});

test("unbuilt destinations refuse with an explanation; unknown ones are rejected", () => {
  const a = resolveNavigation({ destination: "applications" }, { currentProjectId: null, can: allow });
  assert.equal(a.ok, false);
  assert.match((a as { reason: string }).reason, /part of Monarch Admin yet/);
  const u = resolveNavigation({ destination: "../../admin" }, { currentProjectId: null, can: allow });
  assert.equal(u.ok, false);
  assert.match((u as { reason: string }).reason, /Unknown destination/);
});

test("no string from the model ever becomes part of a path", () => {
  const bad = resolveNavigation({ destination: "project", projectId: "../etc/passwd" }, { currentProjectId: null, can: allow });
  assert.equal(bad.ok, false);
  assert.throws(() => projectHref("not-a-uuid"));
  for (const key of DESTINATION_KEYS) {
    const r = resolveNavigation({ destination: key, projectId: PID.toUpperCase() }, { currentProjectId: null, can: allow });
    if (r.ok) assert.match(r.href, /^\/[a-z0-9\-/]+(\?tab=[a-z]+)?$/, `${key} → ${r.href}`);
  }
});
