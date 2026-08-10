import type { Industry } from "./types";

export const industries: Industry[] = [
  {
    slug: "retail-ecommerce",
    name: "Retail & e-commerce",
    problemOneLiner: "Orders, stock, storefronts",
    icon: "Store",
    problems: [
      "Orders arrive on more channels than inventory can keep up with — and stock truth lives in three places.",
      "Promotions and pricing change faster than the storefront can ship without breaking checkout.",
      "Support and returns eat margin because context never travels with the ticket.",
      "Warehouse and store teams work from different numbers and find out at month-end.",
    ],
    services: [
      "web-development",
      "ai-automation",
      "business-process-automation",
      "data-science",
      "mobile-app-development",
    ],
    compliance:
      "PCI-aware payment flows, GST/VAT-ready invoicing where you sell, and clear consent for marketing and data retention. We integrate with the payment and fulfilment providers you already use rather than inventing a parallel stack.",
    seo: {
      description:
        "Retail and e-commerce software — order capture, inventory truth, storefronts and automation built for multi-channel ops.",
    },
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    problemOneLiner: "Intake, records, triage",
    icon: "HeartPulse",
    problems: [
      "Intake forms and phone notes never become structured records the clinical team can trust.",
      "Triage and scheduling still depend on one person who knows every exception.",
      "Patients repeat their story because systems don't share context across visits.",
      "Reporting for compliance arrives as a scramble before each audit.",
    ],
    services: [
      "custom-software",
      "web-development",
      "ai-automation",
      "business-process-automation",
      "ui-ux-design",
    ],
    compliance:
      "HIPAA-minded architecture where US data applies; local privacy and health-data rules elsewhere. Role-based access, audit logs and encryption in transit and at rest are defaults — not add-ons. We don't put PHI into third-party models without a written data path.",
    seo: {
      description:
        "Healthcare software for intake, records and triage — privacy-first architecture with audit trails and clean handover.",
    },
  },
  {
    slug: "fintech",
    name: "Fintech",
    problemOneLiner: "Payments, billing, KYC",
    icon: "CreditCard",
    problems: [
      "KYC and onboarding drop-offs happen because the flow was designed for the policy, not the customer.",
      "Billing exceptions and reconciliations still live in spreadsheets after every release.",
      "Ledger and product systems disagree, and finance finds out in the close.",
      "Fraud and risk signals exist but never reach the operator in time to act.",
    ],
    services: [
      "custom-software",
      "web-development",
      "data-science",
      "ai-automation",
      "mobile-app-development",
    ],
    compliance:
      "PCI DSS scope reduction where possible, KYC/AML workflow support, and audit-ready event logs. We design for the regulators you name in discovery — not a generic 'fintech-ready' checklist.",
    seo: {
      description:
        "Fintech product engineering — payments, billing, KYC and risk surfaces with auditability built in.",
    },
  },
  {
    slug: "logistics",
    name: "Logistics",
    problemOneLiner: "Dispatch, routing, tracking",
    icon: "Truck",
    problems: [
      "Dispatchers still build routes by hand while technicians wait for the next job.",
      "Proof of work and exceptions never make it back to billing the same day.",
      "Customers ask 'where is it?' and the answer depends on who picks up the phone.",
      "Regional teams invent their own process because the platform doesn't fit the field.",
    ],
    services: [
      "custom-software",
      "mobile-app-development",
      "web-development",
      "data-science",
      "business-process-automation",
    ],
    compliance:
      "Field data retention, driver privacy and customer notification rules vary by market. We build tracking and proof-of-work with consent and retention windows you can defend — plus integrations to the carriers and ERPs you already run.",
    seo: {
      description:
        "Logistics platforms for dispatch, routing and field proof-of-work — built for technicians and ops, not demos.",
    },
  },
  {
    slug: "real-estate",
    name: "Real estate",
    problemOneLiner: "Listings, CRM, site visits",
    icon: "Building2",
    problems: [
      "Listings, leads and site visits live in different tools — and the deal status is whoever last updated a sheet.",
      "Agents chase the same lead twice because ownership isn't enforced in the system.",
      "Document packs for closing still assemble manually under deadline pressure.",
      "Owners can't see pipeline health without asking for a Friday export.",
    ],
    services: [
      "web-development",
      "custom-software",
      "mobile-app-development",
      "ai-automation",
      "business-process-automation",
    ],
    compliance:
      "Property and personal-data rules differ by jurisdiction. We keep lead consent, document storage and access logs explicit — and integrate with the MLS/CRM tools your market already requires.",
    seo: {
      description:
        "Real estate CRM, listings and visit workflows — one pipeline from enquiry to close.",
    },
  },
  {
    slug: "education",
    name: "Education",
    problemOneLiner: "LMS, admissions, assessment",
    icon: "GraduationCap",
    problems: [
      "Admissions data never reaches the LMS cleanly, so every term starts with a cleanup week.",
      "Assessment and attendance reporting is a spreadsheet ritual for academic staff.",
      "Learners bounce between portals that don't share progress or identity.",
      "Content updates take a release cycle instead of an editorial change.",
    ],
    services: [
      "web-development",
      "custom-software",
      "content-automation",
      "ui-ux-design",
      "data-science",
    ],
    compliance:
      "Student data protection (including FERPA-minded patterns where US institutions apply), accessibility for learning surfaces, and role separation between staff, learners and parents/guardians.",
    seo: {
      description:
        "Education platforms for admissions, LMS and assessment — accessible, integrated and operable by staff.",
    },
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    problemOneLiner: "Production, QC, maintenance",
    icon: "Factory",
    problems: [
      "Shop-floor status is verbal until someone updates the ERP hours later.",
      "QC fails are logged late, so scrap and rework hide until the weekly review.",
      "Maintenance is reactive because signals from machines never reach a planner.",
      "Suppliers and internal teams work from different BOMs after every engineering change.",
    ],
    services: [
      "custom-software",
      "data-science",
      "business-process-automation",
      "web-development",
      "ai-automation",
    ],
    compliance:
      "Traceability, batch/lot records and operator access control for regulated lines. We design for the quality system you already run — ISO and sector-specific schemes named in discovery.",
    seo: {
      description:
        "Manufacturing software for production visibility, QC and maintenance — traceable and shop-floor usable.",
    },
  },
  {
    slug: "professional-services",
    name: "Professional services",
    problemOneLiner: "Proposals, delivery, billing",
    icon: "Briefcase",
    problems: [
      "Proposals reinvent the wheel every time — and pricing lives in someone's head.",
      "Delivery status is a status call, not something the client can see.",
      "Time and expenses hit billing late, so cash follows the work by weeks.",
      "Knowledge from finished projects never becomes reusable assets for the next pitch.",
    ],
    services: [
      "web-development",
      "custom-software",
      "business-process-automation",
      "ai-automation",
      "content-automation",
    ],
    compliance:
      "Client confidentiality, document retention and engagement-letter workflows. We keep matter-level access control and exportable audit history so partnerships and regulated clients stay comfortable.",
    seo: {
      description:
        "Tools for professional services — proposals, delivery visibility and billing that match how firms actually work.",
    },
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug);
}
