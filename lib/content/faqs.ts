import type { SiteFaq } from "./types";

export const faqs: SiteFaq[] = [
  {
    q: "Is ZAC Consultant actually free?",
    a: "Yes, and you see the recommendation, feature list and timeline on screen before we ask for anything. Contact details are only needed to email you the full roadmap document.",
  },
  {
    q: "What happens to what I type into it?",
    a: "It's used to generate your roadmap and, if you submit contact details, stored in our CRM so a senior engineer can pick up the thread. We don't sell or share it, and you can ask us to delete it at any time.",
  },
  {
    q: "How long does a typical project take?",
    a: "Most builds land between 8 and 20 weeks. Discovery takes one to two weeks and ends with a fixed scope and estimate, so you know the real number before committing to the build.",
  },
  {
    q: "How do you price work?",
    a: "Fixed price per phase after discovery, or a monthly rate for an embedded team. No hourly billing, and no change without a written estimate you approve first.",
  },
  {
    q: "Can you take over an existing codebase?",
    a: "Yes — it's a large share of our work. We start with a one-week audit: what's salvageable, what's risk, what it costs to stabilise. You get that report whether or not you continue with us.",
  },
  {
    q: "Do you build AI features, or just use AI?",
    a: "We build them. ZAC on this site is our own work — retrieval, evaluation, guardrails and all. We scope every AI feature to a measurable saving before writing code, because most don't survive that test.",
  },
];
