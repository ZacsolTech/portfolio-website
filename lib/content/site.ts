import type {
  ClientLogo,
  ConsultantStep,
  LeakFix,
  LeakItem,
  ProcessPhase,
  SiteInfo,
  SiteStat,
  TechStackCategory,
} from "./types";

export const site: SiteInfo = {
  name: "ZACSOL",
  legalName: "ZACSOL Technologies",
  tagline: "AI-powered software agency",
  description:
    "An AI-powered software agency. We build web, mobile, AI automation and custom systems that ship on time and hand over clean.",
  email: "hello@zacsol.com",
  domain: "zacsol.com",
  copyright: "© 2026 ZACSOL. All rights reserved.",
  newsletterBlurb:
    "Short, practical writing on AI, automation and shipping software. No sales sequences.",
  locations: "Remote-first · overlap with PKT and overlapping EU / US East mornings",
  timezoneNote: "A senior engineer replies within one business day.",
  keywords: [
    "AI software agency",
    "custom software development",
    "AI automation agency",
    "web development company",
    "mobile app development",
    "Next.js development",
    "AI solution consultant",
    "ZAC Consultant",
    "ZAC Estimator",
    "business process automation",
    "software agency remote",
    "LLM automation",
    "RAG systems",
    "product engineering agency",
  ],
  social: {
    linkedin: "https://www.linkedin.com/company/zacsol",
    github: "https://github.com/zacsol",
    twitterHandle: "@zacsol",
  },
};

/*
  heroStats and resultsStats appear on the same scroll and used to share two
  entries verbatim ("50+ Projects delivered", "12 Industries served"), so the
  page repeated the same two numbers to the same reader.

  The hero band now answers "what happens if I engage?" — it sits directly
  under a CTA, so every figure is about the buyer's next few minutes. The
  results band keeps the track record.
*/
export const heroStats: SiteStat[] = [
  { value: "~3 min", label: "To a costed roadmap" },
  { value: "$0", label: "To find out" },
  { value: "<1 day", label: "Human reply" },
  { value: "8", label: "Service lines" },
];

export const resultsStats: SiteStat[] = [
  { value: "50+", label: "Projects delivered" },
  { value: "12", label: "Industries served" },
  { value: "10+", label: "Years experience" },
  { value: "99.9%", label: "Uptime maintained" },
];

export const clientLogos: ClientLogo[] = [
  { name: "Northwind" },
  { name: "Bancroft" },
  { name: "Halcyon" },
  { name: "Meridian" },
  { name: "Verdant" },
  { name: "Kestrel" },
  { name: "Ardent" },
];

export const processPhases: ProcessPhase[] = [
  {
    number: "01",
    title: "Discovery",
    body: "Goals, constraints, and the actual bottleneck — not a feature list.",
    deliverable: "Scope + estimate",
  },
  {
    number: "02",
    title: "Concept",
    body: "Architecture options with honest tradeoffs and the cost of each.",
    deliverable: "Technical plan",
  },
  {
    number: "03",
    title: "Design",
    body: "Flows, interface, and a design system your team can extend.",
    deliverable: "Figma system",
  },
  {
    number: "04",
    title: "Build",
    body: "Two-week cycles, deployed every Friday, reviewed with you.",
    deliverable: "Staging build",
  },
  {
    number: "05",
    title: "Harden",
    body: "Tests, performance, security and accessibility pass before launch.",
    deliverable: "QA report",
  },
  {
    number: "06",
    title: "Launch",
    body: "Deploy, monitor, hand over, and support while your team takes the wheel.",
    deliverable: "Runbook + handover",
  },
];

export const techStackCategories: TechStackCategory[] = [
  {
    label: "Frontend",
    items: ["Next.js", "React", "TypeScript", "Tailwind"],
  },
  {
    label: "Backend",
    items: ["Node.js", "NestJS", "Python", ".NET"],
  },
  {
    label: "Mobile",
    items: ["React Native", "Flutter", "Swift", "PWA"],
  },
  {
    label: "Data & ML",
    items: ["PostgreSQL", "ClickHouse", "pandas", "scikit-learn"],
  },
  {
    label: "Cloud & DevOps",
    items: ["AWS", "Docker", "Kubernetes", "GitHub Actions"],
  },
  {
    label: "AI",
    items: ["Gemini", "Claude", "OpenAI", "LangChain", "pgvector"],
  },
];

export const leaks: LeakItem[] = [
  {
    number: "01",
    title: "Scope drift",
    body: "Requirements move faster than the plan. Every change is re-estimated from scratch and the date slides quietly.",
  },
  {
    number: "02",
    title: "Handover debt",
    body: "The agency leaves, the docs don't exist, and your team spends a quarter learning what was built.",
  },
  {
    number: "03",
    title: "Invisible progress",
    body: "You get status decks instead of working software, and find out you're behind when it's too late to correct.",
  },
  {
    number: "04",
    title: "Fragile releases",
    body: "Every deploy is an event. No CI, no rollback, no confidence — so shipping slows to protect uptime.",
  },
];

export const leakFixes: LeakFix[] = [
  {
    number: "01",
    title: "Scope you can hold us to",
    body: "Fixed-scope phases with a written change protocol. You always know what a change costs before we start it.",
    badge: "Scope doc",
  },
  {
    number: "02",
    title: "Handover from day one",
    body: "Docs, decision records and a recorded walkthrough written as we build — not assembled the week we leave.",
    badge: "Runbook",
  },
  {
    number: "03",
    title: "Working software every Friday",
    body: "A deployed environment you can click, every week. Status is something you use, not something you're told.",
    badge: "Staging URL",
  },
  {
    number: "04",
    title: "Boring, repeatable releases",
    body: "CI, automated tests, one-command rollback. Deploys become a non-event by design.",
    badge: "CI pipeline",
  },
];

export const leakBaseline = {
  value: "66%",
  body: "of software projects overrun budget or schedule.",
  source: "Standish CHAOS report",
};

/** Six consultant steps — email is the sole delivery channel at launch. */
export const consultantSteps: ConsultantStep[] = [
  {
    number: "01",
    title: "You describe the problem",
    body: 'Plain language. "Orders come in on chat and we lose half of them" is a perfect brief.',
  },
  {
    number: "02",
    title: "It asks a few simple questions",
    body: "Industry, current process, rough scale, timeline. Four or five, not a form.",
  },
  {
    number: "03",
    title: "It recommends a solution",
    body: "Which of our eight service lines fits, and why that one over the alternatives.",
  },
  {
    number: "04",
    title: "It shows features, timeline and project type",
    body: "A feature list, phased delivery plan and an honest cost band — on screen, immediately.",
  },
  {
    number: "05",
    title: "You leave name and email",
    body: "Only at the end, and only to send the full document — never to unlock a sales call.",
  },
  {
    number: "06",
    title: "The complete roadmap lands in your inbox",
    body: "PDF by email, and a booking link if you want to go further.",
  },
];

export const aboutMission = {
  overline: "Mission",
  titleLead: "We build software your organisation can",
  titleAccent: "operate and extend.",
  body: "ZACSOL designs and delivers production systems for support, logistics, commerce and automation. Every engagement includes defined scope, staged releases and documentation so your team can maintain and grow what we ship.",
} as const;

export const aboutStats: SiteStat[] = [
  { value: "50+", label: "Production systems delivered" },
  { value: "12", label: "Industries served" },
  { value: "<1 day", label: "Average response time" },
  { value: "100%", label: "Client-owned source and infrastructure" },
];

export const contactExpectations = [
  {
    title: "What to send",
    body: "The goal, the bottleneck, timeline and constraints. A messy paragraph beats a polished feature list.",
  },
  {
    title: "What you get",
    body: "A senior engineer replies with a direction — whether or not you hire us.",
  },
  {
    title: "Response window",
    body: "Within one business day. In a hurry? ZAC Consultant answers in three minutes.",
  },
] as const;
