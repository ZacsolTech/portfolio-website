import { zac } from "@/lib/content/zac";

/**
 * ZAC is one assistant with two modes, not two chatbots.
 *
 * Consultant answers "what should we build?"; Estimator answers "what will it
 * cost?". They share a launcher, a dock and a visual language, and the intake
 * they gather overlaps enough that switching modes must never re-ask a
 * question the visitor has already answered (see lib/zac/handoff).
 */

export const ZAC_MODES = ["consultant", "estimator"] as const;

export type ZacMode = (typeof ZAC_MODES)[number];

export const DEFAULT_MODE: ZacMode = "consultant";

export function isZacMode(value: unknown): value is ZacMode {
  return typeof value === "string" && (ZAC_MODES as readonly string[]).includes(value);
}

/** Query key that opens the dock. The single entry contract for both surfaces. */
export const ZAC_PARAM = "zac";
/** Query key carrying a registry seed id. */
export const SEED_PARAM = "seed";

/** Canonical full-page route for each mode — the SEO surface and the no-JS fallback. */
export const ZAC_ROUTES: Record<ZacMode, string> = {
  consultant: "/consultant",
  estimator: "/tools/estimator",
};

export type ZacModeMeta = {
  /** Segmented-control label — short enough for a 420px panel. */
  tab: string;
  /** Full product name. */
  name: string;
  /** One line under the tab strip, explaining what this mode does. */
  purpose: string;
  /** Dock header eyebrow. */
  consoleTitle: string;
  route: string;
};

export const ZAC_MODE_META: Record<ZacMode, ZacModeMeta> = {
  consultant: {
    tab: "Solution",
    name: zac.consultant.name,
    purpose: "Describe the problem — get a scoped roadmap.",
    consoleTitle: zac.consultant.consoleTitle,
    route: ZAC_ROUTES.consultant,
  },
  estimator: {
    tab: "Cost",
    name: zac.estimator.name,
    purpose: "Describe the build — get a real price band.",
    consoleTitle: zac.estimator.consoleTitle,
    route: ZAC_ROUTES.estimator,
  },
};

/** Which mode a path belongs to, or null for an ordinary page. */
export function modeForPath(pathname: string): ZacMode | null {
  for (const mode of ZAC_MODES) {
    if (pathname === ZAC_ROUTES[mode]) return mode;
  }
  return null;
}
