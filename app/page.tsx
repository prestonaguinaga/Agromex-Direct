import { BeforeAfter } from "@/components/BeforeAfter";
import { BriefBuilder } from "@/components/BriefBuilder";
import { BriefProvider } from "@/components/BriefContext";
import { Compare } from "@/components/Compare";
import { Contact } from "@/components/Contact";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { HardStuff } from "@/components/HardStuff";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Nav } from "@/components/Nav";
import { Pricing } from "@/components/Pricing";
import { Process } from "@/components/Process";
import { Promises } from "@/components/Promises";
import { Services } from "@/components/Services";
import { Statement } from "@/components/Statement";
import { Work } from "@/components/Work";
import { tiers } from "@/lib/pricing";
import { site } from "@/site.config";

const fullName = [site.name, site.nameSuffix].filter(Boolean).join(" ");

/** Structured data so search engines read the business, not just the page. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: fullName,
  description: site.tagline,
  url: site.url,
  email: site.contact.email,
  ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
  areaServed: site.contact.location,
  priceRange: `$${tiers[0].upfront}–$${tiers[tiers.length - 1].upfront}`,
  serviceType: "Web design and development for small businesses",
  sameAs: site.social.map((s) => s.href),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Website packages",
    itemListElement: tiers.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: tier.pitch,
      price: tier.upfront,
      priceCurrency: "USD",
    })),
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Serialised from a literal we control; no user input reaches this.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <BriefProvider>
        <main id="main">
          <Hero />
          <Marquee />
          <Promises />
          <BeforeAfter />
          <Statement />
          <HardStuff />
          <Services />
          <Work />
          <Compare />
          <Process />
          <BriefBuilder />
          <Pricing />
          <Faq />
          <Contact />
        </main>
      </BriefProvider>
      <Footer />
    </>
  );
}
