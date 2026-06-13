import type { MetadataRoute } from "next";

const BASE = "https://styleguideai.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/museum`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/stylebear`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/styletarot`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/styledice`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/articles`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/themes`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/consulting`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
