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

/** Visual for a project — real asset path or CSS frame fallback. */
export type PortfolioImage = {
  alt: string;
  caption: string;
  /** Public path e.g. `/projects/ai-support/dashboard.webp`. Optional until assets ship. */
  src?: string;
};

/** One stage of a project's start-to-handover walkthrough. */
export type ProjectStage = {
  /** Real elapsed time — "Week 1–2", "Day 3". Not a tool name. */
  when: string;
  title: string;
  /** One or two sentences: what actually happened, specifically. */
  body: string;
  /** What the client received at this gate. */
  deliverable: string;
  /** Index into the project's `images` — reuses shipped assets. */
  image?: number;
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
  /** Real elapsed delivery time, e.g. "10 weeks". Shown on cards. */
  duration?: string;
  /** Where it runs, e.g. "Vercel + Render". Never mixed with duration. */
  deployment?: string;
  /** Start-to-submission walkthrough, 4–6 stages. Optional — pages fall
      back to the generic process when absent. */
  journey?: ProjectStage[];
  /** Service slugs where this project is THE featured walkthrough. */
  flagshipFor?: string[];
};

/** In-house tools a post should point at after the answer. */
export type BlogTool = "consultant" | "estimator";

/**
 * A public blog post.
 */
export type Insight = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  /** ISO date the facts (prices, models) were last checked. */
  lastReviewed?: string;
  author: string;
  readingTime: string;
  /** Direct answer, rendered before the body. */
  answer: string;
  /** Markdown-ish paragraphs, tables and headings. */
  body: string[];
  faqs: FaqItem[];
  related: string[];
  tools: BlogTool[];
  keywords: string[];
  /** Optional hero / listing image. */
  cover?: {
    src: string;
    alt: string;
    caption?: string;
  };
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  initials: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  category: string;
};

export type SiteFaq = FaqItem;

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
