"use client";

import { motion, useReducedMotion } from "motion/react";
import { site } from "@/site.config";
import { NeonSign } from "./NeonSign";
import { Button, Container } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

const PROOF = [
  "No templates",
  "No monthly lock-in",
  `From ${site.startingPrice}`,
  "Live in 7 days",
];

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden pt-[calc(var(--nav-h)+3.5rem)] pb-16 sm:pt-[calc(var(--nav-h)+5.5rem)] sm:pb-20">
      <div aria-hidden="true" className="grid-lines absolute inset-0 -z-20" />
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
            <em className="italic text-neon [text-shadow:0_0_40px_color-mix(in_oklab,var(--color-neon)_55%,transparent)]">
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
            We build the website, and we do the parts you&apos;d dread — the domain, the
            hosting, the Google listing, the photos, the words. You answer some questions.
            We hand you the keys.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
          >
            <Button href="/#brief">Build your brief — 2 minutes</Button>
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
            {PROOF.map((item) => (
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
