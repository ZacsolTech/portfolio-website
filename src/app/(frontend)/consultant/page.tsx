import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { zac } from "@/lib/content/zac";
import { pageMetadata } from "@/lib/seo";

const ConsultantIntake = dynamic(
  () =>
    import("@/components/shared/consultant-intake").then((m) => m.ConsultantIntake),
  {
    loading: () => (
      <div
        className="chat-app"
        aria-busy="true"
        aria-label={zac.consultant.ariaLoading}
      />
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: zac.consultant.pageTitle,
  description: zac.consultant.pageDescription,
  path: "/consultant",
  keywords: [
    "ZAC Consultant",
    "AI solution consultant",
    "AI software roadmap",
    "free AI project estimate",
    "business automation consultant",
    "AI agency consultant",
  ],
});

/**
 * The focus-mode surface for ZAC Consultant.
 *
 * Most conversations happen in the dock. This route is the search landing
 * page, the "open full view" target, and the no-JS fallback — laid out as a
 * full-viewport chat app so the thread and composer get the whole screen.
 */
export default function ConsultantPage() {
  return (
    <div className="consultant-page consultant-page--app consultant-page--shell">
      <div className="zac-shell">
        <h1 className="sr-only">
          {zac.consultant.name} — describe your business problem, get a solution
          roadmap
        </h1>

        <ConsultantIntake surface="page" />
      </div>
    </div>
  );
}
