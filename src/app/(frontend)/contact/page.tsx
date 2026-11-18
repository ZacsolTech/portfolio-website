import type { Metadata } from "next";
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/json-ld";
import { ContactExpectations, ContactForm } from "@/components/shared/contact-form";
import { pageMetadata } from "@/lib/seo";
import { SeoJsonLd } from "@/components/seo/seo-overrides";
import { withSeo } from "@/lib/seo-overrides";

const baseMetadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Tell ZACSOL what's broken. A senior engineer replies within one business day — or ask ZAC Consultant for a roadmap in three minutes.",
  path: "/contact",
});

export function generateMetadata(): Promise<Metadata> {
  return withSeo("/contact", baseMetadata);
}

export default function ContactPage() {
  return (
    <section className="section section--paper section--after-nav">
      <SeoJsonLd page="/contact" />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <WebPageJsonLd
        type="ContactPage"
        name="Contact ZACSOL"
        description="Send a brief to ZACSOL. A senior engineer replies within one business day."
        path="/contact"
      />
      <div className="container">
        <div className="grid-a grid-a--even">
          <ContactExpectations />
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
