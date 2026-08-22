"use client";

import clsx from "clsx";
import { motion, useInView, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ────────────────────────────── Container ────────────────────────────── */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={clsx("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>
  );
}

/* ─────────────────────────────── Reveal ───────────────────────────────
   Scroll-triggered entrance. Staggers via `delay`. Honors reduced motion by
   rendering the final state immediately.
   ──────────────────────────────────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "span" | "li" | "section";
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={reduced ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/* ─────────────────────────────── Eyebrow ─────────────────────────────── */

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow flex items-center gap-3">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon shadow-[0_0_10px_var(--color-neon)]" />
      {children}
    </div>
  );
}

/* ──────────────────────────────── Button ────────────────────────────────
   Two intents. `solid` is the neon-lit primary; `ghost` is a hairline
   outline that fills on hover. Both work as <a>, <Link> or <button>.
   ──────────────────────────────────────────────────────────────────────── */

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  intent?: "solid" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  href,
  intent = "solid",
  className,
  onClick,
  type = "button",
  disabled,
}: ButtonProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50";

  const styles =
    intent === "solid"
      ? clsx(
          base,
          "bg-neon text-ink",
          "hover:brightness-110",
          "active:scale-[0.98]"
        )
      : clsx(
          base,
          "border border-edge bg-white/[0.02] text-paper backdrop-blur-sm",
          "hover:border-white/25 hover:bg-white/[0.06]",
          "active:scale-[0.98]"
        );

  const content = (
    <>
      {children}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      >
        <path
          d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );

  if (href) {
    const external = href.startsWith("http") || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} className={clsx(styles, className)}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={clsx(styles, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clsx(styles, className)}>
      {content}
    </button>
  );
}

/* ─────────────────────────────── CountUp ───────────────────────────────
   Animates an integer when it scrolls into view. Uses rAF rather than a
   timer so it stays in sync with the compositor.
   ──────────────────────────────────────────────────────────────────────── */

export function CountUp({
  to,
  duration = 1600,
  className,
}: {
  to: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced || to === 0) {
      setValue(to);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast out of the gate, settles gently.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(eased * to));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration, reduced]);

  return (
    <span ref={ref} className={clsx("tnum", className)}>
      {value}
    </span>
  );
}

/* ────────────────────────────── SectionHead ────────────────────────────── */

export function SectionHead({
  index,
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center"
      )}
    >
      <Reveal>
        <div
          className={clsx(
            "flex items-center gap-4",
            align === "center" && "justify-center"
          )}
        >
          {index && (
            <span className="font-mono text-[0.6875rem] tracking-[0.22em] text-neon">
              {index}
            </span>
          )}
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="display-lg text-balance max-w-3xl">{title}</h2>
      </Reveal>
      {lede && (
        <Reveal delay={0.16}>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  );
}
