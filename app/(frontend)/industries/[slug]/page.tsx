import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { ProjectCardGrid } from "@/components/shared/project-cards";
import { ServiceIcon } from "@/components/shared/service-icon";
import { getIndustry, getService, industries, portfolio } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};
  return pageMetadata({
    title: `${industry.name} software`,
    description: industry.seo.description,
    path: `/industries/${slug}`,
    keywords: [
      `${industry.name.toLowerCase()} software development`,
      `${industry.name.toLowerCase()} digital products`,
      "industry software",
      "custom software development",
    ],
  });
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const relatedServices = industry.services
    .map((s) => getService(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const relatedWork = portfolio
    .filter(
      (p) =>
        p.relatedServices.some((rs) => industry.services.includes(rs)) ||
        p.sector.toLowerCase().includes(industry.name.split(" ")[0].toLowerCase()),
    )
    .slice(0, 2);

  return (
    <div className="ind-detail">
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
        title={
          <span className="ind-detail__title">
            <span className="icon-tile icon-tile--gold" aria-hidden>
              <ServiceIcon name={industry.icon} />
            </span>
            {industry.name}
          </span>
        }
        lead={industry.seo.description}
        ctas={[
          {
            href: "/consultant",
            label: "Ask ZAC",
            variant: "gold",
            zac: { seed: `industry.${industry.slug}` },
          },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline">Challenges</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Problems we solve in{" "}
              <span className="em-serif">{industry.name.toLowerCase()}</span>
            </h2>
          </Reveal>
          <div className="ind-detail__scope">
            {industry.problems.map((problem, i) => (
              <Reveal key={problem} index={i} className="ind-detail__scope-item">
                <span className="marker">{String(i + 1).padStart(2, "0")}</span>
                <p>{problem}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container ind-detail__compliance">
          <Reveal>
            <span className="overline">Compliance &amp; integration</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Built for the rules your market{" "}
              <span className="em-serif">actually has</span>
            </h2>
            <p className="lead" style={{ marginTop: "1.25rem" }}>
              {industry.compliance}
            </p>
          </Reveal>
        </div>
      </section>

      {relatedServices.length > 0 ? (
        <section className="section section--paper">
          <div className="container">
            <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
              <span className="overline">Capabilities</span>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                How we deliver for this{" "}
                <span className="em-serif">industry</span>
              </h2>
            </Reveal>
            <div className="ind-detail__services">
              {relatedServices.map((svc, i) => (
                <Reveal key={svc.slug} index={i}>
                  <Link href={`/services/${svc.slug}`} className="ind-detail__service">
                    <span className="icon-tile icon-tile--sm" aria-hidden>
                      <ServiceIcon name={svc.icon} size={18} />
                    </span>
                    <span className="ind-detail__service-body">
                      <span className="ind-detail__service-title">{svc.shortTitle}</span>
                      <span className="body-sm">{svc.blurb}</span>
                    </span>
                    <span className="ind-detail__service-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {relatedWork.length > 0 ? (
        <section className="section section--paper-alt">
          <div className="container">
            <Reveal className="sec-head sec-head--split">
              <div style={{ maxWidth: "36rem" }}>
                <span className="overline">Selected projects</span>
                <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                  Projects in <span className="em-serif">production</span>
                </h2>
              </div>
              <Link href="/portfolio" className="link-u">
                View portfolio →
              </Link>
            </Reveal>
            <ProjectCardGrid items={relatedWork} layout="compact" columns="2" />
          </div>
        </section>
      ) : null}

      <FinalCta
        title={
          <>
            Planning software for {industry.name.toLowerCase()}?{" "}
            <span className="em-serif text-accent">Ask ZAC</span> or book a consultation.
          </>
        }
      />
    </div>
  );
}
