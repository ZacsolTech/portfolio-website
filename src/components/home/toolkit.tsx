import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card, IconTile, LinkArrow } from "@/components/ui";
import { ZacLink } from "@/components/zac/zac-link";
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
    /** Opens the dock in place rather than sending them to the tool page. */
    seed: "pricing",
    learnMore: {
      href: "/software-cost-calculator",
      label: "How the software cost calculator works →",
    },
  },
  {
    icon: "Sparkles",
    title: "Project portfolio",
    body: "Production systems across support, logistics, commerce and automation — with outcomes and stack written clearly.",
    href: "/portfolio",
    cta: "Browse projects",
    meta: "Outcomes · no signup",
    seed: null,
    learnMore: null,
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
                  {tool.seed ? (
                    <ZacLink seed={tool.seed} className="link-arrow">
                      {tool.cta}
                      <ArrowRight aria-hidden />
                    </ZacLink>
                  ) : (
                    <LinkArrow href={tool.href}>{tool.cta}</LinkArrow>
                  )}
                  <span className="tool-card__meta">{tool.meta}</span>
                </div>
                {/* The secondary link is the homepage's descriptive-anchor
                    handoff to the tool's indexable page — the primary CTA above
                    opens the app, which carries no readable content. */}
                {tool.learnMore ? (
                  <p className="body-sm tool-card__learn">
                    <Link href={tool.learnMore.href} className="link-u">
                      {tool.learnMore.label}
                    </Link>
                  </p>
                ) : null}
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
