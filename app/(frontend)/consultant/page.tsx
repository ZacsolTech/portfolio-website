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
        className="console"
        aria-busy="true"
        aria-label={zac.consultant.ariaLoading}
        style={{ minHeight: "28rem" }}
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

export default function ConsultantPage() {
  return (
    <div className="consultant-page on-dark">
      <div className="container">
        <header style={{ textAlign: "center", maxWidth: "44rem", margin: "0 auto 3rem" }}>
          <span className="overline overline--gold">{zac.consultant.name}</span>
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
