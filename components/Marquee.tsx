const TRADES = [
  "Restaurants",
  "Roofers",
  "Salons",
  "Dentists",
  "Auto shops",
  "Gyms",
  "Landscapers",
  "Cafés",
  "Law offices",
  "Bakeries",
  "Plumbers",
  "Photographers",
  "Electricians",
  "Florists",
];

/**
 * Infinite ticker. The track holds two identical copies and translates by
 * exactly -50%, so the seam is never visible and no JS is involved.
 */
export function Marquee() {
  return (
    <section
      aria-label="Types of businesses we build for"
      className="relative border-y border-edge bg-ink-2/40 py-5"
    >
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max items-center gap-10">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
              {TRADES.map((trade) => (
                <span
                  key={trade}
                  className="flex shrink-0 items-center gap-10 font-mono text-xs uppercase tracking-[0.2em] text-muted"
                >
                  {trade}
                  <span className="size-1 rotate-45 bg-neon/60" aria-hidden="true" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
