import type { MetadataRoute } from "next";

const BASE = "https://fondof.netlify.app";

/**
 * Dynamic sitemap. Static pages are listed directly.
 * Dynamic pages (/s/[hash], /from/[source], /u/[login]) are discovered
 * via the API at build time — for now we list the static core and
 * let search engines discover dynamic pages via internal links.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const genres = [
    "reliability",
    "performance",
    "architecture",
    "security",
    "developer-tools",
    "product-and-ux",
    "data-and-state",
    "team-practice",
  ];

  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE}/pool`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE}/forge`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    ...genres.map((genre) => ({
      url: `${BASE}/discover/${genre}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
