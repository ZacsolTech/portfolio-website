"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself.
 *
 * It replaces the whole document, so it must render its own `<html>`/`<body>`
 * — and it cannot rely on the layout that just failed, which means no font
 * variables, no `globals.css` cascade and no theme script. Everything here is
 * inline and self-contained on purpose. Keep it that way.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] unhandled layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ textAlign: "center", maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600, margin: 0 }}>
            Something broke.
          </h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6, color: "#a1a1aa" }}>
            The site failed to load. Reloading usually clears it.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#71717a",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.75rem",
              borderRadius: "999px",
              border: "none",
              background: "#fafafa",
              color: "#09090b",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
