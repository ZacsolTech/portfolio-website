import { services, site, team } from "@/lib/content";
import type { FaqItem, ProcessStep } from "@/lib/content";
import { absoluteUrl, jsonLdScript } from "@/lib/seo";

type Crumb = { name: string; path?: string };

/**
 * Stable node ids. Every graph on the site points at these rather than
 * repeating the organisation inline, which is what lets a crawler merge the
 * pages into one entity instead of treating each as a separate publisher.
 */
export const ORG_ID = absoluteUrl("/#organization");
export const WEBSITE_ID = absoluteUrl("/#website");

function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }}
    />
  );
}

/**
 * Markets we actually serve, as ISO country codes.
 *
 * `areaServed: "Worldwide"` parses as a string and tells an answer engine
 * nothing. Named regions are what get us considered for "software agency in X"
 * style questions without claiming a street address we do not have.
 */
const AREA_SERVED = ["US", "CA", "GB", "IE", "AE", "SA", "AU", "NZ", "SG", "PK"].map(
  (code) => ({ "@type": "Country", name: code }),
);

/** Sitewide Organization + WebSite graph (layout). */
export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": ORG_ID,
        name: site.name,
        legalName: site.legalName,
        alternateName: [site.legalName, `${site.name} Technologies`],
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          "@id": absoluteUrl("/#logo"),
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          caption: site.name,
        },
        image: { "@id": absoluteUrl("/#logo") },
        email: site.email,
        description: site.description,
        slogan: site.tagline,
        knowsAbout: site.keywords,
        /* Remote-first: no PostalAddress is published, because inventing one to
           win a local pack is exactly the signal that gets a business filtered. */
        areaServed: AREA_SERVED,
        sameAs: [site.social?.linkedin, site.social?.github].filter(Boolean),
        founder: team.slice(0, 2).map((member) => ({
          "@type": "Person",
          name: member.name,
          jobTitle: member.role,
        })),
        employee: team.map((member) => ({
          "@type": "Person",
          name: member.name,
          jobTitle: member.role,
          description: member.bio,
        })),
        /* The service catalogue as data. This is what an answer engine reads to
           decide whether we do the thing someone just asked about. */
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `${site.name} services`,
          itemListElement: services.map((service) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              "@id": absoluteUrl(`/services/${service.slug}#service`),
              name: service.title,
              description: service.seo.description,
              url: absoluteUrl(`/services/${service.slug}`),
            },
          })),
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: site.email,
            availableLanguage: ["English"],
            url: absoluteUrl("/contact"),
            areaServed: AREA_SERVED.map((c) => c.name),
          },
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: site.email,
            availableLanguage: ["English"],
            url: absoluteUrl("/contact"),
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: absoluteUrl("/"),
        name: site.name,
        description: site.description,
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
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

export function FaqJsonLd({ items }: { items: readonly FaqItem[] }) {
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

/**
 * A page that is primarily one page — About, Contact, a tool landing page.
 *
 * `WebPage` on its own earns no rich result, but it is what ties a URL to the
 * organisation and gives an answer engine a `description` it can attribute.
 */
export function WebPageJsonLd({
  type = "WebPage",
  name,
  description,
  path,
  primaryImage,
  dateModified,
}: {
  type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
  name: string;
  description: string;
  path: string;
  primaryImage?: string;
  dateModified?: string;
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    inLanguage: "en",
    ...(primaryImage
      ? { primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(primaryImage) } }
      : {}),
    ...(dateModified ? { dateModified } : {}),
  };
  return <JsonLd data={data} />;
}

/**
 * A list page — services, industries, portfolio, blog.
 *
 * Gives the crawler the set of URLs and their order without making it infer
 * them from markup, which is what surfaces sitelinks and carousel treatments.
 */
export function ItemListJsonLd({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string; description?: string }[];
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: "en",
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: absoluteUrl(item.path),
        ...(item.description ? { description: item.description } : {}),
      })),
    },
  };
  return <JsonLd data={data} />;
}

export function ServiceJsonLd({
  name,
  description,
  path,
  serviceOutput,
  offers,
}: {
  name: string;
  description: string;
  path: string;
  /** What the client receives — reads as the deliverable in an answer engine. */
  serviceOutput?: string[];
  /** Engagement shapes. Deliberately unpriced: a made-up `price` is worse than none. */
  offers?: { name: string; description: string }[];
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name,
    description,
    url,
    provider: { "@id": ORG_ID },
    areaServed: AREA_SERVED,
    serviceType: name,
    ...(serviceOutput?.length ? { serviceOutput } : {}),
    ...(offers?.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: `${name} engagements`,
            itemListElement: offers.map((offer) => ({
              "@type": "Offer",
              name: offer.name,
              description: offer.description,
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            })),
          },
        }
      : {}),
  };
  return <JsonLd data={data} />;
}

/**
 * A free browser-based tool — ZAC Consultant and ZAC Estimator.
 *
 * `WebApplication` with a zero-price `offers` is the node that makes a tool
 * eligible to be named as *the tool* in an AI answer to "free X calculator",
 * rather than described as a page that mentions one.
 */
export function SoftwareApplicationJsonLd({
  name,
  description,
  path,
  appUrl,
  category = "BusinessApplication",
  features,
}: {
  name: string;
  description: string;
  /** Canonical landing page for the tool. */
  path: string;
  /** Where the tool itself runs, if that is a different URL. */
  appUrl?: string;
  category?: string;
  features?: string[];
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name,
    description,
    url: absoluteUrl(appUrl ?? path),
    applicationCategory: category,
    applicationSubCategory: "Estimation and scoping tool",
    operatingSystem: "Any — runs in a web browser",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    inLanguage: "en",
    provider: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    ...(features?.length ? { featureList: features } : {}),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      eligibleRegion: AREA_SERVED,
    },
  };
  return <JsonLd data={data} />;
}

/**
 * Step-by-step instructions.
 *
 * The step list is the part answer engines lift wholesale when someone asks
 * "how do I get a software estimate", so the steps are written to stand alone.
 */
export function HowToJsonLd({
  name,
  description,
  path,
  steps,
  totalTime,
}: {
  name: string;
  description: string;
  path: string;
  steps: readonly ProcessStep[];
  /** ISO 8601 duration, e.g. `PT3M`. */
  totalTime?: string;
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${url}#howto`,
    name,
    description,
    inLanguage: "en",
    ...(totalTime ? { totalTime } : {}),
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.body,
      url: `${url}#step-${i + 1}`,
    })),
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
  wordCount,
  keywords,
  image,
}: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  category?: string;
  wordCount?: number;
  keywords?: string[];
  /** Cover or first figure. Falls back to the site share card. */
  image?: string;
}) {
  const url = absoluteUrl(path);
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title.slice(0, 110),
    description,
    url,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: author,
      /* Ties the byline to the company rather than leaving an unattributed
         name, which is the difference E-E-A-T actually looks at. */
      worksFor: { "@id": ORG_ID },
      url: absoluteUrl("/about"),
    },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${url}#webpage` },
    inLanguage: "en",
    ...(category ? { articleSection: category } : {}),
    ...(wordCount ? { wordCount } : {}),
    ...(keywords?.length ? { keywords } : {}),
    image: [absoluteUrl(image ?? "/opengraph-image")],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".article-body p", ".article-body h2"],
    },
  };
  return <JsonLd data={data} />;
}
