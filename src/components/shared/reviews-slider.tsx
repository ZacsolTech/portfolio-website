"use client";

import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { sectionClass, type Surface } from "@/components/home/surface";
import { testimonials } from "@/lib/content";
import { cn } from "@/lib/cn";

export function ReviewsSlider({
  surface = "ink",
  className,
}: {
  surface?: Surface;
  className?: string;
}) {
  const [nudge, setNudge] = useState(0);

  if (!testimonials.length) return null;

  const loop = [...testimonials, ...testimonials];
  const step = (dir: -1 | 1) => setNudge((n) => n + dir);

  return (
    <section
      className={sectionClass(surface, cn("reviews", className))}
      aria-labelledby="reviews-title"
    >
      <div className="container">
        <Reveal className="reviews__head">
          <div className="reviews__intro">
            <span className="overline overline--gold">Client voices</span>
            <h2 className="d2" id="reviews-title">
              Trusted in production —{" "}
              <span className="em-serif">not in decks</span>.
            </h2>
          </div>
          <div className="reviews__arrows">
            <button
              type="button"
              className="reviews__nav"
              aria-label="Previous review"
              onClick={() => step(-1)}
              disabled={testimonials.length < 2}
            >
              <ChevronLeft aria-hidden strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className="reviews__nav"
              aria-label="Next review"
              onClick={() => step(1)}
              disabled={testimonials.length < 2}
            >
              <ChevronRight aria-hidden strokeWidth={1.75} />
            </button>
          </div>
        </Reveal>
      </div>

      <div className="reviews__marquee marquee">
        <div
          className="reviews__shift"
          style={{ "--reviews-nudge": nudge } as CSSProperties}
        >
          <div className="reviews__track marquee__track" aria-hidden>
            {loop.map((t, i) => (
              <figure key={`${t.name}-${i}`} className="reviews__card">
                <span className="chip reviews__cat">{t.category}</span>
                <blockquote className="reviews__quote">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="reviews__person">
                  <span className="reviews__name">{t.name}</span>
                  <span className="reviews__role">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <ul className="sr-only">
          {testimonials.map((t) => (
            <li key={t.name}>
              {t.name}, {t.role} ({t.category}): {t.quote}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
