/**
 * ZAC — ZACSOL's AI product brand.
 * One assistant, two use-case modes: Consultant (solution) and Estimator (cost).
 */
export const zac = {
  name: "ZAC",
  /** Short mark used in chat avatars */
  avatar: "ZAC",
  tagline: "ZACSOL's AI assistant",

  consultant: {
    /** Product name — solution discovery / roadmap */
    name: "ZAC Consultant",
    /** Console chrome */
    consoleTitle: "ZAC · Consultant",
    /** Live status badge */
    badge: "ZAC Consultant · live now",
    /** Primary CTAs */
    cta: "Ask ZAC",
    ctaLong: "Start with ZAC",
    ctaTry: "Try ZAC — free",
    /** Nav / sheet */
    navLabel: "ZAC Consultant",
    /** Accessibility */
    ariaChat: "Conversation with ZAC Consultant",
    ariaFloat: "Ask ZAC Consultant",
    ariaInput: "Message ZAC",
    ariaLoading: "Loading ZAC Consultant",
    ariaTyping: "ZAC is typing",
    /** Opening line in chat */
    greeting:
      "I'm ZAC — ZACSOL's solution consultant. Tell me what's slowing your business down, or the product you're trying to build — plain language is fine. I'll ask a few questions, then put together a solution blueprint with scope, timeline and cost.",
    /** Meta / SEO */
    pageTitle: "ZAC Consultant",
    pageDescription:
      "Describe your business problem. ZAC recommends a solution, features, timeline and cost range — free, in about three minutes.",
  },

  estimator: {
    /** Product name — cost & effort scoping */
    name: "ZAC Estimator",
    consoleTitle: "ZAC · Estimator",
    consoleTitleChat: "ZAC · Estimator · chat",
    consoleTitleResult: "ZAC · Estimator · result",
    consoleTitlePricing: "ZAC · Estimator · pricing",
    cta: "Estimate with ZAC",
    ctaShort: "Estimate my project",
    navLabel: "ZAC Estimator",
    ariaChat: "Conversation with ZAC Estimator",
    pageTitle: "ZAC Estimator",
    pageDescription:
      "Describe your project in plain language. ZAC returns a real cost range, a breakdown of where the money goes, and adjustable assumptions — free, no email required.",
    toolCardTitle: "ZAC Estimator",
    toolCardBody:
      "Five questions on scope, platform and timeline. A cost band with assumptions written out so you can challenge them.",
    greeting:
      "I'm ZAC — ZACSOL's cost estimator. I price software builds for a living. Tell me what you want built and I'll give you a real cost range — what drives it, where it could go over, and what's included. Completely free, no email, nothing held back.",
    ariaTyping: "ZAC is typing",
  },
} as const;

export type ZacBrand = typeof zac;
