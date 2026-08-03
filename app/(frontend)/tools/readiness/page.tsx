import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

const ReadinessWizard = dynamic(
  () => import("@/components/shared/readiness-wizard").then((m) => m.ReadinessWizard),
  {
    loading: () => (
      <div className="console" aria-busy="true" style={{ minHeight: "24rem" }} />
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: "AI readiness assessment",
  description:
    "Twelve questions across Data, Process, Team and Tooling. Get a score, gaps and a 90-day action list.",
  path: "/tools/readiness",
  keywords: [
    "AI readiness assessment",
    "AI maturity score",
    "enterprise AI readiness",
    "AI adoption checklist",
  ],
});

export default function ReadinessPage() {
  return (
    <div className="consultant-page on-dark">
      <div className="container" style={{ maxWidth: "44rem" }}>
        <header style={{ marginBottom: "2.5rem" }}>
          <span className="overline overline--gold">Free tool</span>
          <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
            AI readiness <span className="em-serif">assessment</span>
          </h1>
          <p
            className="lead"
            style={{ marginTop: "1.25rem", color: "var(--text-on-dark-body)" }}
          >
            Twelve questions. Four pillars. A maturity band and the three biggest gaps.
          </p>
        </header>
        <ReadinessWizard />
        <p style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link href="/book" className="link-u" style={{ color: "rgba(255,255,255,.7)" }}>
            Prefer to talk it through? Book 30 minutes →
          </Link>
        </p>
      </div>
    </div>
  );
}
