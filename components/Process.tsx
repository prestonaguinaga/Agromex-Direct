"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { Container, Reveal, SectionHead } from "./ui";

const STEPS = [
  {
    n: "01",
    title: "A twenty-minute call",
    body: "What you do, who walks in the door, and the one thing you wish the site would do for you. No deck, no discovery invoice. Just the call.",
    aside: "Day 0",
  },
  {
    n: "02",
    title: "A free mockup of your actual homepage",
    body: "Within 72 hours you get a real design — your name, your words, your photos — not a template with a placeholder logo. If you don't like it, you walk away and it costs you nothing.",
    aside: "Day 3",
  },
  {
    n: "03",
    title: "We build the whole thing",
    body: "Copy, photography direction, menus, booking, quote forms, the lot. You get a private preview link from day one and three rounds of revisions to push it where you want it.",
    aside: "Day 4–12",
  },
  {
    n: "04",
    title: "Launch, then hand you the keys",
    body: "Domain, hosting, SSL, business email, Google Business Profile. Then a screen-share where we show you how to change your own hours — and a document with every login, in your name.",
    aside: "Day 14",
  },
];

export function Process() {
  const trackRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 65%", "end 75%"],
  });

  // Spring the progress so the line eases rather than tracking the wheel 1:1.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });
  const height = useTransform(progress, (v) => `${v * 100}%`);

  return (
    <section id="process" className="relative scroll-mt-24 py-20 sm:py-28">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead
              index="06"
              eyebrow="How it works"
              title="Fourteen days, and you never guess what happens next."
              lede="The whole process, start to finish. You see the design before any money changes hands."
            />
          </div>

          <ol ref={trackRef} className="relative pl-10 sm:pl-14">
          {/* Rail */}
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-[9px] top-3 w-px bg-white/10 sm:left-[9px]"
          >
            <motion.div
              style={{ height }}
              className="w-px origin-top bg-gradient-to-b from-neon via-neon to-ember shadow-[0_0_12px_var(--color-neon)]"
            />
          </div>

          {STEPS.map((step, i) => (
            <li key={step.n} className="relative pb-14 last:pb-0">
              <Reveal delay={0.05}>
                {/* Node */}
                <span
                  aria-hidden="true"
                  className="absolute -left-10 top-2 grid size-[19px] place-items-center rounded-full border border-white/15 bg-ink sm:-left-14"
                >
                  <span className="size-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--color-neon)]" />
                </span>

                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-xs tracking-[0.2em] text-neon">{step.n}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">
                    {step.aside}
                  </span>
                </div>

                <h3 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-balance sm:text-4xl">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
                  {step.body}
                </p>
              </Reveal>
            </li>
          ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
