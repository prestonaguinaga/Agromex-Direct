import clsx from "clsx";
import { Container, Reveal, SectionHead } from "./ui";

/**
 * The three real options a small business weighs up. Figures for the DIY and
 * agency columns are 2026 market ranges (sourced in README.md), not invented —
 * a table that flatters us with made-up numbers would be worth nothing.
 */
const COLUMNS = ["Do it yourself", "This studio", "A design agency"] as const;

const ROWS: { label: string; cells: [string, string, string] }[] = [
  {
    label: "Upfront cost",
    cells: ["$0", "$1,450 – $5,900", "$6,000 – $35,000"],
  },
  {
    label: "Ongoing cost",
    cells: ["$15 – $50 / mo", "$89 / mo, optional", "$95 – $395 / mo"],
  },
  {
    label: "Your time",
    cells: ["30 – 60 hours", "About 2 hours", "10 – 20 hours of meetings"],
  },
  {
    label: "Who writes the words",
    cells: ["You do", "We do", "They do"],
  },
  {
    label: "Who sorts the photos",
    cells: ["You do", "We do, or direct you", "They do"],
  },
  {
    label: "Domain, hosting, email, SSL",
    cells: ["You figure it out", "Done for you, in your name", "Done, often billed on"],
  },
  {
    label: "Google Business Profile",
    cells: ["You figure it out", "Claimed and linked", "Usually extra"],
  },
  {
    label: "Design made for you",
    cells: ["A template thousands share", "Drawn from scratch", "Drawn from scratch"],
  },
  {
    label: "When something breaks",
    cells: ["A help forum", "Text us — same day", "A support ticket"],
  },
  {
    label: "Time until it's live",
    cells: ["Weeks, if you finish", "7 days – 3 weeks", "6 – 12 weeks"],
  },
];

export function Compare() {
  return (
    <section className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <SectionHead
          index="05"
          eyebrow="Honestly compared"
          title="There are three ways to do this. Two of them are fine."
          lede="A website builder genuinely works if you have the weekends to spare. An agency genuinely delivers if you have the budget. We built this for the gap in between — and the figures on either side are real market ranges, not straw men."
        />

        <Reveal delay={0.15} className="mt-12">
          <div className="overflow-x-auto rounded-2xl border border-edge">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <caption className="sr-only">
                Comparison of doing it yourself, this studio, and a design agency
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[22%] px-6 py-5" />
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      scope="col"
                      className={clsx(
                        "px-6 py-5 align-bottom",
                        i === 1 && "relative bg-neon/[0.06]"
                      )}
                    >
                      {i === 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-px bg-neon"
                        />
                      )}
                      <span
                        className={clsx(
                          "font-display text-xl",
                          i === 1 ? "text-paper" : "text-muted"
                        )}
                      >
                        {col}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-edge">
                    <th
                      scope="row"
                      className="px-6 py-4 font-mono text-[0.62rem] font-normal uppercase tracking-[0.14em] text-muted"
                    >
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={clsx(
                          "px-6 py-4 text-sm leading-snug",
                          i === 1 ? "bg-neon/[0.06] text-paper" : "text-muted"
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-5 text-xs leading-relaxed text-muted">
            Ranges for the outer columns are drawn from published 2026 industry pricing
            surveys. If you&apos;ve been quoted something well outside them, that&apos;s
            worth asking about — in either direction.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
