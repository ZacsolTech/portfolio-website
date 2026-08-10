import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ZacLink } from "@/components/zac/zac-link";
import { zac } from "@/lib/content/zac";

const STEPS = [
  { n: "01", t: "Describe the problem" },
  { n: "02", t: "Get your roadmap" },
  { n: "03", t: "Book a consultation" },
] as const;

type FinalCtaProps = {
  overline?: string;
  title?: ReactNode;
  lead?: ReactNode;
  showSteps?: boolean;
  /**
   * `ink` closes the page on a dark band regardless of theme. Other pages
   * keep the paper close so a dark section above doesn't run into it.
   */
  surface?: "paper-alt" | "ink";
};

export function FinalCta({
  overline = "Next step",
  title = (
    <>
      Start with the problem.{" "}
      <span className="em-serif text-accent">We&apos;ll bring the software.</span>
    </>
  ),
  lead = `Three minutes with ${zac.consultant.name} gets you a recommended solution, a feature list, a timeline and a cost band. Then decide whether you want to talk to us.`,
  showSteps = true,
  surface = "paper-alt",
}: FinalCtaProps) {
  const onInk = surface === "ink";

  return (
    <section
      className={cn(
        "section final-cta",
        onInk ? "section--ink section--persist on-dark" : "section--paper-alt",
      )}
      aria-labelledby="final-cta-title"
    >
      <div className="container">
        <div className="final-cta__inner">
          <span className={onInk ? "overline overline--gold" : "overline"}>{overline}</span>
          <h2 className="d2" id="final-cta-title" style={{ marginTop: "0.75rem" }}>
            {title}
          </h2>
          {lead ? (
            <p className="lead" style={{ margin: "1.5rem auto 0" }}>
              {lead}
            </p>
          ) : null}

          {showSteps ? (
            <ol className={cn("steps", !onInk && "steps--on-paper")}>
              {STEPS.map((step) => (
                <li className="step" key={step.n}>
                  <span className="step__n">{step.n}</span>
                  <span className="step__t">{step.t}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="btn-row final-cta__actions">
            <ZacLink seed="roadmap" className="btn btn--gold btn--lg">
              {zac.consultant.ctaLong}
            </ZacLink>
            <Link
              href="/book"
              className={cn("btn btn--lg", onInk ? "btn--outline-dark" : "btn--ink")}
            >
              Book a consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
