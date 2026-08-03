import { Reveal } from "@/components/motion/reveal";
import { Badge, IconTile, IconTileNum, Panel, PanelRow } from "@/components/ui";
import { processPhases } from "@/lib/content";

export function Process() {
  return (
    <section className="section section--paper" id="process">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline">Method</span>
          <h2 className="d3">
            Six phases. <span className="em-serif">No surprises.</span>
          </h2>
          <p className="lead">
            Each phase ends in something you can hold — a document, a build, or a URL.
          </p>
        </Reveal>

        <Reveal index={1}>
          <Panel>
            {processPhases.map((phase) => (
              <PanelRow key={phase.number} className="row-grid">
                <IconTile>
                  <IconTileNum>{phase.number}</IconTileNum>
                </IconTile>
                <div>
                  <h3 className="d4">{phase.title}</h3>
                  <p className="body-sm">{phase.body}</p>
                </div>
                <Badge>{phase.deliverable}</Badge>
              </PanelRow>
            ))}
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}
