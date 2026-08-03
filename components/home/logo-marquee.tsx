"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { clientLogos } from "@/lib/content";
import { sectionClass, type Surface } from "./surface";

export function LogoMarquee({ surface = "paper" }: { surface?: Surface }) {
  const [paused, setPaused] = useState(false);
  const items = [...clientLogos, ...clientLogos];

  return (
    <section className={sectionClass(surface, "band-thin")} aria-labelledby="clients-title">
      <div className="container band-thin__head">
        <span className="overline" id="clients-title">
          Trusted by teams at
        </span>
      </div>

      <div className="marquee" data-paused={paused}>
        {/* aria-hidden: the duplicated half is a visual seam, not content.
            The real list is exposed to assistive tech below. */}
        <div className="marquee__track" aria-hidden>
          {items.map((logo, i) => (
            <span key={`${logo.name}-${i}`} className="marquee__item">
              {logo.name}
            </span>
          ))}
        </div>
        <ul className="sr-only">
          {clientLogos.map((logo) => (
            <li key={logo.name}>{logo.name}</li>
          ))}
        </ul>
      </div>

      {/* WCAG 2.2.2 — motion over 5s needs a control, not a hover state */}
      <div className="container band-thin__foot">
        <button
          type="button"
          className="marquee-toggle"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
