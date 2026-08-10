import {
  applyMultipliers,
  BlueprintSchema,
  type Blueprint,
  type ConsultantAnswers,
  type ServiceSlug,
} from "./schema";
import { PROMPT_VERSION } from "./prompts";

type Archetype = {
  id: string;
  match: RegExp;
  title: string;
  why: string;
  serviceSlug: ServiceSlug;
  serviceTitle: string;
  features: string[];
  stack: string[];
  phases: { name: string; weeks: number }[];
  team: string;
  base: [number, number];
  assumptions: string[];
};

/**
 * Rules-engine archetypes — ported from design/consultant.html.
 * Order matters: specific before broad. Always available as Gemini fallback.
 */
const ARCHETYPES: Archetype[] = [
  {
    id: "entry",
    match:
      /data entry|copy.?paste|between systems|integrat|sync|duplicate|re.?enter|\berp\b|two systems|human api/i,
    title: "Systems integration layer with automated data sync",
    why: "Nobody should be a human API. We connect the systems you already pay for and let the data move itself, with an audit trail when it does.",
    serviceSlug: "business-process-automation",
    serviceTitle: "Business process automation",
    features: [
      "Bi-directional sync",
      "Field mapping console",
      "Error queue & retries",
      "Audit log",
      "Scheduled + event triggers",
      "Exception alerts",
      "Admin dashboard",
    ],
    stack: ["Node.js", "PostgreSQL", "Temporal", "REST/GraphQL connectors", "Docker"],
    phases: [
      { name: "Systems audit & mapping", weeks: 2 },
      { name: "Connector build", weeks: 3 },
      { name: "Sync engine & error handling", weeks: 3 },
      { name: "Monitoring & handover", weeks: 1 },
    ],
    team: "1 lead · 2 engineers",
    base: [10000, 22000],
    assumptions: [
      "Source systems expose usable APIs or export paths",
      "One primary system of record can be named",
      "Exception handling stays human-in-the-loop at launch",
    ],
  },
  {
    id: "ops",
    match: /whatsapp|order|enquir|inquir|lead|lost|notebook|paper|intake|follow-?up/i,
    title: "Order & enquiry capture system with automated follow-up",
    why: "Your revenue is leaking at intake, not at delivery. The fix is a single place every enquiry lands, with automatic follow-up so nothing depends on someone remembering.",
    serviceSlug: "business-process-automation",
    serviceTitle: "Business process automation",
    features: [
      "Multi-channel intake",
      "Unified enquiry inbox",
      "Auto-assignment rules",
      "Automated follow-up sequences",
      "Order status tracking",
      "Customer notifications",
      "Team dashboard",
      "Daily reporting",
    ],
    stack: ["Next.js", "Node.js", "PostgreSQL", "Redis", "Webhooks"],
    phases: [
      { name: "Discovery & process mapping", weeks: 1 },
      { name: "Intake + inbox build", weeks: 3 },
      { name: "Automation & notifications", weeks: 3 },
      { name: "Reporting & rollout", weeks: 2 },
    ],
    team: "1 lead · 2 engineers · 1 designer",
    base: [12000, 24000],
    assumptions: [
      "Intake channels can be consolidated in phase 1",
      "A named owner exists for assignment rules",
      "Notifications use email/SMS/web — channel choice confirmed in discovery",
    ],
  },
  {
    id: "mobile",
    match: /app idea|mobile|ios|android|play store|app store|an app/i,
    title: "Cross-platform mobile app with a phased MVP release",
    why: "One codebase covers iOS and Android at roughly 60% of the cost of two native builds — and lets you validate the idea before committing to platform-specific work.",
    serviceSlug: "mobile-app-development",
    serviceTitle: "Mobile app development",
    features: [
      "Onboarding & auth",
      "Core feature flow",
      "Push notifications",
      "Offline support",
      "In-app payments",
      "Admin backend",
      "Analytics",
      "Store submission",
    ],
    stack: ["React Native", "Expo", "Node.js", "PostgreSQL", "Firebase"],
    phases: [
      { name: "Discovery & UX", weeks: 2 },
      { name: "Design system & screens", weeks: 3 },
      { name: "Core build", weeks: 6 },
      { name: "Store release & hardening", weeks: 2 },
    ],
    team: "1 lead · 2 engineers · 1 designer",
    base: [22000, 48000],
    assumptions: [
      "MVP scope fits one primary user journey",
      "Store accounts and branding assets are available",
      "Backend can start greenfield unless you say otherwise",
    ],
  },
  {
    id: "support",
    match: /support|ticket|customer service|faq|chatbot|helpdesk|deflect|escalat/i,
    title: "AI support agent with human escalation and lead capture",
    why: "Most incoming questions are the same twenty questions. An agent grounded in your own documentation handles those and hands the rest over with the context attached.",
    serviceSlug: "ai-automation",
    serviceTitle: "AI automation",
    features: [
      "Knowledge base ingestion",
      "Retrieval-grounded answers",
      "Confidence-based escalation",
      "Web + messaging channels",
      "Lead capture",
      "Conversation analytics",
      "Human handoff inbox",
    ],
    stack: ["Gemini", "pgvector", "Next.js", "Node.js", "PostgreSQL"],
    phases: [
      { name: "Knowledge audit", weeks: 1 },
      { name: "Retrieval pipeline", weeks: 2 },
      { name: "Agent + guardrails", weeks: 3 },
      { name: "Channels & escalation", weeks: 2 },
      { name: "Evaluation & tuning", weeks: 2 },
    ],
    team: "1 lead · 1 AI engineer · 1 engineer",
    base: [14000, 32000],
    assumptions: [
      "Source docs/FAQs exist or can be assembled in week 1",
      "A human escalation path is defined",
      "Success is measured as deflection + CSAT, not chat volume alone",
    ],
  },
  {
    id: "data",
    match:
      /forecast|insight|analytic|predict|\bbi\b|trend|warehouse|executive dashboard|data warehouse|no trustworthy/i,
    title: "Analytics warehouse with forecasting and executive dashboards",
    why: "You have the data; what you lack is one trustworthy version of it. We consolidate the sources first, then layer forecasting on a base you can actually defend.",
    serviceSlug: "data-science",
    serviceTitle: "Data science",
    features: [
      "Source consolidation",
      "Data warehouse",
      "Automated pipelines",
      "Executive dashboards",
      "Demand forecasting",
      "Anomaly alerts",
      "Self-serve exports",
    ],
    stack: ["Python", "PostgreSQL", "ClickHouse", "dbt", "scikit-learn", "Metabase"],
    phases: [
      { name: "Data audit", weeks: 2 },
      { name: "Warehouse & pipelines", weeks: 3 },
      { name: "Dashboards", weeks: 2 },
      { name: "Forecasting models", weeks: 3 },
    ],
    team: "1 lead · 1 data engineer · 1 scientist",
    base: [18000, 40000],
    assumptions: [
      "Source systems can be read (API, replica, or export)",
      "One executive decision is named as the first dashboard target",
      "Forecasting needs at least one season of history where claimed",
    ],
  },
  {
    id: "web",
    match:
      /web app|web portal|client portal|marketplace|booking (site|system|platform)|saas dashboard|multi-tenant|seller onboarding|build(ing)? (a |an )?(website|web|saas)|need (a |an )?(website|web portal|portal)/i,
    title: "Custom web platform with role-based access and reporting",
    why: "Off-the-shelf tools stop where your process starts. A purpose-built platform removes the workarounds your team has quietly built around the gaps.",
    serviceSlug: "web-development",
    serviceTitle: "Web development",
    features: [
      "Role-based access",
      "Core workflow modules",
      "Search & filtering",
      "Reporting & exports",
      "Notifications",
      "Audit trail",
      "Admin console",
      "API for integrations",
    ],
    stack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
    phases: [
      { name: "Discovery & scope", weeks: 2 },
      { name: "Design system", weeks: 2 },
      { name: "Core build", weeks: 6 },
      { name: "Hardening & launch", weeks: 2 },
    ],
    team: "1 lead · 2 engineers · 1 designer",
    base: [20000, 45000],
    assumptions: [
      "Primary workflows can be listed in discovery",
      "Roles and permissions are known or discoverable",
      "Hosting preference is cloud (AWS/Vercel) unless stated",
    ],
  },
  {
    id: "content",
    match: /content|video publish|newsletter|cms pipeline|marketing team|brand.?constrained|schedul(e|ing) content/i,
    title: "Content automation pipeline with brand gates",
    why: "Content volume without a pipeline burns people out. We automate drafting, assembly and scheduling — with humans still owning brand approval.",
    serviceSlug: "content-automation",
    serviceTitle: "Content automation",
    features: [
      "Brief templates",
      "Brand-constrained drafting",
      "Human approval gates",
      "Media assembly",
      "Multi-channel scheduling",
      "Performance feedback loop",
    ],
    stack: ["Next.js", "Node.js", "PostgreSQL", "Gemini", "CMS APIs"],
    phases: [
      { name: "Pipeline definition", weeks: 1 },
      { name: "Draft automation", weeks: 3 },
      { name: "Produce & ship", weeks: 3 },
      { name: "Learn from output", weeks: 2 },
    ],
    team: "1 lead · 1 engineer · 1 designer",
    base: [12000, 28000],
    assumptions: [
      "Brand voice guidelines exist or can be written in week 1",
      "Publishing channels have API or export access",
      "A human approver is named for launch",
    ],
  },
  {
    id: "custom",
    match: /.*/,
    title: "Custom software platform built around your workflow",
    why: "What you described does not map cleanly onto an off-the-shelf category — which usually means the process itself is the differentiator and deserves purpose-built software.",
    serviceSlug: "custom-software",
    serviceTitle: "Custom software",
    features: [
      "Workflow modelling",
      "Role-based access",
      "Core operational modules",
      "Reporting",
      "Integrations",
      "Audit trail",
      "Admin console",
    ],
    stack: ["Next.js", "Node.js", "PostgreSQL", "Docker", "AWS"],
    phases: [
      { name: "Discovery & process mapping", weeks: 2 },
      { name: "Architecture & design", weeks: 2 },
      { name: "Core build", weeks: 6 },
      { name: "Hardening & handover", weeks: 2 },
    ],
    team: "1 lead · 2 engineers · 1 designer",
    base: [18000, 42000],
    assumptions: [
      "Discovery can shadow the real workflow for at least a week",
      "Success metrics can be named before build starts",
      "You own the code, infra and runbooks at handover",
    ],
  },
];

export function classifySeed(seed: string): Archetype {
  // Order: specific product intents before broad ops/web catch-alls
  const order = [
    "mobile",
    "support",
    "content",
    "web",
    "data",
    "entry",
    "ops",
    "custom",
  ] as const;

  const byId = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a])) as Record<
    string,
    Archetype
  >;

  for (const id of order) {
    const arch = byId[id];
    if (!arch || arch.id === "custom") continue;
    if (arch.match.test(seed)) return arch;
  }
  return byId.custom!;
}

/** Deterministic blueprint — always available when Gemini fails or is unset. */
export function buildRulesBlueprint(
  seed: string,
  answers: ConsultantAnswers,
): Blueprint {
  const arch = classifySeed(seed);
  const phaseWeeks = arch.phases.reduce((sum, p) => sum + p.weeks, 0);
  const { costBandUsd, durationWeeks } = applyMultipliers(
    arch.base,
    phaseWeeks,
    answers,
  );

  const blueprint = {
    title: arch.title,
    why: arch.why,
    serviceSlug: arch.serviceSlug,
    serviceTitle: arch.serviceTitle,
    features: arch.features,
    stack: arch.stack,
    phases: arch.phases,
    team: arch.team,
    costBandUsd,
    durationWeeks,
    assumptions: arch.assumptions,
    promptVersion: PROMPT_VERSION,
    source: "rules" as const,
  };

  return BlueprintSchema.parse(blueprint);
}
