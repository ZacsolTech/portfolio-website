import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { AdsenseScript } from "@/components/ads/adsense-script";
import { SiteShell } from "@/components/layout/site-shell";
import { AttributionTracker } from "@/components/shared/attribution-tracker";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";
import { site } from "@/lib/content";
import { ibmPlexMono, instrumentSerif, spaceGrotesk } from "@/lib/fonts";
import { absoluteUrl, defaultKeywords, defaultOgImage, siteUrl } from "@/lib/seo";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  /* The ZAC sheet puts a composer at the bottom of the screen. Without this
     the on-screen keyboard overlays it instead of shrinking the viewport, and
     you type into a field you cannot see. */
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: defaultKeywords,
  applicationName: site.name,
  authors: [{ name: site.legalName, url: absoluteUrl("/") }],
  creator: site.name,
  publisher: site.legalName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: absoluteUrl("/"),
    types: {
      "application/rss+xml": absoluteUrl("/feed.xml"),
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: absoluteUrl("/"),
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [defaultOgImage],
  },
    twitter: {
      card: "summary_large_image",
      title: `${site.name} — ${site.tagline}`,
      description: site.description,
      images: [defaultOgImage.url],
      creator: site.social?.twitterHandle || undefined,
    },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : {}),
    },
  },
  category: "technology",
};

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
        <SiteJsonLd />
        <AdsenseScript />
        <link rel="alternate" type="application/rss+xml" title={`${site.name} Blog`} href="/feed.xml" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {/* Records first-touch campaign data before the visitor navigates
              away from the URL that carried it. */}
          <AttributionTracker />
          <SiteShell>{children}</SiteShell>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
