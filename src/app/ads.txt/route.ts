import { adsEnabled, adsensePublisherId } from "@/lib/ads";

/**
 * Google requires ads.txt at the site root before AdSense will serve.
 * Generated from the same publisher id as the script, so it cannot drift.
 */
export function GET() {
  if (!adsEnabled) {
    return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const body = `google.com, ${adsensePublisherId()}, DIRECT, f08c47fec0942fa0\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
