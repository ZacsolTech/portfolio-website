import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";

const panelSkeleton = (
  <div
    aria-busy="true"
    style={{
      minHeight: "32rem",
      borderRadius: "var(--r-2xl)",
      background: "var(--white)",
      border: "1px solid var(--line)",
    }}
  />
);

const BookingPanel = dynamic(
  () => import("@/components/shared/booking-panel").then((m) => m.BookingPanel),
  { loading: () => panelSkeleton },
);

export const metadata: Metadata = pageMetadata({
  title: "Book a consultation",
  description:
    "Book thirty minutes with a ZACSOL senior engineer. Not a sales call — an honest look at the bottleneck.",
  path: "/book",
  keywords: [
    "book software consultation",
    "hire AI agency",
    "software agency discovery call",
  ],
});

export default function BookPage() {
  return (
    <section className="section section--paper section--after-nav">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Book a consultation", path: "/book" },
        ]}
      />
      <WebPageJsonLd
        name="Book a consultation with a senior engineer"
        description="Book thirty minutes with a ZACSOL senior engineer — an honest look at the bottleneck, not a sales call."
        path="/book"
      />
      <div className="container">
        {/* The panel reads `?reschedule=` with useSearchParams, which needs a
            boundary here or the whole route opts out of static rendering. */}
        <Suspense fallback={panelSkeleton}>
          <BookingPanel />
        </Suspense>
      </div>
    </section>
  );
}
