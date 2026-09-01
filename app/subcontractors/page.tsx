import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { SubcontractorForm } from "./Client";

export const metadata: Metadata = {
  title: "Subcontractors",
  description:
    "Take on subcontract work with us. One form covers your trade, experience, rates and availability — and it lands in front of the person who assigns jobs.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <main id="main" className="pt-[var(--nav-h)]">
        <SubcontractorForm />
      </main>
      <Footer />
    </>
  );
}
