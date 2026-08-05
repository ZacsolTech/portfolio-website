import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { ServiceIcon } from "@/components/shared/service-icon";
import { Badge, Card, CardBody, CardMedia, IconTile } from "@/components/ui";
import { getIndustry, getPortfolio } from "@/lib/cms";
import { getService, industries } from "@/lib/content";
import { pageMetadata, thumbClass } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = await getIndustry(slug);
  if (!industry) return {};
  return pageMetadata({
    title: `${industry.name} software`,
    description: industry.seo.description,
    path: `/industries/${slug}`,
    keywords: [
      `${industry.name.toLowerCase()} software development`,
      `${industry.name.toLowerCase()} digital products`,
      "industry software agency",
      "custom software development",
    ],
  });
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const [industry, portfolio] = await Promise.all([getIndustry(slug), getPortfolio()]);
  if (!industry) notFound();

  const relatedServices = industry.services
    .map((s) => getService(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const relatedWork = portfolio
    .filter((p) =>
      p.relatedServices.some((rs) => industry.services.includes(rs)) ||
      p.sector.toLowerCase().includes(industry.name.split(" ")[0].toLowerCase()),
    )
    .slice(0, 2);

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Industries", path: "/industries" },
          { name: industry.name, path: `/industries/${industry.slug}` },
        ]}
      />
      <PageHero
        overline="Industry"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/industries", label: "Industries" },
          { label: industry.name },
        ]}
        title={industry.name}
        lead={industry.problemOneLiner}
        ctas={[
          {
            href: "/consultant",
            label: `Describe your ${industry.name.toLowerCase()} problem`,
            variant: "gold",
            zac: { seed: `industry.${industry.slug}` },
          },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      >
        <div style={{ marginTop: "1.5rem" }}>
          <IconTile variant="gold">
            <ServiceIcon name={industry.icon} />
          </IconTile>
        </div>
      </PageHero>

      <section className="section section--paper">
        <div className="container">
          <div className="sec-head">
            <span className="overline">What we see</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Problems that show up again and again
            </h2>
          </div>
          <div className="grid-2">
            {industry.problems.map((problem, i) => (
              <Reveal key={problem} index={i}>
                <Card>
                  <span className="marker">{String(i + 1).padStart(2, "0")}</span>
                  <p style={{ marginTop: "0.75rem", fontWeight: 500, lineHeight: 1.55 }}>
                    {problem}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <div className="sec-head">
            <span className="overline">What we build</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Relevant service lines
            </h2>
          </div>
          <div className="grid-3">
            {relatedServices.map((svc, i) => (
              <Reveal key={svc.slug} index={i}>
                <Link href={`/services/${svc.slug}`} className="card-link">
                  <Card>
                    <IconTile>
                      <ServiceIcon name={svc.icon} />
                    </IconTile>
                    <h3 className="d4" style={{ marginTop: "1rem" }}>
                      {svc.title}
                    </h3>
                    <p className="body-sm" style={{ marginTop: "0.5rem" }}>
                      {svc.blurb}
                    </p>
                  </Card>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container" style={{ maxWidth: "42rem" }}>
          <span className="overline">Compliance &amp; integration</span>
          <h2 className="d3" style={{ marginTop: "0.75rem" }}>
            Credibility notes
          </h2>
          <p className="lead" style={{ marginTop: "1.25rem" }}>
            {industry.compliance}
          </p>
        </div>
      </section>

      {relatedWork.length > 0 ? (
        <section className="section section--paper-alt">
          <div className="container">
            <div className="sec-head">
              <span className="overline">Related work</span>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                Nearby case studies
              </h2>
            </div>
            <div className="grid-2">
              {relatedWork.map((item, i) => (
                <Link key={item.slug} href={`/portfolio/${item.slug}`} className="card-link">
                  <Card variant="media">
                    <CardMedia>
                      <div className={`thumb ${thumbClass(i)}`} data-label={item.sector} />
                    </CardMedia>
                    <CardBody>
                      <Badge>{item.client}</Badge>
                      <h3 className="d4" style={{ marginTop: "0.75rem" }}>
                        {item.title}
                      </h3>
                      <p
                        className="overline"
                        style={{ marginTop: "auto", paddingTop: "1rem", color: "var(--accent-fg)" }}
                      >
                        {item.metric}
                      </p>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FinalCta
        title={
          <>
            Describe your {industry.name.toLowerCase()} problem.{" "}
            <span className="em-serif text-accent">Get a roadmap.</span>
          </>
        }
      />
    </>
  );
}
