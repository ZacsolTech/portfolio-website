import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { consultantSteps } from "@/lib/content";
import { ZacLink } from "@/components/zac/zac-link";
import { zac } from "@/lib/content/zac";
import { sectionClass, type Surface } from "./surface";

export function ConsultantFeature({ surface = "ink" }: { surface?: Surface }) {
  return (
    <section
      className={sectionClass(surface)}
      id="ai-consultant"
      aria-labelledby="consultant-title"
    >
      <div className="container">
        <div className="grid-a grid-a--wide">
          <Reveal>
            <span className="overline overline--gold">Flagship feature</span>
            <h2 className="d2" id="consultant-title" style={{ marginTop: "0.75rem" }}>
              Most agencies ask for your budget.
              <br />
              <span className="em-serif">We ask what&apos;s broken.</span>
            </h2>
            <p className="lead" style={{ marginTop: "1.5rem" }}>
              {zac.consultant.name} is a real working tool, not a chatbot widget. Describe the
              problem in your own words and it produces a project roadmap you can take to your board
              — whether or not you hire us.
            </p>
            <div className="btn-row" style={{ marginTop: "2.25rem" }}>
              <ZacLink seed="roadmap" className="btn btn--gold">
                {zac.consultant.ctaTry}
              </ZacLink>
              <Link href="/book" className="btn btn--outline-dark">
                Talk to a human instead
              </Link>
            </div>
            {/* Descriptive-anchor handoff to the consultant's indexable page.
                The button above opens the chat app, which has nothing in it for
                a crawler to read. */}
            <p className="body-sm tone-soft" style={{ marginTop: "1.25rem" }}>
              <Link href="/ai-consultant" className="link-u">
                What the AI consultant does, and what it cannot do →
              </Link>
            </p>
          </Reveal>

          <Reveal index={1}>
            <ol className="flow">
              {consultantSteps.map((step) => (
                <li className="flow__i" key={step.number}>
                  <span className="flow__n" aria-hidden>
                    {step.number}
                  </span>
                  <span className="flow__body">
                    <span className="flow__t">{step.title}</span>
                    <span className="body-sm tone-soft flow__d">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
