import type { Metadata, Viewport } from "next";
import { Michroma, Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const michroma = Michroma({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-michroma",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-splinemono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AGROMEX — Construction Quote Sheet",
    template: "%s — AGROMEX",
  },
  description:
    "Quote construction projects fast: itemized material sheets with product links, price options, takeoff estimators and printable quotes. Everything saves in your browser.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbfbf9",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${michroma.variable} ${archivo.variable} ${splineMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
