import type { PortfolioItem } from "./types";

export const portfolio: PortfolioItem[] = [
  {
    slug: "ai-support-agent",
    title: "AI support agent",
    client: "Meridian Retail",
    sector: "Retail",
    metric: "68% of tickets deflected",
    category: "ai",
    summary:
      "A knowledge-backed support agent that answers common questions, escalates with context, and captures unresolved leads.",
    description: [
      "Meridian Retail’s support volume outgrew headcount. Agents spent the first minutes of every ticket re-finding policy answers that already lived in scattered docs.",
      "We shipped a retrieval-backed support agent that answers from a governed knowledge base, escalates to humans with full context, and captures unresolved intents as leads. An evaluation set keeps answer quality from drifting after launch.",
      "In production, the agent deflects roughly two-thirds of inbound tickets with a median first response under thirty seconds — owned by one knowledge team, not a bot farm.",
    ],
    images: [
      {
        caption: "Agent workspace",
        alt: "Support agent workspace with analytics dashboard on screen",
        src: "/projects/ai-support-agent/01.jpg",
      },
      {
        caption: "Escalation trail",
        alt: "Operations dashboard used for ticket escalation and review",
        src: "/projects/ai-support-agent/02.jpg",
      },
      {
        caption: "Knowledge coverage",
        alt: "Team reviewing knowledge coverage on a shared workspace screen",
        src: "/projects/ai-support-agent/03.jpg",
      },
    ],
    stack: ["Next.js", "Gemini", "pgvector", "PostgreSQL", "Resend"],
    relatedServices: ["ai-automation", "web-development"],
    timeline: "10 weeks",
  },
  {
    slug: "field-service-operations",
    title: "Field-service operations platform",
    client: "Halcyon Logistics",
    sector: "Logistics",
    metric: "Dispatch time down 41%",
    category: "web",
    summary:
      "Dispatch, routing and proof-of-work for 300 technicians across four regions.",
    description: [
      "Dispatchers built daily schedules by hand. Technicians worked from paper job packs. Proof of completion reached billing days later, and exceptions disappeared into chat threads.",
      "We delivered a web dispatch console and mobile field app: skills-aware assignment, live job status, photo proof-of-work, and a same-day feed into invoicing. Regional managers see capacity without waiting for a Friday export.",
      "Three hundred technicians moved off paper in fourteen weeks. Dispatch time dropped 41%, with proof of work reaching billing the same day.",
    ],
    images: [
      {
        caption: "Dispatch console",
        alt: "Dispatch board with technician capacity and live job assignments",
      },
      {
        caption: "Field app",
        alt: "Mobile field app showing job details and photo proof-of-work capture",
      },
      {
        caption: "Billing feed",
        alt: "Same-day proof feed into invoicing with exception queue",
      },
    ],
    stack: ["Next.js", "React Native", "Node.js", "PostgreSQL", "Redis"],
    relatedServices: [
      "custom-software",
      "mobile-app-development",
      "web-development",
    ],
    timeline: "14 weeks",
  },
  {
    slug: "order-capture-inventory",
    title: "Multi-channel order capture & inventory",
    client: "Verdant Supply",
    sector: "Retail",
    metric: "Zero lost orders in 6 months",
    category: "automation",
    summary:
      "Orders from chat and email channels flow straight into stock, invoicing and delivery tracking.",
    description: [
      "Wholesale orders arrived in chat threads and inboxes. Staff re-typed them into inventory. Busy weeks meant missed lines in the scroll — and stock truth disagreed with what sales had promised.",
      "We built an intake pipeline that turns channel messages into structured orders, checks stock, raises invoices, and pushes delivery status back to the customer. Exceptions land in a human queue instead of failing silently.",
      "From discovery to production in nine weeks. Six months later: zero lost orders and one source of stock truth across sales and warehouse.",
    ],
    images: [
      {
        caption: "Channel intake",
        alt: "Order intake pipeline converting chat and email into structured orders",
      },
      {
        caption: "Stock check",
        alt: "Inventory confirmation screen before order commitment",
      },
      {
        caption: "Exception queue",
        alt: "Human exception queue for orders that need review",
      },
    ],
    stack: ["Node.js", "PostgreSQL", "workflow engine", "Next.js"],
    relatedServices: [
      "business-process-automation",
      "custom-software",
      "ai-automation",
    ],
    timeline: "9 weeks",
  },
  {
    slug: "inventory-order-dashboard",
    title: "Inventory & order dashboard",
    client: "Northwind Commerce",
    sector: "Retail",
    metric: "Stock truth in one screen",
    category: "web",
    summary:
      "A single operations console for orders, stock levels and fulfilment exceptions.",
    description: [
      "Ops ran the business from three exports and a shared sheet. By the time stock was wrong, sales had already oversold.",
      "We built a role-aware operations dashboard: orders, inventory and exceptions on one surface, with drill-downs that match how warehouse and sales actually argue about numbers.",
      "One live ops surface replaced three exports. Exception queues stay shared, and stock truth is the same for every team.",
    ],
    images: [
      {
        caption: "Ops overview",
        alt: "Operations dashboard showing orders, stock and fulfilment status",
      },
      {
        caption: "Stock detail",
        alt: "Inventory detail view with warehouse-level stock levels",
      },
      {
        caption: "Exceptions",
        alt: "Fulfilment exception queue with owners and status",
      },
    ],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Recharts"],
    relatedServices: ["web-development", "data-science"],
    timeline: "6 weeks",
  },
  {
    slug: "document-data-extractor",
    title: "Document data extractor",
    client: "Bancroft Finance",
    sector: "Fintech",
    metric: "Invoice fields in seconds",
    category: "ai",
    summary:
      "Invoice extraction with confidence scores and human review before finance systems are updated.",
    description: [
      "AP staff re-keyed invoices into the ledger. Error rates climbed with volume, and month-end turned into a reconciliation festival.",
      "We shipped an extraction pipeline with confidence scores, human review for low-confidence fields, and a clean export into the existing finance system.",
      "Structured fields land in seconds. Low-confidence values never reach the ledger without a person in the loop.",
    ],
    images: [
      {
        caption: "Upload & extract",
        alt: "Document upload screen with invoice extraction in progress",
      },
      {
        caption: "Confidence review",
        alt: "Human review UI highlighting low-confidence extracted fields",
      },
      {
        caption: "Finance export",
        alt: "Export confirmation into the finance system API",
      },
    ],
    stack: ["Python", "Gemini", "Next.js", "PostgreSQL"],
    relatedServices: ["ai-automation", "business-process-automation"],
    timeline: "8 weeks",
  },
  {
    slug: "clinic-intake-triage",
    title: "Clinic intake & triage console",
    client: "Kestrel Health",
    sector: "Healthcare",
    metric: "Intake time cut in half",
    category: "web",
    summary:
      "Structured intake, triage queues and visit context that travels with the patient — not a paper pack.",
    description: [
      "Front desk collected the same history on paper every visit. Clinical staff rebuilt context from memory and incomplete notes.",
      "We delivered a web intake flow with role-based triage boards, visit summaries and audit logs — designed so temporary staff can run it without a week of training.",
      "Intake time fell by half. Paper packs left the front desk, and every access carries an audit trail.",
    ],
    images: [
      {
        caption: "Patient intake",
        alt: "Structured clinic intake form on a tablet-friendly layout",
      },
      {
        caption: "Triage board",
        alt: "Role-based triage board with visit priority queues",
      },
      {
        caption: "Visit summary",
        alt: "Visit summary view with clinical context for the next staff member",
      },
    ],
    stack: ["Next.js", "PostgreSQL", "SSO", "encrypted storage"],
    relatedServices: ["custom-software", "ui-ux-design", "web-development"],
    timeline: "12 weeks",
  },
  {
    slug: "content-publish-pipeline",
    title: "Script-to-publish content pipeline",
    client: "Ardent Media",
    sector: "Professional services",
    metric: "3× output, same review team",
    category: "automation",
    summary:
      "Brief to draft to video assembly to scheduled publish — with brand gates humans still own.",
    description: [
      "A small editorial team spent most of the week on assembly and scheduling. Draft quality varied; publishing slipped whenever someone was out.",
      "We automated the pipeline: brief templates, brand-constrained drafting, human approval, media assembly and multi-channel scheduling. Analytics feed the next brief instead of dying in a spreadsheet.",
      "Publish volume tripled with the same review headcount. Every public asset still passes a human gate.",
    ],
    images: [
      {
        caption: "Brief intake",
        alt: "Content brief template intake for the publish pipeline",
      },
      {
        caption: "Approval gate",
        alt: "Human brand approval step before media assembly",
      },
      {
        caption: "Schedule board",
        alt: "Multi-channel publish schedule with status and analytics feedback",
      },
    ],
    stack: ["Node.js", "LLM pipelines", "CMS APIs", "schedulers"],
    relatedServices: ["content-automation", "ai-automation"],
    timeline: "11 weeks",
  },
];

export function getPortfolioItem(slug: string): PortfolioItem | undefined {
  return portfolio.find((p) => p.slug === slug);
}
