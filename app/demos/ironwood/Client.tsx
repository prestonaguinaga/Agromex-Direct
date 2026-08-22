"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/* ────────────────────────── Quote model ──────────────────────────
   Deliberately transparent: rate per square foot by material, adjusted for
   access difficulty and tear-off, then shown as a ±12% range. A homeowner can
   follow the arithmetic, which is the whole point of putting it on the page.
   ──────────────────────────────────────────────────────────────── */

const MATERIALS = [
  { id: "asphalt", label: "3-tab asphalt", rate: 4.75, life: "15–20 yrs" },
  { id: "architectural", label: "Architectural shingle", rate: 6.9, life: "25–30 yrs" },
  { id: "metal", label: "Standing seam metal", rate: 12.4, life: "45–70 yrs" },
] as const;

const STORIES = [
  { id: 1, label: "Single storey", factor: 1 },
  { id: 2, label: "Two storey", factor: 1.14 },
  { id: 3, label: "Three +", factor: 1.28 },
] as const;

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function Ironwood() {
  return (
    <div className="min-h-screen bg-[#101215] text-[#eef1f4] [font-family:var(--font-barlow)] selection:bg-[#f5c518] selection:text-[#101215]">
      <SiteNav />
      <Hero />
      <Estimator />
      <Services />
      <Coverage />
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────── Nav ─────────────────────────────── */

function SiteNav() {
  return (
    <>
      <div className="bg-[#f5c518] px-5 py-2 text-center text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#101215] sm:px-8">
        Storm damage? 24-hour emergency tarping — (555) 226-7743
      </div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101215]/90 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center bg-[#f5c518] text-[#101215]"
              style={{ clipPath: "polygon(50% 0, 100% 38%, 100% 100%, 0 100%, 0 38%)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 7l5-4 5 4v5H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="[font-family:var(--font-anton)] text-xl uppercase tracking-wide">
              Ironwood
            </span>
          </a>

          <div className="hidden items-center gap-7 text-[0.78rem] font-medium uppercase tracking-[0.1em] text-white/60 md:flex">
            <a href="#estimate" className="transition-colors hover:text-[#f5c518]">Instant quote</a>
            <a href="#services" className="transition-colors hover:text-[#f5c518]">Services</a>
            <a href="#coverage" className="transition-colors hover:text-[#f5c518]">Service area</a>
          </div>

          <a
            href="tel:5552267743"
            className="bg-[#f5c518] px-5 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-[#101215] transition-transform duration-200 hover:scale-105"
          >
            (555) 226-7743
          </a>
        </nav>
      </header>
    </>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">
      {/* Diagonal hazard hatching, very low contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #f5c518 0 2px, transparent 2px 22px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-40 top-0 size-[520px] rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(circle, #f5c518, transparent 65%)" }}
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f5c518]"
        >
          Licensed · Bonded · Insured · Est. 1998
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-4xl [font-family:var(--font-anton)] text-[clamp(2.75rem,8.5vw,6.5rem)] uppercase leading-[0.86] tracking-[-0.01em]"
        >
          Know the price
          <br />
          <span className="text-[#f5c518]">before</span> you call.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 max-w-lg text-lg leading-relaxed text-white/60"
        >
          Most roofers make you book a visit just to hear a number. Use the estimator
          below, get a real range in thirty seconds, and only then decide whether you want
          us on your roof.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <a
            href="#estimate"
            className="bg-[#f5c518] px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] text-[#101215] transition-all duration-200 hover:shadow-[0_0_40px_-8px_#f5c518]"
          >
            Get my estimate
          </a>
          <a
            href="#services"
            className="border border-white/20 px-8 py-4 text-sm font-bold uppercase tracking-[0.08em] transition-colors duration-200 hover:border-white/50"
          >
            What we do
          </a>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="mt-16 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-4"
        >
          {[
            { k: "27", u: "yrs", v: "Working these roofs" },
            { k: "3,400", u: "+", v: "Roofs replaced" },
            { k: "25", u: "yr", v: "Workmanship warranty" },
            { k: "24", u: "hr", v: "Storm response" },
          ].map((s) => (
            <div key={s.v} className="bg-[#101215] px-6 py-6">
              <dd className="[font-family:var(--font-anton)] text-4xl leading-none">
                {s.k}
                <span className="text-[#f5c518]">{s.u}</span>
              </dd>
              <dt className="mt-2.5 text-[0.68rem] uppercase tracking-[0.14em] text-white/40">
                {s.v}
              </dt>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

/* ──────────────────────────── Estimator ──────────────────────────── */

function Estimator() {
  const [sqft, setSqft] = useState(1800);
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]["id"]>("architectural");
  const [stories, setStories] = useState<1 | 2 | 3>(1);
  const [tearOff, setTearOff] = useState(true);
  const [booked, setBooked] = useState(false);

  const { low, high, chosen } = useMemo(() => {
    const chosen = MATERIALS.find((m) => m.id === material)!;
    const storeyFactor = STORIES.find((s) => s.id === stories)!.factor;
    const base = sqft * chosen.rate * storeyFactor * (tearOff ? 1.16 : 1);
    return { low: base * 0.88, high: base * 1.12, chosen };
  }, [sqft, material, stories, tearOff]);

  return (
    <section
      id="estimate"
      className="scroll-mt-16 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
              Instant estimate
            </p>
            <h2 className="mt-4 [font-family:var(--font-anton)] text-5xl uppercase leading-none sm:text-6xl">
              Four questions
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">
            This is the same arithmetic we&apos;d do on your driveway. It gets you within
            about 12% — the inspection settles the rest.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          {/* Inputs */}
          <div className="border border-white/10 p-7 sm:p-9">
            {/* Roof size */}
            <label htmlFor="sqft" className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              Roof area
            </label>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="[font-family:var(--font-anton)] text-5xl leading-none">
                {sqft.toLocaleString()}
              </span>
              <span className="text-sm text-white/45">sq ft</span>
            </div>
            <input
              id="sqft"
              type="range"
              min={600}
              max={5000}
              step={50}
              value={sqft}
              onChange={(e) => setSqft(Number(e.target.value))}
              className="mt-5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#f5c518] outline-none"
              style={{
                background: `linear-gradient(to right, #f5c518 ${
                  ((sqft - 600) / 4400) * 100
                }%, rgba(255,255,255,0.15) ${((sqft - 600) / 4400) * 100}%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-[0.65rem] uppercase tracking-[0.12em] text-white/30">
              <span>600 — small bungalow</span>
              <span>5,000 — large two-storey</span>
            </div>

            {/* Material */}
            <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              Material
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {MATERIALS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMaterial(m.id)}
                  aria-pressed={material === m.id}
                  className={clsx(
                    "border p-4 text-left transition-all duration-200",
                    material === m.id
                      ? "border-[#f5c518] bg-[#f5c518]/10"
                      : "border-white/12 hover:border-white/35"
                  )}
                >
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.1em] text-white/40">
                    {m.life} · ${m.rate.toFixed(2)}/sq ft
                  </span>
                </button>
              ))}
            </div>

            {/* Stories */}
            <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">
              Height
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STORIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStories(s.id)}
                  aria-pressed={stories === s.id}
                  className={clsx(
                    "border px-5 py-2.5 text-sm transition-all duration-200",
                    stories === s.id
                      ? "border-[#f5c518] bg-[#f5c518] font-bold text-[#101215]"
                      : "border-white/12 text-white/70 hover:border-white/35"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Tear-off */}
            <button
              type="button"
              onClick={() => setTearOff((v) => !v)}
              aria-pressed={tearOff}
              className="mt-10 flex w-full items-center justify-between gap-6 border border-white/12 p-5 text-left transition-colors duration-200 hover:border-white/30"
            >
              <span>
                <span className="block text-sm font-semibold">Tear off the old roof</span>
                <span className="mt-1 block text-xs leading-relaxed text-white/45">
                  Required if there are already two layers up there, or if the deck needs
                  inspecting.
                </span>
              </span>
              <span
                aria-hidden="true"
                className={clsx(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                  tearOff ? "bg-[#f5c518]" : "bg-white/15"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 size-5 rounded-full bg-[#101215] transition-transform duration-200",
                    tearOff ? "translate-x-[1.4rem]" : "translate-x-0.5"
                  )}
                />
              </span>
            </button>
          </div>

          {/* Output */}
          <div className="flex flex-col border border-[#f5c518]/30 bg-[#f5c518]/[0.05] p-7 sm:p-9">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#f5c518]">
              Your estimate
            </p>

            <div className="mt-6">
              <Ticker value={low} />
              <p className="mt-1 text-sm text-white/40">to</p>
              <Ticker value={high} />
            </div>

            <dl className="mt-8 space-y-2.5 border-t border-white/10 pt-6 text-[0.8rem]">
              {[
                ["Material", chosen.label],
                ["Area", `${sqft.toLocaleString()} sq ft`],
                ["Access", STORIES.find((s) => s.id === stories)!.label],
                ["Tear-off", tearOff ? "Included" : "Not included"],
                ["Warranty", "25-year workmanship"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-white/40">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-auto pt-8">
              <AnimatePresence mode="wait">
                {booked ? (
                  <motion.div
                    key="booked"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[#f5c518] p-5 text-center"
                  >
                    <p className="[font-family:var(--font-anton)] text-2xl uppercase">
                      Inspection requested
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/55">
                      We&apos;ll call within one business day to lock in a time. Bring the
                      estimate — we&apos;ll show you where it lands.
                    </p>
                  </motion.div>
                ) : (
                  <motion.button
                    key="book"
                    type="button"
                    onClick={() => setBooked(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full bg-[#f5c518] py-4 text-sm font-bold uppercase tracking-[0.08em] text-[#101215] transition-all duration-200 hover:shadow-[0_0_40px_-8px_#f5c518]"
                  >
                    Book the free inspection
                  </motion.button>
                )}
              </AnimatePresence>
              <p className="mt-4 text-[0.65rem] leading-relaxed text-white/35">
                No deposit, no obligation. The written quote after inspection is the one
                we stand behind.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Rolls the figure toward its new value so changing an input feels physical. */
function Ticker({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const start = shown;
    const delta = value - start;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min((now - t0) / 420, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(start + delta * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally keyed on `value` only — `shown` is the animation's start point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <p className="[font-family:var(--font-anton)] text-5xl leading-none tabular-nums sm:text-6xl">
      {currency(shown)}
    </p>
  );
}

/* ──────────────────────────── Services ──────────────────────────── */

const WORK = [
  {
    title: "Full replacement",
    body: "Tear-off, deck inspection, ice and water shield, new underlayment, new roof. Two to four days on a typical house.",
  },
  {
    title: "Repairs & leaks",
    body: "We find where the water actually gets in, not where it shows up on your ceiling. Fixed-price on most repairs.",
  },
  {
    title: "Storm & hail damage",
    body: "Emergency tarping within 24 hours, full documentation for your insurer, and we'll meet the adjuster on site.",
  },
  {
    title: "Gutters & flashing",
    body: "Seamless gutter runs, chimney and valley flashing, drip edge. Half of what we call a 'roof leak' starts here.",
  },
  {
    title: "Ventilation",
    body: "Ridge vents and soffit intake sized to the attic. Fixes the ice dams and the summer heat in one go.",
  },
  {
    title: "Annual inspection",
    body: "Photographed, itemised, and honest. If the roof has eight good years left, we'll tell you that.",
  },
];

function Services() {
  return (
    <section
      id="services"
      className="scroll-mt-16 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="[font-family:var(--font-anton)] text-5xl uppercase leading-none sm:text-6xl">
          What we do
        </h2>
        <div className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {WORK.map((w, i) => (
            <motion.article
              key={w.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group bg-[#101215] p-7 transition-colors duration-300 hover:bg-[#15181c]"
            >
              <span className="[font-family:var(--font-anton)] text-sm text-[#f5c518]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 [font-family:var(--font-anton)] text-2xl uppercase leading-tight">
                {w.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{w.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Coverage ──────────────────────────── */

const TOWNS = [
  "Cedar Falls", "Riverton", "Millbrook", "North Shore", "Old Town",
  "Ashgrove", "Fair Hill", "Winslow", "Brookside", "Kentmere",
  "Harper's Bend", "Stonewall",
];

function Coverage() {
  return (
    <section
      id="coverage"
      className="scroll-mt-16 border-t border-white/10 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
            Service area
          </p>
          <h2 className="mt-4 [font-family:var(--font-anton)] text-4xl uppercase leading-none sm:text-5xl">
            Forty miles, no travel charge
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50">
            If you&apos;re inside this list we&apos;ll be there. Outside it, call anyway —
            for a full replacement we usually still make the drive.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {TOWNS.map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-white/65">
                <span className="size-1 bg-[#f5c518]" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-white/10 p-8 sm:p-10">
          <h3 className="[font-family:var(--font-anton)] text-2xl uppercase">
            What the warranty actually covers
          </h3>
          <ul className="mt-6 space-y-5">
            {[
              ["Workmanship — 25 years", "If it leaks because of how we installed it, we fix it. Transferable once if you sell."],
              ["Material — per manufacturer", "Registered in your name on completion day. We hand you the certificate."],
              ["Storm response", "Existing customers go to the front of the queue after a hail event. Always."],
            ].map(([k, v]) => (
              <li key={k} className="border-l-2 border-[#f5c518] pl-5">
                <p className="text-sm font-semibold">{k}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{v}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="[font-family:var(--font-anton)] text-3xl uppercase">Ironwood Roofing</p>
          <p className="mt-3 text-sm text-white/45">
            (555) 226-7743 · License #RC-0041882 · Insured to $2M
          </p>
        </div>
        <p className="text-[0.6rem] uppercase tracking-[0.16em] text-white/25">
          A demonstration build · No such company exists
        </p>
      </div>
    </footer>
  );
}
