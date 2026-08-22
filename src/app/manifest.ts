import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#bbfd6a",
    lang: "en",
    dir: "ltr",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    /*
      Square, and generated from the mark rather than the share card. The 1200x630
      Open Graph image was being served here, which no installer will accept as an
      app icon — it is the wrong aspect ratio for every slot that reads this file.
    */
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "AI consultant",
        short_name: "Consultant",
        description: "Describe a problem and get a costed solution roadmap.",
        url: "/consultant",
      },
      {
        name: "Cost calculator",
        short_name: "Estimator",
        description: "Price a software project in about two minutes.",
        url: "/tools/estimator",
      },
    ],
  };
}
