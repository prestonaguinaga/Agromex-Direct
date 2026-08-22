import type { Metadata } from "next";
import { Fraunces, Karla } from "next/font/google";
import { DemoBar } from "@/components/DemoBar";
import { HarvestTable } from "./Client";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harvest Table — demo build",
  description:
    "A working demonstration restaurant site: filterable menu, honest hours, and a reservation flow. Built to show what a first website can do.",
};

export default function Page() {
  return (
    <div className={`${fraunces.variable} ${karla.variable}`}>
      <DemoBar name="Harvest Table" />
      <HarvestTable />
    </div>
  );
}
