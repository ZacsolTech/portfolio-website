import { site, testimonials } from "@/lib/content";
import type { FaqItem } from "@/lib/content";
import { absoluteUrl, jsonLdScript } from "@/lib/seo";

type Crumb = { name: string; path?: string };

function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}

/** Sitewide Organization + WebSite graph (layout). */
export function SiteJsonLd() {
  const orgId = absoluteUrl("/#organization");
  const websiteId = absoluteUrl("/#website");

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": orgId,
        name: site.name,
        legalName: site.legalName,
        url: absoluteUrl("/"),
        logo: absoluteUrl("/opengraph-image"),
        image: absoluteUrl("/opengraph-image"),
        email: site.email,
        description: site.description,
        slogan: site.tagline,
        knowsAbout: site.keywords,
        areaServed: "Worldwide",
        sameAs: [site.social?.linkedin, site.social?.github].filter(Boolean),
        review: testimonials.map((t) => ({
          "@type": "Review",
          reviewBody: t.quote,
          author: {
            "@type": "Person",
            name: t.name,
            jobTitle: t.role,
            worksFor: {
              "@type": "Organization",
              name: t.company,
            },
          },
          itemReviewed: { "@id": orgId },
        })),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: site.email,
            availableLanguage: ["English"],
            url: absoluteUrl("/contact"),
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: absoluteUrl("/"),
        name: site.name,
        description: site.description,
        publisher: { "@id": orgId },
        inLanguage: "en-US",
      },
    ],
  };

  return <JsonLd data={data} />;
}

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
  return <JsonLd data={data} />;
}

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
  return <JsonLd data={data} />;
}

export function ServiceJsonLd({
  name,
  description,
  path,
  faqs,
}: {
  name: string;
  description: string;
  path: string;
  faqs?: FaqItem[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    provider: {
      "@type": "Organization",
      name: site.name,
      url: absoluteUrl("/"),
    },
    areaServed: "Worldwide",
    serviceType: name,
    ...(faqs?.length
      ? {
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : {}),
  };
  return <JsonLd data={data} />;
}

export function ArticleJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
  author,
  category,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  category?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: absoluteUrl(path),
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/opengraph-image"),
      },
    },
    mainEntityOfPage: absoluteUrl(path),
    ...(category ? { articleSection: category } : {}),
    image: [absoluteUrl("/opengraph-image")],
  };
  return <JsonLd data={data} />;
}
