import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  HowToJsonLd,
  SoftwareApplicationJsonLd,
  WebPageJsonLd,
} from "@/components/seo/json-ld";
import { FaqList } from "@/components/shared/faq-list";
import { ServiceIcon } from "@/components/shared/service-icon";
import { ZacLink } from "@/components/zac/zac-link";
import { consultantLanding, consultantSteps, services, toolComparison, zac } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-consultant";

export const metadata: Metadata = pageMetadata({
  title: consultantLanding.metaTitle,
  description: consultantLanding.metaDescription,
  path: PATH,
  absolute: true,
  keywords: [...consultantLanding.keywords],
  useRouteImage: true,
});

/**
 * `/ai-consultant` — the indexable page for ZAC Consultant.
 *
 * The tool itself lives at `/consultant`, which is a full-viewport chat app
 * with no readable content and is therefore `noindex, follow`. This page is
 * what ranks: it explains the tool, answers the questions people type before
 * they trust one, and carries the WebApplication, HowTo and FAQPage nodes that
 * make it quotable by an answer engine.
 */
export default function AiConsultantPage() {
  return (
    <div className="tool-page">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "AI Consultant", path: PATH },
        ]}
      />
      <WebPageJsonLd
        name={consultantLanding.metaTitle}
        description={consultantLanding.metaDescription}
        path={PATH}
      />
      <SoftwareApplicationJsonLd
        name={zac.consultant.name}
        description={consultantLanding.metaDescription}
        path={PATH}
        appUrl="/consultant"
        features={consultantLanding.deliverables.map((d) => d.title)}
      />
      <HowToJsonLd
        name="How to get a free software solution roadmap"
        description="Describe a business problem to ZAC Consultant and receive a recommended solution, a visual prototype, a phased timeline and a cost band."
        path={PATH}
        steps={consultantSteps}
        totalTime="PT3M"
      />
      <FaqJsonLd items={consultantLanding.faqs} />

      <PageHero
        overline="Free AI tool"
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "AI Consultant" }]}
        title={
          <>
            {consultantLanding.h1Lead}{" "}
            <span className="em-serif">{consultantLanding.h1Accent}</span>.
          </>
        }
        lead={consultantLanding.lead}
        ctas={[
          {
            href: "/consultant",
            label: zac.consultant.ctaTry,
            variant: "gold",
            zac: {},
          },
          { href: "/book", label: "Talk to an engineer instead", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">What you get</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Six things land on screen in{" "}
              <span className="em-serif">about three minutes</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Not a summary of what you typed. The output is the same set of
              artefacts a paid discovery call is supposed to produce.
            </p>
          </Reveal>
          <div className="grid-3" style={{ marginTop: "2.5rem" }}>
            {consultantLanding.deliverables.map((item, i) => (
              <Reveal key={item.title} index={i}>
                <div className="card">
                  <h3 className="d4">{item.title}</h3>
                  <p className="body-sm">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ink on-dark">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline overline--gold">How it works</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              From a messy paragraph to a{" "}
              <span className="em-serif">costed roadmap</span>
            </h2>
          </Reveal>
          <Reveal index={1}>
            <ol className="flow" style={{ marginTop: "2.5rem" }}>
              {consultantSteps.map((step, i) => (
                <li key={step.title} className="flow__i" id={`step-${i + 1}`}>
                  <span className="flow__n">{step.number}</span>
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

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">When to use it</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Good reasons to <span className="em-serif">open it</span>
            </h2>
          </Reveal>
          <Reveal index={1}>
            <ul className="tool-page__list">
              {consultantLanding.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">What it can scope</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Eight service lines, and it will tell you{" "}
              <span className="em-serif">which one</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              ZAC recommends from what we actually deliver. Each of these has a
              page of its own if you would rather read than talk.
            </p>
          </Reveal>
          <div className="grid-3" style={{ marginTop: "2.5rem" }}>
            {services.map((service, i) => (
              <Reveal key={service.slug} index={i}>
                <Link href={`/services/${service.slug}`} className="card-link">
                  <div className="card">
                    <span className="icon-tile icon-tile--gold" aria-hidden>
                      <ServiceIcon name={service.icon} />
                    </span>
                    <h3 className="d4" style={{ marginTop: "1rem" }}>
                      {service.title}
                    </h3>
                    <p className="body-sm">{service.blurb}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">Which tool</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Consultant or <span className="em-serif">Estimator</span>?
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Two tools, two questions. If you already know what you want built
              and only need the number, the{" "}
              <Link href="/software-cost-calculator" className="link-u">
                software cost calculator
              </Link>{" "}
              is the shorter path.
            </p>
          </Reveal>
          <Reveal index={1} className="cmp-wrap">
            <table className="cmp">
              <caption className="sr-only">
                ZAC Consultant compared with ZAC Estimator
              </caption>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">{zac.consultant.name}</th>
                  <th scope="col">{zac.estimator.name}</th>
                </tr>
              </thead>
              <tbody>
                {toolComparison.map((row) => (
                  <tr key={row.question}>
                    <th scope="row">{row.question}</th>
                    <td>{row.consultant}</td>
                    <td>{row.estimator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">Where it stops</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              What this tool <span className="em-serif">is not</span>
            </h2>
          </Reveal>
          <div className="grid-3" style={{ marginTop: "2.5rem" }}>
            {consultantLanding.limits.map((item, i) => (
              <Reveal key={item.title} index={i}>
                <div className="card">
                  <h3 className="d4">{item.title}</h3>
                  <p className="body-sm">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container svc-detail__faq">
          <Reveal className="sec-head" style={{ maxWidth: "32rem" }}>
            <span className="overline">FAQ</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              About the AI consultant
            </h2>
            <ZacLink
              className="link-u"
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              Ask ZAC directly →
            </ZacLink>
          </Reveal>
          <Reveal index={1}>
            <FaqList items={consultantLanding.faqs} />
          </Reveal>
        </div>
      </section>

      <FinalCta
        surface="ink"
        overline="Try it"
        title={
          <>
            It costs nothing and takes three minutes.{" "}
            <span className="em-serif text-accent">Start with the problem.</span>
          </>
        }
      />
    </div>
  );
}
