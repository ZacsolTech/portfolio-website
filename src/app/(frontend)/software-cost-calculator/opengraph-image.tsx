import { brandShareImage, size, contentType } from "@/lib/og-image";
import { estimatorLanding } from "@/lib/content";

export const runtime = "edge";
export { size, contentType };
export const alt = estimatorLanding.metaTitle;

export default function OpenGraphImage() {
  return brandShareImage({
    eyebrow: "Free calculator",
    title: "What should your software project cost?",
    subtitle:
      "A real range, a line-by-line breakdown, and assumptions you can argue with. No email required.",
    footnote: "Priced by the same engine we quote with",
  });
}
