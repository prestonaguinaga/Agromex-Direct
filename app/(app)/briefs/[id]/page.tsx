"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BriefView } from "@/components/brief/BriefView";
import { ErrorMark, LoadingMark, PanelBar, TopBar, formatWhen } from "@/components/ui";
import type { BriefDoc } from "@/lib/brief/types";
import { getBrief, listDeliveries } from "@/lib/data/briefs";
import { describeError } from "@/lib/data/client";
import type { DailyBriefDeliveryRow, DailyBriefRow } from "@/lib/data/database.types";
import { useSession } from "@/lib/data/session";

export default function BriefPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const canManage = session.can("settings.manage");
  const [brief, setBrief] = useState<DailyBriefRow | null | undefined>(undefined);
  const [deliveries, setDeliveries] = useState<DailyBriefDeliveryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await getBrief(id);
        if (cancelled) return;
        setBrief(b);
        if (b && canManage) setDeliveries(await listDeliveries(b.id));
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, canManage]);

  const doc = brief?.doc && typeof brief.doc === "object" && "sections" in (brief.doc as object) ? (brief.doc as unknown as BriefDoc) : null;

  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="briefs" sheet="Sheet 16 · Daily brief" />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">
        <p className="mb-4">
          <Link href="/briefs" className="microlabel hover:text-ink">
            ← All briefs
          </Link>
        </p>
        {error && <ErrorMark text={error} />}
        {brief === undefined && !error && (
          <div className="panel bg-paper">
            <LoadingMark text="Opening the brief…" />
          </div>
        )}
        {brief === null && (
          <div className="panel bg-paper p-8 text-center">
            <p className="font-display text-lg">Brief not found</p>
            <p className="mt-2 text-sm text-mute">It may not exist, or your role can&apos;t read briefs.</p>
          </div>
        )}
        {brief && !doc && (
          <div className="panel bg-paper p-6">
            <p className="text-sm">This brief is {brief.status}.{brief.error ? ` ${brief.error}` : ""}</p>
          </div>
        )}
        {doc && <BriefView doc={doc} />}
        {canManage && brief && (
          <section className="panel mt-4 bg-paper">
            <PanelBar title={`Email delivery · ${deliveries.length}`} />
            {deliveries.length === 0 ? (
              <p className="px-4 py-3 text-xs text-mute">No email deliveries for this brief (no recipients configured, or a manual run without an email address).</p>
            ) : (
              <ul className="divide-y divide-line-soft">
                {deliveries.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2 text-xs">
                    <span>{d.recipient_email}</span>
                    <span className="microlabel">
                      {d.status}
                      {d.sent_at ? ` · ${formatWhen(d.sent_at)}` : ""}
                      {d.error ? ` · ${d.error}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
