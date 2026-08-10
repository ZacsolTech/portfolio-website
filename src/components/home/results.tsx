import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card } from "@/components/ui";
import { resultsStats, testimonials } from "@/lib/content";
import { sectionClass, type Surface } from "./surface";

export function Results({ surface = "ink" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} aria-labelledby="results-title">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline overline--gold">Results</span>
          <h2 className="d2" id="results-title">
            Outcomes clients <span className="em-serif">put their name to.</span>
          </h2>
        </Reveal>

        <RevealGroup className="grid-3">
          {testimonials.map((t) => (
            <Reveal key={t.name}>
              <Card variant="dark" className="quote-card">
                <figure className="quote-card__fig">
                  <div className="quote-metric">{t.metric}</div>
                  <p className="body-sm tone-faint quote-card__label">{t.metricLabel}</p>
                  <blockquote className="body-sm tone-soft quote-card__quote">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="attrib">
                    <span className="avatar" aria-hidden>
                      {t.initials}
                    </span>
                    <span>
                      <span className="tone-strong attrib__name">{t.name}</span>
                      <span className="body-sm tone-faint attrib__role">
                        {t.role}, {t.company}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>

        <Reveal index={3}>
          <dl className="stat-band">
            {resultsStats.map((stat) => (
              <div key={stat.label}>
                <dt className="stat__label">{stat.label}</dt>
                <dd className="stat__value">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
