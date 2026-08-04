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
        className="console console--app"
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
 * Most conversations happen in the dock, on whatever page prompted them. This
 * route is the search landing page, the "open full view" target, and the
 * no-JS fallback every ZacLink points at — so it reads the same `seed` and
 * `from` contract the dock does.
 */
export default function ConsultantPage() {
  return (
    <div className="consultant-page consultant-page--app on-dark">
      <div className="container">
        <header className="consultant-page__head">
          <span className="overline overline--gold">{zac.consultant.name}</span>
          <h1 className="d3">
            Most agencies ask for your budget.{" "}
            <span className="em-serif">We ask what&apos;s broken.</span>
          </h1>
          <p className="body-sm consultant-page__sub">
            Describe the bottleneck in a conversation. Get a solution roadmap on screen —
            then decide whether you want the PDF or a human conversation.
          </p>
        </header>

        {/* `seed` and `from` are read from the URL inside the widget, in the
            browser. Touching `searchParams` here would opt this keyword
            landing page out of static rendering for a query string that most
            visits never carry. */}
        <ConsultantIntake surface="page" />
      </div>
    </div>
  );
}
