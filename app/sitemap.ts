import type { MetadataRoute } from "next";
import { demos } from "@/lib/demos";
import { site } from "@/site.config";

// Emitted as a real file by the static export.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${site.url}/subcontractors`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...demos.map((demo) => ({
      url: `${site.url}/demos/${demo.slug}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
