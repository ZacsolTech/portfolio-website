import Script from "next/script";
import { adsEnabled, adsenseClient } from "@/lib/ads";

/** Loads AdSense once for the whole site. Auto ads need only this. */
export function AdsenseScript() {
  if (!adsEnabled) return null;
  return (
    <Script
      id="adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
