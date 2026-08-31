import type { MetadataRoute } from "next";

// Emitted as a real file by the static export. The quote tool is a private
// utility — keep crawlers out.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
