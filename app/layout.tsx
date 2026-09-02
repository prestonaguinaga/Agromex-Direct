import type { Metadata, Viewport } from "next";
import { Michroma, Archivo, Spline_Sans_Mono } from "next/font/google";
import { appConfig } from "@/app.config";
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
    default: appConfig.appName,
    template: `%s — ${appConfig.appName}`,
  },
  description:
    `${appConfig.company.name} — projects, estimates, budgets, checklists, notes and progress photos, shared by the whole team.`,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0a",
  colorScheme: "dark",
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
