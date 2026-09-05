import { drawLevel, type Layer, type Prim } from "./draw.ts";
import type { HousePlan } from "./model.ts";

/**
 * SVG for the Plan tab: the same primitives as the DXF, flipped so north is
 * up on screen. Colours come from CSS variables so the sheet themes with the
 * app; stroke widths are in drawing inches and scale with the plan.
 */

const STROKE: Record<Layer, { w: number; color: string; dash?: string }> = {
  wall: { w: 1.6, color: "var(--plan-ink, #1c2321)" },
  "wall-center": { w: 0.35, color: "var(--plan-faint, #9aa39e)", dash: "6 4" },
  door: { w: 0.7, color: "var(--plan-ink, #1c2321)" },
  window: { w: 0.7, color: "var(--plan-ink, #1c2321)" },
  opening: { w: 0.6, color: "var(--plan-ink, #1c2321)", dash: "4 3" },
  stair: { w: 0.6, color: "var(--plan-ink, #1c2321)" },
  "room-text": { w: 0, color: "var(--plan-ink, #1c2321)" },
  mark: { w: 0, color: "var(--plan-accent, #c95d17)" },
  dim: { w: 0.35, color: "var(--plan-dim, #4a5451)" },
  title: { w: 0, color: "var(--plan-ink, #1c2321)" },
  symbol: { w: 0.5, color: "var(--plan-ink, #1c2321)" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => (Math.round(v * 100) / 100).toString();

export function levelSvg(plan: HousePlan, levelId: string, opts: { showCenterlines?: boolean; className?: string } = {}): string | null {
  const d = drawLevel(plan, levelId);
  if (!d) return null;
  const { x0, y0, x1, y1 } = d.bounds;
  const W = x1 - x0, H = y1 - y0;
  // flip y: screen y = y1 - model y
  const Y = (y: number) => y1 - y;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x0)} 0 ${n(W)} ${n(H)}" width="100%" role="img" aria-label="${esc(d.title)} floor plan"${opts.className ? ` class="${esc(opts.className)}"` : ""} font-family="'IBM Plex Mono', ui-monospace, Menlo, monospace">`);
  parts.push(`<rect x="${n(x0)}" y="0" width="${n(W)}" height="${n(H)}" fill="var(--plan-paper, #ffffff)"/>`);
  for (const p of d.prims) {
    if (p.layer === "wall-center" && opts.showCenterlines === false) continue;
    parts.push(prim(p, Y));
  }
  parts.push("</svg>");
  return parts.join("");
}

function prim(p: Prim, Y: (y: number) => number): string {
  const s = STROKE[p.layer];
  const dash = p.t === "line" && p.dashed ? ' stroke-dasharray="6 4"' : s.dash ? ` stroke-dasharray="${s.dash}"` : "";
  switch (p.t) {
    case "line":
      return `<line x1="${n(p.x1)}" y1="${n(Y(p.y1))}" x2="${n(p.x2)}" y2="${n(Y(p.y2))}" stroke="${s.color}" stroke-width="${s.w}" stroke-linecap="square"${dash}/>`;
    case "circle":
      return `<circle cx="${n(p.cx)}" cy="${n(Y(p.cy))}" r="${n(p.r)}" fill="none" stroke="${s.color}" stroke-width="${s.w}"/>`;
    case "arc": {
      // DXF angles are CCW from +x in model space; on screen (y down) that becomes CW, so swap sweep.
      const a0 = (p.a0 * Math.PI) / 180, a1 = (p.a1 * Math.PI) / 180;
      const sx = p.cx + p.r * Math.cos(a0), sy = p.cy + p.r * Math.sin(a0);
      const ex = p.cx + p.r * Math.cos(a1), ey = p.cy + p.r * Math.sin(a1);
      const large = Math.abs(p.a1 - p.a0) > 180 ? 1 : 0;
      return `<path d="M ${n(sx)} ${n(Y(sy))} A ${n(p.r)} ${n(p.r)} 0 ${large} 0 ${n(ex)} ${n(Y(ey))}" fill="none" stroke="${s.color}" stroke-width="${s.w}"/>`;
    }
    case "text": {
      const anchor = p.anchor === "middle" ? "middle" : p.anchor === "end" ? "end" : "start";
      const x = p.x, y = Y(p.y);
      const rot = p.rotate ? ` transform="rotate(${-p.rotate} ${n(x)} ${n(y)})"` : "";
      return `<text x="${n(x)}" y="${n(y)}" font-size="${n(p.size)}" text-anchor="${anchor}" fill="${s.color}"${p.bold ? ' font-weight="600"' : ""}${rot}>${esc(p.text)}</text>`;
    }
  }
}
