import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { absoluteUrl, siteUrl } from "@/lib/seo";

/**
 * Paths that must never be crawled.
 *
 * `/roadmap/` and `/book/manage/` are bearer-token URLs holding a named
 * person and a price — they carry `noindex` headers too, but a crawler that
 * never requests them cannot leak them through a referrer or a cache either.
 */
const PRIVATE_PATHS = [
  "/admin",
  "/admin/",
  "/api/",
  "/roadmap/",
  "/book/manage/",
  "/thank-you",
  "/styleguide",
];

/**
 * Assistant and answer-engine crawlers, allowed on purpose.
 *
 * A meaningful share of buying research now happens inside an assistant rather
 * than a results page, and being absent from the index those assistants read
 * is the 2026 equivalent of being absent from Google. They get the same access
 * as a search crawler and the same private-path exclusions — the trade is
 * visibility in answers for content we already publish for free.
 */
const ASSISTANT_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "cohere-ai",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  let host = site.domain;
  try {
    host = new URL(siteUrl).host;
  } catch {
    /* keep default */
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...ASSISTANT_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
      /* Scrapers that take content wholesale and send nothing back. Blocking
         them is a bandwidth and licensing decision, not a ranking one. */
      {
        userAgent: ["CCBot", "Bytespider", "ImagesiftBot", "Diffbot", "Omgilibot"],
        disallow: "/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host,
  };
}
