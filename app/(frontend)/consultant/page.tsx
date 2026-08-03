import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { pageMetadata } from "@/lib/seo";

const ConsultantIntake = dynamic(
  () =>
    import("@/components/shared/consultant-intake").then((m) => m.ConsultantIntake),
  {
    loading: () => (
      <div
        className="console"
        aria-busy="true"
        aria-label="Loading AI consultant"
        style={{ minHeight: "28rem" }}
      />
    ),
  },
);

export const metadata: Metadata = pageMetadata({
  title: "AI Solution Consultant",
  description:
    "Describe your business problem. Our AI consultant recommends a solution, features, timeline and cost range — free, in about three minutes.",
  path: "/consultant",
  keywords: [
    "AI solution consultant",
    "AI software roadmap",
    "free AI project estimate",
    "business automation consultant",
    "AI agency consultant",
  ],
});

export default function ConsultantPage() {
  return (
    <div className="consultant-page on-dark">
      <div className="container">
        <header style={{ textAlign: "center", maxWidth: "44rem", margin: "0 auto 3rem" }}>
          <span className="overline overline--gold">Flagship</span>
          <h1 className="d2" style={{ marginTop: "1rem", color: "#fff" }}>
            Most agencies ask for your budget.{" "}
            <span className="em-serif">We ask what&apos;s broken.</span>
          </h1>
          <p
            className="lead"
            style={{ margin: "1.25rem auto 0", color: "var(--text-on-dark-body)", maxWidth: "36rem" }}
          >
            Describe the bottleneck in a conversation. Get a solution roadmap on screen — then
            decide whether you want the PDF or a human conversation.
          </p>
        </header>

        <ConsultantIntake />
      </div>
    </div>
  );
}
