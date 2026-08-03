import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Badge, Card, CardBody, LinkArrow } from "@/components/ui";
import { portfolio } from "@/lib/content";
import { sectionClass, type Surface } from "./surface";

const THUMB_VARIANTS = ["thumb--a", "thumb--b", "thumb--c"] as const;

const FEATURED = portfolio.slice(0, 3);

function categoryLabel(category: string) {
  if (category === "ai" || category === "demo") return "AI automation";
  if (category === "automation") return "Automation";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function Portfolio({ surface = "paper-alt" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} id="work" aria-labelledby="work-title">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className="overline">Portfolio &amp; demos</span>
            <h2 className="d3" id="work-title">
              Built, shipped, <span className="em-serif">measured</span>.
            </h2>
          </div>
          <Link href="/portfolio" className="link-u">
            View all work →
          </Link>
        </Reveal>

        <RevealGroup className="grid-3">
          {FEATURED.map((item, i) => (
            <Reveal key={item.slug}>
              <Link href={`/portfolio/${item.slug}`} className="card-link">
                <Card variant="media" className="work-card">
                  <div
                    className={`thumb ${THUMB_VARIANTS[i % THUMB_VARIANTS.length]}`}
                    data-label={item.interactive ? "Live demo" : "Case study"}
                  />
                  <CardBody>
                    <div className="work-card__meta">
                      {item.interactive ? (
                        <Badge variant="gold">Interactive</Badge>
                      ) : (
                        <Badge>{item.sector}</Badge>
                      )}
                      <span className="body-sm">
                        {item.interactive
                          ? categoryLabel(item.category)
                          : (item.timeline ?? categoryLabel(item.category))}
                      </span>
                    </div>
                    {/* Titles align by row, not by a magic min-height that
                        breaks the moment one wraps to three lines. */}
                    <h3 className="d4 work-card__title">{item.title}</h3>
                    <p className="body-sm work-card__summary">{item.summary}</p>
                    <p className="work-card__metric">{item.metric}</p>
                    <div className="work-card__cta">
                      <LinkArrow as="span">
                        {item.interactive ? "Open demo" : "Read case study"}
                      </LinkArrow>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
