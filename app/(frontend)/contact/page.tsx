import type { Metadata } from "next";
import { ContactExpectations, ContactForm } from "@/components/shared/contact-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Tell ZACSOL what's broken. A senior engineer replies within one business day — or ask ZAC Consultant for a roadmap in three minutes.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <section className="section section--paper section--after-nav">
      <div className="container">
        <div className="grid-a grid-a--even">
          <ContactExpectations />
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
