/**
 * Edit these to match what you actually charge. Every price on the site is
 * read from here (plus `startingPrice` in site.config.ts, which should match
 * the first tier).
 */
export const tiers = [
  {
    name: "Storefront",
    price: "$1,200",
    cadence: "one-time",
    pitch: "For a business that needs to exist online, properly, this month.",
    features: [
      "One long-scroll page, designed for phones first",
      "Contact form that reaches your phone",
      "Google Business Profile set up and linked",
      "Domain, hosting and SSL — first year included",
      "3 rounds of revisions",
    ],
    cta: "Start here",
    featured: false,
  },
  {
    name: "Full Build",
    price: "$2,800",
    cadence: "one-time",
    pitch: "The one most businesses need. A real site, plus the one feature that earns.",
    features: [
      "Everything in Storefront",
      "5–7 pages, written with you",
      "One revenue feature: booking, menu, ordering or instant quotes",
      "Photo direction — we tell you exactly what to shoot",
      "Local SEO and schema markup",
      "Business email on your own domain",
    ],
    cta: "Most businesses pick this",
    featured: true,
  },
  {
    name: "Everything",
    price: "$5,500",
    cadence: "starting at",
    pitch: "Multiple locations, a real store, or something nobody's built for your trade yet.",
    features: [
      "Everything in Full Build",
      "Online ordering or full e-commerce",
      "Multi-location pages and hours",
      "Custom integrations — POS, CRM, scheduling",
      "Copywriting for every page",
      "Ongoing priority support",
    ],
    cta: "Let's scope it",
    featured: false,
  },
] as const;
