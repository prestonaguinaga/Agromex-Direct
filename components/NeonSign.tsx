"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * A shop-window neon sign that strikes on letter by letter, the way a real gas
 * tube does — stutter, not fade. The unlit glass stays visible underneath so
 * the plaque reads as a physical object before it lights.
 */
export function NeonSign({ word = "OPEN" }: { word?: string }) {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState<number>(reduced ? word.length : 0);

  useEffect(() => {
    if (reduced) {
      setLit(word.length);
      return;
    }
    // Letters strike in a deliberately uneven rhythm — a sign that has been
    // in the window a few years doesn't light evenly.
    const gaps = [260, 180, 420, 200, 300, 240, 380];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 500;

    for (let i = 0; i < word.length; i++) {
      elapsed += gaps[i % gaps.length];
      timers.push(setTimeout(() => setLit((n) => Math.max(n, i + 1)), elapsed));
    }
    return () => timers.forEach(clearTimeout);
  }, [word, reduced]);

  const allLit = lit >= word.length;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Glow spilling onto the wall behind the plaque */}
      <div
        aria-hidden="true"
        className={clsx(
          "bloom pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 transition-opacity duration-1000",
          allLit ? "opacity-70" : "opacity-0"
        )}
      />

      <div className="edge-lit relative rounded-2xl border border-white/10 bg-white/[0.02] px-9 py-5 backdrop-blur-sm sm:px-14 sm:py-7">
        {/* Mounting screws — the small detail that sells the object */}
        {(["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"] as const).map(
          (pos) => (
            <span
              key={pos}
              aria-hidden="true"
              className={clsx("absolute size-1 rounded-full bg-white/20", pos)}
            />
          )
        )}

        <div
          className="flex items-center gap-[0.12em] font-display text-5xl leading-none sm:text-7xl"
          aria-label={word}
        >
          {word.split("").map((char, i) => (
            <span
              key={`${char}-${i}`}
              aria-hidden="true"
              className={clsx(
                "inline-block transition-colors",
                i < lit ? "neon-on neon-strike" : "neon-off"
              )}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      <div
        className={clsx(
          "eyebrow mt-4 transition-all duration-700",
          allLit ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        )}
      >
        <span className="neon-amber">for business</span>
      </div>
    </div>
  );
}
