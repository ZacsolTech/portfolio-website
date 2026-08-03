import { ImageResponse } from "next/og";
import { site } from "@/lib/content";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Shared brand canvas for Open Graph + Twitter images. */
export function brandShareImage() {
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
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {site.tagline}
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.72)",
              maxWidth: 860,
            }}
          >
            Web, mobile, AI automation and custom systems that ship on time.
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
          <span>Senior engineers · Weekly deployables</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
