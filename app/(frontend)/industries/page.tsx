import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta } from "@/components/layout/final-cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { ServiceIcon } from "@/components/shared/service-icon";
import { IconTile } from "@/components/ui";
import { getIndustries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Industries",
  description:
    "Retail, healthcare, fintech, logistics, real estate, education, manufacturing and professional services — software shaped by the problems we see.",
  path: "/industries",
  keywords: [
    "industry software development",
    "fintech software agency",
    "healthcare software development",
    "retail ecommerce development",
    "logistics software",
  ],
});

export default async function IndustriesPage() {
  const industries = await getIndustries();
  return (
    <>
      <PageHero
        overline="Industries"
        title={
          <>
            Domain problems, <span className="em-serif">not generic apps</span>.
          </>
        }
        lead="Eight industries where we've shipped. Each page names the leaks we see and the services that close them."
        ctas={[
          { href: "/consultant", label: "Describe your problem", variant: "gold" },
          { href: "/portfolio", label: "See the work", variant: "outline-dark" },
        ]}
      />

      <section className="section section--paper">
        <div className="container">
          <div className="ind ind--on-paper">
            {industries.map((industry, i) => (
              <Reveal key={industry.slug} index={i}>
                <Link href={`/industries/${industry.slug}`} className="ind__c">
                  <IconTile size="sm">
                    <ServiceIcon name={industry.icon} size={18} />
                  </IconTile>
                  <div className="ind__t">{industry.name}</div>
                  <div className="ind__s">{industry.problemOneLiner}</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
