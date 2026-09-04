import { test } from "node:test";
import assert from "node:assert/strict";
import { findLikelyDuplicate, matchByName, matchProjects, pickProject } from "./match.ts";

const projects = [
  { id: "1", name: "Smith kitchen", number: 7, client_name: "J. Smith", address: "12 Maple St" },
  { id: "2", name: "Smith bath", number: 8, client_name: "J. Smith", address: "12 Maple St" },
  { id: "3", name: "Hampton Lot 14 build", number: 9, client_name: "Hampton Homes", address: "Lot 14, Sunrise Ranch" },
  { id: "4", name: "Monarch Hotel Renovation", number: 10, client_name: "Crown Hospitality", address: "500 Main" },
];

test("exact and partial names win, informal phrasing is tolerated", () => {
  assert.equal(pickProject(matchProjects("the Hampton job", projects)).kind, "one");
  const m = matchProjects("open the hotel project", projects);
  assert.equal(m[0].project.id, "4");
  assert.equal(pickProject(m).kind, "one");
});

test("project numbers match P-0007 / #7 / 7", () => {
  for (const q of ["P-0007", "#7", "7", "p 7"]) {
    const pick = pickProject(matchProjects(q, projects));
    assert.equal(pick.kind, "one", q);
    if (pick.kind === "one") assert.equal(pick.project.id, "1", q);
  }
});

test("two Smith projects are ambiguous, not guessed", () => {
  const pick = pickProject(matchProjects("Smith", projects));
  assert.equal(pick.kind, "ambiguous");
  if (pick.kind === "ambiguous") assert.deepEqual(pick.candidates.map((c) => c.id).sort(), ["1", "2"]);
});

test("client and address match when the name does not; nothing matches nothing", () => {
  const pick = pickProject(matchProjects("Crown Hospitality", projects));
  assert.equal(pick.kind, "one");
  assert.equal(pickProject(matchProjects("Sunrise Ranch", projects)).kind, "one");
  assert.equal(pickProject(matchProjects("Zebra", projects)).kind, "none");
});

test("findLikelyDuplicate flags a matching address or a near-exact name, not a loose one", () => {
  const byAddress = findLikelyDuplicate("Maple St kitchen redo", "12 Maple St", projects);
  assert.equal(byAddress?.reason, "address");
  assert.equal(byAddress?.project.id, "1");

  const byAddressCase = findLikelyDuplicate("Something else", "  12   maple st  ", projects);
  assert.equal(byAddressCase?.reason, "address");

  const byName = findLikelyDuplicate("MONARCH HOTEL RENOVATION", undefined, projects);
  assert.equal(byName?.reason, "name");
  assert.equal(byName?.project.id, "4");

  assert.equal(findLikelyDuplicate("Totally new project", "999 Nowhere Ln", projects), null);
  // a different lot number is a different project, not a duplicate of Lot 14
  assert.equal(findLikelyDuplicate("Hampton Lot 15 build", undefined, projects), null);
});

test("matchByName ranks tasks by title", () => {
  const tasks = [
    { id: "t1", title: "Set trusses" },
    { id: "t2", title: "Pass framing inspection" },
    { id: "t3", title: "Order trusses" },
  ];
  const m = matchByName("framing inspection", tasks, (t) => t.title);
  assert.equal(m[0].project.id, "t2");
  const trusses = matchByName("trusses", tasks, (t) => t.title);
  assert.equal(trusses.length, 2);
});
