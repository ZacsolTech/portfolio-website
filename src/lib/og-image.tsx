import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ShareImageInput = {
  /** Small gold label above the headline — the page's category. */
  eyebrow?: string;
  /** Headline. Keep under ~60 characters or it wraps past three lines. */
  title?: string;
  /** One supporting sentence. */
  subtitle?: string;
  /** Bottom-right proof line. */
  footnote?: string;
};

/**
 * Shared brand canvas for Open Graph + Twitter images.
 *
 * Per-route `opengraph-image.tsx` files pass their own copy so a shared link
 * previews the page rather than the site. Social previews are a real ranking
 * input in 2026 — they drive the click-through and the shares that earn links —
 * so pages we want to rank get their own card instead of the generic one.
 */
export function brandShareImage({
  eyebrow,
  title = site.tagline,
  subtitle = "Web, mobile, AI automation and custom systems that ship on time.",
  footnote = "Senior engineers · Weekly deployables",
}: ShareImageInput = {}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #09090b 0%, #18181b 55%, #0c1a0a 100%)",
          color: "#fafafa",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#bbfd6a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#09090b",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            Z
          </div>
          {site.name}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#bbfd6a",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 860,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <span style={{ color: "#bbfd6a" }}>{site.domain}</span>
          <span>{footnote}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
