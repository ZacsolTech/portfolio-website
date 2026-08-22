import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { zac } from "@/lib/content/zac";
import { pageMetadata } from "@/lib/seo";

const EstimatorWizard = dynamic(
  () => import("@/components/shared/estimator-wizard").then((m) => m.EstimatorWizard),
  {
    loading: () => (
      <div className="chat-app" aria-busy="true" aria-label="Loading ZAC Estimator" />
    ),
  },
);

/* Same contract as `/consultant`: the app is the page, so the crawlable
   counterpart is `/software-cost-calculator`. See that route's comment. */
export const metadata: Metadata = pageMetadata({
  title: zac.estimator.pageTitle,
  description: zac.estimator.pageDescription,
  path: "/tools/estimator",
  noIndexFollow: true,
  keywords: [
    "ZAC Estimator",
    "software project cost estimator",
    "AI project cost",
    "web development cost estimate",
    "app development budget calculator",
    "free software quote calculator",
  ],
});

/**
 * Focus-mode surface for ZAC Estimator.
 *
 * Same contract as `/consultant`: the conversation is the page. Marketing
 * copy lives on tool cards and entry points — not above the composer.
 */
export default function EstimatorPage() {
  return (
    <div className="consultant-page consultant-page--app consultant-page--shell">
      <div className="zac-shell">
        <h1 className="sr-only">
          {zac.estimator.name} — describe your project, get a real cost range
        </h1>

        {/* `seed` is read from the URL inside the widget so this route stays
            statically rendered. */}
        <EstimatorWizard surface="page" />
      </div>
    </div>
  );
}
