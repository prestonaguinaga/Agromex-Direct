import { BeforeAfter } from "@/components/BeforeAfter";
import { Contact } from "@/components/Contact";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Nav } from "@/components/Nav";
import { Pricing } from "@/components/Pricing";
import { Process } from "@/components/Process";
import { Promises } from "@/components/Promises";
import { Services } from "@/components/Services";
import { Statement } from "@/components/Statement";
import { Work } from "@/components/Work";
import { site } from "@/site.config";

const fullName = [site.name, site.nameSuffix].filter(Boolean).join(" ");

/** Structured data so search engines can read the business, not just the page. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: fullName,
  description: site.tagline,
  url: site.url,
  email: site.contact.email,
  ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
  areaServed: site.contact.location,
  priceRange: site.startingPrice,
  serviceType: "Web design and development for small businesses",
  sameAs: site.social.map((s) => s.href),
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
      <main id="main">
        <Hero />
        <Marquee />
        <Promises />
        <BeforeAfter />
        <Statement />
        <Services />
        <Work />
        <Process />
        <Pricing />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
