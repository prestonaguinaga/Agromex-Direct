"use client";

import Link from "next/link";
import type { BriefDoc, BriefItem } from "@/lib/brief/types";
import { PanelBar } from "@/components/ui";

/** Renders a stored brief document in the app's own visual language. */

function local(href: string | undefined, siteUrl: string): string | undefined {
  if (!href) return undefined;
  if (href.startsWith(siteUrl)) return href.slice(siteUrl.length) || "/";
  return href;
}

function Item({ item, siteUrl }: { item: BriefItem; siteUrl: string }) {
  const tone = item.severity === "high" ? "border-ink" : item.severity === "medium" ? "border-gold" : "border-line";
  const href = local(item.href, siteUrl);
  return (
    <li className={`border-l-2 ${tone} px-3 py-1.5`}>
      {href ? (
        <Link href={href} className="text-sm font-semibold hover:underline">
          {item.text}
        </Link>
      ) : (
        <span className="text-sm font-semibold">{item.text}</span>
      )}
      {item.detail && <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-mute">{item.detail}</p>}
      {item.images?.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.images.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" className="h-16 w-16 border object-cover" loading="lazy" />
          ))}
        </div>
      ) : null}
    </li>
  );
}

export function BriefView({ doc }: { doc: BriefDoc }) {
  return (
    <div className="grid gap-4">
      <section className="panel bg-paper">
        <PanelBar title={`${doc.title} · ${doc.dateLabel}`} right={<span className="microlabel">{doc.windowLabel}</span>} />
        <div className="p-4">
          <p className="text-sm leading-relaxed">{doc.summary}</p>
          {doc.narrative && (
            <p className="mt-3 border-l-2 border-gold bg-paper-2 px-3 py-2 text-sm leading-relaxed">
              <span className="microlabel mr-2">Bob&apos;s take</span>
              {doc.narrative}
            </p>
          )}
          {!doc.includesMoney && <p className="microlabel mt-3 !normal-case !tracking-normal">Money figures are left out of this copy.</p>}
        </div>
      </section>
      {doc.sections.map((s) => (
        <section key={s.key} className="panel bg-paper">
          <PanelBar title={s.heading} />
          {s.intro && <p className="px-4 pt-3 text-xs text-mute">{s.intro}</p>}
          {s.groups?.length ? (
            <div className="grid gap-3 p-3">
              {s.groups.map((g) => (
                <div key={g.label}>
                  <p className="microlabel px-1 pb-1">{g.label}</p>
                  {g.items.length === 0 ? (
                    <p className="px-3 text-xs text-mute">{g.empty ?? "—"}</p>
                  ) : (
                    <ul className="grid gap-1">
                      {g.items.map((it, i) => (
                        <Item key={i} item={it} siteUrl={doc.siteUrl} />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : s.items.length === 0 ? (
            <p className="px-4 py-3 text-xs text-mute">{s.empty ?? "—"}</p>
          ) : (
            <ul className="grid gap-1 p-3">
              {s.items.map((it, i) => (
                <Item key={i} item={it} siteUrl={doc.siteUrl} />
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="microlabel !normal-case !tracking-normal">
        Generated {new Date(doc.generatedAt).toLocaleString("en-US")} from the company database. Every line is backed by a record; nothing is inferred.
      </p>
    </div>
  );
}
