"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Container, Reveal, SectionHead } from "./ui";

/**
 * The core sales argument, made draggable: what a customer finds today versus
 * what they'd find with a site. Both panels are real DOM, not screenshots, so
 * the comparison stays sharp at any size and doubles as a capability demo.
 */
export function BeforeAfter() {
  const [pos, setPos] = useState(42);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(97, Math.max(3, next)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === "ArrowLeft") setPos((p) => Math.max(3, p - step));
    if (e.key === "ArrowRight") setPos((p) => Math.min(97, p + step));
    if (e.key === "Home") setPos(3);
    if (e.key === "End") setPos(97);
  };

  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <SectionHead
          index="01"
          eyebrow="The difference"
          title={
            <>
              Right now, a customer searching for you finds{" "}
              <em className="italic text-muted">this.</em>
            </>
          }
          lede="Drag the handle. Left is a business with no site — a half-filled directory listing someone else wrote. Right is the same business, twenty minutes after launch."
        />

        <Reveal delay={0.2} className="mt-12">
          <div
            ref={frameRef}
            className="edge-lit relative aspect-[4/5] w-full select-none overflow-hidden rounded-3xl border border-edge sm:aspect-[16/9]"
          >
            {/* AFTER — full width underneath */}
            <AfterPanel />

            {/* BEFORE — clipped to the handle position */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            >
              <BeforePanel />
            </div>

            {/* Handle */}
            <div
              className="absolute inset-y-0 z-20 w-px bg-neon shadow-[0_0_20px_var(--color-neon)]"
              style={{ left: `${pos}%` }}
            >
              <button
                type="button"
                role="slider"
                aria-label="Compare before and after"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pos)}
                aria-valuetext={`${Math.round(pos)}% showing the before state`}
                tabIndex={0}
                onKeyDown={onKeyDown}
                onPointerDown={(e) => {
                  dragging.current = true;
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                }}
                className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-white/20 bg-ink/80 backdrop-blur-md transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 1L1.5 6 6 11M12 1l4.5 5-4.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Corner labels */}
            <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-black/10 bg-white/80 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neutral-600 backdrop-blur">
              Today
            </span>
            <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-edge bg-ink/70 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-neon backdrop-blur">
              With a site
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ─────────────────────────── BEFORE ───────────────────────────
   A stale directory listing: someone else's photo, unconfirmed hours, and a
   "Website" button that goes nowhere.
   ─────────────────────────────────────────────────────────────── */
function BeforePanel() {
  return (
    <div className="absolute inset-0 bg-[#f1f1ef] p-5 sm:p-8">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {/* Fake search bar */}
        <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2.5 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.25" stroke="#9aa0a6" strokeWidth="1.5" />
            <path d="M9.5 9.5L12.5 12.5" stroke="#9aa0a6" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="truncate text-xs text-neutral-500">
            harvest table restaurant near me
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-neutral-200">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3 14l4-4 3 3 3-4 4 5M3 4h14v12H3z"
                  stroke="#b0b0b0"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-800">Harvest Table</p>
              <p className="mt-0.5 text-[0.7rem] text-neutral-500">
                Restaurant · $$ · 2 reviews
              </p>
              <div className="mt-1 flex gap-0.5" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="text-[0.65rem] text-amber-500">
                    ★
                  </span>
                ))}
                {[0, 1].map((i) => (
                  <span key={i} className="text-[0.65rem] text-neutral-300">
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-neutral-100 pt-3 text-[0.7rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-400">Hours</dt>
              <dd className="text-neutral-400 italic">Not confirmed by owner</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-400">Menu</dt>
              <dd className="text-neutral-400 italic">No menu available</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-400">Website</dt>
              <dd className="font-medium text-neutral-400">—</dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2">
            <span className="flex-1 rounded-full bg-neutral-100 py-2 text-center text-[0.65rem] font-medium text-neutral-400">
              Website
            </span>
            <span className="flex-1 rounded-full bg-neutral-100 py-2 text-center text-[0.65rem] font-medium text-neutral-500">
              Directions
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[0.68rem] leading-relaxed text-neutral-400">
          Photo uploaded by a stranger in 2019. Hours nobody has updated.
          <br />
          The next three results all have websites.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── AFTER ───────────────────────────
   The same business, on its own terms.
   ────────────────────────────────────────────────────────────── */
function AfterPanel() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#120f0d]">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 size-[420px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, #e8873c 42%, transparent), transparent 66%)",
        }}
      />
      <div className="relative flex h-full flex-col p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg text-[#f6ece0]">Harvest Table</span>
          <nav className="hidden gap-5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[#f6ece0]/50 sm:flex">
            <span>Menu</span>
            <span>Hours</span>
            <span>Book</span>
          </nav>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#e8873c]">
            Open until 10pm · Tonight
          </p>
          <h3 className="mt-3 font-display text-3xl leading-[1.05] text-[#f6ece0] sm:text-5xl">
            Wood fire.
            <br />
            Long tables.
          </h3>
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-[#f6ece0]/60 sm:text-sm">
            Seasonal plates from growers within sixty miles. Walk-ins welcome at the bar.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#e8873c] px-4 py-2 text-[0.7rem] font-medium text-[#120f0d]">
              Reserve a table
            </span>
            <span className="rounded-full border border-[#f6ece0]/20 px-4 py-2 text-[0.7rem] text-[#f6ece0]">
              See the menu
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[#f6ece0]/10 pt-4 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[#f6ece0]/40">
          <span>Own the booking</span>
          <span>Own the photos</span>
          <span>Own the phone number</span>
        </div>
      </div>
    </div>
  );
}
