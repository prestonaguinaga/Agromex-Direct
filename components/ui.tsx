"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`font-display inline-flex items-baseline gap-1 ${small ? "text-sm" : "text-lg"}`}
    >
      AGROMEX
      <span
        className={`cursor-blink inline-block bg-current ${small ? "h-3 w-1.5" : "h-3.5 w-2"}`}
        aria-hidden
      />
    </span>
  );
}

/** Live HH:MM readout — gives the header its instrument-panel feel. */
function Clock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="microlabel tnum hidden sm:inline" suppressHydrationWarning>
      {now && `T·${now}`}
    </span>
  );
}

export function TopBar({ active }: { active: "projects" | "guide" | "none" }) {
  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={`px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
        isActive
          ? "bg-paper text-ink"
          : "text-paper/60 hover:bg-paper/10 hover:text-paper"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink bg-ink text-paper">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3">
          <Wordmark small />
          <span className="microlabel !text-paper/50 hidden md:inline">
            Construction quote sheet
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {tab("/", "Projects", active === "projects")}
          {tab("/guide/", "Cost guide", active === "guide")}
          <span className="ml-3 hidden border-l border-paper/20 pl-3 sm:block">
            <Clock />
          </span>
        </nav>
      </div>
    </header>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`panel rise-in w-full bg-paper shadow-[8px_8px_0_0_rgba(16,16,16,0.9)] ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b bg-ink px-4 py-2.5 text-paper">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            {title}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-sm leading-none text-paper/70 hover:text-paper"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="microlabel mb-1 block">{children}</span>;
}

export function EmptyMark({ text }: { text: string }) {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="microlabel">{text}</div>
    </div>
  );
}
