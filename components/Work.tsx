import Link from "next/link";
import { demos } from "@/lib/demos";
import { Container, Reveal, SectionHead } from "./ui";

/**
 * Rather than fake client logos, each card opens a complete, working demo
 * site. Visitors can press the buttons — that's the pitch.
 */
export function Work() {
  return (
    <section id="work" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <SectionHead
          eyebrow="Live demos"
          title="Three sites you can actually click through."
          lede="These aren't screenshots or concepts on a slide. They're complete, working builds — press the buttons, filter the menu, get a quote. Each one was built to demonstrate a different kind of business."
        />

        <div className="mt-14 flex flex-col gap-4">
          {demos.map((demo, i) => (
            <Reveal key={demo.slug} delay={i * 0.08}>
              <Link
                href={`/demos/${demo.slug}`}
                className="edge-lit group relative grid overflow-hidden rounded-3xl border border-edge bg-ink-2/40 transition-colors duration-500 hover:bg-ink-3/60 md:grid-cols-[1.15fr_1fr]"
              >
                {/* Copy */}
                <div className="flex flex-col justify-between gap-10 p-7 sm:p-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted">
                      <span className="text-neon">{String(i + 1).padStart(2, "0")}</span>
                      <span>{demo.trade}</span>
                      <span aria-hidden="true">·</span>
                      <span>Built in {demo.buildTime}</span>
                    </div>

                    <h3 className="mt-5 font-display text-4xl leading-none sm:text-5xl">
                      {demo.name}
                    </h3>

                    <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-muted sm:text-base">
                      {demo.premise}
                    </p>
                  </div>

                  <div>
                    <ul className="flex flex-wrap gap-2">
                      {demo.features.map((f) => (
                        <li
                          key={f}
                          className="rounded-full border border-edge px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>

                    <span className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-paper">
                      <span className="border-b border-neon/40 pb-0.5 transition-colors duration-300 group-hover:border-neon">
                        {demo.highlight}
                      </span>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                        className="text-neon transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path
                          d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Swatch preview — a browser chrome in the demo's own palette. */}
                <div
                  className="relative min-h-[220px] overflow-hidden border-t border-edge p-7 md:border-l md:border-t-0"
                  style={{ backgroundColor: demo.swatch.bg }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-16 -top-16 size-64 rounded-full opacity-40 blur-3xl transition-opacity duration-700 group-hover:opacity-70"
                    style={{ background: demo.swatch.accent }}
                  />
                  <div className="relative flex items-center gap-1.5">
                    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                      <span
                        key={c}
                        className="size-2 rounded-full opacity-70"
                        style={{ background: c }}
                        aria-hidden="true"
                      />
                    ))}
                    <span
                      className="ml-3 truncate rounded-full px-3 py-0.5 font-mono text-[0.58rem] lowercase"
                      style={{
                        color: demo.swatch.ink,
                        background: `${demo.swatch.ink}14`,
                      }}
                    >
                      {demo.slug}.com
                    </span>
                  </div>

                  <div className="relative mt-8 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1">
                    <p
                      className="font-mono text-[0.58rem] uppercase tracking-[0.2em]"
                      style={{ color: demo.swatch.accent }}
                    >
                      {demo.trade}
                    </p>
                    <p
                      className="mt-2 font-display text-3xl leading-none"
                      style={{ color: demo.swatch.ink }}
                    >
                      {demo.name}
                    </p>
                    <div className="mt-5 flex flex-col gap-2">
                      {[92, 68, 78].map((w, j) => (
                        <span
                          key={j}
                          className="block h-1.5 rounded-full"
                          style={{ width: `${w}%`, background: `${demo.swatch.ink}1f` }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span
                      className="mt-6 inline-block rounded-full px-4 py-1.5 text-[0.68rem] font-medium"
                      style={{ background: demo.swatch.accent, color: demo.swatch.bg }}
                    >
                      Open demo
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-8">
          <p className="text-center text-xs leading-relaxed text-muted">
            These are demonstration builds by this studio, not client work — the
            businesses are invented. Everything you can press is real.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
