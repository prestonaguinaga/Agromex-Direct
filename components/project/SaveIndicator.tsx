"use client";

import type { SaveState } from "@/lib/data/use-project";

export function SaveIndicator({
  saveState,
  lastSavedAt,
  error,
  onRetry,
}: {
  saveState: SaveState;
  lastSavedAt: number | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (saveState === "error") {
    return (
      <span className="border border-ink bg-paper-2 px-2 py-0.5 font-mono text-xs">
        ⚠ {error ?? "Not saved"}{" "}
        <button className="underline hover:text-ink" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  if (saveState === "saving") {
    return (
      <span className="microlabel">
        <span className="cursor-blink mr-1 inline-block h-2 w-1 bg-ink align-middle" />
        Saving…
      </span>
    );
  }
  if (saveState === "saved" && lastSavedAt) {
    return (
      <span className="microlabel tnum" title="Saved to the shared database">
        Saved ·{" "}
        {new Date(lastSavedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    );
  }
  return null;
}
