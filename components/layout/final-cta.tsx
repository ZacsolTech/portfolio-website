import type { ReactNode } from "react";
import Link from "next/link";

type FinalCtaProps = {
  overline?: string;
  title?: ReactNode;
  lead?: ReactNode;
  showSteps?: boolean;
};

export function FinalCta({
  overline = "Next step",
  title = (
    <>
      Start with the problem.{" "}
      <span className="em-serif text-accent">We&apos;ll bring the software.</span>
    </>
  ),
  lead = "Three minutes with the AI consultant gets you a recommended solution, a feature list, a timeline and a cost band. Then decide whether you want to talk to us.",
  showSteps = true,
}: FinalCtaProps) {
  return (
    <section className="section section--paper-alt final-cta" style={{ textAlign: "center" }}>
      <div className="container">
        <div style={{ maxWidth: "48rem", marginInline: "auto" }}>
          <span className="overline">{overline}</span>
          <h2 className="d2" style={{ marginTop: "0.75rem" }}>
            {title}
          </h2>
          {lead ? (
            <p className="lead" style={{ margin: "1.5rem auto 0" }}>
              {lead}
            </p>
          ) : null}

          {showSteps ? (
            <div className="steps steps--on-paper">
              <div className="step">
                <div className="step__n">01</div>
                <div className="step__t">Describe the problem</div>
              </div>
              <div className="step">
                <div className="step__n">02</div>
                <div className="step__t">Get your roadmap</div>
              </div>
              <div className="step">
                <div className="step__n">03</div>
                <div className="step__t">Book a consultation</div>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "2.75rem",
            }}
          >
            <Link href="/consultant" className="btn btn--gold btn--lg">
              Start with the AI consultant
            </Link>
            <Link href="/book" className="btn btn--ink btn--lg">
              Book a consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
