import { DEFAULT_MODE, isZacMode, SEED_PARAM, type ZacMode } from "./modes";

/**
 * Seeds — the opening message a contextual entry point hands to ZAC.
 *
 * Two kinds, and the difference is a security boundary, not a nicety:
 *
 * - **Registry seeds** are curated, addressed by a short id, and may send
 *   themselves. Because the text lives in `seed-text.ts` and the URL only
 *   carries an id, a link cannot inject arbitrary instructions into the
 *   model's transcript.
 * - **Free-text seeds** come from a visitor's own typing (the home hero). By
 *   default they only *prefill the composer*. An explicit UI Send (hero arrow
 *   / chip) may opt into `autoSend: true`. Nothing a URL carries is
 *   auto-submitted to the model.
 *
 * That asymmetry is the whole point. Auto-sending URL text would make every
 * inbound link a prompt-injection vector.
 *
 * This module is client-safe and deliberately tiny: the seed *text* is derived
 * from the site's content modules, so it lives in a lazily imported sibling
 * rather than riding along in the bundle of every page (see `loadSeed`).
 */

export type ZacSeed = {
  /** Registry id, or `free` for composer prefill. */
  id: string;
  mode: ZacMode;
  /** The opening user message. */
  text: string;
  /** Curated seeds send themselves; visitor text never does. */
  autoSend: boolean;
};

const FREE_TEXT_ID = "free";

/** `kind.slug` — lowercase, dot-separated, hyphens inside the slug. */
const SEED_ID = /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9-]*)?$/;
const MAX_SEED_ID = 64;

/**
 * Which mode each family of seeds belongs to.
 *
 * Kept as a prefix table rather than a lookup into the registry so that
 * choosing the right pane — the one decision that has to happen before the
 * panel paints — never waits on a dynamic import.
 */
const PREFIX_MODE: Record<string, ZacMode> = {
  service: "consultant",
  industry: "consultant",
  roadmap: "consultant",
  contact: "consultant",
  cost: "estimator",
  like: "estimator",
  pricing: "estimator",
  book: "estimator",
};

/** Is this a well-formed id? Cheap guard before touching the registry. */
export function isSeedId(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_SEED_ID && SEED_ID.test(value);
}

/** The mode a seed id implies, for links that don't state one. */
export function modeForSeed(id: string | null | undefined): ZacMode | null {
  if (!isSeedId(id)) return null;
  return PREFIX_MODE[id.split(".")[0]] ?? null;
}

/**
 * Resolve a curated seed to its text.
 *
 * The text templates are built from the site's services, industries and
 * portfolio, so importing them eagerly would put every one of those content
 * modules in the bundle of every page — for a feature most visits never use.
 * The import is deferred to the moment a seeded CTA is actually clicked, by
 * which point the panel is still animating in.
 *
 * Unknown ids resolve to null rather than throwing: a stale link from an old
 * campaign should open ZAC, not break the page.
 */
export async function loadSeed(id: string | null | undefined): Promise<ZacSeed | null> {
  if (!isSeedId(id)) return null;
  const mode = modeForSeed(id);
  if (!mode) return null;

  try {
    const { seedText } = await import("./seed-text");
    const found = seedText(id);
    if (!found) return null;
    return { id, mode, autoSend: true, ...found };
  } catch {
    // A failed chunk load should not swallow the click — ZAC opens on its
    // ordinary greeting and the visitor types.
    return null;
  }
}

/**
 * Wrap something the visitor typed.
 *
 * Defaults to composer prefill only — URL-carried free text must never
 * auto-send (prompt-injection). Callers that already collected an explicit
 * Send (home hero arrow, etc.) pass `{ autoSend: true }`.
 */
export function freeTextSeed(
  text: string,
  mode: ZacMode = DEFAULT_MODE,
  options: { autoSend?: boolean } = {},
): ZacSeed | null {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 1000);
  if (clean.length < 2) return null;
  return {
    id: FREE_TEXT_ID,
    mode,
    text: clean,
    autoSend: Boolean(options.autoSend),
  };
}

/**
 * Build the href a contextual entry point points at.
 *
 * Always a real, crawlable URL to the full-page surface: the dock is an
 * enhancement layered on top with `preventDefault`, so middle-click, "open in
 * new tab" and a JS-less browser all still work.
 */
export function zacHref(options: {
  seed?: string | null;
  route: string;
}): string {
  if (!options.seed || !isSeedId(options.seed)) return options.route;
  return `${options.route}?${SEED_PARAM}=${encodeURIComponent(options.seed)}`;
}

/** Mode for a link, preferring an explicit value over the seed's own. */
export function coerceMode(mode: unknown, seedId?: string | null): ZacMode {
  if (isZacMode(mode)) return mode;
  return modeForSeed(seedId) ?? DEFAULT_MODE;
}

/**
 * The seed a full-page surface was opened with.
 *
 * Read from the browser rather than from `searchParams` on purpose: touching
 * `searchParams` in the server component would opt `/consultant` and the
 * estimator out of static rendering, and those two are keyword landing pages.
 */
export function readPageSeedId(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get(SEED_PARAM);
  return isSeedId(value) ? value : null;
}

/** True when a full-page surface was opened as a handoff from the other mode. */
export function readPageHandoff(): ZacMode | null {
  if (typeof window === "undefined") return null;
  const from = new URLSearchParams(window.location.search).get("from");
  return isZacMode(from) ? from : null;
}
