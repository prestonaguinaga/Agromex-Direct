"use client";

import Link from "next/link";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar, TopBar, formatWhen } from "@/components/ui";
import { listBriefs } from "@/lib/data/briefs";
import type { DailyBriefRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";
import { useLiveRows } from "@/lib/data/use-live-rows";

/** Sheet 16 · every brief Bob has written, newest first. */
export default function BriefsPage() {
  const session = useSession();
  const companyId = session.company?.id ?? "";
  const live = useLiveRows<DailyBriefRow>(`briefs:${companyId}`, () => listBriefs(companyId), [{ table: "daily_briefs", filter: `company_id=eq.${companyId}` }], Boolean(companyId));
  const canManage = session.can("settings.manage");

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="briefs" sheet="Sheet 16 · Daily brief" />
      <main className="mx-auto max-w-4xl px-4 pb-24">
        <section className="rise-in border-x border-b bg-paper p-6 md:p-10">
          <p className="microlabel">Sheet 16 · Bob&apos;s Daily Brief · {session.company?.name}</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">Daily briefs</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            Every morning Bob reads the company database and writes the owner&apos;s brief: what needs attention, where each active
            project stands, the schedule, money, progress, photos and the inboxes. Each one is kept here and can be emailed.
          </p>
          {canManage && (
            <div className="mt-6">
              <Link href="/settings" className="btn">
                Brief settings
              </Link>
            </div>
          )}
        </section>

        <section className="panel mt-6 bg-paper">
          <PanelBar title={`Briefs · ${live.rows.length}`} />
          {live.error && <ErrorMark text={live.error} onRetry={() => void live.reload()} />}
          {live.loading && <LoadingMark text="Loading briefs…" />}
          {!live.loading && !live.error && live.rows.length === 0 && <EmptyMark text="No briefs yet" />}
          <ul className="divide-y divide-line-soft">
            {live.rows.map((b) => (
              <li key={b.id}>
                <Link href={`/briefs/${b.id}`} className="grid gap-1 px-4 py-3 hover:bg-paper-2 sm:grid-cols-[140px_1fr_auto]">
                  <span className="tnum font-mono text-sm">{b.brief_date}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{b.summary || (b.status === "failed" ? `Failed: ${b.error ?? "unknown error"}` : b.status)}</span>
                    <span className="microlabel">
                      {b.kind === "manual" ? "manual run · " : ""}
                      {b.status === "ready" ? `generated ${formatWhen(b.generated_at)}` : b.status}
                    </span>
                  </span>
                  <span className="microlabel tnum sm:text-right">{b.attention_count} to look at</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
