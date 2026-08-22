"use client";

import clsx from "clsx";
import { useState } from "react";
import { motion } from "motion/react";
import { addOns, carePlan, tiers } from "@/lib/pricing";
import { Button, Container, Reveal, SectionHead } from "./ui";

type Mode = "upfront" | "monthly";

export function Pricing() {
  const [mode, setMode] = useState<Mode>("upfront");

  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <SectionHead
            index="08"
            eyebrow="Pricing"
            title="One price, agreed before we start."
            lede="No hourly billing, no scope surprises, no invoice that lands bigger than the quote. Pay it once, or spread it across the year — same site either way."
          />

          {/* Upfront / monthly switch */}
          <Reveal delay={0.1}>
            <div
              role="tablist"
              aria-label="Payment option"
              className="inline-flex shrink-0 rounded-full border border-edge bg-ink-2/60 p-1"
            >
              {(
                [
                  ["upfront", "Pay once"],
                  ["monthly", "Pay monthly"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => setMode(value)}
                  className={clsx(
                    "relative rounded-full px-5 py-2.5 text-sm transition-colors duration-300",
                    mode === value ? "text-ink" : "text-muted hover:text-paper"
                  )}
                >
                  {mode === value && (
                    <motion.span
                      layoutId="price-mode"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-neon"
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Tiers */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal
              key={tier.name}
              delay={i * 0.09}
              className={clsx(
                "edge-lit relative flex flex-col rounded-2xl border p-7 sm:p-8",
                tier.featured
                  ? "border-neon/30 bg-gradient-to-b from-neon/[0.07] to-transparent"
                  : "border-edge bg-ink-2/40"
              )}
            >
              {tier.featured && (
                <>
                  <div
                    aria-hidden="true"
                    className="bloom pointer-events-none absolute -top-10 left-1/2 h-24 w-2/3 -translate-x-1/2 opacity-40"
                  />
                  <span className="absolute -top-3 left-8 rounded-full bg-neon px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-ink">
                    Most picked
                  </span>
                </>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-2xl">{tier.name}</h3>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                  {tier.pages}
                </span>
              </div>

              <p className="mt-3 min-h-[3.5rem] text-sm leading-relaxed text-muted">
                {tier.pitch}
              </p>

              {/* Price */}
              <div className="mt-6 border-t border-edge pt-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-5xl leading-none tnum">
                    ${(mode === "upfront" ? tier.upfront : tier.monthly).toLocaleString()}
                  </span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                    {mode === "upfront" ? "once" : "/ month"}
                  </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted">
                  {mode === "upfront" ? (
                    <>
                      Then <span className="text-paper">${tier.careAfter}/mo</span> for hosting
                      and care — optional, cancel any month.
                    </>
                  ) : (
                    <>
                      For 12 months, hosting and care included. Drops to{" "}
                      <span className="text-paper">${tier.careAfter}/mo</span> after that.
                    </>
                  )}
                </p>
              </div>

              <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-ember">
                {tier.timeline}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm leading-snug text-paper/80">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-neon"
                    >
                      <path
                        d="M2.5 7.5l3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  href="/#brief"
                  intent={tier.featured ? "solid" : "ghost"}
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Honest note about the monthly option */}
        {mode === "monthly" && (
          <Reveal className="mt-5">
            <p className="rounded-2xl border border-edge bg-ink-2/40 px-6 py-4 text-sm leading-relaxed text-muted">
              <span className="text-paper">Worth knowing:</span> paying monthly works out
              a little more across the first year than paying once — roughly the cost of one
              extra month. That&apos;s the trade for not writing a cheque before the site has
              earned you anything. No credit check, no interest, and you can settle the
              balance early at any point.
            </p>
          </Reveal>
        )}

        {/* Add-ons */}
        <div className="mt-16">
          <Reveal>
            <div className="flex items-end justify-between gap-6">
              <h3 className="font-display text-3xl">Options, priced up front</h3>
              <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted sm:block">
                Add to any tier
              </span>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
            {addOns.map((item, i) => (
              <Reveal
                key={item.name}
                delay={(i % 4) * 0.05}
                className="group bg-ink px-6 py-6 transition-colors duration-500 hover:bg-ink-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="shrink-0 font-display text-lg text-neon">{item.price}</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{item.note}</p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Care plan */}
        <Reveal delay={0.1}>
          <div className="mt-6 grid gap-8 rounded-2xl border border-edge bg-ink-2/40 p-7 sm:p-9 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="eyebrow">After launch</p>
              <h3 className="mt-4 font-display text-3xl leading-tight">
                The care plan — ${carePlan.price} a month, and genuinely optional.
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
                Cancel any month you like. Cancelling doesn&apos;t take your site down and
                doesn&apos;t hold your domain hostage — it&apos;s registered in your name
                either way. We&apos;d rather you stay because it&apos;s worth it.
              </p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {carePlan.includes.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-snug text-paper/75">
                  <span
                    className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-ember"
                    aria-hidden="true"
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
