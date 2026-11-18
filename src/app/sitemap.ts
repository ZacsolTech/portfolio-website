import type { MetadataRoute } from "next";
import { portfolio } from "@/lib/content";
import { blogPath } from "@/lib/blog";
import { getPublishedPosts } from "@/lib/blog/store";
import { absoluteUrl } from "@/lib/seo";
import { getNoindexPageIds } from "@/lib/seo-overrides";
import { postPageId, sitePages } from "@/lib/site-pages";

/**
 * Only indexable URLs belong here.
 *
 * `/consultant` and `/tools/estimator` are deliberately absent: they are
 * `noindex, follow` chat apps, and listing a page you have asked not to be
 * indexed is a contradictory signal that costs crawl budget on every fetch.
 * Their indexable counterparts — `/ai-consultant` and
 * `/software-cost-calculator` — carry the priority instead.
 *
 * For the same reason, any page set to noindex from ZACBOS is dropped.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const hidden = await getNoindexPageIds();

  const pageRoutes: MetadataRoute.Sitemap = sitePages()
    .filter((page) => !hidden.has(page.id))
    .map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }));

  /* Query-string URLs, because `/portfolio/:slug` permanently redirects here.
     They stay listed so the redirect target is what gets crawled. */
  const portfolioRoutes = portfolio.map((p) => ({
    url: absoluteUrl(`/portfolio?project=${p.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const articles = await getPublishedPosts();
  const insightRoutes = articles
    .filter((article) => !article.id || !hidden.has(postPageId(article.id)))
    .map((article) => ({
      url: absoluteUrl(blogPath(article.slug)),
      lastModified: new Date(article.date),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));

  return [...pageRoutes, ...portfolioRoutes, ...insightRoutes];
}
