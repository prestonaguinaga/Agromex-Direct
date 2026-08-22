import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { DemoBar } from "@/components/DemoBar";
import { Lumen } from "./Client";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumen Studio — demo build",
  description:
    "A working demonstration salon and spa site with a three-step booking flow, stylist profiles and gift cards.",
};

export default function Page() {
  return (
    <div className={`${cormorant.variable} ${jost.variable}`}>
      <DemoBar name="Lumen Studio" />
      <Lumen />
    </div>
  );
}
