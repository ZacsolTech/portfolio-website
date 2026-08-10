import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { ProjectCardGrid } from "@/components/shared/project-cards";
import { portfolio } from "@/lib/content";
import { sectionClass, type Surface } from "./surface";

const FEATURED = portfolio.slice(0, 3);

export function Portfolio({ surface = "paper-alt" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} id="work" aria-labelledby="work-title">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className="overline">Projects</span>
            <h2 className="d3" id="work-title">
              Built, shipped, <span className="em-serif">measured</span>.
            </h2>
          </div>
          <Link href="/portfolio" className="link-u">
            View all projects →
          </Link>
        </Reveal>

        <RevealGroup>
          <Reveal>
            <ProjectCardGrid items={FEATURED} layout="featured" columns="3" />
          </Reveal>
        </RevealGroup>
      </div>
    </section>
  );
}
