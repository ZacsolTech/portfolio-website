import { cn } from "@/lib/cn";

/**
 * Homepage band surfaces.
 *
 * Rhythm is a page-level decision, not a section-level one — every section
 * used to hardcode its own background, which is how the page ended up with
 * seven consecutive near-identical light bands in light theme. Sections now
 * take a `surface` and `app/(frontend)/page.tsx` owns the cadence.
 *
 * `ink` is always `--persist`: a dark band that flips to paper in light theme
 * isn't a chapter break, it's a no-op.
 */
export type Surface = "paper" | "paper-alt" | "ink";

export function sectionClass(surface: Surface, extra?: string): string {
  return cn(
    "section",
    surface === "ink" ? "section--ink section--persist on-dark" : `section--${surface}`,
    extra,
  );
}

/** True when the band keeps dark chrome regardless of theme. */
export function isInk(surface: Surface): boolean {
  return surface === "ink";
}
