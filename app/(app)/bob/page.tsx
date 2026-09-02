"use client";

import { BobChat } from "@/components/BobChat";
import { TopBar } from "@/components/ui";
import { useSession } from "@/lib/data/session";

/** Sheet 15 · Bob, full page — the same assistant as the floating panel, wider. */
export default function BobPage() {
  const session = useSession();
  return (
    <div className="sheet-grid min-h-screen">
      <TopBar active="bob" sheet="Sheet 15 · Bob" />
      <main className="mx-auto max-w-4xl px-4 pb-24">
        <section className="rise-in border-x border-b bg-paper p-6 md:p-8">
          <p className="microlabel">Sheet 15 · Site assistant · {session.company?.name}</p>
          <h1 className="font-display mt-3 text-3xl md:text-4xl">🔨 Bob</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">
            Ask about any project — progress, phase, budget, what&apos;s due, what changed, who did what — or tell Bob what to do:
            add tasks and notes, update statuses, edit an estimate, open a page. Every answer is read from the company database
            as you ask; every change is recorded in Activity with your name; anything sensitive waits for your confirmation.
          </p>
        </section>
        <div className="mt-6">
          <BobChat mode="page" />
        </div>
      </main>
    </div>
  );
}
