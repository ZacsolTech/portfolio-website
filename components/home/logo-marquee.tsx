import { clientLogos } from "@/lib/content";

export function LogoMarquee() {
  const items = [...clientLogos, ...clientLogos];

  return (
    <section className="section" style={{ paddingBlock: "4rem", background: "var(--paper)" }}>
      <div className="container" style={{ textAlign: "center", marginBottom: "2rem" }}>
        <span className="overline">Trusted by teams at</span>
      </div>
      <div className="marquee">
        <div className="marquee__track">
          {items.map((logo, i) => (
            <span
              key={`${logo.name}-${i}`}
              className="marquee__item d4"
              style={{ opacity: 0.5, color: "var(--text-ink)" }}
            >
              {logo.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
