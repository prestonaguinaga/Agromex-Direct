/**
 * Fuzzy project lookup for "open the Smith project" / "how are we doing on
 * Hampton?". Pure and unit-tested; the server hands it the projects the
 * person is allowed to see (RLS already filtered them).
 */

export interface MatchableProject {
  id: string;
  name: string;
  number?: number | null;
  client_name?: string | null;
  address?: string | null;
}

export interface ProjectMatch<T> {
  project: T;
  score: number;
}

const STOP = new Set(["project", "projects", "the", "a", "an", "job", "on", "for", "at", "of", "open", "show", "me", "to", "go", "take"]);

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(s: string): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((t) => t && !STOP.has(t));
}

function numberOf(query: string): number | null {
  const m = /^(?:p[- ]?|#)?0*(\d{1,6})$/i.exec(query.trim());
  return m ? Number(m[1]) : null;
}

export function matchProjects<T extends MatchableProject>(query: string, projects: T[]): ProjectMatch<T>[] {
  const qNorm = normalizeText(query);
  const qTokens = tokens(query);
  const qJoined = qTokens.join(" ");
  const num = numberOf(query);
  const out: ProjectMatch<T>[] = [];
  for (const p of projects) {
    const name = normalizeText(p.name);
    const client = normalizeText(p.client_name ?? "");
    const address = normalizeText(p.address ?? "");
    let score = 0;
    if (num !== null && p.number === num) score = 100;
    else if (qNorm && name === qNorm) score = 100;
    else if (qJoined && name === qJoined) score = 98;
    else if (qJoined && name.startsWith(qJoined)) score = 90;
    else if (qJoined && name.includes(qJoined)) score = 82;
    else if (qTokens.length && qTokens.every((t) => name.includes(t))) score = 72;
    else if (qJoined && client && (client.includes(qJoined) || qTokens.every((t) => client.includes(t)))) score = 64;
    else if (qJoined && address && address.includes(qJoined)) score = 52;
    else if (qTokens.length) {
      const hay = `${name} ${client} ${address}`;
      const hits = qTokens.filter((t) => hay.includes(t)).length;
      if (hits > 0) score = Math.round((hits / qTokens.length) * 45);
    }
    if (score > 0) out.push({ project: p, score });
  }
  return out.sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name));
}

export type Pick<T> =
  | { kind: "none" }
  | { kind: "one"; project: T }
  | { kind: "ambiguous"; candidates: T[] };

/** Decide whether a match is safe to act on or needs a clarifying question. */
export function pickProject<T extends MatchableProject>(matches: ProjectMatch<T>[]): Pick<T> {
  if (matches.length === 0) return { kind: "none" };
  const [top, second] = matches;
  // The only thing that matched at all (even by address alone) is not ambiguous.
  if (!second && top.score >= 45) return { kind: "one", project: top.project };
  if (top.score >= 60 && (!second || top.score - second.score >= 15 || top.score === 100)) {
    return { kind: "one", project: top.project };
  }
  return { kind: "ambiguous", candidates: matches.slice(0, 5).map((m) => m.project) };
}

export interface DuplicateCandidate<T> {
  project: T;
  reason: "address" | "name";
}

/**
 * Before creating a project: is there already one at this address, or with a
 * near-identical name? Exact (normalized) address match, or a name match
 * strong enough that a person would call it "the same project" (score >= 90:
 * exact, joined-exact, or a prefix match) — not a loose keyword overlap.
 */
export function findLikelyDuplicate<T extends MatchableProject>(
  name: string,
  address: string | undefined,
  projects: T[],
): DuplicateCandidate<T> | null {
  const addrNorm = address ? normalizeText(address) : "";
  if (addrNorm) {
    const byAddress = projects.find((p) => p.address && normalizeText(p.address) === addrNorm);
    if (byAddress) return { project: byAddress, reason: "address" };
  }
  const [top] = matchProjects(name, projects);
  if (top && top.score >= 90) return { project: top.project, reason: "name" };
  return null;
}

/** Same idea for tasks, budget lines, members, subcontractors: best name match. */
export function matchByName<T extends { id: string }>(query: string, rows: T[], nameOf: (r: T) => string): ProjectMatch<T>[] {
  const q = normalizeText(query);
  const qt = tokens(query);
  const out: ProjectMatch<T>[] = [];
  for (const r of rows) {
    const n = normalizeText(nameOf(r));
    let score = 0;
    if (r.id === query) score = 100;
    else if (q && n === q) score = 100;
    else if (q && n.startsWith(q)) score = 88;
    else if (q && n.includes(q)) score = 80;
    else if (qt.length && qt.every((t) => n.includes(t))) score = 70;
    else if (qt.length) {
      const hits = qt.filter((t) => n.includes(t)).length;
      if (hits > 0) score = Math.round((hits / qt.length) * 45);
    }
    if (score > 0) out.push({ project: r, score });
  }
  return out.sort((a, b) => b.score - a.score);
}
