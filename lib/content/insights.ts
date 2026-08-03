import type { Insight } from "./types";

export const insights: Insight[] = [
  {
    slug: "value-before-the-ask",
    title: "Value before the ask: why we show the roadmap first",
    excerpt:
      "Most agency sites hide the useful bit behind a form. We inverted that — and it changed who books a call.",
    category: "Product",
    date: "2026-06-12",
    author: "S. Zahid",
    readingTime: "6 min",
    body: [
      "The default pattern on software agency sites is familiar: describe your problem, leave your details, wait for a sales call. The visitor does unpaid work and gets nothing until a human decides they're qualified.",
      "We flipped it. ZAC Consultant on this site returns a recommended solution, features, timeline and cost band **on screen** before we ask for a name. Contact details unlock the PDF — not the insight.",
      "That isn't generosity theatre. It's qualification. People who finish a useful artefact and still want to talk are better leads than people who filled a form to 'see pricing'.",
      "### What we measure",
      "The number that matters is the drop between blueprint viewed and gate submitted. If that gap is huge, the ask is too expensive relative to the value just shown. If it's tiny, the gate is priced right.",
      "### What we refuse to do",
      "We won't blur the result before you've seen it. We won't require a call to learn the recommendation. And we won't pretend a chatbot widget is a product.",
      "If you're building your own tools for buyers, start here: give away the useful middle of the sales conversation. Keep the document delivery and the human time for people who already know what they're buying.",
    ],
    related: ["scope-you-can-hold", "when-not-to-build-ai"],
  },
  {
    slug: "scope-you-can-hold",
    title: "Scope you can hold us to",
    excerpt:
      "Fixed-scope phases and a written change protocol beat 'agile' that quietly eats the date.",
    category: "Delivery",
    date: "2026-05-28",
    author: "A. Rahman",
    readingTime: "5 min",
    body: [
      "Scope drift rarely arrives as a dramatic new epic. It arrives as a sequence of small yeses — each reasonable, none re-priced, until the date has moved and nobody owns the decision.",
      "Our fix is boring on purpose. Discovery ends in a fixed-scope document. Changes go through a written protocol: what changes, what it costs, what moves. You approve before we start.",
      "That sounds slower than verbal 'we'll squeeze it in'. It isn't. Verbal squeeze-ins are how budgets leak for months.",
      "### What you get every Friday",
      "A URL you can click. Status is something you use, not a deck you're told. If the scope changed mid-week, the change record is already in the channel — not discovered at the steering meeting.",
      "### What we won't pretend",
      "Agile without a change protocol is just unpaid overtime with better vocabulary. Hold vendors — including us — to written estimates after discovery. If they won't, that's the signal.",
    ],
    related: ["value-before-the-ask", "handover-from-day-one"],
  },
  {
    slug: "when-not-to-build-ai",
    title: "When not to build the AI feature",
    excerpt:
      "Most AI ideas fail a simple test: name the hour or rupee saved. If you can't, don't write the integration.",
    category: "AI",
    date: "2026-04-15",
    author: "S. Zahid",
    readingTime: "7 min",
    body: [
      "We build AI automation for a living. We also talk clients out of roughly half the AI features they arrive wanting.",
      "The test is short. What process costs measurable time or money today? What does 'good enough' look like for an automated answer? Who owns the knowledge when the model is wrong?",
      "If those three questions don't have owners, you're buying a demo — not a system.",
      "### Guardrails aren't optional",
      "Escalation paths, evaluation sets and cost caps belong in the first release. Shipping a chat box without them is how teams lose trust in week two and never recover.",
      "### Start with the leak",
      "Document re-keying, support deflection, triage — these survive scrutiny. 'Add AI to the homepage' usually doesn't. Our consultant is designed to route you toward the former.",
      "Bring the bottleneck, not the buzzword. We'll tell you if the model earns its keep.",
    ],
    related: ["value-before-the-ask", "scope-you-can-hold"],
  },
  {
    slug: "handover-from-day-one",
    title: "Handover from day one",
    excerpt:
      "Docs assembled the week you leave are fiction. Decision records written as you build are the real product.",
    category: "Delivery",
    date: "2026-03-03",
    author: "N. Farooq",
    readingTime: "4 min",
    body: [
      "Handover debt is the quiet killer after agency projects. The build works. The people who know why it works have left. Your team spends a quarter reconstructing intent from commit messages.",
      "We write decision records and runbooks as we build — not as a leaving present. Every Friday deploy includes what's new and what you need to know to operate it.",
      "### What 'clean handover' means",
      "Code ownership, infra access, a recorded walkthrough, and docs that match the code that shipped — not the code that was imagined in week two.",
      "Thirty days of included support after launch. Then a retainer or a clean exit. Either way, you're not locked in.",
      "If a vendor can't show you the runbook mid-project, believe them when they say handover will be fine at the end.",
    ],
    related: ["scope-you-can-hold", "when-not-to-build-ai"],
  },
];

export function getInsight(slug: string): Insight | undefined {
  return insights.find((i) => i.slug === slug);
}
