import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AiFloat } from "@/components/layout/ai-float";
import { PreviewBanner } from "@/components/preview/preview-banner";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PreviewBanner />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <AiFloat />
    </>
  );
}
