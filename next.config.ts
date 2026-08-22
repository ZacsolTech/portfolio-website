import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  /*
    HTTPS is a ranking signal and, more usefully, a prerequisite for one: a
    single http hop on a redirect chain is a crawl-budget tax and a chance for
    the wrong URL to be indexed as canonical.
  */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** Token-bearing routes: never indexed, never cached, by any intermediary. */
const noIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/brand/**" },
      { pathname: "/media/**" },
      { pathname: "/projects/**" },
      { pathname: "/api/media/file/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/demos/:slug",
        destination: "/portfolio?project=:slug",
        permanent: true,
      },
      {
        source: "/demos",
        destination: "/portfolio",
        permanent: true,
      },
      {
        source: "/portfolio/:slug",
        destination: "/portfolio?project=:slug",
        permanent: true,
      },
      /*
        Keyword URLs for the two tools. The chat apps keep their own paths and
        stay out of the index; these are the addresses people type, link to and
        find in a result, so they resolve to the pages that carry the content.
      */
      { source: "/tools", destination: "/software-cost-calculator", permanent: true },
      {
        source: "/estimator",
        destination: "/software-cost-calculator",
        permanent: true,
      },
      {
        source: "/cost-calculator",
        destination: "/software-cost-calculator",
        permanent: true,
      },
      {
        source: "/software-development-cost-calculator",
        destination: "/software-cost-calculator",
        permanent: true,
      },
      { source: "/ai-consultant-free", destination: "/ai-consultant", permanent: true },
      { source: "/blog", destination: "/insights", permanent: true },
      { source: "/blog/:slug", destination: "/insights/:slug", permanent: true },
      { source: "/work", destination: "/portfolio", permanent: true },
      { source: "/case-studies", destination: "/portfolio", permanent: true },
      { source: "/pricing", destination: "/software-cost-calculator", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/opengraph-image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/feed.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      { source: "/roadmap/:path*", headers: noIndexHeaders },
      { source: "/book/manage/:path*", headers: noIndexHeaders },
    ];
  },
};

export default withPayload(nextConfig);
