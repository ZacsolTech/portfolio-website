import type { Metadata } from "next";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { PortfolioFilterGrid } from "@/components/shared/portfolio-filter";
import { Stat } from "@/components/ui";
import { getPortfolio } from "@/lib/cms";
import { heroStats } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Portfolio",
  description:
    "Case studies and live demos — AI agents, ops dashboards, automation and product builds shipped by ZACSOL.",
  path: "/portfolio",
  keywords: [
    "software agency portfolio",
    "AI automation case studies",
    "interactive software demos",
    "custom software projects",
  ],
});

export default async function PortfolioPage() {
  const portfolio = await getPortfolio();
  return (
    <>
      <PageHero
        overline="Portfolio"
        title={
          <>
            Work you can <span className="em-serif">click</span>, not just read.
          </>
        }
        lead="Case studies with real metrics — and interactive demos that prove the AI claims aren't marketing."
        ctas={[
          { href: "/consultant", label: "Ask ZAC", variant: "gold", zac: {} },
          { href: "/contact", label: "Start a project", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <PortfolioFilterGrid items={portfolio} />
        </div>
      </section>

      <section className="section section--ink section--persist on-dark">
        <div className="container">
          <div className="grid-4">
            {heroStats.map((stat) => (
              <Stat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
