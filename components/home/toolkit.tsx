import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card, IconTile, LinkArrow } from "@/components/ui";
import { Icon } from "./icon";

/** Free tools on home — demos live under portfolio */
const tools = [
  {
    icon: "Gauge",
    title: "AI project cost estimator",
    body: "Five questions on scope, platform and timeline. A cost band with assumptions written out so you can challenge them.",
    href: "/tools/estimator",
    cta: "Estimate my project",
  },
] as const;

export function Toolkit() {
  return (
    <section className="section section--paper" id="tools">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline">Free tools</span>
          <h2 className="d3">
            Value <span className="em-serif">before</span> you talk to us.
          </h2>
          <p className="lead">Minutes in. Something you can use out. No call required.</p>
        </Reveal>

        <RevealGroup className="grid-2">
          {tools.map((tool) => (
            <Reveal key={tool.href}>
              <Card>
                <IconTile size="sm">
                  <Icon name={tool.icon} size={20} />
                </IconTile>
                <h3 className="d4" style={{ marginTop: "1.25rem" }}>
                  {tool.title}
                </h3>
                <p className="body-sm">{tool.body}</p>
                <div style={{ marginTop: "1.5rem" }}>
                  <LinkArrow href={tool.href}>{tool.cta}</LinkArrow>
                </div>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
