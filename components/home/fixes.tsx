import { Reveal } from "@/components/motion/reveal";
import { Badge, IconTile, Panel, PanelRow } from "@/components/ui";
import { leakFixes } from "@/lib/content";
import { Icon } from "./icon";

const FIX_ICONS = ["ClipboardCheck", "FileText", "TrendingUp", "GitBranch"] as const;

export function Fixes() {
  return (
    <section className="section section--paper">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline">The fix</span>
          <h2 className="d3">
            Every leak has a fix. Here&apos;s <span className="em-serif">what changes</span>.
          </h2>
          <p className="lead">
            Same four numbers, same order. This is the operating model, not a promise.
          </p>
        </Reveal>

        <Reveal index={1}>
          <Panel>
            {leakFixes.map((fix, i) => (
              <PanelRow key={fix.number} className="row-grid">
                <IconTile>
                  <Icon name={FIX_ICONS[i] ?? "Sparkles"} size={22} />
                </IconTile>
                <div>
                  <span className="card__num">Leak {fix.number} →</span>
                  <h3 className="d4" style={{ marginTop: "0.5rem" }}>
                    {fix.title}
                  </h3>
                  <p className="body-sm measure">{fix.body}</p>
                </div>
                <Badge variant="gold">{fix.badge}</Badge>
              </PanelRow>
            ))}
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
