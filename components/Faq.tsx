"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { Container, Reveal, SectionHead } from "./ui";

const FAQS = [
  {
    q: "I don't have any good photos.",
    a: "Most first-time clients don't, and it's the single biggest thing holding a site back. We give you a shot list — eight to twelve specific photos, what to point the phone at, what time of day, what not to include. Phone photos taken properly beat stock images every time. If you'd rather not, we'll art-direct around what you have.",
  },
  {
    q: "I already have a Facebook page. Isn't that enough?",
    a: "It's a start, but you're renting. Facebook decides who sees your posts, what your page looks like, and whether your competitor's ad sits next to it. A site is the one place online you actually own — your domain, your phone number, your booking, no algorithm in between. Keep the Facebook page. Point it at the site.",
  },
  {
    q: "Do I own the site when it's done?",
    a: "Completely. The domain is registered in your name, the hosting account is yours, and you get a document with every login. There's no clause that keeps it hostage. If you want to move it somewhere else next year, you can, and we'll help you do it.",
  },
  {
    q: "What if I don't like the mockup?",
    a: "Then you say so and we part as friends. The first design is free specifically so nobody has to gamble money on whether we can do this. There's no deposit, no cancellation fee, and we don't chase you.",
  },
  {
    q: "I'm not technical at all. Can I actually update it?",
    a: "Yes — changing hours or prices is like editing a document, and we spend a screen-share session walking you through it before launch. If you'd rather never touch it, send us a text and we'll change it. That's included for the first three months.",
  },
  {
    q: "How fast will I show up on Google?",
    a: "We'll be straight with you: a brand-new site doesn't rank overnight, and anyone promising a top spot in a week is selling something. What we do is make sure you're indexed properly, your Google Business Profile is claimed and linked, and the technical foundation is right. In our experience most local businesses start seeing search traffic within the first couple of months — but the Business Profile usually produces calls much sooner than the site itself.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="relative py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead
              eyebrow="Straight answers"
              title="The questions everyone asks on the first call."
              lede="If yours isn't here, ask it — we'd rather answer than have you wonder."
            />
          </div>

          <Reveal delay={0.1}>
            <ul className="border-t border-edge">
              {FAQS.map((faq, i) => {
                const isOpen = open === i;
                return (
                  <li key={faq.q} className="border-b border-edge">
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : i)}
                        aria-expanded={isOpen}
                        className="group flex w-full items-start justify-between gap-6 py-6 text-left"
                      >
                        <span
                          className={clsx(
                            "font-display text-xl leading-snug transition-colors duration-300 sm:text-2xl",
                            isOpen ? "text-paper" : "text-paper/75 group-hover:text-paper"
                          )}
                        >
                          {faq.q}
                        </span>
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "relative mt-1.5 grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300",
                            isOpen
                              ? "rotate-45 border-neon text-neon"
                              : "border-edge text-muted group-hover:border-white/25"
                          )}
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path
                              d="M5.5 1v9M1 5.5h9"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-prose pb-7 pr-12 text-pretty text-sm leading-relaxed text-muted">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
