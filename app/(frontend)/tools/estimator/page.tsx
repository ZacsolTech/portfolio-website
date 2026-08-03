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
    "Five questions. An indicative cost band, duration and team shape — with assumptions you can challenge.",
  path: "/tools/estimator",
  keywords: [
    "software project cost estimator",
    "AI project cost",
    "web development cost estimate",
    "app development budget calculator",
  ],
});

export default function EstimatorPage() {
  return (
    <div className="consultant-page on-dark">
      <div className="container" style={{ maxWidth: "44rem" }}>
        <header style={{ marginBottom: "2.5rem" }}>
          <span className="overline overline--gold">Free tool</span>
          <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
            Project cost <span className="em-serif">estimator</span>
          </h1>
          <p
            className="lead"
            style={{ marginTop: "1.25rem", color: "var(--text-on-dark-body)" }}
          >
            Five steps. A cost band with the assumptions listed so you can push back.
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
