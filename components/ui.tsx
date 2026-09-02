"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appConfig } from "@/app.config";
import { supabase } from "@/lib/data/client";
import { ROLE_LABELS, useSessionOptional } from "@/lib/data/session";

/** The crown from the Monarch mark — the one place the brand gold appears. */
export function Crown({ className = "h-3.5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={`${className} shrink-0 self-center text-gold`} fill="currentColor" aria-hidden>
      <path d="M2 12 0 2l6.5 4L12 0l5.5 6L24 2l-2 10Zm0 2h20v2H2z" />
    </svg>
  );
}

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`font-display inline-flex items-baseline gap-1.5 ${small ? "text-sm" : "text-lg"}`}
    >
      <Crown className={small ? "h-3 w-4" : "h-4 w-6"} />
      {appConfig.company.wordmark}
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

function UserChip() {
  const session = useSessionOptional();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!session) return null;
  const signOut = async () => {
    try {
      await supabase().auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };
  return (
    <span className="relative ml-2 border-l pl-3">
      <button
        className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-mute hover:text-ink"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={session.displayName}
      >
        <span className="grid h-6 w-6 place-items-center border border-ink text-[0.625rem] text-ink">
          {session.initials}
        </span>
        <span className="hidden md:inline">{session.role ? ROLE_LABELS[session.role] : "—"}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div
          className="panel absolute right-0 top-9 z-50 w-56 bg-paper shadow-[6px_6px_0_0_rgba(242,242,238,0.14)]"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm">{session.displayName}</p>
            <p className="microlabel truncate !normal-case !tracking-normal">{session.email}</p>
            {session.company && (
              <p className="microlabel mt-1 truncate">{session.company.name}</p>
            )}
          </div>
          <Link href="/team" className="block px-3 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper" onClick={() => setOpen(false)}>
            Team &amp; profile
          </Link>
          <button className="block w-full px-3 py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-mute hover:bg-ink hover:text-paper" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </span>
  );
}

export type TopBarTab = "projects" | "team" | "guide" | "none";

export function TopBar({ active, sheet }: { active: TopBarTab; sheet?: string }) {
  const session = useSessionOptional();
  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={`px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors ${
        isActive
          ? "bg-ink text-paper"
          : "text-mute hover:bg-ink/10 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <header className="bar no-print sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/projects" className="flex items-center gap-3">
          <Wordmark small />
          <span className="microlabel hidden md:inline">{sheet ?? appConfig.appName}</span>
        </Link>
        <nav className="flex items-center gap-1">
          {tab("/projects", "Projects", active === "projects")}
          {session?.can("team.view") && tab("/team", "Team", active === "team")}
          {tab("/guide", "Cost guide", active === "guide")}
          <span className="ml-3 hidden border-l pl-3 sm:block">
            <Clock />
          </span>
          <UserChip />
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
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`panel rise-in w-full bg-paper shadow-[8px_8px_0_0_rgba(242,242,238,0.14)] ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="bar flex items-center justify-between border-b px-4 py-2.5">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">
            {title}
          </span>
          <button
            onClick={onClose}
            className="font-mono text-sm leading-none text-mute hover:text-ink"
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

/** Shared states for every database-backed list. */
export function LoadingMark({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="grid place-items-center py-12 text-center">
      <p className="microlabel">
        <span className="cursor-blink mr-1.5 inline-block h-2.5 w-1.5 bg-ink align-middle" />
        {text}
      </p>
    </div>
  );
}

export function ErrorMark({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="m-3 border border-ink bg-paper-2 px-4 py-3 font-mono text-xs">
      ⚠ {text}
      {onRetry && (
        <button className="ml-3 underline hover:text-ink" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Section header strip used inside every panel. */
export function PanelBar({ title, right }: { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bar flex items-center justify-between gap-3 border-b px-4 py-2.5">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em]">{title}</span>
      {right}
    </div>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}
