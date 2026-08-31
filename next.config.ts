import type { NextConfig } from "next";

// Set by the GitHub Pages workflow to "/Agromex-Direct" so the site works
// at https://<user>.github.io/Agromex-Direct/. Empty for local dev and any
// host that serves from the domain root (Netlify, Cloudflare Pages…).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Emits a plain folder of HTML/CSS/JS into `out/` — no Node server needed.
  // That's what makes this hostable on GitHub Pages, Netlify Drop, Cloudflare
  // Pages, Surge or any static host's free tier.
  output: "export",

  // Writes /project/index.html rather than /project.html, so static hosts
  // resolve the URLs without per-host rewrite rules.
  trailingSlash: true,

  images: { unoptimized: true },

  basePath,
};

export default nextConfig;
