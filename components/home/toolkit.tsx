import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card, IconTile, LinkArrow } from "@/components/ui";
import { zac } from "@/lib/content/zac";
import { Icon } from "./icon";
import { sectionClass, type Surface } from "./surface";

/**
 * Two tools, two columns. This was a single card inside `.grid-2`, which
 * rendered as a half-width card floating beside an empty cell.
 */
const tools = [
  {
    icon: "Gauge",
    title: zac.estimator.name,
    body: "Five questions on scope, platform and timeline. A cost band with the assumptions written out so you can challenge them.",
    href: "/tools/estimator",
    cta: "Estimate my project",
    meta: "≈2 min · no email",
  },
  {
    icon: "Sparkles",
    title: "Live product demos",
    body: "The AI builds in our portfolio are running, not screenshotted. Open one and use it the way a customer would.",
    href: "/portfolio",
    cta: "Open the demos",
    meta: "Interactive · no signup",
  },
] as const;

export function Toolkit({ surface = "paper" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} id="tools" aria-labelledby="tools-title">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline">Free tools</span>
          <h2 className="d3" id="tools-title">
            Value <span className="em-serif">before</span> you talk to us.
          </h2>
          <p className="lead">Minutes in. Something you can use out. No call required.</p>
        </Reveal>

        <RevealGroup className="grid-2">
          {tools.map((tool) => (
            <Reveal key={tool.href}>
              <Card className="tool-card">
                <IconTile size="sm">
                  <Icon name={tool.icon} size={20} />
                </IconTile>
                <h3 className="d4 tool-card__title">{tool.title}</h3>
                <p className="body-sm">{tool.body}</p>
                <div className="tool-card__foot">
                  <LinkArrow href={tool.href}>{tool.cta}</LinkArrow>
                  <span className="tool-card__meta">{tool.meta}</span>
                </div>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
