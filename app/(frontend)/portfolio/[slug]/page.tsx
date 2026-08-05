import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Chip, Panel, PanelRow, Stat } from "@/components/ui";
import { getPortfolioItem, getPortfolio } from "@/lib/cms";
import { getService, portfolio } from "@/lib/content";
import { pageMetadata, thumbClass } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return portfolio.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPortfolioItem(slug);
  if (!item) return {};
  return pageMetadata({
    title: item.title,
    description: item.summary,
    path: `/portfolio/${slug}`,
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const [item, allPortfolio] = await Promise.all([getPortfolioItem(slug), getPortfolio()]);
  if (!item) notFound();

  const idx = allPortfolio.findIndex((p) => p.slug === slug);
  const next = allPortfolio[(idx + 1) % allPortfolio.length];

  const relatedServicesList = item.relatedServices
    .map((s) => getService(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <>
      <PageHero
        overline={item.sector}
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/portfolio", label: "Portfolio" },
          { label: item.client },
        ]}
        title={item.title}
        lead={
          <>
            <span style={{ color: "var(--gold)" }}>{item.metric}</span>
            <br />
            {item.client} · {item.sector}
          </>
        }
        ctas={
          /* A case study is a "could you build me that?" moment, so the CTA
             goes to cost rather than to a generic greeting. */
          item.interactive
            ? [
                { href: `/demos/${item.slug}`, label: "Try the live demo", variant: "gold" },
                {
                  href: "/tools/estimator",
                  label: "What would this cost?",
                  variant: "outline-dark",
                  zac: { seed: `like.${item.slug}` },
                },
              ]
            : [
                {
                  href: "/tools/estimator",
                  label: "What would this cost?",
                  variant: "gold",
                  zac: { seed: `like.${item.slug}` },
                },
                { href: "/book", label: "Book a consultation", variant: "outline-dark" },
              ]
        }
      >
        <div
          className={`thumb ${thumbClass(idx)}`}
          data-label={item.client}
          style={{
            marginTop: "2.5rem",
            height: "min(22rem, 50vw)",
            borderRadius: "var(--r-3xl)",
            boxShadow: "var(--sh-hero, 0 24px 64px rgba(0,0,0,.35))",
          }}
        />
      </PageHero>

      <section className="section section--paper">
        <div className="container">
          <Reveal>
            <Panel>
              {(
                [
                  ["Client", item.client],
                  ["Sector", item.sector],
                  ["Timeline", item.timeline ?? "—"],
                  ["Stack", item.stack.join(" · ")],
                ] as const
              ).map(([k, v]) => (
                <PanelRow key={k}>
                  {/* A fixed 8rem label column took half a 320px screen and
                      left "Stack" wrapping one word per line. Stacks below sm. */}
                  <div className="meta-row">
                    <span className="overline">{k}</span>
                    <span className="meta-row__v">{v}</span>
                  </div>
                </PanelRow>
              ))}
            </Panel>
          </Reveal>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container" style={{ maxWidth: "42rem" }}>
          <span className="overline">The problem</span>
          <h2 className="d3" style={{ marginTop: "0.75rem" }}>
            What was leaking
          </h2>
          <p className="lead" style={{ marginTop: "1.25rem" }}>
            {item.problem}
          </p>
          <div className="warn-callout">
            <span className="marker marker--warn">Risk</span>
            <p style={{ margin: "0.5rem 0 0" }}>
              Left alone, this compounds — more headcount on the same broken path, and less trust in
              the numbers the business runs on.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container" style={{ maxWidth: "42rem" }}>
          <span className="overline">What we built</span>
          <h2 className="d3" style={{ marginTop: "0.75rem" }}>
            The system
          </h2>
          <p className="lead" style={{ marginTop: "1.25rem" }}>
            {item.built}
          </p>
          <div
            className={`thumb ${thumbClass(idx + 1)}`}
            data-label="Build"
            style={{
              marginTop: "2rem",
              height: "14rem",
              borderRadius: "var(--r-2xl)",
            }}
          />
        </div>
      </section>

      <section className="section section--ink section--persist on-dark">
        <div className="container">
          <div className="sec-head">
            <span className="overline overline--gold">Results</span>
            <h2 className="d3" style={{ marginTop: "0.75rem", color: "#fff" }}>
              What changed
            </h2>
          </div>
          <div className="grid-3">
            {item.results.map((r) => (
              <Stat key={r.label} value={r.value} label={r.label} />
            ))}
          </div>
        </div>
      </section>

      {item.quote ? (
        <section className="section section--paper">
          <div className="container" style={{ textAlign: "center", maxWidth: "40rem", marginInline: "auto" }}>
            <blockquote
              className="em-serif"
              style={{ fontSize: "clamp(1.35rem, 3vw, 2rem)", lineHeight: 1.35, margin: 0 }}
            >
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <p className="overline" style={{ marginTop: "1.5rem" }}>
              {item.client}
            </p>
          </div>
        </section>
      ) : null}

      <section className="section section--paper-alt">
        <div className="container">
          <span className="overline">Stack used</span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "1rem",
            }}
          >
            {item.stack.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>

          <div style={{ marginTop: "2.5rem" }}>
            <span className="overline">Related services</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
              {relatedServicesList.map((svc) => (
                <Link key={svc.slug} href={`/services/${svc.slug}`} className="btn btn--ghost btn--sm">
                  {svc.shortTitle}
                </Link>
              ))}
            </div>
          </div>

          {next && next.slug !== item.slug ? (
            <p style={{ marginTop: "3rem" }}>
              <Link href={`/portfolio/${next.slug}`} className="link-u">
                Next case study: {next.title} →
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <FinalCta />
    </>
  );
}
