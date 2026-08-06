import type { Metadata } from "next";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Faq, Process, TechStack } from "@/components/home";
import { Reveal } from "@/components/motion/reveal";
import {
  Card,
  CardBody,
  CardMedia,
  Check,
  Stat,
} from "@/components/ui";
import { aboutPrinciples, faqs, resultsStats, site, team } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { FaqJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = pageMetadata({
  title: "About us",
  description:
    "How ZACSOL operates — senior-only teams, written decisions, weekly deployables, and no lock-in. Meet the people behind the work.",
  path: "/about",
  keywords: [
    "about zacsol",
    "AI software agency team",
    "senior software engineers agency",
    "custom software company",
  ],
});

export default async function AboutPage() {
  return (
    <>
      <FaqJsonLd items={faqs} />
      <PageHero
        overline="About"
        title={
          <>
            Built to ship software you can{" "}
            <span className="em-serif">own</span>.
          </>
        }
        lead={site.description}
        ctas={[
          { href: "/consultant", label: "Ask ZAC", variant: "gold" },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <div className="sec-head">
            <span className="overline">How we operate</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Principles, not slogans
            </h2>
          </div>
          <div className="grid-2" style={{ gap: "1rem" }}>
            {aboutPrinciples.map((principle, i) => (
              <Reveal key={principle} index={i}>
                <Check>{principle}</Check>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper-alt">
        <div className="container">
          <div className="sec-head">
            <span className="overline">Team</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              The people on the work
            </h2>
          </div>
          <div className="grid-4">
            {team.map((member, i) => (
              <Reveal key={member.name} index={i}>
                <Card variant="media">
                  <CardMedia>
                    <div className="team-avatar" aria-hidden>
                      {member.initials}
                    </div>
                  </CardMedia>
                  <CardBody>
                    <h3 className="d4" style={{ margin: 0 }}>
                      {member.name}
                    </h3>
                    <p className="overline" style={{ marginTop: "0.375rem" }}>
                      {member.role}
                    </p>
                    <p className="body-sm" style={{ marginTop: "0.75rem" }}>
                      {member.bio}
                    </p>
                  </CardBody>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ink on-dark">
        <div className="container">
          <div className="sec-head">
            <span className="overline overline--gold">Numbers</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Proof in the ledger
            </h2>
          </div>
          <div className="grid-4">
            {resultsStats.map((stat, i) => (
              <Reveal key={stat.label} index={i}>
                <Stat value={stat.value} label={stat.label} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Process />
      <TechStack />
      <Faq />

      <section className="section section--paper-alt">
        <div className="container" style={{ maxWidth: "40rem" }}>
          <span className="overline">Where we work</span>
          <h2 className="d3" style={{ marginTop: "0.75rem" }}>
            Locations &amp; timezone
          </h2>
          <p className="lead" style={{ marginTop: "1.25rem" }}>
            {site.locations}
          </p>
          <p className="body-sm" style={{ marginTop: "1rem" }}>
            {site.timezoneNote}
          </p>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
