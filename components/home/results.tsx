import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card } from "@/components/ui";
import { resultsStats, testimonials } from "@/lib/content";

export function Results() {
  return (
    <section className="section section--ink section--persist on-dark">
      <div className="container">
        <Reveal className="sec-head" style={{ maxWidth: "44rem" }}>
          <span className="overline overline--gold">Results</span>
          <h2 className="d2">
            Outcomes clients <span className="em-serif">put their name to.</span>
          </h2>
        </Reveal>

        <RevealGroup className="grid-3">
          {testimonials.map((t) => (
            <Reveal key={t.name}>
              <Card variant="dark">
                <div className="quote-metric">{t.metric}</div>
                <p className="body-sm tone-faint" style={{ marginTop: "0.5rem" }}>
                  {t.metricLabel}
                </p>
                <p className="body-sm tone-soft" style={{ marginTop: "1.25rem" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="attrib">
                  <div className="avatar">{t.initials}</div>
                  <div>
                    <div className="tone-strong" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                      {t.name}
                    </div>
                    <div className="body-sm tone-faint">
                      {t.role}, {t.company}
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>

        <Reveal index={3} className="stat-band">
          {resultsStats.map((stat) => (
            <div key={stat.label}>
              <div className="stat__value">{stat.value}</div>
              <div className="stat__label">{stat.label}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
