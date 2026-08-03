import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { contactExpectations } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Thank you",
  description: "Brief received. A senior engineer will reply within one business day.",
  path: "/thank-you",
  noIndex: true,
});

export default function ThankYouPage() {
  return (
    <section className="section section--ink section--persist on-dark" style={{ minHeight: "70vh" }}>
      <div
        className="container"
        style={{ textAlign: "center", maxWidth: "36rem", marginInline: "auto", paddingBlock: "4rem" }}
      >
        <div className="done-mark" aria-hidden>
          <Check size={28} strokeWidth={2.5} />
        </div>
        <span className="overline overline--gold">Received</span>
        <h1 className="d2" style={{ marginTop: "0.75rem", color: "#fff" }}>
          Brief received.
        </h1>
        <p className="lead" style={{ margin: "1.25rem auto 0", color: "var(--text-on-dark-body)" }}>
          A senior engineer will reply within one business day.
        </p>

        <div
          style={{
            textAlign: "left",
            display: "grid",
            gap: "1rem",
            marginTop: "2.5rem",
            maxWidth: "28rem",
            marginInline: "auto",
          }}
        >
          {contactExpectations.map((item) => (
            <div key={item.title}>
              <p className="overline overline--gold">{item.title}</p>
              <p className="body-sm" style={{ marginTop: "0.35rem", color: "var(--text-on-dark-body)" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="btn-row" style={{ justifyContent: "center", marginTop: "2.75rem" }}>
          <Link href="/consultant" className="btn btn--gold btn--lg">
            While you wait: try the AI consultant
          </Link>
          <Link href="/" className="btn btn--outline-dark btn--lg">
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}
