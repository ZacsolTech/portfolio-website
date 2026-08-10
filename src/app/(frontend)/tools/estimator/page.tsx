import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { zac } from "@/lib/content/zac";
import { pageMetadata } from "@/lib/seo";

const EstimatorWizard = dynamic(
  () => import("@/components/shared/estimator-wizard").then((m) => m.EstimatorWizard),
  { loading: () => <div className="console console--app" aria-busy="true" /> },
);

export const metadata: Metadata = pageMetadata({
  title: zac.estimator.pageTitle,
  description: zac.estimator.pageDescription,
  path: "/tools/estimator",
  keywords: [
    "ZAC Estimator",
    "software project cost estimator",
    "AI project cost",
    "web development cost estimate",
    "app development budget calculator",
    "free software quote calculator",
  ],
});

/** Focus-mode surface for ZAC Estimator. See the note on the consultant page. */
export default function EstimatorPage() {
  return (
    <div className="consultant-page consultant-page--app on-dark">
      <div className="container container--narrow">
        <header className="consultant-page__head">
          <span className="overline overline--gold">
            {zac.estimator.name} · free · no email
          </span>
          <h1 className="d3">
            What will it actually <span className="em-serif">cost?</span>
          </h1>
          <p className="body-sm consultant-page__sub">
            Describe the project in your own words. {zac.name} returns a real range, a
            breakdown of where the money goes, and every assumption laid out — adjustable,
            so you can see what actually moves the number.
          </p>
        </header>

        {/* See the note on the consultant page: the seed is read client-side
            so this route stays statically rendered. */}
        <EstimatorWizard surface="page" />

        <p className="consultant-page__foot">
          <Link href="/consultant" className="link-u">
            Prefer a full solution roadmap? Ask {zac.name} →
          </Link>
        </p>
      </div>
    </div>
  );
}
