"use client";

import { useMemo, useState } from "react";
import { EmptyMark, ErrorMark, LoadingMark, PanelBar, formatWhen } from "@/components/ui";
import { activityKind, loadProjectActivity } from "@/lib/data/activity";
import type { AuditLogRow } from "@/lib/data/database.types";
import { useLiveRows } from "@/lib/data/use-live-rows";

const KINDS = ["all", "budget", "estimate", "task", "note", "file", "team", "project"] as const;
type Kind = (typeof KINDS)[number];

export function ActivityPanel({ projectId }: { projectId: string }) {
  const live = useLiveRows<AuditLogRow>(
    `activity:${projectId}`,
    () => loadProjectActivity(projectId, 300),
    [{ table: "audit_log", filter: `project_id=eq.${projectId}` }],
  );
  const [kind, setKind] = useState<Kind>("all");
  const rows = useMemo(
    () => (kind === "all" ? live.rows : live.rows.filter((r) => activityKind(r) === kind)),
    [live.rows, kind],
  );

  return (
    <section className="panel bg-paper">
      <PanelBar
        title="Activity"
        right={
          <span className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] ${
                  kind === k ? "bg-ink text-paper" : "text-mute hover:text-ink"
                }`}
              >
                {k}
              </button>
            ))}
          </span>
        }
      />
      {live.error && <ErrorMark text={live.error} onRetry={() => void live.reload()} />}
      {live.loading && <LoadingMark text="Loading history…" />}
      {!live.loading && !live.error && rows.length === 0 && <EmptyMark text="No activity recorded yet" />}
      <ul className="divide-y divide-line-soft">
        {rows.map((a) => (
          <li key={a.id} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-sm leading-snug">{a.summary}</p>
              {a.action === "update" && a.field && isMoney(a) && (
                <p className="microlabel tnum mt-0.5 !normal-case">
                  {a.field}: {fmt(a.old_value)} → {fmt(a.new_value)}
                </p>
              )}
            </div>
            <span className="microlabel tnum sm:text-right">
              {a.actor_name ?? "system"} · {formatWhen(a.created_at)}
              {a.source !== "ui" && ` · ${a.source}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function isMoney(a: AuditLogRow) {
  return ["budgeted", "committed", "actual", "unit_price"].includes(a.field ?? "");
}
function fmt(v: unknown) {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(v);
}
