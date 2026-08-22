import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/motion/reveal";
import { PortfolioFilterGrid } from "@/components/shared/portfolio-filter";
import { ReviewsSlider } from "@/components/shared/reviews-slider";
import { portfolio } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description:
    "Selected software projects shipped by ZACSOL — AI automation, ops platforms, commerce systems and content pipelines with measurable outcomes.",
  path: "/portfolio",
  keywords: [
    "software agency portfolio",
    "custom software projects",
    "AI automation projects",
    "product engineering portfolio",
  ],
});

const portfolioStandards = [
  {
    title: "A metric that matters",
    body: "Every project opens with an outcome you can measure — deflection, speed, loss prevented — not vanity traffic.",
  },
  {
    title: "Problem, build and result",
    body: "What was broken, what we shipped, and what changed in production — written so a technical buyer can evaluate it.",
  },
  {
    title: "Stack and ownership in plain sight",
    body: "What we built with, how long it took, and what your team owns after delivery — clear, not implied.",
  },
] as const;

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const params = await searchParams;
  const projectParam = params.project;
  const initialSlug =
    typeof projectParam === "string" && portfolio.some((p) => p.slug === projectParam)
      ? projectParam
      : null;

  return (
    <div className="portfolio-page">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Projects", path: "/portfolio" },
        ]}
      />
      <ItemListJsonLd
        name="Software projects shipped by ZACSOL"
        description="Selected AI automation, ops platform, commerce and content pipeline projects, each with a measurable production outcome."
        path="/portfolio"
        items={portfolio.map((project) => ({
          name: project.title,
          path: `/portfolio?project=${project.slug}`,
          description: project.summary,
        }))}
      />
      <PageHero
        overline="Projects"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Projects" }]}
        title={
          <>
            Work shipped to <span className="em-serif">production</span>.
          </>
        }
        lead="Selected projects across industries — each with a clear problem, delivery story and measurable outcome."
        ctas={[
          { href: "/consultant", label: "Ask ZAC", variant: "gold", zac: {} },
          { href: "/contact", label: "Start a project", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline">How to read this</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Built for verification, not <span className="em-serif">brochure gloss</span>
            </h2>
          </Reveal>
          <div className="portfolio-page__standards">
            {portfolioStandards.map((item, i) => (
              <Reveal key={item.title} index={i} className="portfolio-page__standard">
                <span className="marker">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="d4" style={{ margin: "0.5rem 0 0" }}>
                  {item.title}
                </h3>
                <p className="body-sm">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head sec-head--split">
            <div style={{ maxWidth: "36rem" }}>
              <span className="overline">Selected projects</span>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                What we have delivered
              </h2>
            </div>
            <Link href="/contact" className="link-u">
              Start a project →
            </Link>
          </Reveal>
          <PortfolioFilterGrid items={portfolio} initialSlug={initialSlug} />
        </div>
      </section>

      <ReviewsSlider surface="ink" />

      <FinalCta />
    </div>
  );
}
