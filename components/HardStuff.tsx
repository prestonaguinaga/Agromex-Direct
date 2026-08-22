import { Container, Reveal, SectionHead } from "./ui";

/**
 * The section people respond to hardest: naming, in plain language, every chore
 * a first website actually involves — then taking all of them off the table.
 */
const CHORES = [
  ["Buying the domain", "Registered in your name, not ours. We just do the buying."],
  ["DNS and the nameservers", "The part that breaks everything if one field is wrong."],
  ["Hosting and SSL", "Set up, paid, renewed. The padlock in the address bar stays on."],
  ["Business email", "you@yourshop.com instead of a Gmail address with numbers in it."],
  ["Google Business Profile", "Claimed, verified, hours filled in, photos uploaded, linked."],
  ["Writing the words", "We interview you for twenty minutes and write it from that."],
  ["Getting photos worth using", "A shot list for your phone — or we come and shoot it."],
  ["Compressing every image", "So the page loads on one bar of signal in a parking lot."],
  ["Making it work on phones", "Tested on real handsets, not just resized in a browser."],
  ["Accessibility", "Contrast, labels, keyboard navigation. It's also the law in most places."],
  ["Schema and metadata", "The invisible markup that tells Google what you are and where."],
  ["The sitemap and search console", "Submitted, indexed, monitored. You don't need to know what that means."],
  ["Form spam", "Filtered, so your phone doesn't buzz at 3am for a fake enquiry."],
  ["Backups", "Nightly. Restorable. You will never think about this."],
  ["Analytics", "Set up to answer one question: is this thing bringing people in?"],
  ["Privacy and cookie pages", "Written, accurate, and matched to what your site actually does."],
];

const FROM_YOU = [
  {
    n: "01",
    title: "Twenty minutes on the phone",
    body: "What you do, who walks in, what you wish the site would handle for you. That's the entire discovery process.",
  },
  {
    n: "02",
    title: "Whatever photos you already have",
    body: "Phone photos are fine — often better than stock. Got none? Say so and we'll either art-direct a shot list or come and take them.",
  },
  {
    n: "03",
    title: "Your logo, if one exists",
    body: "A napkin sketch, a sign photo, an old business card. If there's nothing at all, we'll design one and it's yours.",
  },
];

export function HardStuff() {
  return (
    <section id="hard-stuff" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <SectionHead
          index="02"
          eyebrow="The hard part"
          title="You've got a business to run. We'll do the rest of it."
          lede="Most people who never get a website don't stop because of the design. They stop at the domain, or the hosting, or the third email about nameservers. So we took the whole list."
        />

        {/* The list of chores */}
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-edge bg-edge sm:grid-cols-2">
          {CHORES.map(([title, body], i) => (
            <Reveal
              key={title}
              delay={(i % 4) * 0.05}
              className="group flex gap-4 bg-ink px-6 py-5 transition-colors duration-500 hover:bg-ink-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-neon"
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                <path
                  d="M4.75 8.25l2.25 2.25L11.25 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-6 text-center font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
            Sixteen jobs · All of them ours · None of them billed separately
          </p>
        </Reveal>

        {/* What we need back */}
        <div className="mt-16">
          <Reveal>
            <h3 className="font-display text-3xl leading-tight sm:text-4xl">
              And here is the entire list of what we need{" "}
              <span className="text-neon">from you</span>.
            </h3>
          </Reveal>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FROM_YOU.map((item, i) => (
              <Reveal
                key={item.n}
                delay={i * 0.09}
                className="edge-lit relative flex flex-col rounded-2xl border border-edge bg-ink-2/50 p-7"
              >
                <span className="font-mono text-xs tracking-[0.2em] text-neon">{item.n}</span>
                <h4 className="mt-4 font-display text-2xl leading-tight">{item.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
