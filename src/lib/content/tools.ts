import type { FaqItem, ProcessStep } from "./types";

/**
 * Copy for the two ZAC tool landing pages.
 *
 * `/consultant` and `/tools/estimator` are immersive chat apps — the
 * conversation owns the viewport, the marketing chrome is hidden, and the only
 * text in the HTML is a screen-reader heading. That is the right product
 * decision and a hopeless search one: there is nothing on the page for a
 * crawler or an answer engine to read.
 *
 * So the ranking asset lives here instead. `/ai-consultant` and
 * `/software-cost-calculator` are ordinary indexable pages that explain the
 * tool properly, answer the questions people actually type, and hand the
 * visitor to the app. The apps stay exactly as they are.
 *
 * Everything below is written to be true. Nothing here should say a thing the
 * tool would contradict — the cost figures on the estimator page are computed
 * from the pricing engine rather than typed in, for that reason.
 */

export type ToolBenefit = {
  title: string;
  body: string;
};

export type ToolComparisonRow = {
  question: string;
  consultant: string;
  estimator: string;
};

/* --------------------------------------------------------------------------
   ZAC Consultant — /ai-consultant
   -------------------------------------------------------------------------- */

export const consultantLanding = {
  /* Titles are sized so `<title> — ZACSOL` still fits the ~60-character SERP
     line. A truncated title loses the keyword at the end, which is usually the
     one that earned the impression. */
  metaTitle: "Free AI Consultant for Software & Automation",
  metaDescription:
    "Describe a business problem in plain language and get a solution recommendation, a visual prototype, a phased timeline and an honest cost band in about three minutes. Free, no signup to see the result.",
  h1Lead: "A free AI consultant that scopes your",
  h1Accent: "software problem",
  lead: "ZAC Consultant is a scoping tool, not a chatbot demo. Tell it what is slowing the business down and it returns the thing a discovery call is supposed to produce: a recommended solution, the features that matter first, a phased timeline and a cost band you can take to a budget conversation.",

  keywords: [
    "AI consultant",
    "free AI consultant",
    "AI software consultant",
    "AI automation consultant",
    "software solution consultant",
    "AI project roadmap generator",
    "digital transformation consultant",
    "AI consultant online free",
    "ZAC Consultant",
  ],

  /** Answers "what do I walk away with", which is the query behind the query. */
  deliverables: [
    {
      title: "A named solution, not a menu",
      body: "One recommendation out of eight service lines, with the reasoning for that one over the alternatives. If the honest answer is that software is not your problem, it says so.",
    },
    {
      title: "A visual prototype",
      body: "A generated mock of what the solution looks like — site pages, app screens or an automation flow — so the scope is something you can see and argue with rather than a paragraph of nouns.",
    },
    {
      title: "Features in priority order",
      body: "What ships in phase one, what waits, and which pieces are genuinely optional. This is the part that stops a build doubling in size between the quote and the kickoff.",
    },
    {
      title: "A phased timeline",
      body: "Calendar weeks per phase with the gates between them, based on how long this work actually takes rather than how quickly you would like it to be finished.",
    },
    {
      title: "An honest cost band",
      body: "A range with the assumptions written next to it, so you can challenge the assumptions instead of arguing with a single number that came from nowhere.",
    },
    {
      title: "The whole thing as a PDF",
      body: "Emailed as a forwardable document once you leave a name and address — at the end, after you have already seen the result on screen, and only to send it.",
    },
  ] satisfies ToolBenefit[],

  /** Ranked for "when should I use this" long-tail queries. */
  useCases: [
    "You know the symptom but not the fix — orders getting lost, staff re-keying data, a process that only one person understands.",
    "You need a budget number before you can ask for budget, and nobody will give you one without a sales process first.",
    "You are comparing build-versus-buy and want a neutral read on what building would actually involve.",
    "You have a quote from another agency and want a second opinion on the scope behind it.",
    "You are writing an RFP and need the requirements section to be specific enough to compare responses.",
    "You want to know whether AI is genuinely the right tool for a problem, or whether a boring integration would fix it for a tenth of the cost.",
  ],

  /** E-E-A-T: stating the limits is what separates a tool from a lead magnet. */
  limits: [
    {
      title: "It is an estimate, not a contract",
      body: "The cost band is an informed range from a model of how we price work. A fixed price comes after a discovery sprint, where someone senior has seen your systems.",
    },
    {
      title: "It only knows what you tell it",
      body: "It cannot see your codebase, your data volumes or your compliance obligations. Vague input produces a vague roadmap — the more specific the problem, the more useful the output.",
    },
    {
      title: "It recommends our service lines",
      body: "ZAC scopes work the way we deliver it. It is a good second opinion, not an independent one, and we would rather say that than pretend otherwise.",
    },
  ] satisfies ToolBenefit[],

  faqs: [
    {
      q: "Is the AI consultant actually free?",
      a: "Yes. The recommendation, prototype, feature list, timeline and cost band all appear on screen before anything is asked of you. Contact details are only requested at the end, and only so the full roadmap can be emailed to you as a PDF.",
    },
    {
      q: "How long does it take?",
      a: "About three minutes. It asks four or five discovery questions — who the solution is for, how you cope today, what has to ship first and by when — then builds the roadmap while you watch.",
    },
    {
      q: "Do I have to give an email address to see my result?",
      a: "No. The result is shown in full on screen. An email address is only needed if you want the PDF version sent to you, which is a separate step you can skip.",
    },
    {
      q: "What happens to the information I type in?",
      a: "It is used to generate your roadmap. If you submit contact details it is also stored in our CRM so a senior engineer can pick up the thread. We do not sell or share it, and you can ask us to delete it at any time.",
    },
    {
      q: "How accurate is the cost band?",
      a: "It is produced by the same pricing model we use internally: effort in person-weeks at a blended rate, plus the third-party subscriptions and usage the solution would need. It is accurate enough to plan a budget around and not accurate enough to sign. A one-to-two week discovery sprint is what turns it into a fixed number.",
    },
    {
      q: "Can it scope work on a system that already exists?",
      a: "Yes, and it is a large share of what we do. Describe what is in place and what it fails to do. For anything substantial the recommendation will usually include an audit phase first, because nobody can price a rescue honestly without reading the code.",
    },
    {
      q: "Is this different from just asking ChatGPT?",
      a: "A general model will write you a plausible project plan. This one is wired to a fixed catalogue of what we build, a pricing engine that produces the same number for the same inputs, and guardrails that stop it inventing a technology stack. The prototype and the cost band come from those, not from the model's imagination.",
    },
    {
      q: "Will this put me into a sales sequence?",
      a: "No. If you leave an email you get the roadmap and a booking link. There is no drip campaign attached to using the tool, and you can unsubscribe from anything you did opt into in one click.",
    },
    {
      q: "What if I would rather talk to a person?",
      a: "Book a thirty-minute consultation with a senior engineer, or send a brief through the contact form. A human replies within one business day either way.",
    },
  ] satisfies FaqItem[],
};

/* --------------------------------------------------------------------------
   ZAC Estimator — /software-cost-calculator
   -------------------------------------------------------------------------- */

export const estimatorLanding = {
  metaTitle: "Free Software Development Cost Calculator",
  metaDescription:
    "Work out what your software project should cost. A free calculator that returns a real price range, a line-by-line breakdown of where the money goes, and the assumptions behind it — no email required.",
  h1Lead: "Software development",
  h1Accent: "cost calculator",
  lead: "Describe what you want built in plain language and get a costed range back in about two minutes — with the effort behind every line, the third-party subscriptions the thing will actually need, and levers you can pull to see what changes the number. No email, no gate, nothing held back.",

  keywords: [
    "software development cost calculator",
    "app development cost estimator",
    "how much does it cost to build an app",
    "software project cost estimate",
    "web development cost calculator",
    "custom software pricing calculator",
    "AI project cost estimate",
    "free software quote calculator",
    "ZAC Estimator",
  ],

  /**
   * The cost drivers, in the same order the pricing engine applies them.
   * Percentages are the engine's real multipliers — see lib/estimator/pricing.
   */
  drivers: [
    {
      title: "What kind of product it is",
      body: "The single biggest factor. A marketing site and a multi-tenant platform are not the same job with a different number of pages — they carry roughly three times the engineering between them before anything else is decided.",
    },
    {
      title: "How much of it you build now",
      body: "An MVP scoped to the smallest thing that works lands near two thirds of a full product. Adding to a system that already exists is cheaper again; rebuilding one is about fifteen per cent dearer than greenfield, because you inherit its edge cases before you delete them.",
    },
    {
      title: "Web, mobile, or both",
      body: "Web and mobile together is not double — shared services and one backend absorb a lot of it — but it is close to a forty-five per cent premium over either alone. Internal-only tools come in slightly under public ones: fewer browsers, fewer states, no marketing surface.",
    },
    {
      title: "How many people will use it",
      body: "Scale changes engineering gently and running costs steeply. Ten times the users is nowhere near ten times the build, but it is roughly ten times the API calls — which is why the estimate separates build cost from monthly running cost instead of blending them into one misleading figure.",
    },
    {
      title: "How fast you need it",
      body: "A compressed schedule costs about eighteen per cent more for the same delivered work, because parallelising a project buys calendar time with coordination overhead. A relaxed timeline saves a little. Neither changes what gets built.",
    },
    {
      title: "What it has to run on top of",
      body: "Model APIs, transactional email, hosting, error tracking, payment processing, a vector store. These are priced at list, monthly, dated, and shown as their own line — because a build quote that ignores them is a build quote that comes back in month two.",
    },
  ] satisfies ToolBenefit[],

  /** Sets expectations before someone reads a range and mis-reads it. */
  included: [
    "Engineering effort across every workstream the plan needs, in person-weeks",
    "Product and interface design, sized to how much of it already exists",
    "Testing, deployment pipeline and the handover documentation",
    "Third-party subscriptions and metered usage, at list price, dated",
    "A calendar duration derived separately from effort, because adding people shortens a project sub-linearly",
  ],

  excluded: [
    "Your own team's time reviewing, deciding and supplying content",
    "Content, copywriting and photography unless the plan names them",
    "Licences you already hold, and any enterprise pricing you have negotiated",
    "Ongoing feature work after handover, which is quoted per phase",
    "Taxes and anything that depends on where you are incorporated",
  ],

  /** How the number is produced — the credibility section. */
  method: [
    {
      title: "The model plans, it never multiplies",
      body: "ZAC decides what work a project needs and which products it will pay for. Every dollar figure after that is produced by a deterministic pricing engine at a fixed blended rate.",
    },
    {
      title: "Effort is measured in person-weeks",
      body: "Each workstream in the plan carries an effort figure. Money is effort times rate — one multiplication, in one place, that you can check.",
    },
    {
      title: "Every plan is checked against a baseline",
      body: "Baseline effort per project type exists as a sanity anchor, so a model having a bad day cannot quote a six-month platform as three weeks or a landing page as a year.",
    },
    {
      title: "The same input always prices the same",
      body: "No randomness in the arithmetic. If you run the same project twice you get the same number, and if you challenge a line we can walk you through where it came from.",
    },
  ] satisfies ProcessStep[],

  faqs: [
    {
      q: "How much does it cost to build a custom software application?",
      a: "For the work we take on, most projects land between roughly fifteen and eighty thousand US dollars for the first release, depending on the type of product and how much of it ships in phase one. A marketing site sits at the bottom of that range, a mobile app or a multi-tenant platform at the top. The calculator on this page gives you a range for your specific project rather than that spread.",
    },
    {
      q: "How much does it cost to build a mobile app?",
      a: "A single-platform mobile app scoped as an MVP is typically in the low fifties of thousands of dollars; a full product across iOS and Android is meaningfully more, because two stores, two review processes and two sets of device quirks all have to be paid for. Shipping web and mobile together adds around forty-five per cent over either on its own.",
    },
    {
      q: "Is this calculator free, and do I need to give an email address?",
      a: "It is free and there is no email gate. You see the range, the breakdown and the assumptions on screen. Nothing is held back behind a form.",
    },
    {
      q: "How accurate is an instant software cost estimate?",
      a: "Treat it as a planning range, not a quote. It is built from the same pricing model we use internally, so it is honest about what work a project contains — but it has not seen your systems, your data or your compliance obligations. A one-to-two week discovery sprint is what converts a range into a fixed price you can sign.",
    },
    {
      q: "Why do other agencies not publish prices?",
      a: "Because a single published number is either too high for the small version of a job or too low for the large one, and both cost them the enquiry. A range with its assumptions written out avoids that problem, and we would rather you knew whether we are in your budget before you spend an hour on a call finding out.",
    },
    {
      q: "Does the estimate include running costs?",
      a: "Yes, as a separate line. Model APIs, hosting, transactional email, error tracking and anything else the plan depends on are priced monthly at list price with the date those prices were checked, because build cost and run cost are different budgets and blending them hides the one that recurs.",
    },
    {
      q: "Can I change the assumptions?",
      a: "That is what the levers are for. Scope, platform, scale and timeline can each be adjusted after the first result and the number re-prices instantly, using exactly the same rate the server used. It is meant to be argued with.",
    },
    {
      q: "Do you charge hourly?",
      a: "No. Work is priced fixed per phase after discovery, or at a monthly rate for an embedded team. The estimator models effort in person-weeks internally because that is how software is actually sized, but you are never billed against a timesheet.",
    },
    {
      q: "What if my project is bigger than anything listed?",
      a: "Describe it anyway. The estimator prices from a plan rather than a lookup table, so it handles work that does not fit a category — and if it is genuinely out of range, it will say so instead of quoting you a number it cannot stand behind.",
    },
  ] satisfies FaqItem[],
};

/* --------------------------------------------------------------------------
   Shared
   -------------------------------------------------------------------------- */

/**
 * Consultant vs Estimator, on both pages.
 *
 * Two tools with adjacent names is a real source of confusion, and "which one
 * do I need" is a query in its own right. Answering it on the page keeps both
 * from cannibalising the other in search.
 */
export const toolComparison: ToolComparisonRow[] = [
  {
    question: "The question it answers",
    consultant: "What should we build, and why that?",
    estimator: "What will this cost, and where does the money go?",
  },
  {
    question: "What you bring",
    consultant: "A business problem, in plain language",
    estimator: "A rough idea of what you want built",
  },
  {
    question: "What you get back",
    consultant: "A solution recommendation, prototype, feature plan and timeline",
    estimator: "A cost range, a line-by-line breakdown and adjustable assumptions",
  },
  {
    question: "Includes a price",
    consultant: "Yes — a cost band at the end",
    estimator: "Yes — that is the whole output",
  },
  {
    question: "Includes a visual prototype",
    consultant: "Yes",
    estimator: "No",
  },
  {
    question: "Time it takes",
    consultant: "About three minutes",
    estimator: "About two minutes",
  },
  {
    question: "Email required",
    consultant: "Only to email the PDF",
    estimator: "Never",
  },
];
