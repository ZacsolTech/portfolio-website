"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_MODE,
  isZacMode,
  modeForPath,
  SEED_PARAM,
  ZAC_PARAM,
  type ZacMode,
} from "@/lib/zac/modes";
import {
  freeTextSeed,
  isSeedId,
  loadSeed,
  modeForSeed,
  type ZacSeed,
} from "@/lib/zac/seeds";

/**
 * One ZAC session, two surfaces.
 *
 * This provider owns "is the dock open, in which mode, carrying what seed" and
 * keeps that in sync with the URL. It deliberately does *not* own the
 * conversation: transcripts live server-side keyed by a session id, so the
 * dock and the full page are two views of the same consultation and closing
 * the dock never costs the visitor anything.
 *
 * URL contract (the one entry point for links, campaigns and deep links):
 *
 *   ?zac=consultant|estimator   open the dock in this mode
 *   &seed=<registry id>         curated opening message (see lib/zac/seeds)
 *   &from=estimator             carry an estimate into the consultant
 *
 * Navigation uses the native History API rather than `router.push` on purpose:
 * toggling a panel must not re-run a server component or refetch an RSC
 * payload. Next syncs its own routing state from `pushState`/`replaceState`.
 */

export type ZacHandoff = {
  from: ZacMode;
  /** Bumped on every request so a repeat handoff still fires. */
  token: number;
};

export type ZacOpenOptions = {
  mode?: ZacMode;
  /** A registry id, a prepared seed, or nothing. */
  seed?: string | ZacSeed | null;
  /**
   * Visitor-typed text. Prefills the composer by default; pass `autoSend`
   * when the visitor already pressed Send (e.g. home hero).
   */
  text?: string;
  /** Send `text` immediately. Ignored without `text`. Never set from a URL. */
  autoSend?: boolean;
  /** Carry the other mode's answers across. */
  from?: ZacMode;
  /** Where the open came from, for analytics. Defaults to the current path. */
  source?: string;
};

type ZacContextValue = {
  open: boolean;
  mode: ZacMode;
  seed: ZacSeed | null;
  /** Changes whenever a new seed is delivered, even if the text repeats. */
  seedToken: number;
  handoff: ZacHandoff | null;
  /** Modes that have been shown at least once — kept mounted to hold state. */
  mounted: readonly ZacMode[];
  /** True on `/consultant` and the estimator page, where the page is the tool. */
  suppressed: boolean;
  openZac: (options?: ZacOpenOptions) => void;
  closeZac: () => void;
  switchMode: (mode: ZacMode, options?: { from?: ZacMode }) => void;
  /** Estimator → consultant, carrying the priced inputs. */
  requestHandoff: (to: ZacMode, from: ZacMode) => void;
  clearHandoff: () => void;
  clearSeed: () => void;
};

const ZacContext = createContext<ZacContextValue | null>(null);

const MODE_STORAGE_KEY = "zacsol:zac:mode";

/* ------------------------------- URL helpers ------------------------------ */

type UrlState = { mode: ZacMode | null; seedId: string | null; from: ZacMode | null };

function readUrl(): UrlState {
  if (typeof window === "undefined") return { mode: null, seedId: null, from: null };
  const params = new URLSearchParams(window.location.search);
  const mode = params.get(ZAC_PARAM);
  const seedId = params.get(SEED_PARAM);
  const from = params.get("from");
  return {
    mode: isZacMode(mode) ? mode : null,
    seedId: isSeedId(seedId) ? seedId : null,
    from: isZacMode(from) ? from : null,
  };
}

function writeUrl(mode: ZacMode | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const had = url.searchParams.has(ZAC_PARAM);

  if (mode) {
    url.searchParams.set(ZAC_PARAM, mode);
  } else {
    url.searchParams.delete(ZAC_PARAM);
  }
  // Seeds are one-shot. Leaving them in the URL would re-fire on a reload,
  // on top of a conversation that has already moved on.
  url.searchParams.delete(SEED_PARAM);
  url.searchParams.delete("from");

  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    return;
  }

  // Opening pushes, so Back closes the dock. Everything else replaces, so we
  // never litter history with panel state.
  if (mode && !had) {
    window.history.pushState(null, "", next);
  } else {
    window.history.replaceState(null, "", next);
  }
}

/** Fire-and-forget analytics. No vendor dependency; GTM picks it up if present. */
function track(event: string, detail: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(layer)) layer.push({ event, ...detail });
    window.dispatchEvent(new CustomEvent(event, { detail }));
  } catch {
    // Analytics must never break the widget it measures.
  }
}

function readStoredMode(): ZacMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return isZacMode(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/* -------------------------------- provider -------------------------------- */

export function ZacProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageMode = modeForPath(pathname);
  const suppressed = pageMode !== null;

  const [open, setOpen] = useState(false);
  /*
    Adjusting state during render rather than in an effect — the pattern React
    documents for "reset something when a prop changes", and the one the site
    header already uses. Landing on a full-page surface must close the dock
    before it can paint a second live copy of the same conversation.
  */
  const [suppressedAt, setSuppressedAt] = useState(suppressed);
  if (suppressed !== suppressedAt) {
    setSuppressedAt(suppressed);
    if (suppressed) setOpen(false);
  }

  const [mode, setModeState] = useState<ZacMode>(DEFAULT_MODE);
  const [seed, setSeed] = useState<ZacSeed | null>(null);
  const [seedToken, setSeedToken] = useState(0);
  /** A registry id whose text is still being fetched from its lazy chunk. */
  const [pending, setPending] = useState<{ id: string; token: number } | null>(null);
  const [handoff, setHandoff] = useState<ZacHandoff | null>(null);
  const [mounted, setMounted] = useState<ZacMode[]>([]);

  const booted = useRef(false);

  const markMounted = useCallback((next: ZacMode) => {
    setMounted((prev) => (prev.includes(next) ? prev : [...prev, next]));
  }, []);

  const openZac = useCallback(
    (options: ZacOpenOptions = {}) => {
      const seedId = typeof options.seed === "string" ? options.seed : null;
      const readySeed = typeof options.seed === "object" ? options.seed : null;

      /* Mode is decided synchronously — the panel has to know which pane to
         paint. Only the seed's *text* waits on its chunk. */
      const nextMode =
        options.mode ??
        readySeed?.mode ??
        modeForSeed(seedId) ??
        (open ? mode : readStoredMode());

      const textSeed = options.text
        ? freeTextSeed(options.text, nextMode, { autoSend: options.autoSend })
        : null;
      const immediate = readySeed ?? textSeed;

      setModeState(nextMode);
      markMounted(nextMode);
      setOpen(true);

      if (immediate) {
        setSeed(immediate);
        setSeedToken((n) => n + 1);
      } else if (seedId && isSeedId(seedId)) {
        setPending({ id: seedId, token: Date.now() });
      }

      if (options.from && options.from !== nextMode) {
        setHandoff({ from: options.from, token: Date.now() });
      }

      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      } catch {
        // Private mode — the default mode is a fine fallback.
      }

      writeUrl(nextMode);
      track("zac_open", {
        zac_mode: nextMode,
        zac_seed: seedId ?? immediate?.id ?? null,
        zac_source: options.source ?? pathname,
      });
    },
    [markMounted, mode, open, pathname],
  );

  /* Fetch the pending seed's text from its lazy chunk. */
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;

    void loadSeed(pending.id).then((resolved) => {
      if (cancelled || !resolved) return;
      setSeed(resolved);
      setSeedToken((n) => n + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [pending]);

  const closeZac = useCallback(() => {
    setOpen(false);
    writeUrl(null);
    track("zac_close", { zac_mode: mode });
  }, [mode]);

  const switchMode = useCallback(
    (next: ZacMode, options: { from?: ZacMode } = {}) => {
      setModeState(next);
      markMounted(next);
      if (options.from && options.from !== next) {
        setHandoff({ from: options.from, token: Date.now() });
      }
      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, next);
      } catch {
        // Ignore.
      }
      writeUrl(next);
      track("zac_mode_switch", { zac_mode: next, zac_from: options.from ?? null });
    },
    [markMounted],
  );

  const requestHandoff = useCallback(
    (to: ZacMode, from: ZacMode) => {
      track("zac_handoff", { zac_mode: to, zac_from: from });
      if (suppressed) {
        // On a full-page surface the handoff is a navigation, and the target
        // page reads `from` out of the URL on arrival.
        window.location.href = `${to === "consultant" ? "/consultant" : "/tools/estimator"}?from=${from}`;
        return;
      }
      switchMode(to, { from });
    },
    [suppressed, switchMode],
  );

  const clearHandoff = useCallback(() => setHandoff(null), []);
  const clearSeed = useCallback(() => setSeed(null), []);

  /* ---------------------------- URL → state ---------------------------- */

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    // The tool pages read their own seed from `searchParams`; opening a dock
    // on top of them would be two live copies of one conversation.
    if (suppressed) return;

    const { mode: urlMode, seedId, from } = readUrl();
    const seedMode = modeForSeed(seedId);
    if (!urlMode && !seedMode) return;

    /*
      Deferred a frame on purpose. Opening is an action with side effects
      beyond state — it rewrites the URL and emits an analytics event — and
      running it after the first paint also lets the panel play its entrance
      transition instead of appearing already open.
    */
    const frame = window.requestAnimationFrame(() => {
      openZac({
        mode: urlMode ?? seedMode ?? undefined,
        seed: seedId,
        from: from ?? undefined,
        source: "deep-link",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openZac, suppressed]);

  /* Back/forward is the natural "close the panel" gesture. */
  useEffect(() => {
    const onPopState = () => {
      const { mode: urlMode } = readUrl();
      if (urlMode) {
        setModeState(urlMode);
        markMounted(urlMode);
        setOpen(true);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [markMounted]);

  const value = useMemo<ZacContextValue>(
    () => ({
      open: open && !suppressed,
      mode,
      seed,
      seedToken,
      handoff,
      mounted,
      suppressed,
      openZac,
      closeZac,
      switchMode,
      requestHandoff,
      clearHandoff,
      clearSeed,
    }),
    [
      open,
      suppressed,
      mode,
      seed,
      seedToken,
      handoff,
      mounted,
      openZac,
      closeZac,
      switchMode,
      requestHandoff,
      clearHandoff,
      clearSeed,
    ],
  );

  return <ZacContext.Provider value={value}>{children}</ZacContext.Provider>;
}

/**
 * Dock controls. Safe to call from anywhere inside the frontend layout;
 * throws only if a component is mounted outside the provider, which is a
 * wiring bug rather than a runtime condition.
 */
export function useZac(): ZacContextValue {
  const context = useContext(ZacContext);
  if (!context) throw new Error("useZac must be used inside <ZacProvider>");
  return context;
}
