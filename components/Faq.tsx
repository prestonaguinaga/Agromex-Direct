"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Container, Reveal, SectionHead } from "./ui";

type Faq = { group: Group; q: string; a: string };
type Group = "Money" | "The work" | "Owning it" | "Getting found";

const GROUPS: Group[] = ["Money", "The work", "Owning it", "Getting found"];

const FAQS: Faq[] = [
  /* ── Money ─────────────────────────────────────────────────────────── */
  {
    group: "Money",
    q: "What does it really cost, all in?",
    a: "The number on the pricing table is the number. A Full Build is $2,950 once, or $349 a month for a year — and that includes the domain, the hosting, the SSL certificate and your business email for the first year, which most quotes leave off and bill you for later. After launch the only ongoing cost is the $89 care plan, and that's optional. There is no setup fee, no discovery fee, and no charge for the revisions.",
  },
  {
    group: "Money",
    q: "Why is this cheaper than the agency quote I got?",
    a: "Because you're not paying for an account manager, an office, or a six-week discovery phase that ends in a slide deck. Agencies quote $6,000 to $35,000 for a small business site and a lot of that is overhead you'd never see. We're small, we've done this shape of project many times, and we've cut the parts that don't make the site better. What you're buying is the same thing at the other end.",
  },
  {
    group: "Money",
    q: "Should I pay once or monthly?",
    a: "Pay once if you have the cash — it's cheaper overall by roughly one month's payment. Pay monthly if writing a four-figure cheque before the site has earned you anything feels reckless, which is a completely reasonable position. The monthly option has no credit check and no interest, includes hosting and care for the twelve months, and you can settle the balance early whenever you like.",
  },
  {
    group: "Money",
    q: "Do I have to pay anything to see a design?",
    a: "No. The first design is free and there's no deposit to get it. That exists specifically so nobody has to gamble money on whether we can do this. If you don't like what comes back, you keep it and we part on good terms.",
  },
  {
    group: "Money",
    q: "What if it costs more than the quote?",
    a: "Then we eat it, unless you asked for something new mid-build — and in that case we tell you the price before we touch it, and you decide. The quote is a fixed price, not an estimate. No hourly billing means there's no mechanism for it to quietly inflate.",
  },

  /* ── The work ──────────────────────────────────────────────────────── */
  {
    group: "The work",
    q: "I don't have any good photos.",
    a: "Most first-time clients don't, and it's the single biggest thing holding a site back. We give you a shot list — eight to twelve specific photos, what to point the phone at, what time of day, what to keep out of frame. Phone photos taken properly beat stock images every time, because people can tell. If you'd rather not, a photo session is $400 and we come to you.",
  },
  {
    group: "The work",
    q: "I'm no good at writing about myself.",
    a: "Almost nobody is. We interview you for twenty minutes, record it with your permission, and write the site from how you actually talk about the business. Then you read it and tell us what's wrong. That's included in the Full Build and above — you never face a blank page.",
  },
  {
    group: "The work",
    q: "How long does it take?",
    a: "A single-page Storefront is live in seven to ten days. A Full Build is two to three weeks. Growth projects run four to six. The clock is almost always waiting on us, not you — the only thing that reliably slows a project down is photos, which is why we push on them early.",
  },
  {
    group: "The work",
    q: "What if I don't like the design?",
    a: "Tell us plainly and we change it. Full Build and above include unlimited revisions right up to launch day, because a fixed number of rounds just teaches people to hoard their feedback. If the very first mockup misses completely, you can walk away having paid nothing.",
  },
  {
    group: "The work",
    q: "I'm not technical at all. Is that a problem?",
    a: "It's the normal case, and none of the process requires you to be. There's no software to learn, no account to configure, nothing to install. You answer questions and look at pictures. The only technical thing you'll ever do is decide whether you want to update your own hours — and if you don't, you text us and we do it.",
  },

  /* ── Owning it ─────────────────────────────────────────────────────── */
  {
    group: "Owning it",
    q: "Do I actually own the site when it's done?",
    a: "Completely. The domain is registered in your name, the hosting account is yours, and you get a document with every login in it. There's no clause anywhere that keeps it hostage. If you want to move the whole thing to another provider next year, you can, and we'll help you do it rather than make it difficult.",
  },
  {
    group: "Owning it",
    q: "What happens if I cancel the care plan?",
    a: "Nothing happens to your site. It stays up, on your domain, in your hosting account. You stop getting the backups, the monitoring and the same-day content changes, and that's the entire difference. A care plan that switches your website off isn't a care plan, it's a hostage situation.",
  },
  {
    group: "Owning it",
    q: "What if you go out of business?",
    a: "Fair question, and one worth asking anyone you hire. Everything is in your name already — domain, hosting, email, Google listing — so nothing goes dark if we do. The site is built on standard technology that any competent developer can pick up. We're not a lock-in you'd have to escape.",
  },
  {
    group: "Owning it",
    q: "Can I update it myself?",
    a: "Yes. Changing hours, swapping a price, posting today's special — it works like editing a document, and we spend a screen-share session walking you through it before launch. Prefer never to touch it? Send us a message and it's done the same day. That's included for the first three months regardless of which tier you pick.",
  },

  /* ── Getting found ─────────────────────────────────────────────────── */
  {
    group: "Getting found",
    q: "How fast will I show up on Google?",
    a: "Straight answer: a brand-new site doesn't rank overnight, and anyone promising you a top spot in a week is selling something. What we control is the foundation — you get indexed properly, your Google Business Profile gets claimed, verified and linked, and the technical markup is right from day one. In our experience the Business Profile produces phone calls well before the website itself starts pulling search traffic.",
  },
  {
    group: "Getting found",
    q: "I already have a Facebook page. Isn't that enough?",
    a: "It's a start, but you're renting. Facebook decides who sees your posts, what your page looks like, and whether a competitor's ad sits next to it. A website is the one place online you own outright — your domain, your phone number, your booking, no algorithm in between. Keep the Facebook page. Point it at the site.",
  },
  {
    group: "Getting found",
    q: "Do I need to write a blog?",
    a: "No, and we'd rather you didn't than do it badly for two months and abandon it. For most local businesses the things that actually move search rankings are a claimed Google Business Profile, consistent contact details everywhere, real reviews and a site that loads fast on a phone. All four are handled in the build.",
  },
  {
    group: "Getting found",
    q: "Will it work on phones?",
    a: "It's designed on phones first and tested on real handsets, because that's where most of your customers will see it — usually standing somewhere with bad signal, deciding whether to call you. That's the case we optimise for, not the desktop mockup.",
  },
];

export function Faq() {
  const [group, setGroup] = useState<Group | "All">("All");
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  const shown = useMemo(
    () => (group === "All" ? FAQS : FAQS.filter((f) => f.group === group)),
    [group]
  );

  return (
    <section id="faq" className="relative scroll-mt-24 py-20 sm:py-28">
      <div aria-hidden="true" className="rule mx-auto mb-20 max-w-6xl" />
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead
              index="09"
              eyebrow="Straight answers"
              title="Everything people ask before they say yes."
              lede="Eighteen questions we get on nearly every first call, answered the way we'd answer them on the phone. If yours isn't here, ask it — we'd rather answer than have you wonder."
            />

            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-wrap gap-2">
                {(["All", ...GROUPS] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGroup(g)}
                    aria-pressed={group === g}
                    className={clsx(
                      "rounded-full border px-4 py-2 text-xs transition-all duration-200",
                      group === g
                        ? "border-neon/60 bg-neon/10 text-paper"
                        : "border-edge text-muted hover:border-white/25 hover:text-paper"
                    )}
                  >
                    {g}
                    <span className="ml-2 font-mono text-[0.6rem] text-muted">
                      {g === "All" ? FAQS.length : FAQS.filter((f) => f.group === g).length}
                    </span>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <ul className="border-t border-edge">
              {shown.map((faq) => {
                const isOpen = open === faq.q;
                return (
                  <li key={faq.q} className="border-b border-edge">
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : faq.q)}
                        aria-expanded={isOpen}
                        className="group flex w-full items-start justify-between gap-6 py-5 text-left"
                      >
                        <span className="flex flex-col gap-1.5">
                          {group === "All" && (
                            <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-neon/70">
                              {faq.group}
                            </span>
                          )}
                          <span
                            className={clsx(
                              "font-display text-xl leading-snug transition-colors duration-300 sm:text-2xl",
                              isOpen ? "text-paper" : "text-paper/75 group-hover:text-paper"
                            )}
                          >
                            {faq.q}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "relative mt-1.5 grid size-7 shrink-0 place-items-center rounded-full border transition-all duration-300",
                            isOpen
                              ? "rotate-45 border-neon text-neon"
                              : "border-edge text-muted group-hover:border-white/25"
                          )}
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path
                              d="M5.5 1v9M1 5.5h9"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </button>
                    </h3>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-prose pb-6 pr-10 text-pretty text-sm leading-relaxed text-muted">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
