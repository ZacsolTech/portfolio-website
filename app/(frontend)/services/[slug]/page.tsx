import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { FaqList } from "@/components/shared/faq-list";
import { ServiceIcon } from "@/components/shared/service-icon";
import {
  Badge,
  Card,
  CardBody,
  CardMedia,
  Check,
  Chip,
  Panel,
  PanelRow,
} from "@/components/ui";
import { getService, getPortfolio } from "@/lib/cms";
import { services } from "@/lib/content";
import { pageMetadata, thumbClass } from "@/lib/seo";
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd } from "@/components/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
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
  const [service, portfolio] = await Promise.all([getService(slug), getPortfolio()]);
  if (!service) notFound();

  const related = portfolio
    .filter((p) => p.relatedServices.includes(service.slug))
    .slice(0, 2);

  return (
    <>
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
        title={service.title}
        lead={service.blurb}
        ctas={[
          { href: "/consultant", label: "Ask the AI consultant", variant: "gold" },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      >
        <div style={{ marginTop: "1.5rem" }}>
          <span
            className="icon-tile icon-tile--gold"
            style={{ display: "inline-flex" }}
            aria-hidden
          >
            <ServiceIcon name={service.icon} />
          </span>
        </div>
      </PageHero>

      <section className="section section--paper">
        <div className="container">
          <div className="sec-head">
            <span className="overline">What&apos;s included</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Scope you can hold us to
            </h2>
          </div>
          <div className="grid-2" style={{ gap: "1rem" }}>
            {service.included.map((item, i) => (
              <Reveal key={item} index={i}>
                <Check>{item}</Check>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <div className="sec-head">
            <span className="overline">Our stack for this</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Tools matched to the job
            </h2>
          </div>
          <div className="grid-3" style={{ gap: "1.5rem" }}>
            {service.stackGroups.map((group) => (
              <Reveal key={group.label}>
                <div>
                  <p className="overline">{group.label}</p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.375rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    {group.items.map((item) => (
                      <Chip key={item}>{item}</Chip>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <div className="sec-head">
            <span className="overline">Process</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              How we deliver {service.shortTitle.toLowerCase()}
            </h2>
          </div>
          <Reveal>
            <Panel>
              {service.process.map((step, i) => (
                <PanelRow key={step.title}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "1.25rem",
                      alignItems: "start",
                    }}
                  >
                    <span
                      className="icon-tile icon-tile--sm"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="d4" style={{ margin: 0 }}>
                        {step.title}
                      </h3>
                      <p className="body-sm" style={{ margin: "0.5rem 0 0" }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                </PanelRow>
              ))}
            </Panel>
          </Reveal>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section section--paper-alt">
          <div className="container">
            <div className="sec-head">
              <span className="overline">Related work</span>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                Proof in production
              </h2>
            </div>
            <div className="grid-2">
              {related.map((item, i) => (
                <Reveal key={item.slug} index={i}>
                  <Link href={`/portfolio/${item.slug}`} className="card-link">
                    <Card variant="media">
                      <CardMedia>
                        <div className={`thumb ${thumbClass(i)}`} data-label={item.sector} />
                      </CardMedia>
                      <CardBody>
                        <Badge variant={item.interactive ? "gold" : "default"}>
                          {item.interactive ? "Interactive" : "Case study"}
                        </Badge>
                        <h3 className="d4" style={{ marginTop: "0.75rem" }}>
                          {item.title}
                        </h3>
                        <p className="body-sm" style={{ marginTop: "0.5rem" }}>
                          {item.summary}
                        </p>
                        <p
                          className="overline"
                          style={{ marginTop: "auto", paddingTop: "1.25rem", color: "var(--accent-fg)" }}
                        >
                          {item.metric}
                        </p>
                      </CardBody>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--paper">
        <div className="container">
          <div className="sec-head">
            <span className="overline">Engagement shapes</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              How we work together
            </h2>
          </div>
          <div className="grid-3">
            {service.engagement.map((shape, i) => (
              <Reveal key={shape.title} index={i}>
                <Card>
                  <span className="overline">{shape.from}</span>
                  <h3 className="d4" style={{ marginTop: "0.75rem" }}>
                    {shape.title}
                  </h3>
                  <p className="body-sm" style={{ marginTop: "0.75rem" }}>
                    {shape.body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <div className="grid-a grid-a--panel">
            <div>
              <span className="overline">FAQ</span>
              <h2 className="d3" style={{ marginTop: "0.75rem" }}>
                About {service.shortTitle.toLowerCase()}
              </h2>
              <p className="body-sm" style={{ marginTop: "1rem", maxWidth: "22rem" }}>
                Not sure this is the right service? Ask the consultant.
              </p>
              <Link href="/consultant" className="link-u" style={{ display: "inline-block", marginTop: "1rem" }}>
                Ask the AI consultant →
              </Link>
            </div>
            <FaqList items={service.faqs} />
          </div>
        </div>
      </section>

      <FinalCta
        title={
          <>
            Not sure this is the right service?{" "}
            <span className="em-serif text-accent">Ask the consultant.</span>
          </>
        }
      />
    </>
  );
}
