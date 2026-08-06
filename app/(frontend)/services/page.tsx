import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { ZacLink } from "@/components/zac/zac-link";
import { Reveal } from "@/components/motion/reveal";
import { ServiceIcon } from "@/components/shared/service-icon";
import { Chip, IconTile, Panel, PanelRow } from "@/components/ui";
import { services } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Services",
  description:
    "Eight ways we build — web, mobile, AI automation, data, custom software, UI/UX, process automation and content pipelines. One senior team.",
  path: "/services",
  keywords: [
    "software development services",
    "web development agency",
    "mobile app development",
    "AI automation services",
    "custom software development",
  ],
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        overline="Services"
        title={
          <>
            Eight ways we build, <span className="em-serif">one team</span>.
          </>
        }
        lead="Senior engineers. Weekly deployables. Clean handover. Pick a line of work — or describe the problem and let the consultant route you."
        ctas={[
          { href: "/consultant", label: "Ask ZAC", variant: "gold" },
          { href: "/book", label: "Book a consultation", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <Reveal>
            <Panel>
              {services.map((service) => (
                <PanelRow key={service.slug}>
                  {/* Grid areas rather than a fixed `auto 1fr auto`: on a phone
                      the icon and arrow left the copy about 140px to live in,
                      so the title wrapped to four lines. Below md the blurb
                      drops to its own full-width row instead. */}
                  <Link href={`/services/${service.slug}`} className="svc-row">
                    <IconTile className="svc-row__icon">
                      <ServiceIcon name={service.icon} />
                    </IconTile>
                    <h2 className="d4 svc-row__title">{service.title}</h2>
                    <ArrowRight aria-hidden className="svc-row__arrow" />
                    <div className="svc-row__body">
                      <p className="body-sm">{service.blurb}</p>
                      <div className="chips">
                        {service.tech.map((t) => (
                          <Chip key={t}>{t}</Chip>
                        ))}
                      </div>
                    </div>
                  </Link>
                </PanelRow>
              ))}
            </Panel>
          </Reveal>
        </div>
      </section>

      <section className="section section--ink on-dark">
        <div className="container" style={{ textAlign: "center", maxWidth: "40rem", marginInline: "auto" }}>
          <span className="overline overline--gold">Not sure which you need?</span>
          <h2 className="d2" style={{ marginTop: "0.75rem" }}>
            Send the problem, <span className="em-serif">not the spec</span>.
          </h2>
          <p className="lead" style={{ margin: "1.25rem auto 0", color: "var(--text-on-dark-body)" }}>
            ZAC Consultant maps your bottleneck to a service line, features, timeline and cost
            band — before you talk to anyone.
          </p>
          <div className="btn-row" style={{ justifyContent: "center", marginTop: "2rem" }}>
            <ZacLink seed="roadmap" className="btn btn--gold btn--lg">
              Start with ZAC
            </ZacLink>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
