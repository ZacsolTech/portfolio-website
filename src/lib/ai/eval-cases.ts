/**
 * Evaluation set (~20 representative inputs) for Sprint 4 quality checks.
 * Run: pnpm exec tsx scripts/eval-consultant.ts
 */
export type EvalCase = {
  id: string;
  seed: string;
  answers: {
    industry: string;
    current: string;
    scale: string;
    timeline: string;
  };
  /** Expected rules-engine archetype id or service slug hint */
  expectServiceSlug?: string;
  expectArchetype?: string;
};

export const CONSULTANT_EVAL_CASES: EvalCase[] = [
  {
    id: "lost-orders-chat",
    seed: "Orders come in on WhatsApp and we lose half of them in notebooks.",
    answers: {
      industry: "Retail / e-commerce",
      current: "Entirely manual / paper",
      scale: "10–50 users",
      timeline: "Within 3 months",
    },
    expectArchetype: "ops",
    expectServiceSlug: "business-process-automation",
  },
  {
    id: "manual-data-entry",
    seed: "We copy-paste data between our ERP and a spreadsheet every night.",
    answers: {
      industry: "Manufacturing",
      current: "Spreadsheets",
      scale: "50–250 users",
      timeline: "3–6 months",
    },
    expectArchetype: "entry",
  },
  {
    id: "app-idea",
    seed: "I have an app idea for field technicians on iOS and Android.",
    answers: {
      industry: "Logistics",
      current: "Entirely manual / paper",
      scale: "10–50 users",
      timeline: "As soon as possible",
    },
    expectArchetype: "mobile",
    expectServiceSlug: "mobile-app-development",
  },
  {
    id: "support-tickets",
    seed: "Support tickets pile up and the same FAQ answers get typed all day.",
    answers: {
      industry: "Professional services",
      current: "An off-the-shelf tool that half-fits",
      scale: "50–250 users",
      timeline: "Within 3 months",
    },
    expectArchetype: "support",
    expectServiceSlug: "ai-automation",
  },
  {
    id: "no-insight",
    seed: "We have lots of data but no trustworthy forecast or executive dashboard.",
    answers: {
      industry: "Retail / e-commerce",
      current: "Spreadsheets",
      scale: "250+ users",
      timeline: "3–6 months",
    },
    expectArchetype: "data",
    expectServiceSlug: "data-science",
  },
  {
    id: "odd-workflow",
    seed: "Our underwriting workflow is unique with edge cases no off-the-shelf product covers.",
    answers: {
      industry: "Fintech",
      current: "An off-the-shelf tool that half-fits",
      scale: "50–250 users",
      timeline: "3–6 months",
    },
    expectArchetype: "custom",
  },
  {
    id: "saas-dashboard",
    seed: "We're building a SaaS dashboard for multi-tenant reporting.",
    answers: {
      industry: "Other",
      current: "Custom software that needs replacing",
      scale: "10–50 users",
      timeline: "As soon as possible",
    },
    expectArchetype: "web",
  },
  {
    id: "bi-reports",
    seed: "Leadership wants BI analytics and trend dashboards instead of monthly Excel packs.",
    answers: {
      industry: "Manufacturing",
      current: "Spreadsheets",
      scale: "250+ users",
      timeline: "Within 3 months",
    },
    expectArchetype: "data",
  },
  {
    id: "forecast-demand",
    seed: "We need demand forecasting so we stop over-ordering inventory.",
    answers: {
      industry: "Retail / e-commerce",
      current: "Spreadsheets",
      scale: "250+ users",
      timeline: "Within 3 months",
    },
    expectArchetype: "data",
  },
  {
    id: "faq-answer",
    seed: "Customers ask the same FAQ questions on chat; we need a chatbot with human escalation.",
    answers: {
      industry: "Retail / e-commerce",
      current: "Spreadsheets",
      scale: "10–50 users",
      timeline: "Still exploring",
    },
    expectArchetype: "support",
  },
  {
    id: "customer-portal",
    seed: "We need a client web portal where customers can book and manage jobs.",
    answers: {
      industry: "Professional services",
      current: "Custom software that needs replacing",
      scale: "10–50 users",
      timeline: "Within 3 months",
    },
    expectArchetype: "web",
  },
  {
    id: "content-pipeline",
    seed: "Our marketing team needs a content automation pipeline for drafting and publishing.",
    answers: {
      industry: "Other",
      current: "Spreadsheets",
      scale: "Under 10 users",
      timeline: "Still exploring",
    },
    expectArchetype: "content",
  },
  {
    id: "chatbot-helpdesk",
    seed: "Build a chatbot for our helpdesk that escalates hard cases to humans.",
    answers: {
      industry: "Education",
      current: "Spreadsheets",
      scale: "50–250 users",
      timeline: "3–6 months",
    },
    expectArchetype: "support",
  },
  {
    id: "enquiries-lost",
    seed: "Enquiries get lost between WhatsApp, email and a paper log.",
    answers: {
      industry: "Healthcare",
      current: "Entirely manual / paper",
      scale: "10–50 users",
      timeline: "As soon as possible",
    },
    expectArchetype: "ops",
  },
  {
    id: "two-systems",
    seed: "Staff re-enter the same customer data into two systems that don't sync.",
    answers: {
      industry: "Fintech",
      current: "An off-the-shelf tool that half-fits",
      scale: "50–250 users",
      timeline: "Within 3 months",
    },
    expectArchetype: "entry",
  },
  {
    id: "play-store",
    seed: "We want a Play Store and App Store MVP for consumer bookings.",
    answers: {
      industry: "Retail / e-commerce",
      current: "Entirely manual / paper",
      scale: "Under 10 users",
      timeline: "Still exploring",
    },
    expectArchetype: "mobile",
  },
  {
    id: "marketplace",
    seed: "Need a marketplace website with seller onboarding and payments.",
    answers: {
      industry: "Retail / e-commerce",
      current: "An off-the-shelf tool that half-fits",
      scale: "50–250 users",
      timeline: "3–6 months",
    },
    expectArchetype: "web",
  },
  {
    id: "lead-followup",
    seed: "Sales leads come from the website and nobody follows up consistently.",
    answers: {
      industry: "Professional services",
      current: "Entirely manual / paper",
      scale: "Under 10 users",
      timeline: "Within 3 months",
    },
    expectArchetype: "ops",
  },
  {
    id: "duplicate-records",
    seed: "Duplicate customer records across CRM and billing cause billing mistakes.",
    answers: {
      industry: "Fintech",
      current: "Custom software that needs replacing",
      scale: "50–250 users",
      timeline: "As soon as possible",
    },
    expectArchetype: "entry",
  },
  {
    id: "vague-software",
    seed: "We need software to make the business run better somehow.",
    answers: {
      industry: "Other",
      current: "Entirely manual / paper",
      scale: "Under 10 users",
      timeline: "Still exploring",
    },
    expectArchetype: "custom",
  },
];
