export type Demo = {
  slug: string;
  name: string;
  trade: string;
  /** Shown on the card — what this build proves we can do. */
  premise: string;
  /** The one interactive thing a visitor should go press. */
  highlight: string;
  features: string[];
  /** Card swatch colors — deliberately not the studio palette, to show range. */
  swatch: { bg: string; ink: string; accent: string };
  buildTime: string;
};

export const demos: Demo[] = [
  {
    slug: "harvest-table",
    name: "Harvest Table",
    trade: "Restaurant",
    premise:
      "A dinner-first menu that filters in place, hours that tell the truth, and a reservation that lands on the host's phone.",
    highlight: "Filter the menu by course and dietary need",
    features: ["Live menu filtering", "Reservation form", "Tonight's hours"],
    swatch: { bg: "#171210", ink: "#f6ece0", accent: "#e8873c" },
    buildTime: "9 days",
  },
  {
    slug: "ironwood",
    name: "Ironwood Roofing",
    trade: "Contractor",
    premise:
      "Homeowners want a number before they'll call. This one gives them a real range in thirty seconds, then books the inspection.",
    highlight: "Run the instant quote estimator",
    features: ["Instant quote calculator", "Service area map", "Emergency call-out"],
    swatch: { bg: "#101215", ink: "#eef1f4", accent: "#f5c518" },
    buildTime: "11 days",
  },
  {
    slug: "lumen",
    name: "Lumen Studio",
    trade: "Salon & spa",
    premise:
      "A light, unhurried booking flow — pick a service, pick a stylist, pick a time — that finishes in three taps.",
    highlight: "Book an appointment end to end",
    features: ["3-step booking flow", "Stylist profiles", "Gift cards"],
    swatch: { bg: "#f7f3ef", ink: "#2a2420", accent: "#b08968" },
    buildTime: "8 days",
  },
];

export function getDemo(slug: string): Demo | undefined {
  return demos.find((d) => d.slug === slug);
}
