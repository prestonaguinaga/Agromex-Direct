import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import { site } from "@/site.config";
import "./globals.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const fullName = [site.name, site.nameSuffix].filter(Boolean).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${fullName} — ${site.tagline}`,
    template: `%s — ${fullName}`,
  },
  description: `${fullName} designs and builds fast, modern websites for small businesses that don't have one yet. Free mockup before you pay anything. Launch from ${site.startingPrice}.`,
  keywords: [
    "web design for small business",
    "website for local business",
    "small business website design",
    "restaurant website design",
    "contractor website design",
    "affordable website design",
  ],
  openGraph: {
    type: "website",
    url: site.url,
    siteName: fullName,
    title: `${fullName} — ${site.tagline}`,
    description: `Fast, modern websites for businesses that don't have one yet. See a free mockup of your site before you pay anything.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${fullName} — ${site.tagline}`,
    description: `Fast, modern websites for businesses that don't have one yet.`,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${familjen.variable} ${jetbrains.variable}`}
    >
      <body className="grain antialiased">{children}</body>
    </html>
  );
}
