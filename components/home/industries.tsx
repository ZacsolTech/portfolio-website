import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { IconTile } from "@/components/ui";
import { industries } from "@/lib/content";
import { Icon } from "./icon";

export function Industries() {
  return (
    <section className="section section--ink section--persist on-dark" id="industries">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className="overline overline--gold">Industries</span>
            <h2 className="d2">
              We already know <span className="em-serif">your constraints</span>.
            </h2>
          </div>
          <Link href="/industries" className="link-u" style={{ color: "rgba(255,255,255,.75)" }}>
            Explore industries →
          </Link>
        </Reveal>

        <RevealGroup className="ind">
          {industries.map((industry) => (
            <Reveal key={industry.slug}>
              <Link href={`/industries/${industry.slug}`} className="ind__c">
                <IconTile size="sm">
                  <Icon name={industry.icon} size={18} />
                </IconTile>
                <div className="ind__t">{industry.name}</div>
                <div className="ind__s">{industry.problemOneLiner}</div>
              </Link>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
