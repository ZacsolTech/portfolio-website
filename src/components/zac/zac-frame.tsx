import type { ReactNode } from "react";
import { Console, ConsoleBar, ConsoleBody } from "@/components/ui";

/**
 * Where a ZAC widget is rendering.
 *
 * `page` is the standalone route — it owns its own console chrome and the
 * explanatory rail. `dock` is the slide-over panel, which already supplies a
 * header, a mode switcher and its own scroll container, so the widget must not
 * draw a second frame inside it.
 */
export type ZacSurface = "page" | "dock";

export function ZacFrame({
  surface,
  title,
  phase = "chat",
  children,
}: {
  surface: ZacSurface;
  /** String, not ReactNode: `ConsoleBar` merges this with the HTML attribute. */
  title: string;
  /**
   * `chat` fills the available height and pins the composer to the bottom;
   * every other phase is a document that should grow and scroll normally.
   * Layout follows from this rather than from a measured height.
   */
  phase?: string;
  children: ReactNode;
}) {
  const isChat = phase === "chat";

  if (surface === "dock") {
    return (
      <div className="zac-pane" data-phase={isChat ? "chat" : "document"}>
        {children}
      </div>
    );
  }

  return (
    <Console className="console--app" data-phase={isChat ? "chat" : "document"}>
      <ConsoleBar title={title} />
      <ConsoleBody className="console__body--app">{children}</ConsoleBody>
    </Console>
  );
}
