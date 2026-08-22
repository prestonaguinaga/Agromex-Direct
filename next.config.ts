import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Emits a plain folder of HTML/CSS/JS into `out/` — no Node server needed.
  // That's what makes this hostable on Netlify Drop, GitHub Pages, Cloudflare
  // Pages, Surge or any static host's free tier.
  output: "export",

  // Writes /demos/lumen/index.html rather than /demos/lumen.html, so static
  // hosts resolve the URLs without per-host rewrite rules.
  trailingSlash: true,

  images: { unoptimized: true },
};

export default nextConfig;
