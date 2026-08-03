"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { zac } from "@/lib/content/zac";

/**
 * Hidden where it would be noise rather than help:
 * - `/` opens on a working ZAC console, so the bubble is a second copy of an
 *   offer already on screen — parked on top of the content.
 * - `/consultant` and the estimator *are* ZAC.
 */
const HIDDEN_ON = ["/", "/consultant", "/tools/estimator"];

export function AiFloat() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <Link href="/consultant" className="ai-float" aria-label={zac.consultant.ariaFloat}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4Z" />
      </svg>
      <span>Ask {zac.name}</span>
    </Link>
  );
}
