"use client";

import { useEffect, useRef } from "react";
import { adsEnabled, adsenseClient, slotId, type AdSlotId } from "@/lib/ads";

type Props = {
  slot: AdSlotId;
  format?: "auto" | "fluid";
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A manual AdSense unit. Renders nothing unless ads are on *and* this slot
 * has an id — empty `<ins>` boxes are a policy problem, not a layout one.
 */
export function AdSlot({ slot, format = "auto", className }: Props) {
  const adSlot = slotId(slot);
  const pushed = useRef(false);

  useEffect(() => {
    if (!adsEnabled || !adSlot || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* Ad blockers throw; the page should not. */
    }
  }, [adSlot]);

  if (!adsEnabled || !adSlot) return null;

  return (
    <aside className={className ?? "ad-slot"} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
