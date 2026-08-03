import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card } from "@/components/ui";
import { leakBaseline, leaks } from "@/lib/content";

export function Leaks() {
  return (
    <section className="section section--ink on-dark">
      <div className="container">
        <div className="grid-a grid-a--wide">
          <Reveal>
            <span className="overline overline--gold">The problem</span>
            <h2 className="d2" style={{ marginTop: "0.75rem" }}>
              Most builds don&apos;t fail loudly.
              <br />
              <span className="em-serif">They leak.</span>
            </h2>
            <p className="lead" style={{ marginTop: "1.5rem" }}>
              Budget and timeline rarely disappear in one bad decision. They drain through four
              predictable gaps that nobody owns until it&apos;s too late to correct them.
            </p>
            <div className="surface-note">
              <span className="overline tone-faint">Industry baseline</span>
              <div className="stat__value" style={{ marginTop: "0.75rem", fontSize: "3rem" }}>
                {leakBaseline.value}
              </div>
              <p className="body-sm tone-soft" style={{ marginTop: "0.5rem" }}>
                {leakBaseline.body}{" "}
                <span className="tone-faint">— {leakBaseline.source}</span>
              </p>
            </div>
          </Reveal>

          <RevealGroup className="leak-grid">
            {leaks.map((leak) => (
              <Reveal key={leak.number}>
                <Card variant="dark">
                  <span className="marker">Leak {leak.number}</span>
                  <h3 className="d4" style={{ marginTop: "0.75rem" }}>
                    {leak.title}
                  </h3>
                  <p className="body-sm tone-soft">{leak.body}</p>
                </Card>
              </Reveal>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
