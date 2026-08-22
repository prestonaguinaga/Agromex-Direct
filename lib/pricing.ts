/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PRICING
 * ─────────────────────────────────────────────────────────────────────────────
 *  Set against 2026 market rates (sources in README.md):
 *
 *    Freelance project builds ......... $1,500 – $8,000
 *    Boutique agency builds ........... $6,000 – $35,000
 *    Typical professional small-biz site  $2,000 – $8,000
 *    Subscription / "website as a service" $100 – $400 per month
 *    Full-service care plans .......... $95 – $195 per month
 *
 *  These sit deliberately at the lower end of the freelance band — competitive
 *  without reading as bargain-bin, which is its own kind of warning sign to a
 *  business owner.
 *
 *  The monthly figure is the build spread over twelve months with hosting and
 *  the care plan folded in. It costs a little more across year one than paying
 *  up front — that difference is stated plainly on the page rather than buried,
 *  because a business owner who spots it themselves stops trusting the rest.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Tier = {
  name: string;
  /** Paid once, before launch. */
  upfront: number;
  /** Per month for 12 months, then drops to `careAfter`. */
  monthly: number;
  /** The care-plan rate once the 12 months are up. */
  careAfter: number;
  pitch: string;
  pages: string;
  timeline: string;
  features: string[];
  cta: string;
  featured: boolean;
};

export const tiers: Tier[] = [
  {
    name: "Storefront",
    upfront: 1450,
    monthly: 219,
    careAfter: 89,
    pitch: "For a business that needs to exist online, properly, this month.",
    pages: "One page",
    timeline: "Live in 7–10 days",
    features: [
      "One long-scroll page, designed for phones first",
      "Contact form that reaches your phone",
      "Google Business Profile claimed, filled in and linked",
      "Domain, hosting, SSL and business email — set up for you",
      "Local SEO groundwork and schema markup",
      "3 rounds of revisions",
    ],
    cta: "Start here",
    featured: false,
  },
  {
    name: "Full Build",
    upfront: 2950,
    monthly: 349,
    careAfter: 89,
    pitch: "What most businesses actually need — a real site, plus the one thing on it that earns.",
    pages: "5–7 pages",
    timeline: "Live in 2–3 weeks",
    features: [
      "Everything in Storefront",
      "5–7 pages, written with you — not filled with placeholder text",
      "One revenue feature: booking, menu, ordering or instant quotes",
      "Photo direction — a shot list telling you exactly what to point a phone at",
      "Copywriting for every page",
      "Analytics, so you can see what people actually do",
      "Unlimited revisions until launch day",
    ],
    cta: "Most businesses pick this",
    featured: true,
  },
  {
    name: "Growth",
    upfront: 5900,
    monthly: 639,
    careAfter: 129,
    pitch: "Multiple locations, a real store, or something nobody has built for your trade yet.",
    pages: "Unlimited",
    timeline: "Live in 4–6 weeks",
    features: [
      "Everything in Full Build",
      "Online ordering or full e-commerce",
      "Multi-location pages, hours and service areas",
      "Custom integrations — POS, CRM, scheduling, inventory",
      "A half-day photo and content session, run by us",
      "Priority support and quarterly reviews for the first year",
    ],
    cta: "Let's scope it",
    featured: false,
  },
];

/** Bolt-ons. Priced so nobody has to move up a tier for one missing thing. */
export const addOns = [
  { name: "Extra page", price: "$180", note: "Designed and written, not duplicated" },
  { name: "Online ordering", price: "$1,200", note: "Up to 50 items, card payments live" },
  { name: "Booking & scheduling", price: "$650", note: "Syncs to the calendar you already use" },
  { name: "Copywriting", price: "$220 / page", note: "We interview you, you approve it" },
  { name: "Logo & brand kit", price: "$750", note: "Logo, colours, type, and the files to use them" },
  { name: "Photo session", price: "$400", note: "Half a day on site, edited and delivered" },
  { name: "Extra location page", price: "$350", note: "Own hours, own map, own search listing" },
  { name: "Rush delivery", price: "+35%", note: "Live inside 7 days, front of the queue" },
];

/** What the care plan buys once the build is paid off. */
export const carePlan = {
  price: 89,
  includes: [
    "Hosting, SSL and domain renewals — handled",
    "Backups nightly, restore on request",
    "Uptime monitoring, and we notice before you do",
    "Security patches and software updates",
    "Small content changes — text us, it's done same day",
    "A plain-English traffic report every month",
  ],
};
