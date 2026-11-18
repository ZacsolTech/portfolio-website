import localFont from "next/font/local";

/*
  Self-hosted fonts (latin subset, woff2) in src/fonts/.

  next/font/google downloads from Google at build time, and that broke Vercel
  builds twice: first JetBrains Mono (404s on the woff2 URLs), then every
  family (Google answered with font URLs the loader could not parse:
  "Cannot read properties of null (reading '1')" in google/loader.js).
  Local files make the build independent of Google entirely.

  The CSS variable names are unchanged, so tokens.css and admin.css work as-is.
  `--font-jetbrains-mono` is historical: it carries IBM Plex Mono.
*/

export const spaceGrotesk = localFont({
  src: [{ path: "../fonts/space-grotesk-latin-var.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const ibmPlexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "monospace"],
});

/* The single contrast voice — accented phrases inside headlines only. */
export const instrumentSerif = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: true,
  fallback: ["ui-serif", "Georgia", "serif"],
});
