import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Badge, Card, CardBody, LinkArrow } from "@/components/ui";
import { portfolio } from "@/lib/content";

const THUMB_VARIANTS = ["thumb--a", "thumb--b", "thumb--c"] as const;

const FEATURED = portfolio.slice(0, 3);

function categoryLabel(category: string) {
  if (category === "ai" || category === "demo") return "AI automation";
  if (category === "automation") return "Automation";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function Portfolio() {
  return (
    <section className="section section--paper-alt" id="work">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className="overline">Portfolio &amp; demos</span>
            <h2 className="d3">
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
              <Card variant="media">
                <div
                  className={`thumb ${THUMB_VARIANTS[i % THUMB_VARIANTS.length]}`}
                  data-label={item.interactive ? "Live demo" : "Case study"}
                />
                <CardBody>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    {item.interactive ? (
                      <Badge variant="gold">Interactive</Badge>
                    ) : (
                      <Badge>{item.sector}</Badge>
                    )}
                    <span className="body-sm">
                      {item.interactive
                        ? categoryLabel(item.category)
                        : item.timeline ?? categoryLabel(item.category)}
                    </span>
                  </div>
                  <h3 className="d4" style={{ marginTop: "1rem", minHeight: "3.5rem" }}>
                    {item.title}
                  </h3>
                  <p className="body-sm" style={{ flex: 1 }}>
                    {item.summary}
                  </p>
                  <p
                    style={{
                      marginTop: "1rem",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      color: "var(--text-ink)",
                    }}
                  >
                    {item.metric}
                  </p>
                  <div style={{ marginTop: "1rem" }}>
                    <LinkArrow href={`/portfolio/${item.slug}`}>
                      {item.interactive ? "Open demo" : "Read case study"}
                    </LinkArrow>
                  </div>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
