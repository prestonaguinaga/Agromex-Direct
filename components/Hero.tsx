"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { site } from "@/site.config";
import { NeonSign } from "./NeonSign";
import { Button, Container } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // A soft light that follows the cursor across the hero — as if the sign is
  // catching the viewer. Written straight to a transform to stay off the
  // React render path; skipped entirely on touch and reduced-motion.
  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const el = spotlightRef.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.parentElement!.getBoundingClientRect();
        el.style.transform = `translate3d(${e.clientX - rect.left - 300}px, ${
          e.clientY - rect.top - 300
        }px, 0)`;
        el.style.opacity = "1";
      });
    };

    const onLeave = () => {
      el.style.opacity = "0";
    };

    const parent = el.parentElement!;
    parent.addEventListener("pointermove", onMove);
    parent.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <section className="relative isolate overflow-hidden pt-[calc(var(--nav-h)+3.5rem)] pb-24 sm:pt-[calc(var(--nav-h)+6rem)] sm:pb-32">
      {/* Atmosphere */}
      <div aria-hidden="true" className="grid-lines absolute inset-0 -z-20" />
      <div
        aria-hidden="true"
        ref={spotlightRef}
        className="pointer-events-none absolute left-0 top-0 -z-10 size-[600px] rounded-full opacity-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-neon) 10%, transparent) 0%, transparent 62%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-20 h-64 bg-gradient-to-t from-ink to-transparent"
      />

      <Container>
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <NeonSign word="OPEN" />
          </motion.div>

          <motion.h1
            className="display-xl text-balance mt-12 max-w-4xl"
            initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.35, ease: EASE }}
          >
            You&apos;re open.
            <br />
            The internet{" "}
            <em className="italic text-neon [text-shadow:0_0_40px_color-mix(in_oklab,var(--color-neon)_60%,transparent)]">
              doesn&apos;t know
            </em>{" "}
            yet.
          </motion.h1>

          <motion.p
            className="text-pretty mt-8 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          >
            We design and build fast, modern websites for small businesses that have
            never had one. You&apos;ll see a full mockup of your actual site before
            you pay a cent.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
          >
            <Button href="/#contact">Get a free mockup</Button>
            <Button href="/#work" intent="ghost">
              Walk through a live demo
            </Button>
          </motion.div>

          <motion.ul
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            {[
              "No templates",
              "No monthly lock-in",
              `From ${site.startingPrice}`,
              "Live in 2 weeks",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-ember/70" aria-hidden="true" />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>
      </Container>
    </section>
  );
}
