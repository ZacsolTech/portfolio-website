import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { Chip, Panel } from "@/components/ui";
import { ZacLink } from "@/components/zac/zac-link";
import { getPortfolioItem, portfolio } from "@/lib/content";
import { pageMetadata, thumbClass } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

const demos = portfolio.filter((p) => p.interactive);

export function generateStaticParams() {
  return demos.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getPortfolioItem(slug);
  if (!item || !item.interactive) return {};
  return pageMetadata({
    title: `Demo · ${item.title}`,
    description: item.summary,
    path: `/demos/${slug}`,
  });
}

export default async function DemoPage({ params }: Props) {
  const { slug } = await params;
  const item = getPortfolioItem(slug);
  if (!item || !item.interactive) notFound();

  const idx = demos.findIndex((d) => d.slug === slug);

  return (
    <>
      <section className="section section--paper section--after-nav">
        <div className="container">
          <div className="demo-layout">
            <div className={`thumb demo-layout__stage ${thumbClass(idx)}`} data-label="Live demo" />

            <Panel className="demo-layout__panel">
              <span className="overline">Interactive demo</span>
              <h1 className="d3" style={{ marginTop: "0.75rem" }}>
                {item.title}
              </h1>
              <p className="lead" style={{ marginTop: "1rem", fontSize: "1.0625rem" }}>
                {item.summary}
              </p>

              <h2 className="d4" style={{ marginTop: "2rem" }}>
                What it does
              </h2>
              <p className="body-sm" style={{ marginTop: "0.5rem" }}>
                {item.built}
              </p>

              <h2 className="d4" style={{ marginTop: "1.75rem" }}>
                Stack
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.75rem" }}>
                {item.stack.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>

              <p className="overline" style={{ marginTop: "1.75rem" }}>
                Build time · {item.timeline ?? "—"}
              </p>

              <div className="btn-row" style={{ marginTop: "2rem" }}>
                <ZacLink seed={`like.${item.slug}`} className="btn btn--gold">
                  Want this for your business?
                </ZacLink>
                <Link href={`/portfolio/${item.slug}`} className="btn btn--ink">
                  Full case study
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      <FinalCta
        title={
          <>
            Want this for your business?{" "}
            <span className="em-serif text-accent">Ask ZAC.</span>
          </>
        }
      />
    </>
  );
}
