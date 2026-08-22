"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useBrief } from "./BriefContext";
import { Container, Reveal, SectionHead } from "./ui";

/* ─────────────────────────────── Options ─────────────────────────────── */

const TRADES = [
  "Restaurant, café or bar",
  "Trades & contracting",
  "Salon, spa or barber",
  "Health & wellness",
  "Retail shop",
  "Professional services",
  "Events & hospitality",
  "Something else",
];

const GOALS = [
  { id: "calls", label: "Make the phone ring", note: "Click-to-call, hours, directions" },
  { id: "bookings", label: "Take bookings", note: "Appointments straight into your calendar" },
  { id: "menu", label: "Show a menu or price list", note: "Updated by you, in seconds" },
  { id: "sell", label: "Sell online", note: "Products, deposits or gift cards" },
  { id: "quotes", label: "Give instant quotes", note: "A number before they call you" },
  { id: "work", label: "Show off past work", note: "Galleries, before-and-afters" },
  { id: "found", label: "Get found on Google", note: "Local search and maps" },
  { id: "trust", label: "Look legitimate", note: "So people stop hesitating" },
];

/**
 * Design directions, drawn rather than described. A business owner can point at
 * a picture far more reliably than they can name a style — and what they point
 * at is the most useful thing in the whole brief.
 */
const DIRECTIONS = [
  {
    id: "warm",
    name: "Warm & rustic",
    desc: "Wood, fire, handwriting. Feels local and lived-in.",
    bg: "#1a1310", ink: "#f3e7d8", accent: "#d2803f", serif: true, caps: false,
  },
  {
    id: "minimal",
    name: "Clean & minimal",
    desc: "White space, one strong photo, nothing shouting.",
    bg: "#ffffff", ink: "#14161a", accent: "#14161a", serif: false, caps: false,
  },
  {
    id: "industrial",
    name: "Bold & industrial",
    desc: "Heavy type, high contrast. Reads as capable and no-nonsense.",
    bg: "#101215", ink: "#eef1f4", accent: "#f5c518", serif: false, caps: true,
  },
  {
    id: "elegant",
    name: "Elegant & refined",
    desc: "Soft neutrals and fine serif. Calm, unhurried, premium.",
    bg: "#f7f3ef", ink: "#2a2420", accent: "#b08968", serif: true, caps: false,
  },
  {
    id: "friendly",
    name: "Bright & friendly",
    desc: "Open, colourful, approachable. Good for families and walk-ins.",
    bg: "#fffaf2", ink: "#23303d", accent: "#2f9e6f", serif: false, caps: false,
  },
  {
    id: "premium",
    name: "Dark & premium",
    desc: "Near-black with one sharp accent. Feels expensive and technical.",
    bg: "#07090f", ink: "#eef3fb", accent: "#3d8bff", serif: true, caps: false,
  },
];

const ASSETS = [
  { id: "logo", label: "A logo" },
  { id: "photos", label: "Photos of the business" },
  { id: "copy", label: "Written descriptions" },
  { id: "domain", label: "A domain name" },
  { id: "google", label: "A Google Business listing" },
  { id: "social", label: "An active social page" },
  { id: "nothing", label: "Honestly, none of it" },
];

const STEPS = ["Trade", "Goals", "Look", "Assets"] as const;

/* ─────────────────────────────── Component ─────────────────────────────── */

export function BriefBuilder() {
  const { setBrief } = useBrief();
  const [step, setStep] = useState(0);
  const [trade, setTrade] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [direction, setDirection] = useState<string | null>(null);
  const [assets, setAssets] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    // "None of it" is mutually exclusive with everything else.
    if (id === "nothing") return set(list.includes("nothing") ? [] : ["nothing"]);
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    set(next.filter((x) => x !== "nothing"));
  };

  const canAdvance =
    step === 0 ? !!trade : step === 1 ? goals.length > 0 : step === 2 ? !!direction : true;

  const summary = useMemo(() => {
    const chosenGoals = GOALS.filter((g) => goals.includes(g.id)).map((g) => g.label);
    const chosenDirection = DIRECTIONS.find((d) => d.id === direction);
    const chosenAssets = ASSETS.filter((a) => assets.includes(a.id)).map((a) => a.label);

    return [
      `Business type: ${trade ?? "—"}`,
      ``,
      `What the site needs to do:`,
      ...chosenGoals.map((g) => `  • ${g}`),
      ``,
      `Design direction: ${chosenDirection ? `${chosenDirection.name} — ${chosenDirection.desc}` : "—"}`,
      ``,
      `Already have:`,
      ...(chosenAssets.length
        ? chosenAssets.map((a) => `  • ${a}`)
        : ["  • Nothing yet"]),
    ].join("\n");
  }, [trade, goals, direction, assets]);

  function finish() {
    setBrief(summary);
    setDone(true);
  }

  function reset() {
    setDone(false);
    setStep(0);
    setTrade(null);
    setGoals([]);
    setDirection(null);
    setAssets([]);
  }

  return (
    <section id="brief" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <SectionHead
          index="07"
          eyebrow="Start here"
          title="Four questions, two minutes, and we know what to build."
          lede="This is the whole brief. Answer it and we'll have enough to send you a real design — no meeting, no forms to print, no jargon. Point at the look you want and we'll take it from there."
        />

        <Reveal delay={0.14} className="mt-12">
          <div className="edge-lit overflow-hidden rounded-3xl border border-edge bg-ink-2/50">
            {/* Progress */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-edge px-6 py-5 sm:px-9">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => !done && i < step && setStep(i)}
                    disabled={done || i > step}
                    className={clsx(
                      "flex items-center gap-2.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] transition-colors duration-300",
                      done || i < step
                        ? "text-neon"
                        : i === step
                          ? "text-paper"
                          : "text-muted/50",
                      !done && i < step && "cursor-pointer hover:text-paper"
                    )}
                  >
                    <span
                      className={clsx(
                        "grid size-6 place-items-center rounded-full border text-[0.6rem] transition-all duration-300",
                        done || i < step
                          ? "border-neon text-neon"
                          : i === step
                            ? "border-paper bg-paper text-ink"
                            : "border-edge text-muted/50"
                      )}
                    >
                      {done || i < step ? "✓" : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "h-px w-5 transition-colors duration-500 sm:w-10",
                        done || i < step ? "bg-neon" : "bg-edge"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="min-h-[28rem] p-6 sm:p-9">
              <AnimatePresence mode="wait">
                {done ? (
                  <Panel key="done">
                    <div className="flex flex-col items-start gap-8 lg:flex-row">
                      <div className="lg:w-1/2">
                        <p className="eyebrow">Your brief</p>
                        <h3 className="mt-4 font-display text-4xl leading-tight">
                          That&apos;s everything we need.
                        </h3>
                        <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
                          It&apos;s been dropped into the contact form below — add your name
                          and email and it&apos;s on its way. You&apos;ll have a design of
                          your actual homepage within 72 hours.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                          <a
                            href="#contact"
                            className="inline-flex items-center gap-2 rounded-full bg-neon px-6 py-3 text-sm font-medium text-ink transition-all duration-300 hover:brightness-110"
                          >
                            Send it over
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                              <path d="M7 3v8m0 0L3.5 7.5M7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                          <button
                            type="button"
                            onClick={reset}
                            className="rounded-full border border-edge px-6 py-3 text-sm text-muted transition-colors duration-300 hover:border-white/25 hover:text-paper"
                          >
                            Start again
                          </button>
                        </div>
                      </div>

                      <pre className="w-full overflow-x-auto rounded-2xl border border-edge bg-ink p-6 font-mono text-xs leading-relaxed text-paper/75 lg:w-1/2">
                        {summary}
                      </pre>
                    </div>
                  </Panel>
                ) : step === 0 ? (
                  <Panel key="trade">
                    <Question
                      n="01"
                      title="What kind of business is it?"
                      hint="Pick the closest — we'll get the detail on the call."
                    />
                    <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {TRADES.map((t) => (
                        <Choice key={t} selected={trade === t} onClick={() => setTrade(t)}>
                          {t}
                        </Choice>
                      ))}
                    </div>
                  </Panel>
                ) : step === 1 ? (
                  <Panel key="goals">
                    <Question
                      n="02"
                      title="What does it actually need to do?"
                      hint="Choose as many as apply. This decides what we build, not just how it looks."
                    />
                    <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {GOALS.map((g) => (
                        <Choice
                          key={g.id}
                          selected={goals.includes(g.id)}
                          onClick={() => toggle(goals, setGoals, g.id)}
                          note={g.note}
                        >
                          {g.label}
                        </Choice>
                      ))}
                    </div>
                  </Panel>
                ) : step === 2 ? (
                  <Panel key="look">
                    <Question
                      n="03"
                      title="Which of these feels like you?"
                      hint="Don't overthink it — point at the one you'd walk into. We design from there."
                    />
                    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {DIRECTIONS.map((d) => (
                        <DirectionCard
                          key={d.id}
                          direction={d}
                          selected={direction === d.id}
                          onClick={() => setDirection(d.id)}
                        />
                      ))}
                    </div>
                  </Panel>
                ) : (
                  <Panel key="assets">
                    <Question
                      n="04"
                      title="What have you got already?"
                      hint="Be honest — 'none of it' is the most common answer, and it changes nothing about the price."
                    />
                    <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {ASSETS.map((a) => (
                        <Choice
                          key={a.id}
                          selected={assets.includes(a.id)}
                          onClick={() => toggle(assets, setAssets, a.id)}
                        >
                          {a.label}
                        </Choice>
                      ))}
                    </div>
                    <p className="mt-7 max-w-lg text-sm leading-relaxed text-muted">
                      Anything you don&apos;t have, we make. A logo, the photos, the words on
                      every page — it&apos;s all covered in the build, and nothing on this
                      screen adds to the quote.
                    </p>
                  </Panel>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            {!done && (
              <div className="flex items-center justify-between gap-4 border-t border-edge px-6 py-5 sm:px-9">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-paper disabled:opacity-0"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  disabled={!canAdvance}
                  onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}
                  className="inline-flex items-center gap-2 rounded-full bg-neon px-7 py-3 text-sm font-medium text-ink transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {step === STEPS.length - 1 ? "Build my brief" : "Next"}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ─────────────────────────────── Pieces ─────────────────────────────── */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Question({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs tracking-[0.2em] text-neon">{n}</span>
        <h3 className="font-display text-3xl leading-tight sm:text-4xl">{title}</h3>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

function Choice({
  children,
  note,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  note?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "rounded-xl border p-4 text-left transition-all duration-200",
        selected
          ? "border-neon/60 bg-neon/10 text-paper"
          : "border-edge bg-ink/40 text-paper/75 hover:border-white/25 hover:text-paper"
      )}
    >
      <span className="block text-sm leading-snug">{children}</span>
      {note && <span className="mt-1.5 block text-xs leading-relaxed text-muted">{note}</span>}
    </button>
  );
}

/** A miniature of the direction, so the choice is visual rather than verbal. */
function DirectionCard({
  direction: d,
  selected,
  onClick,
}: {
  direction: (typeof DIRECTIONS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "group overflow-hidden rounded-2xl border text-left transition-all duration-300",
        selected
          ? "border-neon ring-1 ring-neon/40"
          : "border-edge hover:border-white/25"
      )}
    >
      <div
        className="relative aspect-[16/10] overflow-hidden p-5"
        style={{ backgroundColor: d.bg }}
      >
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-8 size-28 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: d.accent }}
        />
        <p
          className="relative text-[0.5rem] tracking-[0.2em]"
          style={{ color: d.accent, textTransform: "uppercase" }}
        >
          Your business
        </p>
        <p
          className={clsx(
            "relative mt-2 leading-[0.95]",
            d.serif ? "font-display text-2xl" : "text-xl font-bold",
            d.caps && "uppercase tracking-tight"
          )}
          style={{ color: d.ink }}
        >
          Open today
        </p>
        <div className="relative mt-3 flex flex-col gap-1.5">
          {[80, 55].map((w) => (
            <span
              key={w}
              aria-hidden="true"
              className="block h-1 rounded-full"
              style={{ width: `${w}%`, background: d.ink, opacity: 0.18 }}
            />
          ))}
        </div>
        <span
          className="relative mt-4 inline-block rounded-full px-3 py-1 text-[0.55rem] font-medium"
          style={{ background: d.accent, color: d.bg }}
        >
          Get in touch
        </span>
      </div>

      <div className="bg-ink/60 px-4 py-3.5">
        <p className="text-sm font-medium">{d.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{d.desc}</p>
      </div>
    </button>
  );
}
