/** Shared shapes for typed content modules. */

export type FaqItem = {
  q: string;
  a: string;
};

export type ProcessStep = {
  title: string;
  body: string;
};

export type StackGroup = {
  label: string;
  items: string[];
};

export type EngagementShape = {
  title: string;
  body: string;
  /** Soft "from" framing — never a hard price. */
  from: string;
};

export type SeoMeta = {
  description: string;
};

export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  blurb: string;
  /** Lucide icon name, e.g. "Monitor", "Smartphone". */
  icon: string;
  tech: string[];
  included: [string, string, string, string, string, string];
  stackGroups: StackGroup[];
  process: ProcessStep[];
  faqs: FaqItem[];
  engagement: [EngagementShape, EngagementShape, EngagementShape];
  seo: SeoMeta;
};

export type Industry = {
  slug: string;
  name: string;
  problemOneLiner: string;
  icon: string;
  problems: [string, string, string, string];
  /** Related service slugs. */
  services: string[];
  compliance: string;
  seo: SeoMeta;
};

export type PortfolioCategory =
  | "web"
  | "mobile"
  | "ai"
  | "data"
  | "automation";

export type ResultMetric = {
  value: string;
  label: string;
};

/** Visual for a project — real asset path or CSS frame fallback. */
export type PortfolioImage = {
  alt: string;
  caption: string;
  /** Public path e.g. `/projects/ai-support/dashboard.webp`. Optional until assets ship. */
  src?: string;
};

/** A shipped project shown in the portfolio and related sections. */
export type PortfolioItem = {
  slug: string;
  title: string;
  sector: string;
  category: PortfolioCategory;
  /** Short blurb for cards. */
  summary: string;
  /** Full project write-up for the detail modal (one or more paragraphs). */
  description: string[];
  /** Card / list preview image. Falls back to first `images[].src`. */
  thumbnail?: string;
  /** Product visuals shown first in the modal. */
  images: [PortfolioImage, PortfolioImage, ...PortfolioImage[]];
  stack: string[];
  /** Card metric / proof line. */
  metric: string;
  client: string;
  relatedServices: string[];
  timeline?: string;
};

export type Insight = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  readingTime: string;
  /** Markdown-ish paragraphs. */
  body: string[];
  related: string[];
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  initials: string;
};

export type Testimonial = {
  quote: string;
  metric: string;
  metricLabel: string;
  name: string;
  role: string;
  company: string;
  initials: string;
};

export type SiteFaq = FaqItem;

export type ProcessPhase = {
  number: string;
  title: string;
  body: string;
  deliverable: string;
};

export type TechStackCategory = {
  label: string;
  items: string[];
};

export type LeakItem = {
  number: string;
  title: string;
  body: string;
};

export type LeakFix = {
  number: string;
  title: string;
  body: string;
  badge: string;
};

export type ConsultantStep = {
  number: string;
  title: string;
  body: string;
};

export type SiteStat = {
  value: string;
  label: string;
};

export type ClientLogo = {
  name: string;
};

export type SiteSocial = {
  linkedin: string;
  github: string;
  /** Optional @handle for Twitter cards */
  twitterHandle?: string;
};

export type SiteInfo = {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  email: string;
  domain: string;
  copyright: string;
  newsletterBlurb: string;
  locations: string;
  timezoneNote: string;
  /** Primary ranking / topical keywords for meta + schema */
  keywords: string[];
  social: SiteSocial;
};
