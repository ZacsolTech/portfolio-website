import { industries, services } from "@/lib/content";
import { BLOG_PATH } from "@/lib/blog";

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitePage = {
  /** Stable id: the path for code-defined pages. Also the SEO-override key. */
  id: string;
  path: string;
  type: "page" | "service" | "industry";
  title: string;
  excerpt?: string;
  priority: number;
  changeFrequency: ChangeFrequency;
};

/**
 * Every indexable page that is defined in code (blog posts come from Payload).
 * Shared by app/sitemap.ts and the ZACBOS connector so both see one list.
 *
 * `/consultant` and `/tools/estimator` are deliberately absent: they are
 * `noindex, follow` chat apps. See app/sitemap.ts.
 */
const FIXED: Omit<SitePage, "id" | "type">[] = [
  { path: "/", title: "Home", priority: 1, changeFrequency: "weekly" },
  { path: "/ai-consultant", title: "AI Consultant", priority: 0.95, changeFrequency: "weekly" },
  {
    path: "/software-cost-calculator",
    title: "Software cost calculator",
    priority: 0.95,
    changeFrequency: "weekly",
  },
  { path: "/services", title: "Services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/portfolio", title: "Portfolio", priority: 0.85, changeFrequency: "weekly" },
  { path: "/industries", title: "Industries", priority: 0.85, changeFrequency: "monthly" },
  { path: BLOG_PATH, title: "Blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/book", title: "Book a call", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contact", title: "Contact", priority: 0.75, changeFrequency: "monthly" },
  { path: "/about", title: "About us", priority: 0.7, changeFrequency: "monthly" },
  { path: "/privacy", title: "Privacy policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", title: "Terms of service", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cookies", title: "Cookie policy", priority: 0.2, changeFrequency: "yearly" },
];

export function sitePages(): SitePage[] {
  return [
    ...FIXED.map((page) => ({ ...page, id: page.path, type: "page" as const })),
    ...services.map((service) => ({
      id: `/services/${service.slug}`,
      path: `/services/${service.slug}`,
      type: "service" as const,
      title: service.title,
      excerpt: service.seo.description,
      priority: 0.85,
      changeFrequency: "monthly" as const,
    })),
    ...industries.map((industry) => ({
      id: `/industries/${industry.slug}`,
      path: `/industries/${industry.slug}`,
      type: "industry" as const,
      title: `${industry.name} software`,
      excerpt: industry.seo.description,
      priority: 0.75,
      changeFrequency: "monthly" as const,
    })),
  ];
}

/** SEO-override key for a blog post. Row id, so a slug change keeps its overrides. */
export function postPageId(id: string | number): string {
  return `post:${id}`;
}
