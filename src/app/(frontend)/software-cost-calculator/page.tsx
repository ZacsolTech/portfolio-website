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
import { estimatorLanding, toolComparison, zac } from "@/lib/content";
import { PRICES_AS_OF } from "@/lib/estimator/catalog";
import { PROJECT_TYPES, indicativeCostBand } from "@/lib/estimator/pricing";
import { pageMetadata } from "@/lib/seo";

const PATH = "/software-cost-calculator";

export const metadata: Metadata = pageMetadata({
  title: estimatorLanding.metaTitle,
  description: estimatorLanding.metaDescription,
  path: PATH,
  absolute: true,
  keywords: [...estimatorLanding.keywords],
  useRouteImage: true,
});

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** The steps a visitor takes, phrased so an answer engine can lift them whole. */
const HOW_STEPS = [
  {
    title: "Describe what you want built",
    body: "One or two sentences in plain language. \"A customer portal with login, invoices and support tickets\" is enough to start.",
  },
  {
    title: "Answer five questions",
    body: "Project type, how much of it ships first, web or mobile, roughly how many people will use it, and when you need it.",
  },
  {
    title: "Read the range and the breakdown",
    body: "A cost band appears with every workstream priced separately, plus the monthly subscriptions and usage the solution would need.",
  },
  {
    title: "Pull the levers",
    body: "Change scope, platform, scale or timeline and the number re-prices instantly, so you can see which of your requirements is the expensive one.",
  },
  {
    title: "Take it away",
    body: "No email is required at any point. If you want a fixed price, a one-to-two week discovery sprint is the next step.",
  },
];

/**
 * `/software-cost-calculator` — the indexable page for ZAC Estimator.
 *
 * The published bands come from `indicativeCostBand`, which reads the same
 * effort baselines and blended rate the estimator itself prices with. That is
 * deliberate: a marketing page quoting a number the tool would contradict is
 * worse for trust than publishing nothing, and this way the two cannot drift.
 */
export default function SoftwareCostCalculatorPage() {
  const bands = PROJECT_TYPES.map((type) => ({
    type,
    band: indicativeCostBand(type),
  })).filter((row): row is { type: string; band: NonNullable<ReturnType<typeof indicativeCostBand>> } =>
    Boolean(row.band),
  );

  return (
    <div className="tool-page">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Software cost calculator", path: PATH },
        ]}
      />
      <WebPageJsonLd
        name={estimatorLanding.metaTitle}
        description={estimatorLanding.metaDescription}
        path={PATH}
      />
      <SoftwareApplicationJsonLd
        name={zac.estimator.name}
        description={estimatorLanding.metaDescription}
        path={PATH}
        appUrl="/tools/estimator"
        category="FinanceApplication"
        features={estimatorLanding.drivers.map((d) => d.title)}
      />
      <HowToJsonLd
        name="How to estimate the cost of a software project"
        description="Use a free software development cost calculator to turn a plain-language project description into a costed range with a line-by-line breakdown."
        path={PATH}
        steps={HOW_STEPS}
        totalTime="PT2M"
      />
      <FaqJsonLd items={estimatorLanding.faqs} />

      <PageHero
        overline="Free calculator"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { label: "Software cost calculator" },
        ]}
        title={
          <>
            {estimatorLanding.h1Lead}{" "}
            <span className="em-serif">{estimatorLanding.h1Accent}</span>
          </>
        }
        lead={estimatorLanding.lead}
        ctas={[
          {
            href: "/tools/estimator",
            label: zac.estimator.ctaShort,
            variant: "gold",
            zac: { mode: "estimator" },
          },
          { href: "/book", label: "Get a fixed price instead", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">Typical ranges</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              What software actually{" "}
              <span className="em-serif">costs to build</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Starting points for a first release, before anything specific to
              your project is known. The low figure is an MVP scoped to the
              smallest thing that works; the high figure is a full product.
            </p>
          </Reveal>
          <Reveal index={1} className="cmp-wrap">
            <table className="cmp price-band">
              <caption className="sr-only">
                Indicative software development cost by project type, in US dollars
              </caption>
              <thead>
                <tr>
                  <th scope="col">Project type</th>
                  <th scope="col">Typical effort</th>
                  <th scope="col">MVP</th>
                  <th scope="col">Full product</th>
                </tr>
              </thead>
              <tbody>
                {bands.map(({ type, band }) => (
                  <tr key={type}>
                    <th scope="row">{type}</th>
                    <td>{band.weeks} person-weeks</td>
                    <td className="price-band__figure">{usd.format(band.low)}</td>
                    <td className="price-band__figure">{usd.format(band.high)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
          <p className="price-band__note">
            These are planning figures, not quotes, and they exclude the running
            costs below. Rebuilding an existing system runs about fifteen per
            cent above greenfield; adding to one runs well under. Run your own
            project through the{" "}
            <Link href="/tools/estimator" className="link-u">
              calculator
            </Link>{" "}
            for a range that reflects it.
          </p>
        </div>
      </section>

      <section className="section section--ink on-dark">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline overline--gold">Cost drivers</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Six things move the number, and{" "}
              <span className="em-serif">nothing else does</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Every one of these is a lever in the calculator. Knowing which one
              is expensive is usually worth more than the estimate itself.
            </p>
          </Reveal>
          <div className="grid-3" style={{ marginTop: "2.5rem" }}>
            {estimatorLanding.drivers.map((item, i) => (
              <Reveal key={item.title} index={i}>
                {/* Plain `card`, not `card--invert`: the invert variant is a
                    dark box for a *light* band, and on `section--ink` the light
                    theme's heading override outranks it — which rendered a dark
                    title on a near-black card. */}
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
        <div className="container">
          <div className="grid-2">
            <Reveal>
              <span className="overline">Included in the estimate</span>
              <ul className="tool-page__list">
                {estimatorLanding.included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal index={1}>
              <span className="overline">Not included</span>
              <ul className="tool-page__list">
                {estimatorLanding.excluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
          </div>
          <p className="price-band__note">
            Third-party prices in the breakdown are list prices in US dollars,
            checked as of {PRICES_AS_OF}. Vendors move them; the tool shows the
            date so you know how stale the figure is.
          </p>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">How it works</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Two minutes, <span className="em-serif">five questions</span>
            </h2>
          </Reveal>
          <Reveal index={1}>
            <ol className="flow" style={{ marginTop: "2.5rem" }}>
              {HOW_STEPS.map((step, i) => (
                <li key={step.title} className="flow__i" id={`step-${i + 1}`}>
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

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">Method</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Why this number is{" "}
              <span className="em-serif">defensible</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Most instant quote tools are a lookup table with a lead form
              attached. This one separates judgement from arithmetic on purpose.
            </p>
          </Reveal>
          <div className="grid-2" style={{ marginTop: "2.5rem" }}>
            {estimatorLanding.method.map((item, i) => (
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

      <section className="section section--paper-alt">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "38rem" }}>
            <span className="overline">Which tool</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Estimator or <span className="em-serif">Consultant</span>?
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              This page prices something you have already decided on. If you are
              still working out what to build, start with the{" "}
              <Link href="/ai-consultant" className="link-u">
                AI consultant
              </Link>{" "}
              instead — it ends with a cost band too.
            </p>
          </Reveal>
          <Reveal index={1} className="cmp-wrap">
            <table className="cmp">
              <caption className="sr-only">
                ZAC Estimator compared with ZAC Consultant
              </caption>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">{zac.estimator.name}</th>
                  <th scope="col">{zac.consultant.name}</th>
                </tr>
              </thead>
              <tbody>
                {toolComparison.map((row) => (
                  <tr key={row.question}>
                    <th scope="row">{row.question}</th>
                    <td>{row.estimator}</td>
                    <td>{row.consultant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container svc-detail__faq">
          <Reveal className="sec-head" style={{ maxWidth: "32rem" }}>
            <span className="overline">FAQ</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Software cost questions
            </h2>
            <Link
              href="/tools/estimator"
              className="link-u"
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              Price your project →
            </Link>
          </Reveal>
          <Reveal index={1}>
            <FaqList items={estimatorLanding.faqs} />
          </Reveal>
        </div>
      </section>

      <FinalCta
        surface="ink"
        overline="Try it"
        title={
          <>
            Get your range in two minutes.{" "}
            <span className="em-serif text-accent">No email required.</span>
          </>
        }
        lead={`${zac.estimator.name} returns a real cost band with the breakdown and the assumptions written out, so you can challenge them.`}
        showSteps={false}
      />
    </div>
  );
}
