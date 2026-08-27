/**
 * AdSense is optional revenue on top of service leads.
 *
 * Ads stay dark until `NEXT_PUBLIC_ADSENSE_CLIENT` is a real `ca-pub-…` id.
 * That keeps empty ad boxes off the page (a policy violation) and stops a
 * missing publisher id from loading Google's script on every request.
 *
 * Auto ads: set the client id and turn Auto ads on in the AdSense dashboard.
 * Manual units: also set the slot env vars, then the `<ins>` tags render.
 */

export const adsenseClient =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";

export const adsEnabled = /^ca-pub-\d+$/.test(adsenseClient);

/** ads.txt wants `pub-…`, not `ca-pub-…`. */
export function adsensePublisherId(): string {
  return adsenseClient.replace(/^ca-/, "");
}

export const adsenseSlots = {
  inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE?.trim() ?? "",
  feed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED?.trim() ?? "",
  display: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY?.trim() ?? "",
} as const;

export type AdSlotId = keyof typeof adsenseSlots;

export function slotId(slot: AdSlotId): string {
  return adsenseSlots[slot];
}
