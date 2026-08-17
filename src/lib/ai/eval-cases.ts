/**
 * Evaluation set (~20 representative inputs) for Sprint 4 quality checks.
 * Run: pnpm exec tsx scripts/eval-consultant.ts
 */
export type EvalCase = {
  id: string;
  seed: string;
  answers: {
    audience: string;
    today: string;
    v1: string;
    timing: string;
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
      audience: "Kitchen staff and the owner",
      today: "WhatsApp and paper notebooks",
      v1: "Capture orders, confirm them, stop losing them",
      timing: "Within 3 months",
    },
    expectArchetype: "ops",
    expectServiceSlug: "business-process-automation",
  },
  {
    id: "manual-data-entry",
    seed: "We copy-paste data between our ERP and a spreadsheet every night.",
    answers: {
      audience: "Ops team (~80 people)",
      today: "Spreadsheets plus ERP",
      v1: "Automated sync with an audit trail",
      timing: "3–6 months",
    },
    expectArchetype: "entry",
  },
  {
    id: "app-idea",
    seed: "I have an app idea for field technicians on iOS and Android.",
    answers: {
      audience: "Field technicians",
      today: "Paper job sheets and phone calls",
      v1: "Offline job list, checklists, photo capture",
      timing: "As soon as possible",
    },
    expectArchetype: "mobile",
    expectServiceSlug: "mobile-app-development",
  },
  {
    id: "support-tickets",
    seed: "Support tickets pile up and the same FAQ answers get typed all day.",
    answers: {
      audience: "Support agents and customers",
      today: "Helpdesk tool that half-fits",
      v1: "FAQ bot with human escalation",
      timing: "Within 3 months",
    },
    expectArchetype: "support",
    expectServiceSlug: "ai-automation",
  },
  {
    id: "no-insight",
    seed: "We have lots of data but no trustworthy forecast or executive dashboard.",
    answers: {
      audience: "Leadership and analysts",
      today: "Spreadsheets",
      v1: "Trusted dashboard and a basic forecast",
      timing: "3–6 months",
    },
    expectArchetype: "data",
    expectServiceSlug: "data-science",
  },
  {
    id: "odd-workflow",
    seed: "Our underwriting workflow is unique with edge cases no off-the-shelf product covers.",
    answers: {
      audience: "Underwriters and ops",
      today: "Off-the-shelf tool that half-fits",
      v1: "Core underwriting path with audit trail",
      timing: "3–6 months",
    },
    expectArchetype: "custom",
  },
  {
    id: "saas-dashboard",
    seed: "We're building a SaaS dashboard for multi-tenant reporting.",
    answers: {
      audience: "SaaS customers (tenants)",
      today: "Custom software that needs replacing",
      v1: "Multi-tenant login and core reports",
      timing: "As soon as possible",
    },
    expectArchetype: "web",
  },
  {
    id: "bi-reports",
    seed: "Leadership wants BI analytics and trend dashboards instead of monthly Excel packs.",
    answers: {
      audience: "Leadership",
      today: "Monthly Excel packs",
      v1: "Live trend dashboard",
      timing: "Within 3 months",
    },
    expectArchetype: "data",
  },
  {
    id: "forecast-demand",
    seed: "We need demand forecasting so we stop over-ordering inventory.",
    answers: {
      audience: "Merchandising team",
      today: "Spreadsheets",
      v1: "Demand forecast with reorder suggestions",
      timing: "Within 3 months",
    },
    expectArchetype: "data",
  },
  {
    id: "faq-answer",
    seed: "Customers ask the same FAQ questions on chat; we need a chatbot with human escalation.",
    answers: {
      audience: "Customers and support staff",
      today: "Manual chat replies",
      v1: "FAQ chatbot with escalation",
      timing: "Still exploring",
    },
    expectArchetype: "support",
  },
  {
    id: "customer-portal",
    seed: "We need a client web portal where customers can book and manage jobs.",
    answers: {
      audience: "Customers",
      today: "Custom software that needs replacing",
      v1: "Book, view, and manage jobs online",
      timing: "Within 3 months",
    },
    expectArchetype: "web",
  },
  {
    id: "content-pipeline",
    seed: "Our marketing team needs a content automation pipeline for drafting and publishing.",
    answers: {
      audience: "Marketing team",
      today: "Spreadsheets and manual drafts",
      v1: "Draft → review → publish pipeline",
      timing: "Still exploring",
    },
    expectArchetype: "content",
  },
  {
    id: "chatbot-helpdesk",
    seed: "Build a chatbot for our helpdesk that escalates hard cases to humans.",
    answers: {
      audience: "Students and helpdesk staff",
      today: "Spreadsheets and inbox",
      v1: "Chatbot with human handoff",
      timing: "3–6 months",
    },
    expectArchetype: "support",
  },
  {
    id: "enquiries-lost",
    seed: "Enquiries get lost between WhatsApp, email and a paper log.",
    answers: {
      audience: "Clinic front desk",
      today: "WhatsApp, email, paper log",
      v1: "Single enquiry queue with follow-up",
      timing: "As soon as possible",
    },
    expectArchetype: "ops",
  },
  {
    id: "two-systems",
    seed: "Staff re-enter the same customer data into two systems that don't sync.",
    answers: {
      audience: "Internal staff",
      today: "Two systems that don't sync",
      v1: "Bi-directional sync for customer records",
      timing: "Within 3 months",
    },
    expectArchetype: "entry",
  },
  {
    id: "play-store",
    seed: "We want a Play Store and App Store MVP for consumer bookings.",
    answers: {
      audience: "Consumers",
      today: "Phone bookings",
      v1: "Book and confirm on mobile",
      timing: "Still exploring",
    },
    expectArchetype: "mobile",
  },
  {
    id: "marketplace",
    seed: "Need a marketplace website with seller onboarding and payments.",
    answers: {
      audience: "Buyers and sellers",
      today: "Off-the-shelf storefront that half-fits",
      v1: "Seller onboarding, listings, payments",
      timing: "3–6 months",
    },
    expectArchetype: "web",
  },
  {
    id: "lead-followup",
    seed: "Sales leads come from the website and nobody follows up consistently.",
    answers: {
      audience: "Sales team",
      today: "Manual follow-up from inbox",
      v1: "Lead capture and follow-up reminders",
      timing: "Within 3 months",
    },
    expectArchetype: "ops",
  },
  {
    id: "duplicate-records",
    seed: "Duplicate customer records across CRM and billing cause billing mistakes.",
    answers: {
      audience: "Billing and CRM operators",
      today: "CRM and billing that don't match",
      v1: "Deduped customer master with sync",
      timing: "As soon as possible",
    },
    expectArchetype: "entry",
  },
  {
    id: "vague-software",
    seed: "We need software to make the business run better somehow.",
    answers: {
      audience: "Owner / small team",
      today: "Mostly manual",
      v1: "Clarify one core workflow and ship it",
      timing: "Still exploring",
    },
    expectArchetype: "custom",
  },
];
