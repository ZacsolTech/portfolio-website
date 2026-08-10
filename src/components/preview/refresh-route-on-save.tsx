"use client";

import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

/**
 * Listens for Payload Live Preview postMessage events and refreshes
 * the App Router page so server components re-fetch draft content.
 */
export function RefreshRouteOnSave() {
  const router = useRouter();
  const serverURL =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!serverURL) return null;

  return (
    <PayloadLivePreview
      refresh={router.refresh}
      serverURL={serverURL.replace(/\/$/, "")}
    />
  );
}
