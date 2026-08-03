import Link from "next/link";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { faqs } from "@/lib/content";
import { zac } from "@/lib/content/zac";
import { sectionClass, type Surface } from "./surface";

export function Faq({ surface = "paper" }: { surface?: Surface }) {
  return (
    <section className={sectionClass(surface)} id="faq" aria-labelledby="faq-title">
      <div className="container">
        <div className="grid-a grid-a--panel">
          <Reveal className="sticky-col">
            <span className="overline">Questions</span>
            <h2 className="d3" id="faq-title" style={{ marginTop: "0.75rem" }}>
              Answers <span className="em-serif">before you ask</span>.
            </h2>
            <p className="body-sm" style={{ marginTop: "1rem", maxWidth: "22rem" }}>
              Still unsure? {zac.consultant.cta}, or email us — a senior engineer replies.
            </p>
            <Link href="/consultant" className="link-u faq__link">
              {zac.consultant.cta} →
            </Link>
          </Reveal>

          <Reveal index={1}>
            {faqs.map((item) => (
              <details className="acc__item" key={item.q}>
                <summary className="acc__trigger">
                  {item.q}
                  <span className="acc__icon">
                    <Plus size={20} aria-hidden />
                  </span>
                </summary>
                <div className="acc__panel">{item.a}</div>
              </details>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
