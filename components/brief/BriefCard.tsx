"use client";

import Link from "next/link";
import { LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import type { BriefDoc } from "@/lib/brief/types";
import { latestBrief } from "@/lib/data/briefs";
import type { DailyBriefRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";
import { useLiveRows } from "@/lib/data/use-live-rows";

/** The dashboard card: the latest brief at a glance, with the way in. */
export function BriefCard() {
  const session = useSession();
  const companyId = session.company?.id ?? "";
  const canSee = session.can("briefs.view");
  const canManage = session.can("settings.manage");
  const live = useLiveRows<DailyBriefRow>(`brief-card:${companyId}`, async () => [await latestBrief(companyId)].filter((b): b is DailyBriefRow => Boolean(b)), [{ table: "daily_briefs", filter: `company_id=eq.${companyId}` }], Boolean(companyId) && canSee);
  if (!canSee) return null;
  const brief = live.rows[0] ?? null;
  const doc = brief?.doc && typeof brief.doc === "object" && "sections" in (brief.doc as object) ? (brief.doc as unknown as BriefDoc) : null;
  const attention = doc?.sections.find((s) => s.key === "attention")?.items.slice(0, 3) ?? [];

  return (
    <section className="panel rise-in bg-paper">
      <PanelBar
        title="🔨 Bob's Daily Brief"
        right={
          <span className="flex items-center gap-3">
            <Link href="/briefs" className="microlabel hover:text-ink">
              All briefs →
            </Link>
            {canManage && (
              <Link href="/settings" className="microlabel hover:text-ink">
                Settings
              </Link>
            )}
          </span>
        }
      />
      {live.loading && <LoadingMark text="Loading the latest brief…" />}
      {!live.loading && !brief && (
        <div className="p-4 text-sm leading-relaxed text-mute">
          {canManage ? (
            <>
              No brief yet. Turn on the daily brief in <Link href="/settings" className="underline hover:text-ink">Settings</Link> — pick a delivery time, timezone and recipients — and Bob will summarise every active project each morning, here and by email.
            </>
          ) : (
            <>No brief has been generated yet. The owner turns it on in Settings.</>
          )}
        </div>
      )}
      {brief && doc && (
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="microlabel tnum">
              {doc.dateLabel} · {brief.kind === "manual" ? "manual run" : "scheduled"} · generated {formatWhen(brief.generated_at)}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{doc.summary}</p>
            {attention.length > 0 && (
              <ul className="mt-2 grid gap-1">
                {attention.map((a, i) => (
                  <li key={i} className={`border-l-2 ${a.severity === "high" ? "border-ink" : "border-gold"} px-2 text-xs leading-snug`}>
                    {a.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <span className="tnum font-mono text-3xl">{brief.attention_count}</span>
            <span className="microlabel">to look at</span>
            <Link href={`/briefs/${brief.id}`} className="btn btn-solid btn-xs">
              Read the brief →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
