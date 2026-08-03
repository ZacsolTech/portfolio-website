import type { PortfolioItem } from "./types";

export const portfolio: PortfolioItem[] = [
  {
    slug: "ai-support-agent",
    title: "AI support agent — try it live",
    client: "Meridian Retail",
    sector: "Retail",
    metric: "68% of tickets deflected",
    category: "demo",
    interactive: true,
    summary:
      "Ask it anything a customer would. It answers from a knowledge base, escalates when unsure, and logs the lead.",
    problem:
      "Support volume grew faster than headcount. Agents spent the first minutes of every ticket re-finding policy answers that already lived in scattered docs.",
    built:
      "A retrieval-backed support agent with escalation to humans, lead capture on unresolved intents, and an evaluation set so answer quality doesn't silently drift. The same build powers the live demo on this site.",
    results: [
      { value: "68%", label: "Tickets deflected" },
      { value: "<30s", label: "Median first response" },
      { value: "1 team", label: "Knowledge owners, not a bot farm" },
    ],
    stack: ["Next.js", "Gemini", "pgvector", "PostgreSQL", "Resend"],
    quote:
      "The AI agent handles two-thirds of what used to reach a person, and it escalates the rest with the context already attached.",
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
    interactive: false,
    summary:
      "Dispatch, routing and proof-of-work for 300 technicians across four regions.",
    problem:
      "Dispatchers built daily schedules by hand. Technicians worked from paper job packs. Proof of completion reached billing days later — and exceptions vanished into chat threads.",
    built:
      "A web dispatch console and mobile field app: skills-aware assignment, live job status, photo proof-of-work, and a same-day feed into invoicing. Regional managers see capacity without asking for a Friday export.",
    results: [
      { value: "41%", label: "Faster dispatch" },
      { value: "300", label: "Technicians live in 14 weeks" },
      { value: "Same day", label: "Proof into billing" },
    ],
    stack: ["Next.js", "React Native", "Node.js", "PostgreSQL", "Redis"],
    quote:
      "Three hundred technicians moved off paper in fourteen weeks. Nothing broke, and nobody needed a training week.",
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
    interactive: false,
    summary:
      "Orders from chat and email channels flow straight into stock, invoicing and delivery tracking.",
    problem:
      "Wholesale orders arrived in chat threads and inboxes. Staff re-typed them into inventory. Every busy week, lines were missed in the scroll — and stock truth disagreed with what sales had promised.",
    built:
      "An intake pipeline that turns channel messages into structured orders, checks stock, raises invoices and pushes delivery status back to the customer. Exceptions land in a queue humans clear — not a silent miss.",
    results: [
      { value: "0", label: "Orders lost in six months" },
      { value: "9 wks", label: "Discovery to production" },
      { value: "1 source", label: "Of stock truth" },
    ],
    stack: ["Node.js", "PostgreSQL", "workflow engine", "Next.js"],
    quote:
      "We used to lose orders in the chat scroll every single day. Since launch, not one.",
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
    category: "demo",
    interactive: true,
    summary:
      "Click through seeded orders, stock levels and fulfilment states — a live ops console, not a screenshot.",
    problem:
      "Ops ran the business from three exports and a shared sheet. By the time stock was wrong, sales had already oversold.",
    built:
      "A role-aware operations dashboard: orders, inventory and exceptions on one surface, with drill-downs that match how warehouse and sales actually argue about numbers. Seeded demo data so visitors can click without credentials.",
    results: [
      { value: "1", label: "Ops surface instead of three exports" },
      { value: "Live", label: "Exception queue" },
      { value: "Demo", label: "Clickable on this site" },
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
    category: "demo",
    interactive: true,
    summary:
      "Upload an invoice and watch structured fields populate — extraction with review, not blind trust.",
    problem:
      "AP staff re-keyed invoices into the ledger. Error rates climbed with volume, and month-end became a reconciliation festival.",
    built:
      "An extraction pipeline with confidence scores, human review for low-confidence fields, and a clean export into the existing finance system. The interactive demo uses the same UX pattern with sample documents.",
    results: [
      { value: "Seconds", label: "To structured fields" },
      { value: "Review", label: "Gate on low confidence" },
      { value: "API", label: "Into existing finance tools" },
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
    interactive: false,
    summary:
      "Structured intake, triage queues and visit context that travels with the patient — not a paper pack.",
    problem:
      "Front desk collected the same history on paper every visit. Clinical staff rebuilt context from memory and incomplete notes.",
    built:
      "A web intake flow with role-based triage boards, visit summaries and audit logs. Designed so temporary staff can run it without a week of training.",
    results: [
      { value: "50%", label: "Faster intake" },
      { value: "0 paper", label: "Packs at front desk" },
      { value: "Audit", label: "Trail on every access" },
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
    interactive: false,
    summary:
      "Brief to draft to video assembly to scheduled publish — with brand gates humans still own.",
    problem:
      "A small editorial team spent most of the week on assembly and scheduling. Draft quality varied; publishing slipped whenever someone was out.",
    built:
      "An automated pipeline: brief templates, brand-constrained drafting, human approval, media assembly and multi-channel scheduling. Analytics feed the next brief instead of dying in a spreadsheet.",
    results: [
      { value: "3×", label: "Publish volume" },
      { value: "Same", label: "Review headcount" },
      { value: "Gates", label: "On every public asset" },
    ],
    stack: ["Node.js", "LLM pipelines", "CMS APIs", "schedulers"],
    relatedServices: ["content-automation", "ai-automation"],
    timeline: "11 weeks",
  },
];

export function getPortfolioItem(slug: string): PortfolioItem | undefined {
  return portfolio.find((p) => p.slug === slug);
}
