import type { Metadata } from "next";
import { ContactExpectations, ContactForm } from "@/components/shared/contact-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Tell ZACSOL what's broken. A senior engineer replies within one business day — or use the AI consultant for a roadmap in three minutes.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <section className="section section--paper" style={{ paddingBlockStart: "8rem" }}>
      <div className="container">
        <div
          style={{
            display: "grid",
            gap: "3rem",
            gridTemplateColumns: "1fr",
          }}
          className="contact-grid"
        >
          <ContactExpectations />
          <ContactForm />
        </div>
      </div>
      <style>{`
        @media (min-width: 900px) {
          .contact-grid {
            grid-template-columns: 0.95fr 1.15fr !important;
            align-items: start;
          }
        }
      `}</style>
    </section>
  );
}
