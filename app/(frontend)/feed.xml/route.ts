import { insights, site } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Insights RSS — off-page discovery + Google / Feedly syndication. */
export async function GET() {
  const items = [...insights].sort((a, b) => (a.date < b.date ? 1 : -1));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)} Insights</title>
    <link>${escapeXml(absoluteUrl("/insights"))}</link>
    <description>${escapeXml(site.newsletterBlurb)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(absoluteUrl(`/insights/${item.slug}`))}</link>
      <guid isPermaLink="true">${escapeXml(absoluteUrl(`/insights/${item.slug}`))}</guid>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.excerpt)}</description>
    </item>`,
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
