import Link from "next/link";
import { Reveal, RevealGroup } from "@/components/motion/reveal";
import { Card, CardNum, CardTop, Chip, IconTile } from "@/components/ui";
import { services } from "@/lib/content";
import { zac } from "@/lib/content/zac";
import { Icon } from "./icon";
import { sectionClass, type Surface } from "./surface";

/**
 * Five lines + the ZAC tile = six cards, which fills the 3-column grid
 * exactly. Six + tile left one orphan card on a row of its own.
 * Full catalogue lives on /services.
 */
const HOME_SERVICES = services.slice(0, 5);

export function Services({ surface = "paper-alt" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} id="services" aria-labelledby="services-title">
      <div className="container">
        <Reveal className="sec-head sec-head--split">
          <div>
            <span className="overline">Services</span>
            <h2 className="d3" id="services-title">
              Ways we build, <span className="em-serif">one team</span>.
            </h2>
          </div>
          <Link href="/services" className="link-u">
            View all services →
          </Link>
        </Reveal>

        <RevealGroup className="grid-3">
          {HOME_SERVICES.map((service, i) => (
            <Reveal key={service.slug}>
              <Link href={`/services/${service.slug}`} className="card-link">
                <Card>
                  <CardTop>
                    <IconTile size="sm">
                      <Icon name={service.icon} size={20} />
                    </IconTile>
                    <CardNum>{String(i + 1).padStart(2, "0")}</CardNum>
                  </CardTop>
                  <h3 className="d4">{service.title}</h3>
                  <p className="body-sm">{service.blurb}</p>
                  <div className="chips">
                    {service.tech.slice(0, 3).map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </Card>
              </Link>
            </Reveal>
          ))}

          <Reveal>
            <Card className="card--invert">
              <CardTop>
                <IconTile size="sm" variant="gold">
                  <Icon name="Sparkles" size={20} />
                </IconTile>
                <CardNum>—</CardNum>
              </CardTop>
              <h3 className="d4">Not sure which you need?</h3>
              <p className="body-sm">
                Describe the problem instead of the solution. {zac.consultant.name} maps it to the
                right line.
              </p>
              <Link href="/consultant" className="btn btn--gold btn--sm card--invert__cta">
                {zac.consultant.cta}
              </Link>
            </Card>
          </Reveal>
        </RevealGroup>
      </div>
    </section>
  );
}
