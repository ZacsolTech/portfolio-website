import type { Metadata } from "next";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { InsightsBrowser } from "@/components/shared/insights-browser";
import { getInsights } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Insights",
  description:
    "Short, practical writing on AI, automation and shipping software — from the ZACSOL team.",
  path: "/insights",
  keywords: [
    "software agency blog",
    "AI automation insights",
    "product engineering articles",
    "shipping software",
  ],
});

export default async function InsightsPage() {
  const insights = await getInsights();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
        ]}
      />
      <ItemListJsonLd
        name="ZACSOL Insights"
        description="Short, practical writing on AI, automation and shipping software."
        path="/insights"
        items={insights.map((article) => ({
          name: article.title,
          path: `/insights/${article.slug}`,
          description: article.excerpt,
        }))}
      />
      <PageHero
        overline="Insights"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Insights" }]}
        title={
          <>
            Practical notes on <span className="em-serif">shipping</span>.
          </>
        }
        lead="No sales sequences. Delivery habits, AI guardrails and how we qualify work before we build."
      />

      <section className="section section--paper">
        <div className="container">
          <InsightsBrowser items={insights} />
        </div>
      </section>

      <FinalCta showSteps={false} />
    </>
  );
}
