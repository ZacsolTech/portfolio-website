import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

const EstimatorWizard = dynamic(
  () => import("@/components/shared/estimator-wizard").then((m) => m.EstimatorWizard),
  {
    loading: () => (
      <div className="console" aria-busy="true" style={{ minHeight: "24rem" }} />
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: "AI project cost estimator",
  description:
    "Describe your project in plain language. Get a real cost range, a breakdown of where the money goes, and adjustable assumptions — free, no email required.",
  path: "/tools/estimator",
  keywords: [
    "software project cost estimator",
    "AI project cost",
    "web development cost estimate",
    "app development budget calculator",
    "free software quote calculator",
  ],
});

export default function EstimatorPage() {
  return (
    <div className="consultant-page on-dark">
      <div className="container" style={{ maxWidth: "48rem" }}>
        <header style={{ marginBottom: "2.5rem" }}>
          <span className="overline overline--gold">Free · no email required</span>
          <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
            What will it actually <span className="em-serif">cost?</span>
          </h1>
          <p
            className="lead"
            style={{ marginTop: "1.25rem", color: "var(--text-on-dark-body)" }}
          >
            Describe the project in your own words. You get a real range, a breakdown of
            where the money goes, and every assumption laid out — adjustable, so you can
            see what actually moves the number.
          </p>
        </header>
        <EstimatorWizard />
        <p style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link href="/consultant" className="link-u" style={{ color: "rgba(255,255,255,.7)" }}>
            Prefer a full solution roadmap? →
          </Link>
        </p>
      </div>
    </div>
  );
}
