import type { Project, Totals } from "@/lib/types";
import { appConfig } from "@/app.config";
import { activePrice, lineTotal, money, num } from "@/lib/format";

/**
 * The paper deliverable. Hidden on screen (`print-only`), rendered by
 * window.print() — one clean, hairline-ruled quote sheet with a drafting
 * title block, itemized sections, totals, and a product-link appendix.
 */
export function PrintSheet({
  project,
  totals,
}: {
  project: Project;
  totals: Totals;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // The printed quote carries only real money: unpriced and $0 lines stay
  // on the working sheet (they're the checklist) but are left off the PDF.
  const printable = (item: Project["sections"][number]["items"][number]) =>
    (lineTotal(item) ?? 0) > 0;

  const linkRows: { item: string; label: string; url: string }[] = [];
  for (const sec of project.sections)
    for (const item of sec.items)
      if (printable(item))
        for (const opt of item.options)
          if (opt.url)
            linkRows.push({
              item: item.name,
              label: opt.label || "product page",
              url: opt.url,
            });

  return (
    <div className="print-only">
      {/* Title block */}
      <div className="mb-5 border-2 border-ink">
        <div className="flex items-stretch justify-between border-b-2 border-ink">
          <div className="p-3">
            <p className="font-display text-lg">{appConfig.company.wordmark}</p>
            <p className="microlabel">{appConfig.company.name} · Construction quote sheet</p>
          </div>
          <div className="grid grid-cols-2 text-right">
            <div className="border-l border-ink p-3">
              <p className="microlabel">Date</p>
              <p className="tnum font-mono text-sm">{today}</p>
            </div>
            <div className="border-l border-ink p-3">
              <p className="microlabel">Type</p>
              <p className="font-mono text-sm uppercase">
                {project.type === "new-build" ? "New build" : "Remodel"}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="p-3">
            <p className="microlabel">Project</p>
            <p className="text-sm font-semibold">{project.name}</p>
          </div>
          <div className="border-l border-ink p-3">
            <p className="microlabel">Client</p>
            <p className="text-sm">{project.info.client || "—"}</p>
            {project.info.phone && (
              <p className="tnum font-mono text-xs">{project.info.phone}</p>
            )}
          </div>
          <div className="border-l border-ink p-3">
            <p className="microlabel">Address</p>
            <p className="text-sm">{project.info.address || "—"}</p>
          </div>
        </div>
        {(project.info.sqft || project.info.bedrooms || project.info.bathrooms) && (
          <div className="flex gap-6 border-t border-ink p-3">
            {project.info.sqft && (
              <span className="font-mono text-xs">
                {num(project.info.sqft)} sq ft
              </span>
            )}
            <span className="font-mono text-xs">
              {project.info.stories} {project.info.stories === 1 ? "story" : "stories"}
            </span>
            {project.info.bedrooms != null && project.info.bedrooms > 0 && (
              <span className="font-mono text-xs">{project.info.bedrooms} bed</span>
            )}
            {project.info.bathrooms != null && project.info.bathrooms > 0 && (
              <span className="font-mono text-xs">{project.info.bathrooms} bath</span>
            )}
          </div>
        )}
      </div>

      {/* Itemized sections */}
      {project.sections.map((sec, sIdx) => {
        const items = sec.items.filter(printable);
        if (items.length === 0) return null;
        const secTotal = items.reduce((a, i) => a + (lineTotal(i) ?? 0), 0);
        return (
          <table
            key={sec.id}
            className="mb-4 w-full border-collapse text-xs"
            style={{ pageBreakInside: "avoid" }}
          >
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="py-1 pr-2 text-left">
                  <span className="microlabel tnum mr-2">
                    S{String(sIdx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[0.6875rem]">{sec.name}</span>
                </th>
                <th className="microlabel py-1 text-right">Qty</th>
                <th className="microlabel py-1 pl-3 text-left">Unit</th>
                <th className="microlabel py-1 text-right">@ Price</th>
                <th className="microlabel py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const active =
                  item.options.find((o) => o.id === item.activeOptionId) ??
                  item.options[0];
                const t = lineTotal(item);
                return (
                  <tr key={item.id} className="border-b border-line align-top">
                    <td className="py-1 pr-2">
                      {item.name}
                      {active?.label && (
                        <span className="text-mute"> — {active.label}</span>
                      )}
                      {item.note && (
                        <span className="block text-[0.625rem] text-mute">
                          {item.note}
                        </span>
                      )}
                    </td>
                    <td className="tnum py-1 text-right font-mono">
                      {num(item.qty)}
                    </td>
                    <td className="py-1 pl-3 font-mono">{item.unit}</td>
                    <td className="tnum py-1 text-right font-mono">
                      {activePrice(item) === null ? "—" : money(activePrice(item))}
                    </td>
                    <td className="tnum py-1 text-right font-mono">
                      {t === null ? "—" : money(t)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4} className="microlabel py-1 text-right">
                  Section total
                </td>
                <td className="tnum border-t border-ink py-1 text-right font-mono font-semibold">
                  {money(secTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}

      {/* Totals block */}
      <table
        className="ml-auto w-72 border-collapse text-xs"
        style={{ pageBreakInside: "avoid" }}
      >
        <tbody>
          <tr>
            <td className="py-0.5">Materials subtotal</td>
            <td className="tnum py-0.5 text-right font-mono">
              {money(totals.materials)}
            </td>
          </tr>
          {totals.waste > 0 && (
            <tr>
              <td className="py-0.5">Waste / overage ({project.settings.wastePct}%)</td>
              <td className="tnum py-0.5 text-right font-mono">{money(totals.waste)}</td>
            </tr>
          )}
          {totals.tax > 0 && (
            <tr>
              <td className="py-0.5">Sales tax ({project.settings.taxPct}%)</td>
              <td className="tnum py-0.5 text-right font-mono">{money(totals.tax)}</td>
            </tr>
          )}
          {totals.labor > 0 && (
            <tr>
              <td className="py-0.5">Labor & overhead ({project.settings.laborPct}%)</td>
              <td className="tnum py-0.5 text-right font-mono">{money(totals.labor)}</td>
            </tr>
          )}
          {totals.contingency > 0 && (
            <tr>
              <td className="py-0.5">
                Contingency ({project.settings.contingencyPct}%)
              </td>
              <td className="tnum py-0.5 text-right font-mono">
                {money(totals.contingency)}
              </td>
            </tr>
          )}
          <tr>
            <td className="border-t-2 border-ink py-1.5 font-display text-[0.6875rem]">
              Quote total
            </td>
            <td className="tnum border-t-2 border-ink py-1.5 text-right font-mono text-base font-bold">
              {money(totals.grand)}
            </td>
          </tr>
        </tbody>
      </table>

      {totals.unpricedItems > 0 && (
        <p className="mt-2 text-right text-[0.625rem] text-mute">
          * {totals.unpricedItems} unpriced line{totals.unpricedItems > 1 ? "s" : ""} on
          the working sheet {totals.unpricedItems > 1 ? "are" : "is"} left off this
          printout; the total reflects priced lines only.
        </p>
      )}

      {project.info.notes && (
        <div className="mt-5 border border-ink p-3" style={{ pageBreakInside: "avoid" }}>
          <p className="microlabel mb-1">Notes</p>
          <p className="whitespace-pre-wrap text-xs leading-relaxed">
            {project.info.notes}
          </p>
        </div>
      )}

      {/* Link appendix */}
      {linkRows.length > 0 && (
        <div className="mt-5">
          <p className="microlabel mb-1 border-b-2 border-ink pb-1">
            Product links on file
          </p>
          <table className="w-full border-collapse text-[0.625rem]">
            <tbody>
              {linkRows.map((l, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="w-44 py-0.5 pr-2">{l.item}</td>
                  <td className="w-40 py-0.5 pr-2 text-mute">{l.label}</td>
                  <td className="tnum break-all py-0.5 font-mono">{l.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="microlabel mt-6 text-center">
        Generated with {appConfig.appName} · {today}
      </p>
    </div>
  );
}
