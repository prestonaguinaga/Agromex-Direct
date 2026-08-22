import clsx from "clsx";
import { Container, Reveal, SectionHead } from "./ui";

type Service = {
  title: string;
  body: string;
  detail: string[];
  span: string;
  icon: React.ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const SERVICES: Service[] = [
  {
    title: "Design that looks like your business",
    body: "No stock template with your logo dropped in the corner. We start from your room, your product, your handwriting on the chalkboard — and build the type, color and rhythm out from there.",
    detail: ["Custom layout", "Real photography direction", "Type & color system"],
    span: "md:col-span-2 md:row-span-2",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" />
      </svg>
    ),
  },
  {
    title: "Built to be found",
    body: "Local business schema, clean metadata, a real sitemap, and the Google Business Profile linked up properly.",
    detail: ["Local SEO", "Schema markup"],
    span: "md:col-span-2",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M16 16l4.5 4.5M4 11h14M11 4c4 4.5 4 9.5 0 14M11 4c-4 4.5-4 9.5 0 14" />
      </svg>
    ),
  },
  {
    title: "Fast on a bad connection",
    body: "Your customer is in a parking lot on one bar of signal. The page still loads before they give up.",
    detail: ["Sub-second loads", "Image optimization"],
    span: "",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z" />
      </svg>
    ),
  },
  {
    title: "You can change it yourself",
    body: "Change the hours, swap a price, post today's special. No ticket, no invoice, no waiting on us.",
    detail: ["Owner editing", "15-min handoff call"],
    span: "",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 10-3-3L5 17v3z" />
        <path d="M14.5 6.5l3 3" />
      </svg>
    ),
  },
  {
    title: "The parts that actually make money",
    body: "Booking, quote calculators, online ordering, menus that update, forms that reach your phone the second they're sent.",
    detail: ["Reservations", "Instant quotes", "Lead alerts"],
    span: "md:col-span-2",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4M8.5 14.5l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "We handle the boring parts",
    body: "Domain, hosting, SSL, business email, backups. You get the logins in a document you own.",
    detail: ["Domain & DNS", "Hosting & SSL", "You own everything"],
    span: "md:col-span-2",
    icon: (
      <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
        <rect x="3" y="4" width="18" height="7" rx="1.5" />
        <rect x="3" y="13" width="18" height="7" rx="1.5" />
        <path d="M7 7.5h.01M7 16.5h.01" />
      </svg>
    ),
  },
];

export function Services() {
  return (
    <section id="services" className="relative scroll-mt-24 py-20 sm:py-28">
      <Container>
        <SectionHead
          eyebrow="What you get"
          title="Everything a first website needs, and nothing it doesn't."
          lede="One build, one price, one point of contact. Here's what's inside every project."
        />

        <div className="mt-14 grid auto-rows-[minmax(0,auto)] gap-4 md:grid-cols-4">
          {SERVICES.map((service, i) => (
            <Reveal
              key={service.title}
              delay={(i % 3) * 0.08}
              className={clsx(
                "edge-lit group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-edge bg-ink-2/50 p-6 transition-colors duration-500 hover:bg-ink-3/70 sm:p-7",
                service.span
              )}
            >
              {/* Hover glow that tracks the card, not the cursor — cheap and calm. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-neon/[0.07] opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
              />

              <div className="relative">
                <div className="mb-6 grid size-10 place-items-center rounded-xl border border-edge bg-ink text-neon transition-transform duration-500 group-hover:-rotate-6">
                  <span className="block size-5">{service.icon}</span>
                </div>
                <h3 className="font-display text-2xl leading-tight text-balance">
                  {service.title}
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
                  {service.body}
                </p>
              </div>

              <ul className="relative mt-7 flex flex-wrap gap-2">
                {service.detail.map((d) => (
                  <li
                    key={d}
                    className="rounded-full border border-edge px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
