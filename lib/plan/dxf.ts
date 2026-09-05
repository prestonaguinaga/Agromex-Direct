import { drawLevel, drawPlan, type Drawing, type Layer, type Prim } from "./draw.ts";
import type { HousePlan } from "./model.ts";

/**
 * DXF R12 (AC1009) writer — the most widely imported flavour, and the one
 * Home Designer / Chief Architect read as CAD lines at true scale. Units are
 * inches ($INSUNITS = 1). Layers follow the AIA convention so the import
 * lands on sensibly-named layers to trace.
 */

const LAYERS: Record<Layer, { name: string; color: number; ltype: "CONTINUOUS" | "DASHED" }> = {
  wall: { name: "A-WALL", color: 7, ltype: "CONTINUOUS" },
  "wall-center": { name: "A-WALL-CNTR", color: 8, ltype: "DASHED" },
  door: { name: "A-DOOR", color: 3, ltype: "CONTINUOUS" },
  window: { name: "A-GLAZ", color: 4, ltype: "CONTINUOUS" },
  opening: { name: "A-DOOR-OPNG", color: 3, ltype: "DASHED" },
  stair: { name: "A-FLOR-STRS", color: 6, ltype: "CONTINUOUS" },
  "room-text": { name: "A-AREA-IDEN", color: 2, ltype: "CONTINUOUS" },
  mark: { name: "A-ANNO-SYMB", color: 2, ltype: "CONTINUOUS" },
  dim: { name: "A-ANNO-DIMS", color: 1, ltype: "CONTINUOUS" },
  title: { name: "A-ANNO-TTLB", color: 7, ltype: "CONTINUOUS" },
  symbol: { name: "A-ANNO-SYMB", color: 7, ltype: "CONTINUOUS" },
};

const f = (n: number) => (Math.round(n * 1000) / 1000).toString();

function header(): string[] {
  return ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "9", "$INSUNITS", "70", "1", "9", "$MEASUREMENT", "70", "0", "0", "ENDSEC"];
}

function tables(): string[] {
  const out: string[] = ["0", "SECTION", "2", "TABLES"];
  // line types
  out.push("0", "TABLE", "2", "LTYPE", "70", "2");
  out.push("0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0");
  out.push("0", "LTYPE", "2", "DASHED", "70", "0", "3", "Dashed __ __ __", "72", "65", "73", "2", "40", "9", "49", "6", "49", "-3");
  out.push("0", "ENDTAB");
  // layers (dedupe by name)
  const seen = new Map<string, { color: number; ltype: string }>();
  for (const l of Object.values(LAYERS)) if (!seen.has(l.name)) seen.set(l.name, { color: l.color, ltype: l.ltype });
  out.push("0", "TABLE", "2", "LAYER", "70", String(seen.size + 1));
  out.push("0", "LAYER", "2", "0", "70", "0", "62", "7", "6", "CONTINUOUS");
  for (const [name, l] of seen) out.push("0", "LAYER", "2", name, "70", "0", "62", String(l.color), "6", l.ltype);
  out.push("0", "ENDTAB");
  // text style
  out.push("0", "TABLE", "2", "STYLE", "70", "1", "0", "STYLE", "2", "STANDARD", "70", "0", "40", "0", "41", "1", "50", "0", "71", "0", "42", "0.2", "3", "txt", "4", "", "0", "ENDTAB");
  out.push("0", "ENDSEC");
  return out;
}

function entity(p: Prim, dx: number, dy: number): string[] {
  const L = LAYERS[p.layer].name;
  switch (p.t) {
    case "line":
      return ["0", "LINE", "8", L, ...(p.dashed ? ["6", "DASHED"] : []), "10", f(p.x1 + dx), "20", f(p.y1 + dy), "30", "0", "11", f(p.x2 + dx), "21", f(p.y2 + dy), "31", "0"];
    case "arc":
      return ["0", "ARC", "8", L, "10", f(p.cx + dx), "20", f(p.cy + dy), "30", "0", "40", f(p.r), "50", f(p.a0), "51", f(p.a1)];
    case "circle":
      return ["0", "CIRCLE", "8", L, "10", f(p.cx + dx), "20", f(p.cy + dy), "30", "0", "40", f(p.r)];
    case "text": {
      const just = p.anchor === "middle" ? "1" : p.anchor === "end" ? "2" : "0";
      const out = ["0", "TEXT", "8", L, "10", f(p.x + dx), "20", f(p.y + dy), "30", "0", "40", f(p.size), "1", p.text.replace(/\r?\n/g, " ")];
      if (p.rotate) out.push("50", f(p.rotate));
      if (just !== "0") out.push("72", just, "11", f(p.x + dx), "21", f(p.y + dy), "31", "0");
      return out;
    }
  }
}

function serialise(drawings: Array<{ d: Drawing; dx: number; dy: number }>): string {
  const lines: string[] = [...header(), ...tables(), "0", "SECTION", "2", "ENTITIES"];
  for (const { d, dx, dy } of drawings) for (const p of d.prims) lines.push(...entity(p, dx, dy));
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\r\n") + "\r\n";
}

/** One level per file — the normal way to bring a floor into Home Designer. */
export function levelDxf(plan: HousePlan, levelId: string): string | null {
  const d = drawLevel(plan, levelId);
  if (!d) return null;
  return serialise([{ d, dx: 0, dy: 0 }]);
}

/** Every level in one file, laid out left to right. */
export function planDxf(plan: HousePlan): string {
  const ds = drawPlan(plan);
  let dx = 0;
  const placed = ds.map((d) => {
    const item = { d, dx: dx - d.bounds.x0, dy: -d.bounds.y0 };
    dx += d.bounds.x1 - d.bounds.x0 + 120;
    return item;
  });
  return serialise(placed);
}
