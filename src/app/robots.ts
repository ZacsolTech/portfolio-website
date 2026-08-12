import type { MetadataRoute } from "next";
import { site } from "@/lib/content";
import { absoluteUrl, siteUrl } from "@/lib/seo";

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
        disallow: ["/admin", "/admin/", "/api/", "/styleguide", "/thank-you"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host,
  };
}
