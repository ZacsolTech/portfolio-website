import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "404",
  description: "That page shipped elsewhere.",
  noIndex: true,
});

export default function NotFound() {
  return (
    <section
      className="section section--ink on-dark"
      style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}
    >
      <div className="container" style={{ textAlign: "center", paddingBlock: "4rem" }}>
        <p
          className="em-serif"
          style={{
            fontSize: "clamp(4rem, 12vw, 7rem)",
            lineHeight: 1,
            /* --accent-fg, not --gold: lime is illegible on the light band. */
            color: "var(--accent-fg)",
            margin: 0,
          }}
        >
          404
        </p>
        <h1 className="d2" style={{ marginTop: "1rem" }}>
          That page shipped elsewhere.
        </h1>
        <p className="lead" style={{ margin: "1.25rem auto 0", color: "var(--text-on-dark-body)", maxWidth: "28rem" }}>
          The link may be outdated, or the page moved. Try home or the portfolio.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2.5rem" }}>
          <Link href="/" className="btn btn--gold btn--lg">
            Home
          </Link>
          <Link href="/portfolio" className="btn btn--outline-dark btn--lg">
            Portfolio
          </Link>
        </div>
      </div>
    </section>
  );
}
