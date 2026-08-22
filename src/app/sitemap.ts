import type { MetadataRoute } from "next";
import { industries, insights, portfolio, services } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";

/**
 * Only indexable URLs belong here.
 *
 * `/consultant` and `/tools/estimator` are deliberately absent: they are
 * `noindex, follow` chat apps, and listing a page you have asked not to be
 * indexed is a contradictory signal that costs crawl budget on every fetch.
 * Their indexable counterparts — `/ai-consultant` and
 * `/software-cost-calculator` — carry the priority instead.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/ai-consultant", priority: 0.95, changeFrequency: "weekly" as const },
    {
      path: "/software-cost-calculator",
      priority: 0.95,
      changeFrequency: "weekly" as const,
    },
    { path: "/services", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/portfolio", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/industries", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/insights", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/book", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path || "/"),
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const serviceRoutes = services.map((s) => ({
    url: absoluteUrl(`/services/${s.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const industryRoutes = industries.map((i) => ({
    url: absoluteUrl(`/industries/${i.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  /* Query-string URLs, because `/portfolio/:slug` permanently redirects here.
     They stay listed so the redirect target is what gets crawled. */
  const portfolioRoutes = portfolio.map((p) => ({
    url: absoluteUrl(`/portfolio?project=${p.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const insightRoutes = insights.map((i) => ({
    url: absoluteUrl(`/insights/${i.slug}`),
    lastModified: new Date(i.date),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...industryRoutes,
    ...portfolioRoutes,
    ...insightRoutes,
  ];
}
