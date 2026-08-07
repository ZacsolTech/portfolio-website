import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd } from "@/components/seo/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { ProjectCardGrid } from "@/components/shared/project-cards";
import { ServiceIcon } from "@/components/shared/service-icon";
import { Chip } from "@/components/ui";
import { ZacLink } from "@/components/zac/zac-link";
import { getService, portfolio, services } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return pageMetadata({
    title: service.title,
    description: service.seo.description,
    path: `/services/${slug}`,
    keywords: [
      service.title.toLowerCase(),
      `${service.title.toLowerCase()} agency`,
      ...service.tech.map((t) => t.toLowerCase()),
      "custom software development",
    ],
  });
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = portfolio
    .filter((p) => p.relatedServices.includes(service.slug))
    .slice(0, 2);

  return (
    <div className="svc-detail">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ]}
      />
      <ServiceJsonLd
        name={service.title}
        description={service.seo.description}
        path={`/services/${service.slug}`}
      />
      <FaqJsonLd items={service.faqs} />

      <PageHero
        overline="Service"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/services", label: "Services" },
          { label: service.shortTitle },
        ]}
        title={
          <span className="svc-detail__title">
            <span className="icon-tile icon-tile--gold" aria-hidden>
              <ServiceIcon name={service.icon} />
            </span>
            {service.title}
          </span>
        }
        lead={service.blurb}
        ctas={[
          {
            href: "/consultant",
            label: "Ask ZAC",
            variant: "gold",
            zac: { seed: `service.${service.slug}` },
          },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      >
        <div className="chips svc-detail__tech">
          {service.tech.map((item) => (
            <Chip key={item}>{item}</Chip>
          ))}
        </div>
      </PageHero>

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline">What&apos;s included</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Scope you can <span className="em-serif">hold us to</span>
            </h2>
          </Reveal>
          <div className="svc-detail__scope">
            {service.included.map((item, i) => (
              <Reveal key={item} index={i} className="svc-detail__scope-item">
                <span className="marker">{String(i + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline">Process</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              How we deliver{" "}
              <span className="em-serif">{service.shortTitle.toLowerCase()}</span>
            </h2>
          </Reveal>
          <Reveal index={1}>
            <ol className="flow svc-detail__flow">
              {service.process.map((step, i) => (
                <li key={step.title} className="flow__i">
                  <span className="flow__n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flow__body">
                    <span className="flow__t">{step.title}</span>
                    <span className="flow__d body-sm">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section section--paper">
          <div className="container">
            <Reveal className="sec-head sec-head--split">
              <div>
                <span className="overline">Related projects</span>
                <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                  Proof in production
                </h2>
              </div>
              <Link href="/portfolio" className="link-u">
                All work →
              </Link>
            </Reveal>
            <ProjectCardGrid items={related} layout="media" columns="2" />
          </div>
        </section>
      ) : null}

      <section className="section section--paper-alt">
        <div className="container svc-detail__faq">
          <Reveal className="sec-head" style={{ maxWidth: "32rem" }}>
            <span className="overline">FAQ</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              About {service.shortTitle.toLowerCase()}
            </h2>
            <ZacLink
              seed={`service.${service.slug}`}
              className="link-u"
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              Ask ZAC →
            </ZacLink>
          </Reveal>
          <Reveal index={1}>
            <FaqList items={service.faqs} />
          </Reveal>
        </div>
      </section>

      <FinalCta
        title={
          <>
            Not sure this is the right service?{" "}
            <span className="em-serif text-accent">Ask ZAC.</span>
          </>
        }
      />
    </div>
  );
}
