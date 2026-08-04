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
      "Full-stack web apps, CMS sites and admin portals — MERN, Django, PHP or WordPress, chosen for your product and your team.",
    icon: "Monitor",
    tech: ["MERN", "DJANGO", "PHP", "WORDPRESS"],
    included: [
      "Stack recommendation with clear tradeoffs (MERN, Django, PHP or WordPress)",
      "Responsive UI built for conversion, clarity and mobile-first use",
      "Secure auth, roles, APIs and integrations with tools you already run",
      "Performance tuning, SEO foundations and Core Web Vitals targets",
      "Staging, CI and a deployment path your team can repeat safely",
      "Handover docs, admin training and a recorded walkthrough",
    ],
    stackGroups: [
      { label: "JavaScript", items: ["MongoDB", "Express", "React", "Node.js"] },
      { label: "Python & PHP", items: ["Django", "PHP", "Laravel-ready patterns"] },
      { label: "CMS", items: ["WordPress", "custom themes", "headless options"] },
    ],
    process: [
      {
        title: "Choose the right stack",
        body: "MERN for rich apps, Django for structured backends, PHP or WordPress when content and speed-to-market win — written before build.",
      },
      {
        title: "Ship a thin vertical",
        body: "One real user path live on staging within the first two weeks.",
      },
      {
        title: "Harden and grow",
        body: "Security, SEO, performance and the next surfaces in priority order.",
      },
      {
        title: "Hand over clean",
        body: "Runbook, hosting access and a team that can extend it without us.",
      },
    ],
    faqs: [
      {
        q: "MERN, Django, PHP or WordPress — how do you decide?",
        a: "By product shape, not preference. Rich dashboards and SPAs lean MERN; data-heavy backends lean Django; marketing and content sites often win on WordPress or PHP. We recommend in writing during discovery.",
      },
      {
        q: "Can you rebuild or extend an existing site?",
        a: "Yes. Much of our work is stabilising production products — after a short audit that tells you what to keep, rewrite or retire.",
      },
      {
        q: "Will the site be SEO-ready?",
        a: "Yes. Clean URLs, metadata, sitemap/robots, performance budgets and structured content are part of delivery — not a bolt-on later.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Web development with MERN, Django, PHP and WordPress — fast apps, CMS sites and portals with SEO foundations and clean handover.",
    },
  },
  {
    slug: "mobile-app-development",
    title: "Mobile app development",
    shortTitle: "Mobile apps",
    blurb:
      "iOS and Android apps that feel native — React Native, Flutter, PWA, Swift or Kotlin, shipped through both stores.",
    icon: "Smartphone",
    tech: ["React Native", "Flutter", "PWA", "SWIFT", "KOTLIN"],
    included: [
      "Platform choice with honest tradeoffs (React Native, Flutter, PWA, Swift or Kotlin)",
      "Native-feel navigation, offline support and push notifications where needed",
      "Shared design language across web and mobile when both exist",
      "App Store and Google Play listing, review handling and release pipeline",
      "Crash reporting, analytics and staged rollouts",
      "Handover docs and a release runbook your team can own",
    ],
    stackGroups: [
      { label: "Cross-platform", items: ["React Native", "Flutter", "Expo", "PWA"] },
      { label: "Native", items: ["Swift", "Kotlin"] },
      { label: "Backend", items: ["Node.js", "PostgreSQL", "push services"] },
    ],
    process: [
      {
        title: "Pick the right shell",
        body: "Cross-platform reach vs native depth vs PWA speed — documented before UI work starts.",
      },
      {
        title: "Core loops first",
        body: "The screens users live in, wired to real data on TestFlight and internal Android tracks.",
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
        q: "React Native, Flutter, PWA or fully native?",
        a: "Whichever matches your timeline, team and product. We recommend in writing during discovery — not by default. Swift and Kotlin when native APIs or performance demand it.",
      },
      {
        q: "Do you handle App Store and Play review?",
        a: "Yes. Listings, compliance screenshots, review responses and the first production release are part of the build.",
      },
      {
        q: "Can one codebase serve both stores?",
        a: "Usually yes with React Native or Flutter. When a feature needs deep native work, we bridge with Swift or Kotlin without rewriting the whole app.",
      },
    ],
    engagement: [
      engagementDefaults.discovery,
      engagementDefaults.fixed,
      engagementDefaults.embedded,
    ],
    seo: {
      description:
        "Mobile app development with React Native, Flutter, PWA, Swift and Kotlin — store shipping, staged rollouts and team handover.",
    },
  },
  {
    slug: "ai-automation",
    title: "AI automation",
    shortTitle: "AI automation",
    blurb:
      "Chatbots, RAG assistants and agent workflows — wired through n8n or Zapier and scoped to hours or cost you can measure.",
    icon: "Sparkles",
    tech: ["LLM pipelines", "RAG", "Agents", "N8N", "ZAPIER", "CHATBOT"],
    included: [
      "Use-case scoping against a measurable saving before any model work",
      "RAG over your docs, tools and guardrails — not a generic chat widget",
      "Custom chatbots and agents with human escalation paths",
      "n8n or Zapier orchestration into the apps your team already uses",
      "Evaluation sets, cost/latency monitoring and failure alerts",
      "Runbook so your team can update knowledge and flows without us",
    ],
    stackGroups: [
      { label: "Intelligence", items: ["LLM pipelines", "RAG", "agents", "chatbots"] },
      { label: "Orchestration", items: ["n8n", "Zapier", "webhooks", "APIs"] },
      { label: "Data", items: ["embeddings", "vector stores", "document stores"] },
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
        title: "Wire into operations",
        body: "n8n or Zapier connects the assistant to CRM, email, tickets and the tools people already open.",
      },
      {
        title: "Measure and tighten",
        body: "Deflection, accuracy and cost per conversation — then iterate.",
      },
    ],
    faqs: [
      {
        q: "Will you just wrap ChatGPT for us?",
        a: "No. We build retrieval, agents, evaluation and guardrails — then connect them with n8n or Zapier so the answer reaches the right system, not only a chat box.",
      },
      {
        q: "n8n or Zapier?",
        a: "Zapier when you want speed and SaaS connectors. n8n when you need self-hosted control, complex branching or lower volume cost. We pick for fit during discovery.",
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
        "AI automation with LLM pipelines, RAG, agents and chatbots — orchestrated via n8n or Zapier, scoped to measurable savings.",
    },
  },
  {
    slug: "content-automation",
    title: "Content automation",
    shortTitle: "Content automation",
    blurb:
      "From brief to published video — n8n workflows with HeyGen, Higgsfield and Veo-3 so your team ships more without the grind.",
    icon: "Clapperboard",
    tech: ["N8N", "HEYGEN", "HIGGSFIELD", "VEO-3", "CUSTOM WORKFLOWS"],
    included: [
      "Editorial workflow from brief to approved script inside n8n",
      "AI video generation with HeyGen, Higgsfield and Veo-3 where each fits",
      "Brand voice rules, forbidden-claim checks and human review gates",
      "Custom workflows for assembly, subtitles, thumbnails and variants",
      "Publish pipelines to the channels and CMS you already use",
      "Analytics loop so the next brief starts smarter",
    ],
    stackGroups: [
      { label: "Orchestration", items: ["n8n", "custom workflows", "approval gates"] },
      { label: "Video AI", items: ["HeyGen", "Higgsfield", "Veo-3"] },
      { label: "Publish", items: ["schedulers", "CMS APIs", "social connectors"] },
    ],
    process: [
      {
        title: "Define the pipeline",
        body: "Formats, channels, approval roles and which AI tool owns each step.",
      },
      {
        title: "Automate drafts",
        body: "Scripts and assets generated against brand rules — review before anything public.",
      },
      {
        title: "Produce with AI video",
        body: "HeyGen for presenters, Higgsfield and Veo-3 for scenes — assembled and QA'd in the same flow.",
      },
      {
        title: "Ship and learn",
        body: "Scheduled publish with rollback, performance fed back into the next brief.",
      },
    ],
    faqs: [
      {
        q: "Does AI publish without review?",
        a: "Not by default. Review gates sit where brand and legal risk live. Full auto-publish is opt-in after trust is earned.",
      },
      {
        q: "Why HeyGen, Higgsfield and Veo-3 together?",
        a: "Different jobs. HeyGen excels at avatar presenters; Higgsfield and Veo-3 handle cinematic and generative scenes. We route each asset to the right tool inside one n8n pipeline.",
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
        "Content automation with n8n, HeyGen, Higgsfield and Veo-3 — brand-safe script-to-video pipelines with human review gates.",
    },
  },
  {
    slug: "data-science",
    title: "Data science",
    shortTitle: "Data science",
    blurb:
      "ML models, computer vision, NLP and analysis that answer the business question — not a model for its own sake.",
    icon: "TrendingUp",
    tech: ["ML MODELS", "COMPUTER VISION", "NLP", "DATA ANALYSIS"],
    included: [
      "Question framing before model work — what decision this answers",
      "ML models you can explain to operators, not only to data teams",
      "Computer vision for images, documents and quality inspection",
      "NLP for classification, extraction, search and support triage",
      "Analysis, dashboards and alerts wired to the decisions they support",
      "Monitoring for drift, freshness and silent failures — plus docs for the next hire",
    ],
    stackGroups: [
      { label: "ML", items: ["supervised models", "forecasting", "scoring"] },
      { label: "Vision & language", items: ["computer vision", "NLP", "embeddings"] },
      { label: "Analysis", items: ["Python", "SQL", "dashboards", "pipelines"] },
    ],
    process: [
      {
        title: "Name the decision",
        body: "The question, the owner and the cost of being wrong — written first.",
      },
      {
        title: "Fix the pipes",
        body: "Sources, labels and definitions. Models on dirty inputs are theatre.",
      },
      {
        title: "Model and validate",
        body: "Baselines before cleverness — whether it's tabular ML, vision or NLP.",
      },
      {
        title: "Put it in the loop",
        body: "APIs, dashboards or alerts where the decision actually happens.",
      },
    ],
    faqs: [
      {
        q: "Do you build models or just dashboards?",
        a: "Both — but only when the decision is clear. Many briefs need trustworthy analysis first; we say which before any ML work.",
      },
      {
        q: "When do you use computer vision or NLP?",
        a: "When the signal lives in images, PDFs or unstructured text — quality checks, document extraction, ticket triage, search. We prove lift against a simple baseline first.",
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
        "Data science with ML models, computer vision, NLP and decision-ready analysis — pipelines and dashboards your team can operate.",
    },
  },
  {
    slug: "custom-software",
    title: "Custom software",
    shortTitle: "Custom software",
    blurb:
      "ERP, CRM and internal tools on Node.js, .NET and PostgreSQL — shaped around how your business actually runs.",
    icon: "Code2",
    tech: ["Node.js", ".NET", "PostgreSQL"],
    included: [
      "Process mapping with the people who do the work today",
      "Domain model and permissions that match real roles",
      "Node.js or .NET backends on PostgreSQL — chosen for your team and constraints",
      "Integrations with the systems you already pay for",
      "Migration plan from spreadsheets or legacy tools, with audit trails",
      "Ownership transfer: code, infra access and runbooks",
    ],
    stackGroups: [
      { label: "Backend", items: ["Node.js", ".NET", "PostgreSQL"] },
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
        body: "One workflow live end to end on Node.js or .NET before boiling the ocean.",
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
        q: "Node.js or .NET?",
        a: "Node.js when JavaScript teams and API-heavy products dominate; .NET when Windows estates, enterprise integrations or existing C# skills do. PostgreSQL is our default data layer either way.",
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
        "Custom ERP, CRM and internal tools with Node.js, .NET and PostgreSQL — integrations, migration and a clean handover.",
    },
  },
  {
    slug: "business-process-automation",
    title: "Business process automation",
    shortTitle: "Process automation",
    blurb:
      "Approvals, handoffs and reporting on autopilot — n8n, Zapier, RPA and custom workflows that stop needing someone to chase them.",
    icon: "Workflow",
    tech: ["WORKFLOW", "INTEGRATIONS", "RPA", "N8N", "ZAPIER", "CUSTOM WORKFLOWS"],
    included: [
      "Process map with owners, SLAs and failure modes",
      "n8n, Zapier or custom workflows — chosen for fit, not fashion",
      "API integrations between the tools your team already uses",
      "RPA only where systems won't talk — with the risk documented",
      "Exception queues humans can clear without a spreadsheet",
      "Auditability and playbooks so ops can change rules without a deploy every time",
    ],
    stackGroups: [
      { label: "Automation", items: ["n8n", "Zapier", "custom workflows", "schedulers"] },
      { label: "Integration", items: ["APIs", "webhooks", "RPA where needed"] },
      { label: "Ops", items: ["dashboards", "alerts", "audit logs"] },
    ],
    process: [
      {
        title: "Time the waste",
        body: "Where hours disappear: chasing, re-keying, waiting on approvals.",
      },
      {
        title: "Automate the spine",
        body: "Happy path first in n8n or Zapier, with clear ownership when something breaks.",
      },
      {
        title: "Handle exceptions",
        body: "Queues, retries and human takeover — not silent failure. RPA only as a last resort.",
      },
      {
        title: "Measure the gain",
        body: "Cycle time and error rate before vs after — written into the handover.",
      },
    ],
    faqs: [
      {
        q: "n8n, Zapier or custom?",
        a: "Zapier for fast SaaS glue. n8n for self-hosted control and complex branching. Custom workflows when volume, latency or compliance outgrow no-code. We recommend in discovery.",
      },
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
        "Business process automation with n8n, Zapier, RPA and custom workflows — measurable cycle-time gains and audit-ready ops.",
    },
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX design",
    shortTitle: "UI/UX design",
    blurb:
      "Research, flows, prototypes and design systems in Figma — plus Adobe XD and Canva when your team already lives there.",
    icon: "Palette",
    tech: ["Figma", "Design systems", "ADOBE XD", "CANVA", "FIGMA PLUGINS", "PROTOTYPING"],
    included: [
      "Research and journey maps tied to a real product bottleneck",
      "Flows, wireframes and interactive prototypes validated before visual polish",
      "Interface design with production-ready component specs",
      "Figma design systems, plugins and tokens engineers can implement cleanly",
      "Adobe XD or Canva deliverables when stakeholders need lighter tools",
      "Accessibility review and a handover session so your team can extend the system",
    ],
    stackGroups: [
      { label: "Design", items: ["Figma", "Adobe XD", "prototyping", "Figma plugins"] },
      { label: "Systems", items: ["components", "variants", "design tokens", "docs"] },
      { label: "Lightweight", items: ["Canva", "stakeholder kits", "marketing assets"] },
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
        title: "Prototype and system",
        body: "Clickable prototypes, then components, states and the pages that ship first.",
      },
      {
        title: "Pair into build",
        body: "Design stays in the loop through implementation — Figma specs, not throw-over-the-wall PDFs.",
      },
    ],
    faqs: [
      {
        q: "Do you design only, or design and build?",
        a: "Either. Many clients take design-plus-build as one team so the system and the code stay aligned.",
      },
      {
        q: "Figma only, or Adobe XD and Canva too?",
        a: "Figma is our system of record. Adobe XD when you already have files there; Canva when marketing needs editable social and deck assets without touching the product file.",
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
        "UI/UX design with Figma, design systems, Adobe XD, Canva and prototyping — research-led interfaces your engineers can ship.",
    },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
