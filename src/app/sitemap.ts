import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const BASE = "https://www.styleguideai.com";

const PAGES = [
  { path: "/",          changeFrequency: "daily"   as const, priority: 1.0 },
  { path: "/rising",    changeFrequency: "hourly"  as const, priority: 0.9 },
  { path: "/museum",    changeFrequency: "weekly"  as const, priority: 0.9 },
  { path: "/stylebear", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/articles",  changeFrequency: "daily"   as const, priority: 0.8 },
  { path: "/styletarot",changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/styledice", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/consulting",changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/themes",    changeFrequency: "daily"   as const, priority: 0.6 },
  { path: "/about",     changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/privacy",   changeFrequency: "yearly"  as const, priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return PAGES.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${BASE}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }))
  );
}
