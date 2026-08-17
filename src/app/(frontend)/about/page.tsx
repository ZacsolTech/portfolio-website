import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { ProjectCardGrid } from "@/components/shared/project-cards";
import { ReviewsSlider } from "@/components/shared/reviews-slider";
import { Stat } from "@/components/ui";
import { aboutMission, aboutStats, portfolio, team } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About us",
  description:
    "ZACSOL is a software company that designs and delivers production systems for support, logistics, commerce and automation — with clear scope, staged releases and full client ownership.",
  path: "/about",
  keywords: [
    "about zacsol",
    "software company",
    "custom software development",
    "AI software agency",
    "product engineering company",
  ],
});

export default async function AboutPage() {
  const featured = portfolio.slice(0, 3);

  return (
    <div className="about-page">
      <PageHero
        overline="About"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { label: "About" },
        ]}
        title={
          <>
            A software company built for{" "}
            <span className="em-serif">reliable delivery</span>.
          </>
        }
        lead="We partner with organisations to design, build and launch production software — from discovery through release — with transparent scope, predictable cadence and systems your team can operate."
        ctas={[
          {
            href: "/consultant",
            label: "Ask ZAC",
            variant: "gold",
            zac: { seed: "contact" },
          },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container about-page__mission">
          <Reveal>
            <span className="overline">{aboutMission.overline}</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              {aboutMission.titleLead}{" "}
              <span className="em-serif">{aboutMission.titleAccent}</span>
            </h2>
            <p className="lead" style={{ marginTop: "1.25rem" }}>
              {aboutMission.body}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink on-dark">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline overline--gold">By the numbers</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              Results that reflect how we <span className="em-serif">work</span>
            </h2>
          </Reveal>
          <div className="grid-4" style={{ marginTop: "2.5rem" }}>
            {aboutStats.map((stat, i) => (
              <Reveal key={stat.label} index={i}>
                <Stat value={stat.value} label={stat.label} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="container">
          <Reveal className="sec-head" style={{ maxWidth: "36rem" }}>
            <span className="overline">Leadership &amp; team</span>
            <h2 className="d3" style={{ marginTop: "0.75rem" }}>
              The people accountable for{" "}
              <span className="em-serif">delivery</span>
            </h2>
            <p className="lead" style={{ marginTop: "1rem" }}>
              Product, engineering and design leadership stay close to the work — from estimate through handover.
            </p>
          </Reveal>
          <div className="about-page__team">
            {team.map((member, i) => (
              <Reveal key={member.name} index={i} className="about-page__member">
                <span className="team-avatar" aria-hidden>
                  {member.initials}
                </span>
                <div>
                  <h3 className="d4" style={{ margin: 0 }}>
                    {member.name}
                  </h3>
                  <p className="overline" style={{ marginTop: "0.375rem" }}>
                    {member.role}
                  </p>
                  <p className="body-sm" style={{ marginTop: "0.75rem" }}>
                    {member.bio}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ReviewsSlider surface="ink" />

      {featured.length > 0 ? (
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
            <ProjectCardGrid items={featured} layout="compact" columns="3" />
          </div>
        </section>
      ) : null}

      <FinalCta
        title={
          <>
            Ready to discuss your project?{" "}
            <span className="em-serif text-accent">Ask ZAC</span> or book a consultation.
          </>
        }
      />
    </div>
  );
}
