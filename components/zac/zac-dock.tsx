"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { zac as brand } from "@/lib/content/zac";
import { ZAC_MODE_META, ZAC_MODES, ZAC_ROUTES } from "@/lib/zac/modes";
import { useZac } from "./zac-provider";

/**
 * The dock — ZAC's primary surface.
 *
 * Right-hand slide-over on desktop, bottom sheet on mobile. On desktop it is
 * deliberately **non-modal**: no scrim, no scroll lock, no focus trap. The
 * point of the dock is that you can keep reading the service page you were on
 * while ZAC scopes it; a panel that blacks out that page would be a worse
 * version of the destination route it replaces. On mobile there is no room for
 * both, so the sheet becomes modal and behaves like one.
 *
 * Once a mode has been opened it stays mounted (hidden, `inert`) for the rest
 * of the visit, so closing the dock costs nothing and reopening is instant.
 */

const ConsultantIntake = dynamic(
  () => import("@/components/shared/consultant-intake").then((m) => m.ConsultantIntake),
  { loading: () => <DockSkeleton /> },
);

const EstimatorWizard = dynamic(
  () => import("@/components/shared/estimator-wizard").then((m) => m.EstimatorWizard),
  { loading: () => <DockSkeleton /> },
);

function DockSkeleton() {
  return (
    <div className="zac-dock__skeleton" aria-busy="true" aria-label={`Loading ${brand.name}`}>
      <span className="typing">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

const MOBILE_QUERY = "(max-width: 719px)";

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return isMobile;
}

/* --------------------------------- icons --------------------------------- */

function SparkIcon() {
  return (
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
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 4h6v6M20 4l-8 8M10 20H4v-6M4 20l8-8" />
    </svg>
  );
}

/* -------------------------------- launcher -------------------------------- */

/**
 * Held back until the home hero scrolls away: that hero already renders a live
 * ZAC console, and a floating button offering the same thing on top of it is
 * noise. Any page without the marker shows the launcher immediately.
 */
function useLauncherVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.querySelector("[data-zac-hero]");

    if (!anchor) {
      // A frame late so the entrance transition has something to animate from.
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return visible;
}

/* ---------------------------------- dock ---------------------------------- */

export function ZacDock() {
  const {
    open,
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
  } = useZac();

  const panelId = useId();
  const isMobile = useIsMobile();
  const launcherVisible = useLauncherVisible();

  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  /* Streams outlive renders; a ref is the only reading of `open` that is
     still true by the time a reply lands. */
  const openRef = useRef(open);

  const [unread, setUnread] = useState(false);

  const onReply = useCallback(() => {
    if (!openRef.current) setUnread(true);
  }, []);

  /* Reading the dot clears it. Adjusted during render rather than in an
     effect — see the same pattern in the provider and the site header. */
  const [unreadSeenAt, setUnreadSeenAt] = useState(open);
  if (open !== unreadSeenAt) {
    setUnreadSeenAt(open);
    if (open) setUnread(false);
  }

  /* --------------------------- open/close effects --------------------------- */

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /* Escape closes from anywhere inside the panel, and from the page on mobile. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeZac();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeZac]);

  /* Only the mobile sheet is modal, so only the mobile sheet locks the page. */
  useEffect(() => {
    if (!open || !isMobile) return;
    document.body.classList.add("zac-locked");
    return () => document.body.classList.remove("zac-locked");
  }, [open, isMobile]);

  /*
    Focus goes to the composer on desktop — the visitor opened a chat, they
    want to type. On mobile that would throw up the keyboard over the greeting
    they have not read yet, so the panel itself takes focus instead.
  */
  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      const id = window.setTimeout(() => {
        const panel = panelRef.current;
        if (!panel) return;
        if (isMobile) {
          panel.focus();
          return;
        }
        const composer = panel.querySelector<HTMLTextAreaElement>("textarea");
        (composer ?? panel).focus();
      }, 260);
      return () => window.clearTimeout(id);
    }

    if (!open && wasOpen.current) {
      wasOpen.current = false;
      launcherRef.current?.focus();
    }
  }, [open, isMobile]);

  /* Tab must not walk into a closed panel; on mobile it must not leave an open one. */
  useEffect(() => {
    if (!open || !isMobile) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [open, isMobile]);

  if (suppressed) return null;

  const meta = ZAC_MODE_META[mode];
  const seedForMode = seed && seed.mode === mode ? seed : null;
  const handoffForMode = handoff && handoff.from !== mode ? handoff : null;

  return (
    <>
      <button
        type="button"
        ref={launcherRef}
        className="zac-launcher"
        data-visible={launcherVisible && !open}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Ask ${brand.name}`}
        onClick={() => openZac({ source: "launcher" })}
      >
        <SparkIcon />
        <span className="zac-launcher__label">Ask {brand.name}</span>
        {unread ? <span className="zac-launcher__dot" aria-label="New reply" /> : null}
      </button>

      <div className="zac-dock" data-open={open} data-modal={isMobile}>
        {/* Mobile only — on desktop the page behind stays live and clickable. */}
        <button
          type="button"
          className="zac-dock__scrim"
          tabIndex={-1}
          aria-hidden
          onClick={closeZac}
        />

        <div
          className="zac-dock__panel"
          id={panelId}
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal={isMobile ? true : undefined}
          aria-label={`${brand.name} — ${meta.name}`}
          inert={!open}
        >
          <div className="zac-dock__grip" aria-hidden />

          <header className="zac-dock__head">
            <span className="zac-dock__brand">
              <span className="live" aria-hidden />
              {brand.name}
            </span>
            <span className="zac-dock__eyebrow">{meta.consoleTitle}</span>
            <span className="zac-dock__actions">
              <a
                className="zac-dock__icon"
                href={ZAC_ROUTES[mode]}
                aria-label="Open the full view"
                title="Open the full view"
              >
                <ExpandIcon />
              </a>
              <button
                type="button"
                className="zac-dock__icon"
                onClick={closeZac}
                aria-label={`Close ${brand.name}`}
              >
                <CloseIcon />
              </button>
            </span>
          </header>

          {/*
            Toggle buttons, not a tablist. `role="tab"` promises arrow-key
            navigation and owned tabpanels; two buttons that swap the panel
            below are honestly described by `aria-pressed`.
          */}
          <div className="zac-dock__modes" role="group" aria-label="What do you need?">
            {ZAC_MODES.map((candidate) => {
              const active = candidate === mode;
              return (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={active}
                  className="zac-dock__mode"
                  data-active={active}
                  onClick={() => {
                    if (!active) switchMode(candidate);
                  }}
                >
                  {ZAC_MODE_META[candidate].tab}
                </button>
              );
            })}
          </div>

          <p className="zac-dock__purpose">{meta.purpose}</p>

          <div className="zac-dock__body">
            {mounted.includes("consultant") ? (
              <ModePane active={mode === "consultant"}>
                <ConsultantIntake
                  surface="dock"
                  active={mode === "consultant"}
                  seed={seedForMode}
                  seedToken={seedToken}
                  onSeedConsumed={clearSeed}
                  handoff={handoffForMode}
                  onHandoffConsumed={clearHandoff}
                  onReply={onReply}
                />
              </ModePane>
            ) : null}

            {mounted.includes("estimator") ? (
              <ModePane active={mode === "estimator"}>
                <EstimatorWizard
                  surface="dock"
                  active={mode === "estimator"}
                  seed={seedForMode}
                  seedToken={seedToken}
                  onSeedConsumed={clearSeed}
                  onReply={onReply}
                  onRequestRoadmap={() => requestHandoff("consultant", "estimator")}
                />
              </ModePane>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

/** Hidden but mounted: the other mode keeps its transcript and scroll position. */
function ModePane({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="zac-dock__pane" hidden={!active} inert={!active}>
      {children}
    </div>
  );
}
