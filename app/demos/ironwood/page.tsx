import type { Metadata } from "next";
import { Anton, Barlow } from "next/font/google";
import { DemoBar } from "@/components/DemoBar";
import { Ironwood } from "./Client";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ironwood Roofing — demo build",
  description:
    "A working demonstration contractor site with a live instant-quote estimator, service area and warranty detail.",
};

export default function Page() {
  return (
    <div className={`${anton.variable} ${barlow.variable}`}>
      <DemoBar name="Ironwood Roofing" />
      <Ironwood />
    </div>
  );
}
