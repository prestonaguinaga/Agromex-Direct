"use client";

import clsx from "clsx";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/* ───────────────────────────── Data ───────────────────────────── */

const SERVICES = [
  { id: "cut", name: "Cut & finish", duration: "60 min", price: 85, note: "Consultation, wash, cut, blow-dry" },
  { id: "colour", name: "Full colour", duration: "150 min", price: 210, note: "Includes gloss and a cut" },
  { id: "balayage", name: "Balayage", duration: "180 min", price: 265, note: "Hand-painted, toned, finished" },
  { id: "treatment", name: "Bond treatment", duration: "45 min", price: 70, note: "Repair for coloured or heat-worn hair" },
  { id: "facial", name: "Signature facial", duration: "75 min", price: 140, note: "Double cleanse, mask, massage" },
  { id: "massage", name: "Deep tissue massage", duration: "60 min", price: 125, note: "Focused work, firm pressure" },
];

const STYLISTS = [
  { id: "any", name: "No preference", role: "First available", initials: "—" },
  { id: "mara", name: "Mara Oyelaran", role: "Colour director · 12 yrs", initials: "MO" },
  { id: "jun", name: "Jun Park", role: "Senior stylist · 8 yrs", initials: "JP" },
  { id: "elise", name: "Elise Brandt", role: "Aesthetician", initials: "EB" },
];

const DAYS = [
  { label: "Thu", date: "12" },
  { label: "Fri", date: "13" },
  { label: "Sat", date: "14" },
  { label: "Sun", date: "15", closed: true },
  { label: "Mon", date: "16" },
  { label: "Tue", date: "17" },
];

const SLOTS = ["9:00", "10:30", "12:00", "1:30", "3:00", "4:30"];

/* ───────────────────────────── Page ───────────────────────────── */

export function Lumen() {
  return (
    <div className="min-h-screen bg-[#f7f3ef] text-[#2a2420] [font-family:var(--font-jost)] selection:bg-[#b08968] selection:text-[#f7f3ef]">
      <SiteNav />
      <Hero />
      <Booking />
      <Team />
      <Gift />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2a2420]/8 bg-[#f7f3ef]/85 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a
          href="#top"
          className="[font-family:var(--font-cormorant)] text-2xl tracking-[0.24em] uppercase"
        >
          Lumen
        </a>
        <div className="hidden items-center gap-9 text-[0.72rem] uppercase tracking-[0.18em] text-[#2a2420]/55 sm:flex">
          <a href="#book" className="transition-colors hover:text-[#b08968]">Book</a>
          <a href="#team" className="transition-colors hover:text-[#b08968]">Team</a>
          <a href="#gift" className="transition-colors hover:text-[#b08968]">Gift cards</a>
        </div>
        <a
          href="#book"
          className="rounded-full border border-[#2a2420]/20 px-5 py-2 text-[0.72rem] uppercase tracking-[0.16em] transition-colors duration-200 hover:border-[#b08968] hover:text-[#b08968]"
        >
          Book now
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
      <div
        aria-hidden="true"
        className="absolute -right-20 top-10 size-[460px] rounded-full opacity-30 blur-[100px]"
        style={{ background: "radial-gradient(circle, #d9c3ae, transparent 68%)" }}
      />
      <div className="relative mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-[0.68rem] uppercase tracking-[0.3em] text-[#b08968]"
        >
          Hair · Skin · Quiet
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-3xl [font-family:var(--font-cormorant)] text-[clamp(3rem,8.5vw,6.5rem)] font-light leading-[0.95] tracking-[-0.01em]"
        >
          An hour that belongs
          <span className="italic text-[#b08968]"> only</span> to you.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="mt-8 max-w-md text-base leading-relaxed text-[#2a2420]/60"
        >
          A small studio on the top floor of the old post office. Six chairs, two
          treatment rooms, and nobody rushing you out of one.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.38 }}
          className="mt-11 flex flex-wrap items-center gap-6"
        >
          <a
            href="#book"
            className="rounded-full bg-[#2a2420] px-8 py-4 text-[0.75rem] uppercase tracking-[0.16em] text-[#f7f3ef] transition-all duration-300 hover:bg-[#b08968]"
          >
            Book an appointment
          </a>
          <a
            href="tel:5550117788"
            className="text-[0.75rem] uppercase tracking-[0.16em] text-[#2a2420]/60 underline-offset-8 transition-colors hover:text-[#b08968] hover:underline"
          >
            (555) 011-7788
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Booking flow ─────────────────────────── */

function Booking() {
  const [step, setStep] = useState(0);
  const [service, setService] = useState<string | null>(null);
  const [stylist, setStylist] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const chosenService = SERVICES.find((s) => s.id === service);
  const chosenStylist = STYLISTS.find((s) => s.id === stylist);

  const canAdvance = step === 0 ? !!service : step === 1 ? !!stylist : !!(day && slot);
  const steps = ["Service", "Who with", "When"];

  return (
    <section
      id="book"
      className="scroll-mt-20 border-t border-[#2a2420]/8 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[#b08968]">
            Three taps
          </p>
          <h2 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-light leading-none sm:text-6xl">
            Book in
          </h2>
        </div>

        {/* Progress */}
        <ol className="mt-14 flex items-center justify-center gap-2 sm:gap-4">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={clsx(
                  "flex items-center gap-2.5 text-[0.68rem] uppercase tracking-[0.18em] transition-colors duration-300",
                  i === step ? "text-[#2a2420]" : i < step ? "text-[#b08968]" : "text-[#2a2420]/25",
                  i < step && "cursor-pointer"
                )}
              >
                <span
                  className={clsx(
                    "grid size-7 place-items-center rounded-full border text-[0.65rem] transition-all duration-300",
                    i === step
                      ? "border-[#2a2420] bg-[#2a2420] text-[#f7f3ef]"
                      : i < step
                        ? "border-[#b08968] text-[#b08968]"
                        : "border-[#2a2420]/20"
                  )}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "h-px w-8 transition-colors duration-500 sm:w-14",
                    i < step ? "bg-[#b08968]" : "bg-[#2a2420]/15"
                  )}
                />
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12 min-h-[26rem] rounded-3xl border border-[#2a2420]/8 bg-[#efe8e1]/50 p-6 sm:p-10">
          <AnimatePresence mode="wait">
            {/* ── Step 1 · Service ── */}
            {step === 0 && (
              <motion.div
                key="service"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35 }}
                className="grid gap-2 sm:grid-cols-2"
              >
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setService(s.id)}
                    aria-pressed={service === s.id}
                    className={clsx(
                      "rounded-2xl border bg-white p-5 text-left transition-all duration-200",
                      service === s.id
                        ? "border-[#b08968] shadow-[0_8px_24px_-12px_rgba(176,137,104,0.7)]"
                        : "border-[#2a2420]/10 hover:border-[#2a2420]/30 hover:shadow-[0_8px_20px_-14px_rgba(42,36,32,0.5)]"
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="[font-family:var(--font-cormorant)] text-2xl">
                        {s.name}
                      </span>
                      <span className="text-sm text-[#b08968]">${s.price}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#2a2420]/50">{s.note}</p>
                    <p className="mt-3 text-[0.62rem] uppercase tracking-[0.16em] text-[#2a2420]/40">
                      {s.duration}
                    </p>
                  </button>
                ))}
              </motion.div>
            )}

            {/* ── Step 2 · Stylist ── */}
            {step === 1 && (
              <motion.div
                key="stylist"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35 }}
                className="grid gap-2 sm:grid-cols-2"
              >
                {STYLISTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStylist(p.id)}
                    aria-pressed={stylist === p.id}
                    className={clsx(
                      "flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all duration-200",
                      stylist === p.id
                        ? "border-[#b08968] shadow-[0_8px_24px_-12px_rgba(176,137,104,0.7)]"
                        : "border-[#2a2420]/10 hover:border-[#2a2420]/30 hover:shadow-[0_8px_20px_-14px_rgba(42,36,32,0.5)]"
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e6dcd2] [font-family:var(--font-cormorant)] text-lg text-[#2a2420]/70">
                      {p.initials}
                    </span>
                    <span>
                      <span className="block [font-family:var(--font-cormorant)] text-xl">
                        {p.name}
                      </span>
                      <span className="mt-0.5 block text-[0.68rem] uppercase tracking-[0.12em] text-[#2a2420]/45">
                        {p.role}
                      </span>
                    </span>
                  </button>
                ))}
              </motion.div>
            )}

            {/* ── Step 3 · When ── */}
            {step === 2 && (
              <motion.div
                key="when"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.35 }}
              >
                <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#2a2420]/45">
                  Pick a day
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {DAYS.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      disabled={d.closed}
                      onClick={() => setDay(d.date)}
                      aria-pressed={day === d.date}
                      className={clsx(
                        "rounded-2xl border py-4 transition-all duration-200",
                        d.closed
                          ? "cursor-not-allowed border-[#2a2420]/[0.06] text-[#2a2420]/20"
                          : day === d.date
                            ? "border-[#2a2420] bg-[#2a2420] text-[#f7f3ef]"
                            : "border-[#2a2420]/10 bg-white hover:border-[#2a2420]/35"
                      )}
                    >
                      <span className="block text-[0.62rem] uppercase tracking-[0.14em] opacity-60">
                        {d.label}
                      </span>
                      <span className="mt-1 block [font-family:var(--font-cormorant)] text-2xl">
                        {d.date}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="mt-9 text-[0.62rem] uppercase tracking-[0.2em] text-[#2a2420]/45">
                  Pick a time
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!day}
                      onClick={() => setSlot(t)}
                      aria-pressed={slot === t}
                      className={clsx(
                        "rounded-full border py-2.5 text-sm transition-all duration-200",
                        !day
                          ? "cursor-not-allowed border-[#2a2420]/[0.06] text-[#2a2420]/20"
                          : slot === t
                            ? "border-[#b08968] bg-[#b08968] text-[#f7f3ef]"
                            : "border-[#2a2420]/12 hover:border-[#2a2420]/35"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {!day && (
                  <p className="mt-4 text-xs text-[#2a2420]/45">
                    Choose a day first and we&apos;ll show what&apos;s actually free.
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Confirmation ── */}
            {step === 3 && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="flex min-h-[22rem] flex-col items-center justify-center text-center"
              >
                <span className="grid size-16 place-items-center rounded-full bg-[#b08968] text-2xl text-[#f7f3ef]">
                  ✓
                </span>
                <h3 className="mt-8 [font-family:var(--font-cormorant)] text-4xl font-light">
                  You&apos;re in the book.
                </h3>
                <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#2a2420]/60">
                  {chosenService?.name} with {chosenStylist?.name.replace("No preference", "the first available stylist")},
                  {" "}the {day}th at {slot}. A reminder will arrive the day before — reply
                  to it if anything changes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setService(null);
                    setStylist(null);
                    setDay(null);
                    setSlot(null);
                  }}
                  className="mt-8 text-[0.68rem] uppercase tracking-[0.18em] text-[#b08968] underline underline-offset-4"
                >
                  Book something else
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {step < 3 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-[0.7rem] uppercase tracking-[0.18em] text-[#2a2420]/50 transition-colors hover:text-[#2a2420] disabled:opacity-0"
            >
              ← Back
            </button>

            <div className="flex items-center gap-5">
              {chosenService && (
                <span className="hidden text-[0.7rem] uppercase tracking-[0.14em] text-[#2a2420]/45 sm:inline">
                  {chosenService.name} · ${chosenService.price} · {chosenService.duration}
                </span>
              )}
              <button
                type="button"
                disabled={!canAdvance}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-full bg-[#2a2420] px-8 py-3.5 text-[0.72rem] uppercase tracking-[0.16em] text-[#f7f3ef] transition-all duration-300 hover:bg-[#b08968] disabled:cursor-not-allowed disabled:opacity-25"
              >
                {step === 2 ? "Confirm booking" : "Continue"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────────── Team ───────────────────────────── */

function Team() {
  return (
    <section
      id="team"
      className="scroll-mt-20 border-t border-[#2a2420]/8 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[#b08968]">The studio</p>
          <h2 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-light leading-[1.05]">
            Four people who have been doing this a long time.
          </h2>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STYLISTS.slice(1).map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-gradient-to-b from-[#e6dcd2] to-[#d9c9ba]">
                <span className="[font-family:var(--font-cormorant)] text-6xl text-[#2a2420]/25">
                  {p.initials}
                </span>
              </div>
              <h3 className="mt-5 [font-family:var(--font-cormorant)] text-2xl">{p.name}</h3>
              <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-[#2a2420]/45">
                {p.role}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Gift cards ─────────────────────────── */

function Gift() {
  const [amount, setAmount] = useState(150);

  return (
    <section
      id="gift"
      className="scroll-mt-20 border-t border-[#2a2420]/8 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[#b08968]">Gift cards</p>
          <h2 className="mt-4 [font-family:var(--font-cormorant)] text-5xl font-light leading-[1.05]">
            Give someone the hour.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#2a2420]/60">
            Delivered by email the moment you buy, or printed on card stock if you&apos;d
            rather hand it over. No expiry date — ever.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {[75, 100, 150, 250, 400].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(a)}
                aria-pressed={amount === a}
                className={clsx(
                  "rounded-full border px-5 py-2.5 text-sm transition-all duration-200",
                  amount === a
                    ? "border-[#2a2420] bg-[#2a2420] text-[#f7f3ef]"
                    : "border-[#2a2420]/15 hover:border-[#2a2420]/40"
                )}
              >
                ${a}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="mt-8 rounded-full bg-[#b08968] px-8 py-4 text-[0.72rem] uppercase tracking-[0.16em] text-[#f7f3ef] transition-transform duration-200 hover:scale-[1.02]"
          >
            Buy a ${amount} gift card
          </button>
        </div>

        <motion.div
          key={amount}
          initial={{ rotate: -2, scale: 0.98, opacity: 0.6 }}
          animate={{ rotate: -2, scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-[1.6/1] rounded-2xl bg-gradient-to-br from-[#2a2420] to-[#4a3f36] p-8 shadow-[0_30px_60px_-20px_rgba(42,36,32,0.4)]"
        >
          <p className="[font-family:var(--font-cormorant)] text-xl uppercase tracking-[0.3em] text-[#f7f3ef]">
            Lumen
          </p>
          <p className="mt-auto absolute bottom-8 left-8 [font-family:var(--font-cormorant)] text-6xl text-[#f7f3ef]">
            ${amount}
          </p>
          <p className="absolute bottom-9 right-8 text-[0.6rem] uppercase tracking-[0.2em] text-[#f7f3ef]/40">
            No expiry
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-[#2a2420]/8 px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="[font-family:var(--font-cormorant)] text-3xl uppercase tracking-[0.2em]">
            Lumen
          </p>
          <p className="mt-3 text-sm text-[#2a2420]/50">
            Top floor, 8 Post Office Lane · Tuesday to Saturday, 9 to 6
          </p>
        </div>
        <p className="text-[0.6rem] uppercase tracking-[0.16em] text-[#2a2420]/35">
          A demonstration build · No such studio exists
        </p>
      </div>
    </footer>
  );
}
