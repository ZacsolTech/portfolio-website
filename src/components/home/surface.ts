import { cn } from "@/lib/cn";

/**
 * Homepage band surfaces.
 *
 * Rhythm is a page-level decision, not a section-level one — every section
 * used to hardcode its own background, which is how the page ended up with
 * seven consecutive near-identical light bands in light theme. Sections now
 * take a `surface` and `app/(frontend)/page.tsx` owns the cadence.
 *
 * `ink` is the chapter break. It used to carry `--persist` — staying black in
 * light theme — because light mode owned only two surfaces a few percent
 * apart, so a band that flipped to paper stopped being a break at all. Light
 * mode now has a third step (`--paper-deep`, see tokens.css), so `ink` reads
 * as a break in both themes and light mode no longer has to go dark to get
 * one. The bookends that genuinely stay dark — hero, page hero, closing CTA,
 * footer — keep `--persist` at their own call sites.
 */
export type Surface = "paper" | "paper-alt" | "ink";

export function sectionClass(surface: Surface, extra?: string): string {
  return cn(
    "section",
    surface === "ink" ? "section--ink on-dark" : `section--${surface}`,
    extra,
  );
}

/** True when the band is a chapter break (dark in dark theme, deep paper in light). */
export function isInk(surface: Surface): boolean {
  return surface === "ink";
}
