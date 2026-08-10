"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for every page under `(frontend)`.
 *
 * Without one, an unhandled render error shows Next's own error screen — a
 * stack trace in development, a blank grey page in production. Neither gives
 * a visitor a way back, and the second reads as an outage.
 *
 * `digest` is the only detail worth surfacing: it correlates with the server
 * log entry, so someone reporting the fault can quote it. The message itself
 * is deliberately withheld — in production it may name internals.
 */
export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[frontend] unhandled render error:", error);
  }, [error]);

  return (
    <section
      className="section section--ink on-dark"
      style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}
    >
      <div className="container" style={{ textAlign: "center", paddingBlock: "4rem" }}>
        <p
          className="em-serif"
          style={{
            fontSize: "clamp(3rem, 9vw, 5rem)",
            lineHeight: 1,
            color: "var(--accent-fg)",
            margin: 0,
          }}
        >
          Something broke.
        </p>
        <h1 className="d2" style={{ marginTop: "1rem" }}>
          That is on us, not you.
        </h1>
        <p
          className="lead"
          style={{
            margin: "1.25rem auto 0",
            color: "var(--text-on-dark-body)",
            maxWidth: "30rem",
          }}
        >
          The page failed to render. Trying again usually clears it — if it
          doesn&apos;t, get in touch and we&apos;ll take a look.
        </p>
        {error.digest ? (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.75rem",
              fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
              color: "var(--text-on-dark-muted)",
            }}
          >
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2.5rem" }}>
          <button type="button" onClick={reset} className="btn btn--gold btn--lg">
            Try again
          </button>
          <Link href="/" className="btn btn--outline-dark btn--lg">
            Home
          </Link>
        </div>
      </div>
    </section>
  );
}
