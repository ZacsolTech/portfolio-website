import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { consultantSteps } from "@/lib/content";

export function ConsultantFeature() {
  return (
    <section className="section section--ink on-dark" id="ai-consultant">
      <div className="container">
        <div className="grid-a grid-a--wide">
          <Reveal>
            <span className="overline overline--gold">Flagship feature</span>
            <h2 className="d2" style={{ marginTop: "0.75rem" }}>
              Most agencies ask for your budget.
              <br />
              <span className="em-serif">We ask what&apos;s broken.</span>
            </h2>
            <p className="lead" style={{ marginTop: "1.5rem" }}>
              Our AI Business Consultant is a real working tool, not a chatbot widget. Describe the
              problem in your own words and it produces a project roadmap you can take to your board
              — whether or not you hire us.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2.25rem" }}>
              <Link href="/consultant" className="btn btn--gold">
                Try it now — free
              </Link>
              <Link href="/book" className="btn btn--outline-dark">
                Talk to a human instead
              </Link>
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="flow">
              {consultantSteps.map((step) => (
                <div className="flow__i" key={step.number}>
                  <div className="flow__n">{step.number}</div>
                  <div>
                    <div className="flow__t">{step.title}</div>
                    <p className="body-sm tone-soft" style={{ margin: "0.375rem 0 0" }}>
                      {step.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
