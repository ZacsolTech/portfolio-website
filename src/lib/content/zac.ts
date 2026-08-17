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
      "I'm ZAC — ZACSOL's solution consultant. Tell me what you want to achieve, or what's slowing the business down — plain language is fine. I'll ask a few discovery questions, then put together a solution blueprint with a visual prototype, scope, timeline and cost.",
    /**
     * Starter prompts on the empty thread.
     *
     * Specific on purpose. A blank box asking someone to "describe your
     * problem" gets a one-line answer that scopes to nothing; four concrete
     * problems show the level of detail that actually produces a good
     * blueprint, and one of them is usually close enough to click.
     */
    starters: [
      "We take orders over WhatsApp and lose track of them",
      "My team re-types the same data into three systems",
      "I want an app our field engineers can use offline",
      "Our booking process is a phone call and a paper diary",
    ],
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
    /** Empty-thread starters — same job as consultant starters. */
    starters: [
      "A customer portal with login, invoices and support tickets",
      "An iOS and Android app for field technicians",
      "Rebuild our WordPress site as a modern web app",
      "An internal dashboard that pulls from three existing tools",
    ],
    ariaTyping: "ZAC is typing",
  },
} as const;

export type ZacBrand = typeof zac;
