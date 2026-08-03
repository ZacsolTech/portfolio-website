import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { IconTile } from "@/components/ui";
import { industries } from "@/lib/content";
import { Icon } from "./icon";
import { isInk, sectionClass, type Surface } from "./surface";

export function Industries({ surface = "paper" }: { surface?: Surface }) {
  const onInk = isInk(surface);

  return (
    <section className={sectionClass(surface)} id="industries" aria-labelledby="industries-title">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className={onInk ? "overline overline--gold" : "overline"}>Industries</span>
            <h2 className="d3" id="industries-title">
              We already know <span className="em-serif">your constraints</span>.
            </h2>
          </div>
          <Link href="/industries" className="link-u">
            Explore industries →
          </Link>
        </Reveal>

        <RevealGroup className={onInk ? "ind" : "ind ind--on-paper"}>
          {industries.map((industry) => (
            <Reveal key={industry.slug}>
              <Link href={`/industries/${industry.slug}`} className="ind__c">
                <IconTile size="sm">
                  <Icon name={industry.icon} size={18} />
                </IconTile>
                <span className="ind__t">{industry.name}</span>
                <span className="ind__s">{industry.problemOneLiner}</span>
              </Link>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
