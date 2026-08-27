import type { Insight } from "./types";

/**
 * Seed posts copied into Payload `posts` on first CMS setup.
 *
 * Live /blog reads published rows from the database. Edit and publish in
 * /admin → Posts. Keep this file only as the import source for
 * `pnpm seed:posts` (skips slugs that already exist).
 */

export const insights: Insight[] = [
  {
    slug: "prompt-engineering-2026",
    title: "Prompt engineering in 2026: the production version",
    excerpt:
      "A production prompt is a contract: role, task, constraints, examples and a schema — plus an eval set. Clever wording is not the job. Specifying the job is.",
    category: "AI",
    date: "2026-08-27",
    lastReviewed: "2026-08-27",
    author: "Shehryar Afzal",
    readingTime: "11 min",
    cover: {
      src: "/blog/prompt-engineering-2026/cover.png",
      alt: "Five stacked glass panels connected by lime light traces — a structured production prompt",
      caption:
        "A production prompt is a stack, not a sentence. Role, task, constraints, examples and output schema, in that order.",
    },
    answer:
      "In 2026, prompt engineering is specifying the job a model is allowed to do — not collecting clever phrases. A production prompt names a role, a task, hard constraints, a few real examples, and a required output shape. It sits next to retrieval and an evaluation set. If you cannot score the prompt against real cases, you do not have a prompt. You have a demo that will drift the first week a vendor ships a new model.",
    keywords: [
      "prompt engineering 2026",
      "how to write production prompts",
      "prompt vs RAG",
      "LLM system prompt best practices",
      "prompt evaluation",
    ],
    tools: ["consultant", "estimator"],
    related: [
      "rag-vs-fine-tuning-2026",
      "when-not-to-build-ai",
      "ai-agents-vs-chatbots-vs-workflows",
    ],
    body: [
      "Most “prompt engineering” posts are still teaching people to be polite to a chatbot. That was 2023. In production, the prompt is a small piece of software: versioned, tested, and cheap to change — which is why it is the right first lever, and a terrible last one. If the facts live in documents, [retrieve them](/blog/rag-vs-fine-tuning-2026). If the path is a graph you can draw, [automate it](/blog/ai-agents-vs-chatbots-vs-workflows). The prompt does the language in the middle.",
      "## The five parts of a prompt that survives production",
      "Every prompt we ship has the same skeleton. Skip a layer and the failure is predictable: no role means tone drift, no constraints means invented policy, no schema means the next system cannot parse the answer.",
      "![Five stacked layers of a production prompt: role, task, constraints, examples, output schema](/blog/prompt-engineering-2026/anatomy.png \"Role → task → constraints → examples → schema. If you only write the task, the other four get improvised — usually badly.\")",
      "| Layer | What it does | What breaks without it |",
      "| Role | Who is speaking, to whom | Tone and over-helpfulness |",
      "| Task | The one job this call is for | The model tries to do three jobs |",
      "| Constraints | What it must not do | Invented discounts, legal advice, PII in the reply |",
      "| Examples | Two or three real input → output pairs | Format drift on ugly real-world inputs |",
      "| Schema | The shape the next system can parse | A paragraph where your n8n node expected JSON |",
      "## Vague vs specified",
      "The difference is not length. A 40-line prompt that restates the product brochure is still vague. A 12-line prompt that names the audience, the forbidden claims, and the JSON keys is specified.",
      "![Chaotic tangle on the left versus a clean nested lattice on the right](/blog/prompt-engineering-2026/vague-vs-specified.png \"Left is “be a helpful assistant for our company.” Right is a job with a contract.\")",
      "Here is the vague version we still get in briefs:",
      "```\nYou are a helpful assistant for our company. Answer customer questions.\nBe friendly and professional. Use the knowledge you have.\n```",
      "Here is the same job, specified enough to put behind an API:",
      "```\nYou are a first-line support agent for a B2B inventory product.\nAudience: store managers, not engineers.\nTask: answer only from the retrieved passages. If the passages do not contain the answer, say so and offer to escalate.\nNever invent pricing, SLAs or feature availability.\nNever ask for passwords or payment card numbers.\nReturn JSON: { \"answer\": string, \"escalate\": boolean, \"citations\": string[] }\n```",
      "The second prompt is not “better writing”. It is a contract the rest of the stack can enforce. Citations come from retrieval. Escalation is a boolean your [n8n workflow](/blog/n8n-vs-zapier-vs-make-2026) can branch on. Pricing is forbidden because the model is not the price list.",
      "## Prompts sit in a stack — they are not the stack",
      "A prompt with no knowledge source will hallucinate politely. A prompt with no orchestration will dump a paragraph into Slack and call it automation. The picture we actually build looks like this: documents underneath, the prompt in the middle, the channel or agent on top.",
      "![Three floating layers: documents at the bottom, a prompt card in the middle, a chat node on top](/blog/prompt-engineering-2026/stack.png \"Retrieval feeds the prompt. The prompt feeds a channel or a tool call. Reverse that order and you are back to a homepage widget.\")",
      "This is why we talk people out of “just write a better prompt” as a product strategy. Prompting is the cheapest layer to iterate. It cannot replace [a RAG pipeline](/blog/rag-vs-fine-tuning-2026) when the facts change weekly, and it cannot replace an agent’s audit log when the model is allowed to write to a CRM. [When not to build the AI feature](/blog/when-not-to-build-ai) is the test: name the hour saved, name “good enough”, name who owns a wrong answer.",
      "## The loop that makes a prompt real",
      "Write, run on an eval set, score, tighten. That is the whole practice. Teams that skip the middle two steps are prompt-tuning against vibes, which is how a model update on a Tuesday undoes a month of “it felt good”.",
      "![Four-step cycle: draft, test, score, tighten](/blog/prompt-engineering-2026/eval-loop.png \"Draft → test on real cases → score faithfulness and format → tighten. If there is no score, there is no engineering.\")",
      "An evaluation set for a support prompt is not “ten clever questions”. It is 40–80 real ones: the angry ones, the ones with order numbers in the wrong field, the ones that should escalate. Score at least two things: did it stay inside the passages, and did it emit the schema. Cost per call is the third score once volume is real — Gemini Flash list prices as of February 2026 are $0.30 / $2.50 per million tokens, so a sloppy system prompt that repeats a 2,000-token policy on every turn is a line item, not a style choice.",
      "> If you cannot show the eval table, you do not have prompt engineering. You have a chat window and a hope.",
      "## What we actually version",
      "The prompt file, the eval cases, and the model id. Not “whatever *-latest is this week” — aliases float, quotas vanish, and a prompt tuned to one snapshot fails on the next. We pin models for the same reason we pin npm packages. When we change the prompt, we re-run the set before we ship. That is boring, and it is why the chatbot still answers after a vendor weekend.",
      "If you are trying to decide whether your problem is a prompt, a retrieval system, or a workflow, describe it in [ZAC Consultant](/ai-consultant). If you already know you are building an assistant and you want the cost band, use the [software cost calculator](/software-cost-calculator).",
    ],
    faqs: [
      {
        q: "Is prompt engineering still a job in 2026?",
        a: "As a standalone title, rarely. As a skill inside shipping AI systems — specifying the contract, writing evals, pinning models — yes. The people who only collect prompt snippets are not doing that job.",
      },
      {
        q: "How long should a system prompt be?",
        a: "As short as the contract allows. Every extra paragraph is tokens on every call and another place to contradict yourself. Put facts in retrieval, not in the prompt, unless they are true for every call and change slower than a deploy.",
      },
      {
        q: "Do examples in the prompt beat fine-tuning?",
        a: "For format and tone, two or three real examples usually beat a fine-tune you will not refresh. Fine-tune when prompting cannot hold a schema or a voice across a large volume. Do not fine-tune to “load the docs”.",
      },
      {
        q: "Should every prompt return JSON?",
        a: "If another system has to read it, yes — a schema with required keys. If a human is the only reader, a short prose answer with a clear escalate path is fine. Mixing the two in one call is how parsers break.",
      },
      {
        q: "Can we reuse one mega-prompt for support, sales and internal search?",
        a: "No. One job per prompt. Shared constraints can live in a snippet you compose. A mega-prompt that tries to be three agents is how you get a sales pitch in a support ticket.",
      },
    ],
  },
  {
    slug: "how-much-does-an-ai-chatbot-cost-2026",
    title: "How much does an AI chatbot cost in 2026?",
    excerpt:
      "A production RAG support chatbot typically costs $18k–$45k to build in 2026, plus $80–$400 a month to run at about 10,000 conversations — model spend is usually the small line.",
    category: "Cost",
    date: "2026-08-18",
    lastReviewed: "2026-08-18",
    author: "Syed Shayan Arshad",
    readingTime: "9 min",
    answer:
      "A production RAG support chatbot typically costs $18,000–$45,000 to build in 2026, plus $80–$400 per month to run at around 10,000 conversations. The build is retrieval, evaluation, guardrails and wiring into the tools your team already uses — not a ChatGPT skin. Model API spend at that volume is usually tens of dollars, not thousands; hosting, automation and the humans who handle escalations dominate the running cost.",
    keywords: [
      "AI chatbot cost 2026",
      "how much does a RAG chatbot cost",
      "custom chatbot development price",
      "LLM API cost per conversation",
    ],
    tools: ["estimator", "consultant"],
    related: [
      "n8n-vs-zapier-vs-make-2026",
      "rag-vs-fine-tuning-2026",
      "when-not-to-build-ai",
    ],
    body: [
      "The number people want is a single price. The number that is true is a band, because three different things get quoted as “the chatbot”: a widget on a marketing page, a retrieval assistant over your real documents, and an agent that can take actions in other systems. Only the last two survive a month in production, and they are not the same job.",
      "## What you are actually paying to build",
      "Most of the money is not the model. It is scoping the questions the bot is allowed to answer, cleaning the knowledge it will retrieve from, writing evaluation cases so you can tell when it is wrong, and connecting it to CRM, tickets or WhatsApp so the answer reaches a human when it should. Skip any of those and you have a demo.",
      "| What you are buying | Typical build (USD, 2026) | What is in the number |",
      "| FAQ widget on a brochure site | $4k–$12k | Prompt, a knowledge file, a chat UI. No retrieval eval, no escalation. |",
      "| RAG support assistant | $18k–$45k | Retrieval over your docs, evaluation set, human handoff, cost caps. |",
      "| Agent that takes actions | $35k–$80k | Tool calls into CRM or tickets, audit trail, failure queues. |",
      "Those bands are planning figures from how we price this work — person-weeks at a blended rate, not a promise. A written quote comes after discovery, once someone has seen your systems. If you want a range for *your* stack, run it through the [software cost calculator](/software-cost-calculator); it uses the same engine.",
      "## What it costs to run each month",
      "Vendor list prices as of February 2026. A support turn that sends ~4,000 input tokens and ~800 output tokens through Gemini Flash is roughly $0.003 of model spend. Ten thousand of those conversations is about $30 of API cost — less if you route classification to Flash Lite ($0.10 / $0.40 per million tokens).",
      "| Line | Typical at ~10k conversations / month |",
      "| Model API (Gemini Flash) | $20–$80 |",
      "| Vector store + hosting | $20–$80 |",
      "| n8n Cloud Starter or a small VPS | $14–$24 |",
      "| Human review / exception handling | The large line — budget hours, not dollars |",
      "The surprise bill is almost never the model. It is sending every turn to a reasoning model (Gemini Pro is $1.25 / $10 per million tokens), re-embedding the whole corpus on a schedule nobody owns, or leaving Zapier on a task meter after volume is real. We publish those list prices in the estimator catalog and we re-check them; if a post here disagrees with the catalog, believe the catalog.",
      "## What moves the build number",
      "Three things, in order. First, whether the knowledge is already structured — a clean help centre is a different project from a shared drive of PDFs. Second, how many systems the answer has to touch (email only vs CRM + tickets + WhatsApp). Third, whether you need the bot to *do* something (create a ticket, update a record) or only to *say* something. Action-taking is an agent, and it needs audit logs and an exception queue from day one.",
      "A fourth, quieter mover: evaluation. Teams that skip it ship in week two and spend month two arguing with screenshots. Budget it in the first phase.",
      "## When the cheaper option is the right one",
      "If the questions are a closed FAQ and you do not need citations, a retrieval system is wasted money. If the process is “copy this field from A to B”, you want an [n8n or Zapier workflow](/blog/n8n-vs-zapier-vs-make-2026), not a chatbot. We talk clients out of the AI feature when it fails a simple test: name the hour or rupee it saves. [When not to build the AI feature](/blog/when-not-to-build-ai) is that test in full.",
      "If you already know the symptom but not which of those three jobs you are in, [ZAC Consultant](/ai-consultant) will pick a service line and a cost band in about three minutes. If you already know it is a chatbot and you want the number, use the estimator.",
    ],
    faqs: [
      {
        q: "Is $18k–$45k the price I will be quoted?",
        a: "No. It is a planning band for a RAG support assistant built the way we deliver them. Your quote is fixed per phase after a one-to-two week discovery sprint, once we have seen the knowledge and the systems the bot has to touch.",
      },
      {
        q: "Does the monthly model bill stay under $100?",
        a: "At around 10,000 ordinary support conversations on Gemini Flash, yes — often well under. It jumps when every turn goes to a reasoning model, when you re-embed a large corpus constantly, or when conversations include long document dumps.",
      },
      {
        q: "Can I just wrap ChatGPT / Gemini in a widget?",
        a: "You can, and it will look finished in a demo. Without retrieval over your docs, evaluation, and a path to a human, it will be wrong in public by week two. We do not sell that as a production system.",
      },
      {
        q: "How long does a RAG chatbot take to ship?",
        a: "A first production phase is typically 6–10 weeks after discovery: knowledge pipeline, retrieval, eval set, one channel, human handoff. Extra channels and tool-calling agents add phases, not days.",
      },
    ],
  },
  {
    slug: "n8n-vs-zapier-vs-make-2026",
    title: "n8n vs Zapier vs Make in 2026: which should you actually pick?",
    excerpt:
      "Pick Zapier below ~2,000 tasks a month when you want speed. Pick n8n when volume is real or you need the workflow on your own box. Make sits between them on price and sits closer to Zapier on product.",
    category: "Automation",
    date: "2026-08-12",
    lastReviewed: "2026-08-12",
    author: "Syed Shayan Arshad",
    readingTime: "8 min",
    answer:
      "In 2026, pick Zapier Professional (~$49/month) when you want the fastest SaaS connectors and you are below about 2,000 tasks a month. Pick n8n when volume is real or you need the workflow on a box you control — Cloud Starter is $24/month for 2,500 executions, or about $14/month to self-host on a small VPS. Make Core (~$12/month, 10,000 operations) is the cheap middle, but one scenario run is many operations, so the bill moves faster than the dashboard implies.",
    keywords: [
      "n8n vs Zapier 2026",
      "n8n vs Make vs Zapier",
      "best automation tool for small business",
      "self-host n8n cost",
    ],
    tools: ["estimator", "consultant"],
    related: [
      "self-host-n8n-vs-n8n-cloud",
      "how-much-does-an-ai-chatbot-cost-2026",
      "ai-agents-vs-chatbots-vs-workflows",
    ],
    body: [
      "These three products get compared as if they were the same job. They are not. Zapier sells speed-to-first-workflow. n8n sells control and a cost curve that does not punish volume. Make sells a visual builder priced per operation. Choosing on “which is more popular” is how teams pay Zapier prices for n8n work, or fight n8n for a two-step Gmail filter that Zapier would have shipped before lunch.",
      "## The 2026 price picture (list, USD, February 2026)",
      "| Product | Plan | Base / month | What you get before overage |",
      "| Zapier | Professional | $49 | Fastest connectors; expensive once task volume is real |",
      "| n8n | Cloud Starter | $24 | 2,500 executions, 5 active workflows |",
      "| n8n | Cloud Pro | $60 | 10,000 executions, 15 active workflows |",
      "| n8n | Community, self-hosted | ~$14 | Licence is free; this is the VPS it runs on |",
      "| Make | Core | $12 | 10,000 operations — one run is often many operations |",
      "Overage on n8n Cloud Starter works out around $0.006 per execution once you are past the allowance (you are really on the next tier). Make is about $0.0009 per operation past 10,000. Zapier does not have a cheap high-volume story; past a couple of thousand tasks a month we usually recommend moving the same job to n8n.",
      "## Pick this if",
      "| You should pick | When | You should not pick it when |",
      "| Zapier | You need it live this week, the apps are in their directory, volume is low | You can already see 10k+ tasks/month, or the flow has ugly branching |",
      "| n8n Cloud | You want n8n without running a box | You have a compliance reason to keep execution off a vendor |",
      "| n8n self-hosted | Volume, branching, or data that should not leave your VPC | You have nobody who can patch a VPS |",
      "| Make | You like the canvas and operation math is honest for your flows | You thought “10,000 operations” meant 10,000 runs |",
      "## n8n vs Zapier, in one paragraph",
      "Zapier wins the first afternoon. n8n wins month four. That is the whole decision for most small teams. If the workflow is “new Stripe payment → Slack + sheet”, Zapier is correct. If the workflow is “enrich, branch, wait, write back to two CRMs, retry, alert a human”, n8n is correct, and self-hosting it is usually cheaper than Cloud Pro once executions climb. We wrote the self-host comparison separately: [self-host n8n vs n8n Cloud](/blog/self-host-n8n-vs-n8n-cloud).",
      "## Where AI fits",
      "All three will call a model. That does not make the workflow an “AI agent”. A classifier that routes a ticket is a step. An agent that chooses tools at runtime is a different system, with evaluation and an escape hatch. See [agents vs chatbots vs workflows](/blog/ai-agents-vs-chatbots-vs-workflows). If you are mixing the two, say so in the brief — it changes both the build and the bill.",
      "Want this priced for a specific process rather than a category? Describe it in [ZAC Consultant](/ai-consultant) or put the build through the [cost calculator](/software-cost-calculator). Both are free; both use the same vendor prices this table is quoting.",
    ],
    faqs: [
      {
        q: "Is n8n always cheaper than Zapier?",
        a: "At low volume, no — Zapier’s time-to-first-workflow can be worth the extra. Past roughly 2,000 tasks a month, n8n is almost always cheaper for the same job, especially self-hosted.",
      },
      {
        q: "Is Make just cheaper Zapier?",
        a: "It is cheaper per unit until you count operations honestly. A three-module scenario is three operations per run. Ten thousand operations is not ten thousand runs. Price the actual graph, not the plan name.",
      },
      {
        q: "Do you lock clients into one of these?",
        a: "No. We pick during discovery. Zapier for speed and SaaS coverage, n8n for control and volume, custom code when the workflow is the product. Switching later is possible; designing as if you will switch is cheaper than migrating a hundred live scenarios.",
      },
      {
        q: "What about Temporal?",
        a: "Temporal Cloud is for long-running, must-not-drop workflows where failure is expensive. It is overkill for CRM syncs and Slack alerts. We use it when the alternative is a lost payment or a stuck onboarding, not when a Zap would do.",
      },
    ],
  },
  {
    slug: "rag-vs-fine-tuning-2026",
    title: "RAG vs fine-tuning in 2026: when you need retrieval (and when you don’t)",
    excerpt:
      "Use RAG when the answer must come from your documents and must be citeable. Fine-tune when you need a stable style or format. Most “we should fine-tune” requests in 2026 are actually retrieval jobs.",
    category: "AI",
    date: "2026-08-05",
    lastReviewed: "2026-08-05",
    author: "Shehryar Afzal",
    readingTime: "8 min",
    answer:
      "In 2026, use retrieval-augmented generation (RAG) when the answer must come from your documents and you need to cite them. Fine-tune a model when you need a stable voice, a strict output format, or a specialised skill that prompting cannot hold. Most teams who arrive asking for a fine-tune actually need RAG — their facts change weekly, and a trained-in corpus goes stale the day after you ship.",
    keywords: [
      "RAG vs fine-tuning 2026",
      "when to use RAG",
      "do I need to fine-tune an LLM",
      "retrieval augmented generation for business",
    ],
    tools: ["consultant"],
    related: [
      "prompt-engineering-2026",
      "how-much-does-an-ai-chatbot-cost-2026",
      "when-not-to-build-ai",
    ],
    body: [
      "Fine-tuning got famous because it sounds like you are making “your own model”. Retrieval got famous because it actually works for the problem most businesses have: the facts live in docs, tickets and wikis, and those facts change. Mixing them up is the most expensive way to ship a chatbot that sounds confident and cites last year’s price list.",
      "## The one-line test",
      "If the correct answer would change when you update a document, you need retrieval. If the correct *shape* of the answer would change — tone, schema, a house style that prompting keeps dropping — you may need a fine-tune. If neither is true, you need a prompt and a workflow, not a model project.",
      "| Approach | Use it when | Do not use it when |",
      "| Prompting only | Closed FAQ, no citations needed, facts fit in the prompt | The corpus is larger than a context window you can afford |",
      "| RAG | Answers must come from *your* sources and be citeable | You have no sources, or the sources are wrong |",
      "| Fine-tune | Voice, format, or a skill prompting cannot hold | Your facts change weekly and you hoped training would “load the docs” |",
      "| Agent + tools | The model must *do* something in another system | You only needed a paragraph of text |",
      "## What RAG actually is (and is not)",
      "RAG is not a chatbot. It is a pipeline: chunk documents, embed them, retrieve the passages that match a question, then ask a model to answer *using those passages*. The model is the last step. The quality lives in the chunks, the metadata, and the evaluation set that tells you when retrieval missed. A vector database with no eval is a search engine you cannot audit.",
      "We build RAG with an evaluation set from day one — real questions from your team, not demo prompts. If retrieval cannot beat a baseline (keyword search, or a human with the wiki) on paper, we do not wrap a chat UI around it. That is the same rule as [when not to build the AI feature](/blog/when-not-to-build-ai).",
      "## What fine-tuning is for now",
      "Fine-tuning in 2026 is for behaviour, not knowledge. Teach a model to always emit a schema, to write in a brand voice that prompting keeps sliding off, or to do a narrow classification cheaper than a large prompt. It is not how you “put the employee handbook into the model”. Handbooks belong in retrieval, because someone will edit them on Thursday.",
      "Fine-tunes also have an operations cost: you own the data, the refresh, and the eval when the base model vendor ships a better default. Budget that, or you will freeze a 2026-Q1 behaviour into 2027.",
      "## Cost, honestly",
      "A RAG assistant is the $18k–$45k build described in [how much an AI chatbot costs](/blog/how-much-does-an-ai-chatbot-cost-2026). A fine-tune on top of that is extra data work and extra eval — not a substitute for retrieval. Embedding a corpus is cheap at list price (Google text embeddings at $0.15 per million tokens as of February 2026) and expensive when you re-index without a reason.",
      "If you are unsure which of these jobs you are in, describe the problem in [ZAC Consultant](/ai-consultant). It is built to route “add AI to the homepage” away from a model project and toward the actual bottleneck.",
    ],
    faqs: [
      {
        q: "Can RAG and fine-tuning be combined?",
        a: "Yes. Retrieve facts, then use a fine-tuned or heavily prompted model to write them in a required format. Do not fine-tune *instead of* retrieving facts that will change.",
      },
      {
        q: "Is RAG outdated now that context windows are huge?",
        a: "Large windows reduce the need to retrieve for small corpora. They do not remove the need to cite, to stay within cost, or to keep last month’s PDF from crowding out this week’s policy. Retrieval is still how you control what the model is allowed to see.",
      },
      {
        q: "Do I need my own vector database?",
        a: "Not always. For a first phase we often start with a managed store and a few thousand chunks. You need your own ops story when the corpus, the retention rules, or the region requirements say so — not because a tutorial used Pinecone.",
      },
      {
        q: "How do I know RAG is working?",
        a: "An evaluation set: real questions, expected passages, expected answers, scored on retrieval hit-rate and answer faithfulness. If you cannot show that table, you have a demo.",
      },
    ],
  },
  {
    slug: "ai-agents-vs-chatbots-vs-workflows",
    title: "AI agent vs chatbot vs workflow: pick the job, not the buzzword",
    excerpt:
      "A chatbot answers. A workflow runs a known graph. An agent chooses tools at runtime. Most businesses need the middle one; the expensive mistake is buying an agent for a Zap.",
    category: "AI",
    date: "2026-07-28",
    lastReviewed: "2026-07-28",
    author: "Shehryar Afzal",
    readingTime: "7 min",
    answer:
      "A chatbot answers questions. A workflow (n8n, Zapier, Make) runs a graph you designed in advance. An AI agent chooses which tools to call at runtime. In 2026 most businesses should buy a workflow, sometimes with a model step inside it. Buy a chatbot when people need to ask in language. Buy an agent only when the path cannot be written down ahead of time — and budget evaluation, audit logs and a human escape hatch in the first release.",
    keywords: [
      "AI agent vs chatbot",
      "AI agent vs workflow",
      "what is an AI agent 2026",
      "n8n AI agent",
    ],
    tools: ["consultant", "estimator"],
    related: [
      "n8n-vs-zapier-vs-make-2026",
      "rag-vs-fine-tuning-2026",
      "when-not-to-build-ai",
    ],
    body: [
      "Vendors collapsed three products into one word: “agent”. Operators then buy the most expensive of the three for a problem the cheapest would finish this week. The fix is to name the job before you name the stack.",
      "## Three jobs",
      "| Job | What success looks like | Typical stack |",
      "| Chatbot | A correct, citeable answer in language | RAG + chat UI + human handoff |",
      "| Workflow | The same graph runs reliably, with retries | n8n / Zapier / Make / custom |",
      "| Agent | The model picks tools because the path was not known | LLM + tools + eval + audit |",
      "If you can draw the steps on a whiteboard without a diamond that says “the model decides”, you want a workflow. Put a model *inside* a step if you need classification or a draft. That is still a workflow. Calling it an agent in the pitch deck does not change the architecture, but it will change what you get billed for.",
      "## Why agents are expensive",
      "An agent is a loop: observe, choose a tool, observe, repeat, stop. Every extra step is tokens, latency, and a new way to fail. Without an evaluation set you cannot tell a good loop from a lucky demo. Without an exception queue, a wrong tool call becomes a wrong CRM record. That is why our AI automation work scopes to a measurable saving *before* any model work, and why we refuse to ship a chat box with no escalation path.",
      "n8n can host all three patterns. That is a feature and a trap. A 40-node scenario with an “AI agent” node in the middle is still a workflow if the branches are yours. It becomes an agent when you stop being able to say what it will do next. If you cannot write the allowed tools and the stop condition, you are not ready to build it.",
      "## A practical default",
      "Start with the leak: re-keying, missed handoffs, support questions that already have answers. Automate the graph. Add a model only where language is the interface or the classifier. Promote a step to an agent only after a workflow has been running and you can point at the branch that genuinely cannot be specified. [ZAC Consultant](/ai-consultant) is biased toward that order on purpose.",
      "If the thing you want is a numbered cost for “an agent”, say what it is allowed to touch. The [estimator](/software-cost-calculator) will not invent a product you did not describe — and neither should a vendor.",
    ],
    faqs: [
      {
        q: "Is a GPT with function calling an agent?",
        a: "It is the usual implementation of one. The distinction that matters is not the API — it is whether you specified the path or left the model to choose it. Function calling inside a fixed three-step flow is a workflow with tools.",
      },
      {
        q: "Can n8n replace an agent framework?",
        a: "For most business processes, yes: n8n is the orchestrator, the model is a step, humans get the exceptions. Agent frameworks earn their keep when the tool list is long and the path is genuinely unknown. That is rarer than the blog posts suggest.",
      },
      {
        q: "What’s the first release of an agent you would actually ship?",
        a: "A short tool list, a hard stop condition, logging of every tool call, a human queue for low-confidence or failed actions, and an eval set of at least a few dozen real cases. Anything thinner is a demo.",
      },
    ],
  },
  {
    slug: "self-host-n8n-vs-n8n-cloud",
    title: "Self-host n8n vs n8n Cloud: the real cost in 2026",
    excerpt:
      "Self-host n8n when you want the box and the volume curve. Stay on n8n Cloud when you want someone else to patch it. The licence is free either way; you are paying for operations.",
    category: "Automation",
    date: "2026-07-14",
    lastReviewed: "2026-07-14",
    author: "Syed Shayan Arshad",
    readingTime: "7 min",
    answer:
      "Self-host n8n when execution volume is real, when data should not sit on a vendor, or when you already have someone who can patch a VPS. Budget about $14/month for a small box plus your time. Stay on n8n Cloud ($24 Starter / $60 Pro as of February 2026) when you want backups, upgrades and support to be someone else’s problem. The software licence is free in both cases — you are choosing an operations model, not a product.",
    keywords: [
      "self-host n8n vs cloud",
      "n8n cloud pricing 2026",
      "n8n VPS cost",
      "is n8n free",
    ],
    tools: ["estimator"],
    related: [
      "n8n-vs-zapier-vs-make-2026",
      "how-much-does-an-ai-chatbot-cost-2026",
      "ai-agents-vs-chatbots-vs-workflows",
    ],
    body: [
      "n8n’s Community edition is free. Cloud is n8n running the box for you. Arguments that start with “n8n is free so we should self-host” skip the part that actually costs money: disk, upgrades, backups, and the 2 a.m. restart when a workflow wedges. Arguments that start with “never self-host” skip the part where Cloud Pro’s execution cap becomes the most expensive line on the invoice.",
      "## Side by side",
      "| | n8n Cloud Starter | n8n Cloud Pro | Self-hosted Community |",
      "| Monthly (Feb 2026 list) | $24 | $60 | ~$14 VPS |",
      "| Executions included | 2,500 | 10,000 | Whatever the box will run |",
      "| Active workflows | 5 | 15 | No vendor cap |",
      "| Who patches it | n8n | n8n | You |",
      "| Data residency | Vendor | Vendor | Your VPC / region |",
      "Past Starter’s 2,500 executions you are not “a bit over” — you are on the next tier, at about $0.006 per extra run if you stay on Cloud math. Self-hosting removes that meter. It does not remove CPU. A queue of heavy HTTP and AI steps will still want RAM and a worker story.",
      "## Choose Cloud when",
      "You have no one who will apply n8n updates. You have five workflows and a few thousand runs. You would rather pay $24–$60 than invent backup and monitoring. This is the correct default for a first automation, and we often start clients here even when we expect to move them later.",
      "## Choose self-host when",
      "Volume is already past Pro, or obviously will be. The payloads are things you do not want in another company’s database (health, finance, anything you could not paste into a ticket). You already run other boxes and n8n would not be your first overnight page. Then the ~$14 VPS is the honest number, plus the engineering hours to put Caddy or nginx, backups and a restore test in front of it. Skip the restore test and you do not have a self-host — you have a hobby.",
      "We will recommend Cloud, self-host, or “this should not be n8n” during discovery. If you want that recommendation against a real process, describe it in [ZAC Consultant](/ai-consultant). If you want the build and run cost in one range, use the [software cost calculator](/software-cost-calculator) — it prices n8n Cloud and self-host as separate catalog lines so the model cannot invent a tier.",
    ],
    faqs: [
      {
        q: "Is self-hosting n8n actually free?",
        a: "The licence is. The VPS, the backups, the upgrades and the person who does them are not. Treat ~$14/month as the floor for a small instance, not the total cost of ownership.",
      },
      {
        q: "When does Cloud Pro get more expensive than a VPS?",
        a: "As soon as you need more than 10,000 executions a month on a steady basis, or more active workflows than the plan allows. A $14 box will usually absorb that load; Cloud will ask you to move up a tier.",
      },
      {
        q: "Can we start on Cloud and move later?",
        a: "Yes, and we often do. Export workflows, point credentials at the new instance, run both until you trust the cutover. Designing workflows without Cloud-only features makes that move boring, which is the point.",
      },
    ],
  },
  {
    slug: "when-not-to-build-ai",
    title: "When not to build the AI feature",
    excerpt:
      "Most AI ideas fail a simple test: name the hour or rupee saved. If you cannot, do not write the integration. We build this for a living and still talk clients out of roughly half of it.",
    category: "AI",
    date: "2026-07-02",
    lastReviewed: "2026-07-02",
    author: "Shehryar Afzal",
    readingTime: "6 min",
    answer:
      "Do not build an AI feature until you can name the process that costs measurable time or money today, what “good enough” looks like for an automated answer, and who owns the knowledge when the model is wrong. If those three have no owners, you are buying a demo. In 2026 the expensive failure mode is not “we didn’t adopt AI” — it is a chat box in production with no evaluation, no escalation path, and no cost cap.",
    keywords: [
      "when not to use AI",
      "AI project failure",
      "should I build a chatbot",
      "AI automation worth it",
    ],
    tools: ["consultant"],
    related: [
      "rag-vs-fine-tuning-2026",
      "ai-agents-vs-chatbots-vs-workflows",
      "how-much-does-an-ai-chatbot-cost-2026",
    ],
    body: [
      "We build AI automation for a living. We also talk clients out of roughly half the AI features they arrive wanting. That is not a bit. A model that cannot beat the current process on paper will not beat it in production, and it will spend your trust doing it.",
      "## The three questions",
      "What process costs measurable time or money today? What does “good enough” look like for an automated answer — not perfect, *good enough*, with a number? Who owns the knowledge when the model is wrong, and how does a human take over? If any of those is “we’ll figure it out after the pilot”, stop. The pilot is how you skip the questions.",
      "## What survives scrutiny",
      "Document re-keying. Support deflection where the answers already exist. Triage and routing. Intake that turns unstructured mail into a structured record. These have a baseline you can measure and a failure mode a person can catch. “Add AI to the homepage” usually does not. “An agent that runs the business” never does — see [agents vs chatbots vs workflows](/blog/ai-agents-vs-chatbots-vs-workflows).",
      "## Guardrails are the first release",
      "Escalation paths, evaluation sets and cost caps belong in v1. Shipping a chat box without them is how teams lose trust in week two and never recover. Retrieval without eval is a search engine you cannot audit. Tool-calling without a queue is a CRM you cannot trust. We will not build the second of those on purpose.",
      "If the honest recommendation is “do the process and the data hygiene first”, that recommendation is free in discovery. [ZAC Consultant](/ai-consultant) is designed to route you toward the leak, not the buzzword. Bring the bottleneck.",
    ],
    faqs: [
      {
        q: "So you don’t want AI projects?",
        a: "We want AI projects that beat a baseline. We do not want a widget that cannot be evaluated. Those two look identical in a pitch and nothing alike six weeks later.",
      },
      {
        q: "What if our data isn’t ready?",
        a: "Then we say so. Process and data hygiene often come before model work. Forcing a RAG pipeline over a junk shared drive just automates the junk.",
      },
      {
        q: "Is a small pilot a way around this?",
        a: "A pilot with an eval set and a named owner is how you *do* this. A pilot that is “let’s put ChatGPT on it and see” is how you skip it.",
      },
    ],
  },
  {
    slug: "nextjs-vs-wordpress-business-site-2026",
    title: "Next.js vs WordPress for a business site in 2026",
    excerpt:
      "WordPress still wins a brochure you want editors to live in tomorrow. Next.js wins when the site is a product — logged-in areas, custom data, performance you can budget. Most “redesigns” are this choice in disguise.",
    category: "Web",
    date: "2026-06-22",
    lastReviewed: "2026-06-22",
    author: "Syed Shayan Arshad",
    readingTime: "8 min",
    answer:
      "Choose WordPress in 2026 when the site is a brochure plus a blog and a non-technical editor must publish without a developer. Choose Next.js when the site is a product: authenticated areas, custom data, performance and SEO you need to control, or integrations that have already outgrown plugins. A marketing rebuild that keeps WordPress and a product rebuild that moves to Next.js are different projects; quoting them as one “website” is how estimates lie.",
    keywords: [
      "Next.js vs WordPress 2026",
      "rebuild WordPress as Next.js",
      "best framework for business website",
      "headless WordPress vs Next.js",
    ],
    tools: ["estimator", "consultant"],
    related: [
      "how-much-does-an-ai-chatbot-cost-2026",
      "n8n-vs-zapier-vs-make-2026",
      "when-not-to-build-ai",
    ],
    body: [
      "The argument is usually framed as taste: “WordPress is outdated”, “Next.js is overkill”. The useful frame is the job. If the job is publishing pages, WordPress is still a content management system that millions of editors already know. If the job is a web application that happens to have pages, WordPress is a plugin pile with a page builder on top, and the pile is the project.",
      "## Choose WordPress when",
      "A marketing team will publish weekly without waiting on engineering. The integrations are common (forms, SEO plugin, a shop that already lives in WooCommerce). You do not need custom business logic in the request path. Security and updates are a retainer you are willing to pay, because the plugin surface is the risk.",
      "## Choose Next.js when",
      "People log in. Data comes from your API, not from pages. You care about Core Web Vitals as a ranking input you can actually budget, not a plugin lottery. You want the same TypeScript app to own marketing pages *and* the product. You are tired of paying for a page builder to approximate an app. This site is Next.js for those reasons — including a CMS where we need one, without making the whole front-end a theme.",
      "| | WordPress | Next.js |",
      "| Editor experience | Wins, if you keep the stack boring | Wins once you invest in a CMS (Payload, Sanity, etc.) |",
      "| Custom product UI | Plugins and shortcodes | Native |",
      "| Performance | Depends on hosting + plugins | You own it |",
      "| Plugin / dependency risk | High | Different (npm), usually narrower |",
      "| Typical rebuild band | $8k–$25k for a serious marketing rebuild | $16k–$50k+ when the site is also a product |",
      "Those bands are planning figures, not quotes. Logged-in portals, bookings, estimators and AI tools sit at the top of the Next.js range because they are software, not a theme. The [cost calculator](/software-cost-calculator) will show you which side of that line a description actually lands on.",
      "## Headless WordPress is a third option, not a free upgrade",
      "Keeping WordPress as a CMS and putting Next.js on the front is a real architecture. It is also two systems to host, cache, preview and secure. Do it when editorial truly must stay in wp-admin and the front-end must be an app. Do not do it because a blog said “headless” — you will pay for both products and the glue.",
      "If you are staring at a WordPress site that has become an app, describe what staff and customers actually do in [ZAC Consultant](/ai-consultant). The useful output is not “Next.js” as a brand. It is which pieces are pages, which pieces are product, and which phase is worth paying for first.",
    ],
    faqs: [
      {
        q: "Is WordPress dead in 2026?",
        a: "No. It is the wrong default for a custom product and still a reasonable default for a brochure plus blog with a known editor workflow. Treat “dead” posts as marketing.",
      },
      {
        q: "Can you migrate our WordPress content into Next.js?",
        a: "Yes. The work is content modelling, redirects, and not breaking URLs that already rank — not “export XML and hope”. Redirect maps are part of the build, not a launch-week surprise.",
      },
      {
        q: "Will Next.js rank better by itself?",
        a: "Not by itself. It gives you the control to be fast, to ship structured data, and to not fight a page builder. Content, links and crawlable HTML still do the ranking. This site’s tool landing pages exist because a chat UI is a terrible thing to index — the framework does not fix that on its own.",
      },
    ],
  },
];

export const posts = insights;

export function getInsight(slug: string): Insight | undefined {
  return insights.find((i) => i.slug === slug);
}

export const getPost = getInsight;
