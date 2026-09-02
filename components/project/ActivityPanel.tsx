"use client";

import { useMemo, useState } from "react";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar } from "@/components/ui";
import { activityKind, loadProjectActivity } from "@/lib/data/activity";
import type { AuditLogRow } from "@/lib/data/database.types";
import { dayBucket, groupActivity } from "@/lib/data/progress";
import { useLiveRows } from "@/lib/data/use-live-rows";

const KINDS = ["all", "budget", "task", "project", "note", "file", "estimate", "team"] as const;
type Kind = (typeof KINDS)[number];

/**
 * The site log. Meaningful events only by default ("Johnny changed Electrical
 * budget from $26,000 to $28,500"); line-level estimate edits are a toggle.
 */
export function ActivityPanel({ projectId }: { projectId: string }) {
  const [detailed, setDetailed] = useState(false);
  const live = useLiveRows<AuditLogRow>(
    `activity:${projectId}:${detailed}`,
    () => loadProjectActivity(projectId, 400, detailed),
    [{ table: "audit_log", filter: `project_id=eq.${projectId}` }],
  );
  const [kind, setKind] = useState<Kind>("all");

  const feed = useMemo(() => {
    const rows = kind === "all" ? live.rows : live.rows.filter((r) => activityKind(r) === kind);
    return groupActivity(rows);
  }, [live.rows, kind]);

  const days = useMemo(() => {
    const out: { label: string; items: typeof feed }[] = [];
    for (const item of feed) {
      const label = dayBucket(item.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [feed]);

  return (
    <section className="panel bg-paper">
      <PanelBar
        title="Activity"
        right={
          <span className="flex flex-wrap items-center gap-1">
            {KINDS.map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${kind === k ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}>
                {k}
              </button>
            ))}
            <label className="ml-2 flex cursor-pointer items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-mute">
              <input type="checkbox" className="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} />
              detailed edits
            </label>
          </span>
        }
      />
      {live.error && <ErrorMark text={live.error} onRetry={() => void live.reload()} />}
      {live.loading && <LoadingMark text="Loading history…" />}
      {!live.loading && !live.error && feed.length === 0 && <EmptyMark text="No activity recorded yet" />}
      {days.map((day) => (
        <div key={day.label}>
          <p className="microlabel border-y bg-paper-2 px-4 py-1.5">{day.label}</p>
          <ul className="divide-y divide-line-soft">
            {day.items.map((item) => {
              const row = item.rows[0];
              const isMoney = item.count === 1 && row.action === "update" && ["budgeted", "committed", "actual", "unit_price", "contract_amount"].includes(row.field ?? "");
              return (
                <li key={item.id} className="grid gap-0.5 px-4 py-2 sm:grid-cols-[1fr_auto]">
                  <p className="text-sm leading-snug">
                    <span className="font-semibold">{item.actorName}</span> {item.summary}.
                    {row.kind === "minor" && <span className="microlabel ml-2">detail</span>}
                  </p>
                  <span className="microlabel tnum sm:text-right">
                    {new Date(item.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {row.source !== "ui" && ` · ${row.source}`}
                  </span>
                  {isMoney && (
                    <p className="microlabel tnum !normal-case sm:col-span-2">
                      {row.field}: {fmt(row.old_value)} → {fmt(row.new_value)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : String(v);
}
