import type { Project, Totals } from "./types";
import { activePrice, lineTotal, money } from "./format";

/**
 * Plain-text rendering of the quote for the "Email" button (mailto:).
 * Kept compact — mail clients cap URL length, so long link lists are
 * summarized and the printed sheet remains the full record.
 */
export function buildQuoteText(project: Project, totals: Totals): string {
  const lines: string[] = [];
  lines.push(`QUOTE — ${project.name}`);
  if (project.info.client) lines.push(`Client: ${project.info.client}`);
  if (project.info.address) lines.push(`Address: ${project.info.address}`);
  lines.push(`Date: ${new Date().toLocaleDateString("en-US")}`);
  lines.push("");

  for (const sec of project.sections) {
    const priced = sec.items.filter((i) => lineTotal(i) !== null);
    if (priced.length === 0) continue;
    const secTotal = priced.reduce((a, i) => a + (lineTotal(i) ?? 0), 0);
    lines.push(`— ${sec.name.toUpperCase()} · ${money(secTotal)}`);
    for (const item of priced) {
      const p = activePrice(item);
      lines.push(
        `  ${item.name}: ${item.qty} ${item.unit} @ ${money(p)} = ${money(lineTotal(item))}`,
      );
    }
    lines.push("");
  }

  lines.push(`Materials subtotal: ${money(totals.materials)}`);
  if (totals.waste > 0)
    lines.push(`Waste/overage (${project.settings.wastePct}%): ${money(totals.waste)}`);
  if (totals.tax > 0)
    lines.push(`Sales tax (${project.settings.taxPct}%): ${money(totals.tax)}`);
  if (totals.labor > 0)
    lines.push(`Labor & overhead (${project.settings.laborPct}%): ${money(totals.labor)}`);
  if (totals.contingency > 0)
    lines.push(
      `Contingency (${project.settings.contingencyPct}%): ${money(totals.contingency)}`,
    );
  lines.push(`TOTAL: ${money(totals.grand)}`);
  if (totals.unpricedItems > 0)
    lines.push(`(${totals.unpricedItems} items not yet priced)`);
  return lines.join("\n");
}

export function mailtoHref(project: Project, totals: Totals): string {
  const subject = `Quote — ${project.name} (${money(totals.grand)})`;
  let body = buildQuoteText(project, totals);
  // Keep the whole mailto under ~7.5KB so common clients accept it.
  if (body.length > 7000) {
    body =
      body.slice(0, 6800) +
      "\n…\n(sheet truncated — print to PDF for the full version)";
  }
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
