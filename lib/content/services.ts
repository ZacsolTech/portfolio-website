import type { Service } from "./types";

const engagementDefaults = {
  discovery: {
    title: "Discovery sprint",
    body: "One to two weeks. Goals, constraints, architecture options and a fixed-scope estimate you can hold us to — whether or not you continue.",
    from: "From a fixed discovery fee",
  },
  fixed: {
    title: "Fixed-scope build",
    body: "Phased delivery with a written change protocol. You always know what a change costs before we start it.",
    from: "From a scoped build estimate",
  },
  embedded: {
    title: "Embedded team",
    body: "Senior engineers inside your cadence — weekly deployables, shared channel, no account-manager relay.",
    from: "From a monthly team rate",
  },
} as const;

export const services: Service[] = [
  {
    slug: "web-development",
    title: "Web development",
    shortTitle: "Web development",
    blurb:
      "Dashboards, portals, marketplaces and platforms that stay fast as data and team size grow.",
    icon: "Monitor",
    tech: ["Next.js", "React", "TypeScript"],
    included: [
      "Product architecture and information architecture",
      "Responsive UI on a shared design system",
      "API design, auth and role-based access",
      "Performance budgets and Core Web Vitals targets",
      "CI, staging environments and one-command rollback",
      "Handover docs, decision records and a recorded walkthrough",
    ],
    stackGroups: [
      { label: "Frontend", items: ["Next.js", "React", "TypeScript", "Tailwind"] },
      { label: "Backend", items: ["Node.js", "PostgreSQL", "Redis"] },
      { label: "Delivery", items: ["Vercel", "GitHub Actions", "Playwright"] },
    ],
    process: [
      {
        title: "Map the product",
        body: "Users, workflows and the bottleneck — not a feature wishlist.",
      },
      {
        title: "Ship a thin vertical",
        body: "One real path end to end on staging within the first two weeks.",
      },
      {
        title: "Harden and grow",
        body: "Auth, performance, accessibility and the next surface areas in priority order.",
      },
      {
        title: "Hand over clean",
        body: "Runbook, observability and a team that can extend it without us.",
      },
    ],
    faqs: [
      {
        q: "Do you rebuild existing sites or only greenfield?",
        a: "Both. A large share of our work is stabilising and extending products already in production — after a one-week audit that tells you what's salvageable.",
      },
      {
        q: "How do you keep dashboards fast as data grows?",
        a: "Server-side data access, indexed queries, caching where it earns its keep, and performance budgets checked in CI — not a late optimisation pass.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Web applications, portals and platforms built with Next.js and TypeScript — senior engineers, weekly deployables, clean handover.",
    },
  },
  {
    slug: "mobile-app-development",
    title: "Mobile app development",
    shortTitle: "Mobile apps",
    blurb:
      "Native-feel iOS and Android from one codebase — and we ship it through both stores for you.",
    icon: "Smartphone",
    tech: ["React Native", "Flutter", "PWA"],
    included: [
      "Platform choice with honest tradeoffs (RN, Flutter or PWA)",
      "Native-feel navigation, offline and push where needed",
      "Shared design system across web and mobile when both exist",
      "Store listing, review and release pipeline for iOS and Android",
      "Crash reporting, analytics and staged rollouts",
      "Handover docs and a release runbook your team can own",
    ],
    stackGroups: [
      { label: "Apps", items: ["React Native", "Flutter", "Expo", "PWA"] },
      { label: "Native", items: ["Swift", "Kotlin bridges when required"] },
      { label: "Backend", items: ["Node.js", "PostgreSQL", "Push services"] },
    ],
    process: [
      {
        title: "Pick the right shell",
        body: "Native feel vs reach vs cost — written down before a line of UI ships.",
      },
      {
        title: "Core loops first",
        body: "The three screens users live in, wired to real data on TestFlight / internal tracks.",
      },
      {
        title: "Store-ready polish",
        body: "Permissions, offline, accessibility and the listing assets reviewers expect.",
      },
      {
        title: "Ship and watch",
        body: "Staged rollout, crash budgets and a clear path for the next release.",
      },
    ],
    faqs: [
      {
        q: "React Native or Flutter?",
        a: "Whichever matches your team and existing stack. We recommend in writing during discovery — not by default.",
      },
      {
        q: "Do you handle App Store and Play review?",
        a: "Yes. Listings, compliance screenshots, review responses and the first production release are part of the build.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "iOS and Android apps with React Native or Flutter — store shipping, staged rollouts and a handover your team can run.",
    },
  },
  {
    slug: "ai-automation",
    title: "AI automation",
    shortTitle: "AI automation",
    blurb:
      "Assistants, document processing and retrieval — each scoped to a measurable hour or rupee saved.",
    icon: "Sparkles",
    tech: ["LLM pipelines", "RAG", "Agents"],
    included: [
      "Use-case scoping against a measurable saving before build",
      "Retrieval, tools and guardrails — not a chat widget bolted on",
      "Evaluation set and regression checks for answer quality",
      "Human escalation paths with context attached",
      "Observability: cost, latency, deflection and failure modes",
      "Runbook so your team can update knowledge without us",
    ],
    stackGroups: [
      { label: "Models", items: ["Gemini", "Claude", "OpenAI"] },
      { label: "Orchestration", items: ["LangChain", "structured outputs", "agents"] },
      { label: "Data", items: ["pgvector", "embeddings", "document stores"] },
    ],
    process: [
      {
        title: "Prove the saving",
        body: "Baseline hours or cost. If the AI feature can't beat it on paper, we don't build it.",
      },
      {
        title: "Grounded prototype",
        body: "Retrieval over your real docs, with evaluation cases from day one.",
      },
      {
        title: "Ship with guardrails",
        body: "Escalation, audit logs and cost caps before anyone trusts it with customers.",
      },
      {
        title: "Measure and tighten",
        body: "Deflection, accuracy and cost per conversation — then iterate.",
      },
    ],
    faqs: [
      {
        q: "Will you just wrap ChatGPT for us?",
        a: "No. The consultant on this site is our own work — retrieval, evaluation and guardrails. We scope every feature to a measurable saving first.",
      },
      {
        q: "What if our data isn't ready?",
        a: "Then we say so. Process and data hygiene often come before model work — and that recommendation is free in discovery.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "AI assistants, RAG and document automation scoped to measurable savings — with evaluation, guardrails and clean handover.",
    },
  },
  {
    slug: "data-science",
    title: "Data science",
    shortTitle: "Data science",
    blurb:
      "Forecasting, segmentation and dashboards that answer the question you actually asked.",
    icon: "TrendingUp",
    tech: ["Python", "ML models", "BI"],
    included: [
      "Question framing before model work — what decision this answers",
      "Pipelines from source systems into a trustworthy warehouse layer",
      "Models you can explain to operators, not only to data teams",
      "Dashboards and alerts wired to the decisions they support",
      "Monitoring for drift, freshness and silent failures",
      "Documentation so the next hire can extend the work",
    ],
    stackGroups: [
      { label: "Languages", items: ["Python", "SQL"] },
      { label: "ML & BI", items: ["pandas", "scikit-learn", "dbt", "Metabase"] },
      { label: "Stores", items: ["PostgreSQL", "ClickHouse", "object storage"] },
    ],
    process: [
      {
        title: "Name the decision",
        body: "The question, the owner and the cost of being wrong — written first.",
      },
      {
        title: "Fix the pipes",
        body: "Sources, freshness and definitions. Models on dirty inputs are theatre.",
      },
      {
        title: "Model and validate",
        body: "Baselines before cleverness. Operators review outputs against reality.",
      },
      {
        title: "Put it in the loop",
        body: "Dashboards, alerts or APIs where the decision actually happens.",
      },
    ],
    faqs: [
      {
        q: "Do you build models or just dashboards?",
        a: "Both — but only when the decision is clear. Many briefs need trustworthy reporting first; we say which.",
      },
      {
        q: "Can you work with our existing warehouse?",
        a: "Yes. We prefer extending what you have over a greenfield rebuild unless the foundations are the bottleneck.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Forecasting, segmentation and decision-ready dashboards — Python, SQL and pipelines your team can operate.",
    },
  },
  {
    slug: "custom-software",
    title: "Custom software",
    shortTitle: "Custom software",
    blurb:
      "ERP, CRM and internal tools built around how your business actually runs — not a template.",
    icon: "Code2",
    tech: ["Node.js", ".NET", "PostgreSQL"],
    included: [
      "Process mapping with the people who do the work today",
      "Domain model and permissions that match real roles",
      "Integrations with the systems you already pay for",
      "Migration plan from spreadsheets or legacy tools",
      "Audit trails and reporting operators actually use",
      "Ownership transfer: code, infra access and runbooks",
    ],
    stackGroups: [
      { label: "Backend", items: ["Node.js", "NestJS", ".NET", "PostgreSQL"] },
      { label: "Frontend", items: ["React", "Next.js", "TypeScript"] },
      { label: "Integration", items: ["REST", "webhooks", "queues", "SSO"] },
    ],
    process: [
      {
        title: "Shadow the work",
        body: "We watch how orders, approvals and exceptions actually move — not how the SOP says they do.",
      },
      {
        title: "Replace the painful slice",
        body: "One workflow live end to end before boiling the ocean.",
      },
      {
        title: "Integrate and migrate",
        body: "Cutover plan, dual-run where needed, rollback if reality disagrees.",
      },
      {
        title: "Operate together",
        body: "Support window, then your team owns the product with docs that match the code.",
      },
    ],
    faqs: [
      {
        q: "Why not buy off-the-shelf ERP/CRM?",
        a: "Often you should. We say so when a product fits. Custom wins when your process is the product — and templates fight you every quarter.",
      },
      {
        q: "Will we be locked into ZACSOL?",
        a: "No. Code, infra and docs are yours. Handover is a phase, not a surprise.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Custom ERP, CRM and internal tools shaped to your process — integrations, migration and a clean handover.",
    },
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX design",
    shortTitle: "UI/UX design",
    blurb:
      "Research, flows, interface and a design system your own team can extend after we leave.",
    icon: "Palette",
    tech: ["Figma", "Design systems"],
    included: [
      "Research and journey maps tied to a real bottleneck",
      "Flows and wireframes validated before visual polish",
      "Interface design with production-ready component specs",
      "A Figma system your engineers can implement without guesswork",
      "Accessibility review against WCAG targets you set",
      "Handover session so your team can extend the system",
    ],
    stackGroups: [
      { label: "Design", items: ["Figma", "prototyping", "design tokens"] },
      { label: "Systems", items: ["components", "variants", "documentation"] },
      { label: "Handoff", items: ["specs", "redlines", "dev pairing"] },
    ],
    process: [
      {
        title: "Find the friction",
        body: "Interviews and task observation — the screen that costs you the most.",
      },
      {
        title: "Structure before style",
        body: "Flows and information architecture signed off before colour and type.",
      },
      {
        title: "System and UI",
        body: "Components, states and the pages that ship in the first release.",
      },
      {
        title: "Pair into build",
        body: "Design stays in the loop through implementation — no throw-over-the-wall.",
      },
    ],
    faqs: [
      {
        q: "Do you design only, or design and build?",
        a: "Either. Many clients take design-plus-build as one team so the system and the code stay aligned.",
      },
      {
        q: "Can you work inside our existing brand?",
        a: "Yes. We extend what you have unless the brand itself is the constraint — and then we say so early.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Product UX, interface design and Figma systems your engineers can ship — research-led, handover-ready.",
    },
  },
  {
    slug: "business-process-automation",
    title: "Business process automation",
    shortTitle: "Process automation",
    blurb:
      "The quiet win: approvals, handoffs and reporting that stop needing a person to chase them.",
    icon: "Workflow",
    tech: ["Workflow", "Integrations", "RPA"],
    included: [
      "Process map with owners, SLAs and failure modes",
      "Workflow engine or lightweight automation — chosen for fit, not fashion",
      "Integrations between the tools your team already uses",
      "Exception queues humans can clear without a spreadsheet",
      "Auditability for finance, ops and compliance",
      "Playbooks so ops can change rules without a deploy every time",
    ],
    stackGroups: [
      { label: "Automation", items: ["workflow engines", "queues", "schedulers"] },
      { label: "Integration", items: ["APIs", "webhooks", "iPaaS", "RPA where needed"] },
      { label: "Ops", items: ["dashboards", "alerts", "audit logs"] },
    ],
    process: [
      {
        title: "Time the waste",
        body: "Where hours disappear: chasing, re-keying, waiting on approvals.",
      },
      {
        title: "Automate the spine",
        body: "Happy path first, with clear ownership when something breaks.",
      },
      {
        title: "Handle exceptions",
        body: "Queues, retries and human takeover — not silent failure.",
      },
      {
        title: "Measure the gain",
        body: "Cycle time and error rate before vs after — written into the handover.",
      },
    ],
    faqs: [
      {
        q: "Is this RPA or proper integration?",
        a: "Integration when APIs exist. RPA only when the system won't talk — and we document the risk either way.",
      },
      {
        q: "Will this replace our ERP?",
        a: "Usually no. We connect and orchestrate what you already run, unless replacement is the brief.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Approvals, handoffs and reporting automated with integrations and workflows — measurable cycle-time gains.",
    },
  },
  {
    slug: "content-automation",
    title: "Content automation",
    shortTitle: "Content automation",
    blurb:
      "Script to video to publish — an automated pipeline that drafts, produces and ships content without the manual grind.",
    icon: "Clapperboard",
    tech: ["Script", "Video", "Auto-publish"],
    included: [
      "Editorial workflow from brief to approved script",
      "Generation and assembly steps with human review gates",
      "Brand voice constraints and forbidden-claim checks",
      "Publish pipelines to the channels you already use",
      "Asset library, versioning and reuse across formats",
      "Analytics loop so the next brief starts smarter",
    ],
    stackGroups: [
      { label: "Generation", items: ["LLM drafting", "templates", "brand rules"] },
      { label: "Media", items: ["video assembly", "subtitles", "thumbnails"] },
      { label: "Publish", items: ["schedulers", "CMS APIs", "social connectors"] },
    ],
    process: [
      {
        title: "Define the pipeline",
        body: "Formats, channels, approval roles and where humans must stay in the loop.",
      },
      {
        title: "Automate drafts",
        body: "Script and asset generation against brand rules — review before anything public.",
      },
      {
        title: "Produce and ship",
        body: "Assembly, QA checks and scheduled publish with rollback.",
      },
      {
        title: "Learn from output",
        body: "Performance fed back into the next brief — not a dead-end calendar.",
      },
    ],
    faqs: [
      {
        q: "Does AI publish without review?",
        a: "Not by default. We put review gates where brand and legal risk live. Full auto-publish is opt-in after trust is earned.",
      },
      {
        q: "Can this plug into our existing CMS?",
        a: "Yes — CMS APIs and schedulers are the usual path. We don't force a new editorial stack unless yours is the bottleneck.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Content automation from script to publish — brand-safe pipelines with human review gates and channel delivery.",
    },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
