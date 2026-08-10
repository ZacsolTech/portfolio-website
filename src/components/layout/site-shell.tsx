import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PreviewBanner } from "@/components/preview/preview-banner";
import { ZacDock, ZacProvider } from "@/components/zac";

/**
 * The dock lives here, outside `<main>`, so an App Router navigation swaps the
 * page underneath it without remounting the panel. A visitor can start
 * scoping on a service page, browse three projects while ZAC is still open,
 * and come back to the same conversation with its scroll position intact.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <ZacProvider>
      <PreviewBanner />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <ZacDock />
    </ZacProvider>
  );
}
