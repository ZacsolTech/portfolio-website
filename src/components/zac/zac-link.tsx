"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { ZAC_ROUTES, type ZacMode } from "@/lib/zac/modes";
import { coerceMode, zacHref } from "@/lib/zac/seeds";
import { useZac } from "./zac-provider";

/**
 * A contextual entry point into ZAC.
 *
 * Renders a real `<a>` to the full-page surface and *upgrades* the click into
 * an in-place dock open. That ordering matters: middle-click, ⌘-click,
 * "copy link address", a crawler and a browser with JS off all get a working
 * URL, while everyone else stays on the page they were reading — which is the
 * entire reason for the dock.
 */

export type ZacLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** Defaults to the seed's own mode, then to the visitor's last used mode. */
  mode?: ZacMode;
  /** Registry seed id — see lib/zac/seeds. */
  seed?: string;
  /** Carry the other mode's answers across on open. */
  from?: ZacMode;
  children: ReactNode;
};

/** Clicks the browser owns: new tab, new window, download, non-primary button. */
function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export function ZacLink({
  mode,
  seed,
  from,
  children,
  onClick,
  ...rest
}: ZacLinkProps) {
  const zac = useZac();
  const target = coerceMode(mode, seed);
  const href = zacHref({ seed, route: ZAC_ROUTES[target] });

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (isModifiedClick(event)) return;

    // On `/consultant` and the estimator the page *is* the tool; let the
    // navigation happen so the visitor lands on the right surface.
    if (zac.suppressed) return;

    event.preventDefault();
    zac.openZac({ mode: target, seed, from });
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
