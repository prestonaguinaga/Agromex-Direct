/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SINGLE SOURCE OF TRUTH FOR YOUR BRAND
 * ─────────────────────────────────────────────────────────────────────────────
 *  "OPENSIGN" is a placeholder. To rebrand the entire site, change the values
 *  in this file only. Nothing else hardcodes the business name.
 *
 *  Colors live in app/globals.css under the @theme block.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type SiteConfig = {
  name: string;
  nameSuffix: string;
  tagline: string;
  url: string;
  contact: { email: string; phone: string; location: string };
  social: { label: string; href: string }[];
  promises: { value: string; unit: string; label: string; prefix?: string }[];
  startingPrice: string;
  formEndpoint: string;
};

export const site: SiteConfig = {
  /** Shown in the nav, the neon hero sign, page titles and the footer. */
  name: "OPENSIGN",
  /** Optional second word rendered lighter after the name. Set to "" to hide. */
  nameSuffix: "STUDIO",
  /** One line. Used in <meta description> and under the hero sign. */
  tagline: "Websites for businesses the internet can't find yet.",
  /** Deployed URL. Update after your first deploy — used for SEO + sitemap. */
  url: "https://opensign.studio",

  contact: {
    email: "hello@opensign.studio",
    /** Set to "" to hide the phone link everywhere. */
    phone: "",
    /** Free-text. Used in the footer + local-business schema. */
    location: "Remote — serving businesses across North America",
  },

  social: [
    // Delete any you don't use; the footer renders whatever is left.
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "LinkedIn", href: "https://linkedin.com/" },
  ],

  /**
   * Your own service promises. These are claims YOU control and can stand
   * behind — deliberately not third-party market statistics, so there is
   * nothing here you'd have to source or defend.
   */
  promises: [
    { value: "72", unit: "hr", label: "First design in your inbox" },
    { value: "100", unit: "/100", label: "Target Lighthouse performance score" },
    { value: "3", unit: "×", label: "Revision rounds included, every build" },
    { value: "0", prefix: "$", unit: "", label: "Cost to see a mockup of your site" },
  ],

  /** Starting price shown in the hero + pricing section. */
  startingPrice: "$1,200",

  /**
   * Where the contact form posts. The site is a static export, so there is no
   * server of ours to receive it — a free form service does the job.
   *
   * Sign up at formspree.io (free tier: 50 submissions/month), create a form,
   * and paste its endpoint here. Basin and Web3Forms work identically.
   *
   *   formEndpoint: "https://formspree.io/f/xxxxxxxx",
   *
   * Left empty, the form still works: it opens the visitor's email app with
   * every field already filled in and addressed to you. Nothing is lost — but
   * setting the endpoint is a smoother experience, so do it before launch.
   */
  formEndpoint: "",
};

export type Site = SiteConfig;
