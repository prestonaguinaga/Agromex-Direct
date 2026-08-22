import clsx from "clsx";
import { tiers } from "@/lib/pricing";
import { Button, Container, Reveal, SectionHead } from "./ui";

export function Pricing() {
  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <SectionHead
          eyebrow="Pricing"
          title="One price, agreed before we start."
          lede="No hourly billing, no scope surprises, no invoice that arrives bigger than the quote. If the project changes, we tell you what it costs before we touch it."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <Reveal
              key={tier.name}
              delay={i * 0.1}
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

              <h3 className="font-display text-2xl">{tier.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-muted">{tier.pitch}</p>

              <div className="mt-6 flex items-baseline gap-2 border-t border-edge pt-6">
                <span className="font-display text-5xl leading-none">{tier.price}</span>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
                  {tier.cadence}
                </span>
              </div>

              <ul className="mt-7 flex flex-1 flex-col gap-3">
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
                  href="/#contact"
                  intent={tier.featured ? "solid" : "ghost"}
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-edge bg-ink-2/40 p-6 sm:flex-row sm:items-center sm:p-7">
            <div>
              <p className="font-display text-xl">Care plan — $49/month. Optional, always.</p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                Updates, backups, uptime monitoring and small changes on request. Cancel any
                month. Cancelling doesn&apos;t take your site down — it&apos;s yours, on your
                domain, either way.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-edge px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              No lock-in
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
