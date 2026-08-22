"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/* ─────────────────────────────── Data ─────────────────────────────── */

type Dish = {
  name: string;
  desc: string;
  price: string;
  course: "Small" | "Fire" | "Sweet";
  tags: ("Vegetarian" | "Gluten-free")[];
};

const MENU: Dish[] = [
  { name: "Charred leeks, hazelnut, brown butter", desc: "Cooked directly in the embers, dressed warm.", price: "14", course: "Small", tags: ["Vegetarian", "Gluten-free"] },
  { name: "Sourdough & cultured butter", desc: "Three-day starter, sea salt, baked at four each morning.", price: "9", course: "Small", tags: ["Vegetarian"] },
  { name: "Oysters, apple mignonette", desc: "Half dozen, shucked to order.", price: "22", course: "Small", tags: ["Gluten-free"] },
  { name: "Beet tartare, smoked yolk, rye", desc: "Roasted in salt for six hours, then chopped fine.", price: "16", course: "Small", tags: ["Vegetarian"] },
  { name: "Whole trout, fennel, lemon", desc: "Grilled over oak, finished with brown butter.", price: "34", course: "Fire", tags: ["Gluten-free"] },
  { name: "Dry-aged ribeye, bone marrow", desc: "For two. Forty-five days, cut thick, rested long.", price: "78", course: "Fire", tags: ["Gluten-free"] },
  { name: "Ember-roasted cauliflower", desc: "Whole head, tahini, pomegranate, dukkah.", price: "26", course: "Fire", tags: ["Vegetarian"] },
  { name: "Half chicken under a brick", desc: "Brined two days, pressed crisp, pan drippings.", price: "31", course: "Fire", tags: ["Gluten-free"] },
  { name: "Burnt honey custard", desc: "Set soft, cracked at the table.", price: "12", course: "Sweet", tags: ["Vegetarian", "Gluten-free"] },
  { name: "Olive oil cake, plum, crème fraîche", desc: "Still warm from the oven at nine.", price: "13", course: "Sweet", tags: ["Vegetarian"] },
];

const COURSES = ["All", "Small", "Fire", "Sweet"] as const;
const DIETS = ["Vegetarian", "Gluten-free"] as const;

const HOURS = [
  { day: "Tuesday — Thursday", time: "5:00pm — 10:00pm" },
  { day: "Friday — Saturday", time: "5:00pm — 11:00pm" },
  { day: "Sunday", time: "4:00pm — 9:00pm" },
  { day: "Monday", time: "Closed" },
];

/* ─────────────────────────────── Page ─────────────────────────────── */

export function HarvestTable() {
  return (
    <div className="min-h-screen bg-[#171210] text-[#f6ece0] [font-family:var(--font-karla)] selection:bg-[#e8873c] selection:text-[#171210]">
      <SiteNav />
      <Hero />
      <Menu />
      <Room />
      <Reserve />
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────── Nav ─────────────────────────────── */

function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#f6ece0]/10 bg-[#171210]/85 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="[font-family:var(--font-fraunces)] text-xl tracking-tight">
          Harvest Table
        </a>
        <div className="hidden items-center gap-8 text-[0.8rem] uppercase tracking-[0.14em] text-[#f6ece0]/60 sm:flex">
          <a href="#menu" className="transition-colors hover:text-[#e8873c]">Menu</a>
          <a href="#room" className="transition-colors hover:text-[#e8873c]">The room</a>
          <a href="#hours" className="transition-colors hover:text-[#e8873c]">Hours</a>
        </div>
        <a
          href="#reserve"
          className="rounded-full bg-[#e8873c] px-5 py-2 text-[0.78rem] font-semibold text-[#171210] transition-transform duration-200 hover:scale-105"
        >
          Reserve
        </a>
      </nav>
    </header>
  );
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
      <div
        aria-hidden="true"
        className="absolute -right-32 -top-40 size-[560px] rounded-full opacity-45 blur-[110px]"
        style={{ background: "radial-gradient(circle, #e8873c, transparent 65%)" }}
      />
      {/* Ember specks drifting up from the fire */}
      <Embers />

      <div className="relative mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.24em] text-[#e8873c]"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#e8873c] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#e8873c]" />
          </span>
          Open tonight until 10pm
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-4xl [font-family:var(--font-fraunces)] text-[clamp(3rem,9vw,7rem)] font-light leading-[0.88] tracking-[-0.03em]"
        >
          Wood fire.
          <br />
          <span className="italic text-[#e8873c]">Long</span> tables.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
          className="mt-8 max-w-md text-base leading-relaxed text-[#f6ece0]/65"
        >
          Everything here touches flame or smoke at some point. Seasonal plates from
          growers within sixty miles, meant to be passed around. Walk-ins always welcome
          at the bar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.38 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <a
            href="#reserve"
            className="rounded-full bg-[#e8873c] px-7 py-3.5 text-sm font-semibold text-[#171210] transition-all duration-200 hover:shadow-[0_0_40px_-6px_#e8873c]"
          >
            Reserve a table
          </a>
          <a
            href="#menu"
            className="rounded-full border border-[#f6ece0]/20 px-7 py-3.5 text-sm transition-colors duration-200 hover:border-[#f6ece0]/50"
          >
            See tonight&apos;s menu
          </a>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-[#f6ece0]/10 bg-[#f6ece0]/10 sm:grid-cols-3"
        >
          {[
            { k: "Address", v: "114 Mill Street, Old Town" },
            { k: "Reservations", v: "(555) 018-4420" },
            { k: "Parking", v: "Free lot behind the building" },
          ].map((item) => (
            <div key={item.k} className="bg-[#171210] px-6 py-5">
              <dt className="text-[0.62rem] uppercase tracking-[0.2em] text-[#f6ece0]/40">
                {item.k}
              </dt>
              <dd className="mt-2 text-sm">{item.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

function Embers() {
  // Deterministic positions so server and client markup agree.
  const specks = [8, 19, 27, 38, 46, 55, 63, 71, 79, 88, 94];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-72 overflow-hidden">
      {specks.map((left, i) => (
        <motion.span
          key={left}
          className="absolute bottom-0 size-1 rounded-full bg-[#e8873c]"
          style={{ left: `${left}%` }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -260, opacity: [0, 0.8, 0] }}
          transition={{
            duration: 6 + (i % 4),
            repeat: Infinity,
            delay: i * 0.7,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────── Menu ─────────────────────────────── */

function Menu() {
  const [course, setCourse] = useState<(typeof COURSES)[number]>("All");
  const [diets, setDiets] = useState<string[]>([]);

  const toggleDiet = (d: string) =>
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const dishes = useMemo(
    () =>
      MENU.filter((dish) => {
        if (course !== "All" && dish.course !== course) return false;
        return diets.every((d) => dish.tags.includes(d as Dish["tags"][number]));
      }),
    [course, diets]
  );

  return (
    <section id="menu" className="scroll-mt-16 border-t border-[#f6ece0]/10 px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#e8873c]">
              Changes weekly
            </p>
            <h2 className="mt-4 [font-family:var(--font-fraunces)] text-5xl font-light leading-none sm:text-6xl">
              The menu
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[#f6ece0]/55">
            Written every Tuesday around whatever came in that morning. Filter it however
            you eat.
          </p>
        </div>

        {/* Filters */}
        <div className="mt-12 flex flex-col gap-5 border-y border-[#f6ece0]/10 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {COURSES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCourse(c)}
                aria-pressed={course === c}
                className={clsx(
                  "rounded-full px-5 py-2 text-sm transition-all duration-200",
                  course === c
                    ? "bg-[#e8873c] font-semibold text-[#171210]"
                    : "border border-[#f6ece0]/15 text-[#f6ece0]/70 hover:border-[#f6ece0]/40 hover:text-[#f6ece0]"
                )}
              >
                {c === "Small" ? "To start" : c === "Fire" ? "From the fire" : c === "Sweet" ? "Sweet" : "Everything"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[#f6ece0]/40">
              Dietary
            </span>
            {DIETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDiet(d)}
                aria-pressed={diets.includes(d)}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs transition-all duration-200",
                  diets.includes(d)
                    ? "border-[#e8873c] bg-[#e8873c]/15 text-[#f6ece0]"
                    : "border-[#f6ece0]/15 text-[#f6ece0]/55 hover:border-[#f6ece0]/35"
                )}
              >
                <span
                  className={clsx(
                    "grid size-3.5 place-items-center rounded-[4px] border transition-colors",
                    diets.includes(d) ? "border-[#e8873c] bg-[#e8873c]" : "border-[#f6ece0]/30"
                  )}
                >
                  {diets.includes(d) && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                      <path d="M1.5 4.8l2 2 4-5" stroke="#171210" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Dishes */}
        <div className="mt-4">
          <AnimatePresence mode="popLayout">
            {dishes.map((dish, i) => (
              <motion.article
                key={dish.name}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                className="group border-b border-[#f6ece0]/[0.07] py-6"
              >
                <div className="flex items-baseline gap-4">
                  <h3 className="[font-family:var(--font-fraunces)] text-xl leading-snug transition-colors duration-200 group-hover:text-[#e8873c] sm:text-2xl">
                    {dish.name}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="hidden h-px min-w-8 flex-1 translate-y-[-0.35em] border-b border-dotted border-[#f6ece0]/20 sm:block"
                  />
                  <span className="ml-auto shrink-0 [font-family:var(--font-fraunces)] text-xl text-[#e8873c] sm:ml-0">
                    ${dish.price}
                  </span>
                </div>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-[#f6ece0]/50">
                  {dish.desc}
                </p>
                {dish.tags.length > 0 && (
                  <ul className="mt-3 flex gap-2">
                    {dish.tags.map((t) => (
                      <li
                        key={t}
                        className="rounded-full border border-[#f6ece0]/12 px-2.5 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-[#f6ece0]/45"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.article>
            ))}
          </AnimatePresence>

          {dishes.length === 0 && (
            <p className="py-16 text-center text-sm text-[#f6ece0]/50">
              Nothing on tonight&apos;s menu matches both filters — but the kitchen will
              adapt almost anything. Mention it when you book.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Room + hours ─────────────────────────── */

function Room() {
  return (
    <section
      id="room"
      className="scroll-mt-16 border-t border-[#f6ece0]/10 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#e8873c]">The room</p>
          <h2 className="mt-4 [font-family:var(--font-fraunces)] text-4xl font-light leading-[1.05] sm:text-5xl">
            Forty seats, one fire, no reservations after nine.
          </h2>
          <p className="mt-7 max-w-md text-sm leading-relaxed text-[#f6ece0]/60">
            A converted mill floor with the beams left exposed. The kitchen is open to the
            room, so the fire is the loudest thing in it. We hold six seats at the bar for
            walk-ins every night — if you&apos;re passing, look in.
          </p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#f6ece0]/60">
            Large parties up to fourteen in the back room. Wine list is small on purpose,
            mostly low-intervention, and someone will happily talk you through it.
          </p>
        </div>

        <div id="hours" className="scroll-mt-24">
          <div className="rounded-2xl border border-[#f6ece0]/12 p-7 sm:p-9">
            <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-[#f6ece0]/45">
              Hours
            </h3>
            <dl className="mt-6">
              {HOURS.map((h) => (
                <div
                  key={h.day}
                  className="flex items-baseline justify-between gap-4 border-b border-[#f6ece0]/[0.07] py-4 last:border-0"
                >
                  <dt className="text-sm text-[#f6ece0]/75">{h.day}</dt>
                  <dd
                    className={clsx(
                      "text-sm",
                      h.time === "Closed" ? "text-[#f6ece0]/30" : "text-[#e8873c]"
                    )}
                  >
                    {h.time}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs leading-relaxed text-[#f6ece0]/40">
              Kitchen closes thirty minutes before the door does. Holiday hours are posted
              here first.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Reservation ─────────────────────────── */

const PARTY = ["2", "3", "4", "5", "6+"];
const TIMES = ["5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00"];
const TAKEN = new Set(["7:00", "7:30"]);

function Reserve() {
  const [party, setParty] = useState("2");
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <section
      id="reserve"
      className="scroll-mt-16 border-t border-[#f6ece0]/10 px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-[#e8873c]/40 bg-[#e8873c]/[0.07] p-10 text-center sm:p-14"
            >
              <h2 className="[font-family:var(--font-fraunces)] text-4xl font-light">
                Table held.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-[#f6ece0]/70">
                {party} guests at {time}pm. A confirmation is on its way — the host stand
                will text you if anything changes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  setTime(null);
                }}
                className="mt-8 text-xs uppercase tracking-[0.18em] text-[#e8873c] underline underline-offset-4"
              >
                Book another
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (time) setDone(true);
              }}
              className="rounded-3xl border border-[#f6ece0]/12 p-7 sm:p-11"
            >
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[#e8873c]">
                Reservations
              </p>
              <h2 className="mt-4 [font-family:var(--font-fraunces)] text-4xl font-light leading-none sm:text-5xl">
                Book a table
              </h2>

              <div className="mt-10">
                <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#f6ece0]/45">
                  Party size
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PARTY.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setParty(p)}
                      aria-pressed={party === p}
                      className={clsx(
                        "size-11 rounded-full text-sm transition-all duration-200",
                        party === p
                          ? "bg-[#e8873c] font-semibold text-[#171210]"
                          : "border border-[#f6ece0]/15 text-[#f6ece0]/70 hover:border-[#f6ece0]/40"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#f6ece0]/45">
                  Tonight
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {TIMES.map((t) => {
                    const taken = TAKEN.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={taken}
                        onClick={() => setTime(t)}
                        aria-pressed={time === t}
                        className={clsx(
                          "rounded-xl py-2.5 text-sm transition-all duration-200",
                          taken
                            ? "cursor-not-allowed border border-[#f6ece0]/[0.06] text-[#f6ece0]/20 line-through"
                            : time === t
                              ? "bg-[#e8873c] font-semibold text-[#171210]"
                              : "border border-[#f6ece0]/15 text-[#f6ece0]/75 hover:border-[#f6ece0]/40"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <input
                  required
                  placeholder="Name"
                  aria-label="Name"
                  className="rounded-xl border border-[#f6ece0]/15 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#f6ece0]/30 focus:border-[#e8873c]"
                />
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  aria-label="Phone"
                  className="rounded-xl border border-[#f6ece0]/15 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#f6ece0]/30 focus:border-[#e8873c]"
                />
              </div>

              <textarea
                rows={2}
                placeholder="Allergies, birthdays, anything we should know"
                aria-label="Notes"
                className="mt-4 w-full resize-none rounded-xl border border-[#f6ece0]/15 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#f6ece0]/30 focus:border-[#e8873c]"
              />

              <button
                type="submit"
                disabled={!time}
                className="mt-8 w-full rounded-full bg-[#e8873c] py-4 text-sm font-semibold text-[#171210] transition-all duration-200 hover:shadow-[0_0_40px_-6px_#e8873c] disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              >
                {time ? `Hold a table for ${party} at ${time}pm` : "Pick a time above"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Footer ─────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-[#f6ece0]/10 px-5 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="[font-family:var(--font-fraunces)] text-3xl">Harvest Table</p>
          <p className="mt-3 text-sm text-[#f6ece0]/50">
            114 Mill Street, Old Town · (555) 018-4420
          </p>
        </div>
        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[#f6ece0]/30">
          A demonstration build · No such restaurant exists
        </p>
      </div>
    </footer>
  );
}
