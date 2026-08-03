import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card, Chip } from "@/components/ui";
import { techStackCategories } from "@/lib/content";

export function TechStack() {
  return (
    <section className="section section--paper-alt">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "40rem" }}>
          <span className="overline">Stack</span>
          <h2 className="d3">
            The tools we actually use <span className="em-serif">in production</span>.
          </h2>
        </Reveal>

        <RevealGroup className="grid-3">
          {techStackCategories.map((group) => (
            <Reveal key={group.label}>
              <Card className="stack-group">
                <h4>{group.label}</h4>
                <div className="chips" style={{ margin: 0 }}>
                  {group.items.map((item) => (
                    <Chip key={item}>{item}</Chip>
                  ))}
                </div>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
