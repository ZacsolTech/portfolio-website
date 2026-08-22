import { brandShareImage, size, contentType } from "@/lib/og-image";
import { consultantLanding } from "@/lib/content";

export const runtime = "edge";
export { size, contentType };
export const alt = consultantLanding.metaTitle;

export default function OpenGraphImage() {
  return brandShareImage({
    eyebrow: "Free AI tool",
    title: "A free AI consultant for your software problem",
    subtitle:
      "A recommended solution, a prototype, a timeline and a cost band — in about three minutes.",
    footnote: "No signup to see the result",
  });
}
