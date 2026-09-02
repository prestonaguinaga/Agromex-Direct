import type { NextConfig } from "next";

/**
 * Monarch Admin runs as a server-rendered Next.js app (Vercel or any Node
 * host). The former `output: "export"` static mode is gone: route
 * protection, auth callbacks and the invitation API need a server.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // Bookmarks from the browser-only estimator.
      { source: "/project", destination: "/projects", permanent: false },
      { source: "/project/:path*", destination: "/projects", permanent: false },
    ];
  },
};

export default nextConfig;
