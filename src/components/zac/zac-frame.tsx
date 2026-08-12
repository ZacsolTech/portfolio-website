import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";

/**
 * Where a ZAC widget is rendering.
 *
 * `page` is the standalone route — full-viewport chat app chrome.
 * `dock` is the slide-over panel, which already supplies a header, a mode
 * switcher and its own scroll container, so the widget must not draw a
 * second frame inside it.
 */
export type ZacSurface = "page" | "dock";

export function ZacFrame({
  surface,
  title,
  subtitle,
  phase = "chat",
  progress,
  barTrailing,
  children,
}: {
  surface: ZacSurface;
  /** String, not ReactNode: `ConsoleBar` merges this with the HTML attribute. */
  title: string;
  /** Page-only quiet status line under the product name. */
  subtitle?: string;
  /**
   * `chat` fills the available height and pins the composer to the bottom;
   * every other phase is a document that should grow and scroll normally.
   */
  phase?: string;
  /** 0–100 intake progress. Page chrome only — rendered as a thin top bar. */
  progress?: number;
  /**
   * Actions for the far end of the header. Page surface only — the dock
   * draws its own header and has no room for a second row of links.
   */
  barTrailing?: ReactNode;
  children: ReactNode;
}) {
  const isChat = phase === "chat";
  const clamped = Math.max(0, Math.min(100, progress ?? 0));
  /** Mark already says ZAC — drop the redundant prefix on narrow headers. */
  const shortTitle = title.replace(/^ZAC\s+/i, "");

  if (surface === "dock") {
    return (
      <div className="zac-pane" data-phase={isChat ? "chat" : "document"}>
        {children}
      </div>
    );
  }

  /*
    Immersive chat chrome, three beats:
    left  — company (ZACSOL logo → home)
    center — product mark + name + tag on one row
    right — progress, mode switch, theme
  */
  return (
    <div className="chat-app" data-phase={isChat ? "chat" : "document"}>
      <header className="chat-app__top">
        <div className="chat-app__top-start">
          <Logo className="chat-app__logo" priority />
        </div>

        <div className="chat-app__top-center">
          <span className="chat-app__mark" aria-hidden>
            ZAC
          </span>
          <p className="chat-app__name">
            <span className="chat-app__name-full">{title}</span>
            <span className="chat-app__name-short">{shortTitle}</span>
          </p>
          {subtitle ? (
            <>
              <span className="chat-app__dot" aria-hidden>
                ·
              </span>
              <p className="chat-app__sub">{subtitle}</p>
            </>
          ) : null}
        </div>

        <div className="chat-app__top-end">
          {typeof progress === "number" && isChat ? (
            <div
              className="chat-app__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clamped}
              aria-label={`Intake ${clamped}% complete`}
            >
              <span className="chat-app__progress-label">{clamped}%</span>
              <span className="chat-app__progress-track" aria-hidden>
                <span style={{ width: `${clamped}%` }} />
              </span>
            </div>
          ) : null}
          {barTrailing != null ? (
            <div className="chat-app__actions">{barTrailing}</div>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      <div className="chat-app__body">{children}</div>
    </div>
  );
}

/** Kept for dock / legacy call sites that still compose Console directly. */
export { Console, ConsoleBar, ConsoleBody };
