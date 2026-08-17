/**
 * Offline evaluation for the AI consultant.
 *
 * Covers the deterministic logic that decides what a visitor is quoted and
 * when the intake ends — no API key, no network, safe for CI. The model's
 * conversational quality is judged separately; what is checked here is the
 * machinery that must hold even when the model misbehaves.
 *
 * Usage: pnpm eval:consultant
 */
import { CONSULTANT_EVAL_CASES } from "@/lib/ai/eval-cases";
import { isExplicitBlueprintRequest, rulesChatTurn } from "@/lib/ai/chat";
import { extractPartialString, parseJsonLoose } from "@/lib/ai/partial-json";
import { buildRulesPrototype, normalizePrototype } from "@/lib/ai/prototype";
import { isRenderable, resolvePrototypeKind } from "@/lib/ai/prototype-schema";
import { buildRulesBlueprint, classifySeed } from "@/lib/ai/rules-engine";
import {
  BlueprintSchema,
  inferSizeMult,
  normalizeTiming,
  type Slots,
} from "@/lib/ai/schema";
import { mergeSlots, missingSlots, slotProgress, slotsComplete } from "@/lib/ai/slots";
import {
  inferEstimatorSlots,
  isExplicitEstimateRequest,
  rulesEstimatorTurn,
} from "@/lib/estimator/chat";
import { CATALOG_KEYS, catalogEntry, priceSelection } from "@/lib/estimator/catalog";
import { priceProject, resolveInputs } from "@/lib/estimator/pricing";
import {
  BuildPlanSchema,
  type EstimatorSlots,
  type LeverOverrides,
} from "@/lib/estimator/schema";

let failed = 0;
let passed = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

function eq<T>(name: string, actual: T, expected: T) {
  check(name, Object.is(actual, expected), `got ${String(actual)}, want ${String(expected)}`);
}

function section(title: string) {
  console.log(`\n── ${title}`);
}

/* ------------------------- 1. rules-engine archetypes ------------------------- */

section("Rules-engine archetypes");
for (const testCase of CONSULTANT_EVAL_CASES) {
  const arch = classifySeed(testCase.seed);
  const blueprint = buildRulesBlueprint(testCase.seed, testCase.answers);

  const parsed = BlueprintSchema.safeParse(blueprint);
  if (!parsed.success) {
    check(`${testCase.id} schema`, false, JSON.stringify(parsed.error.issues[0]));
    continue;
  }
  check(
    `${testCase.id} archetype`,
    !testCase.expectArchetype || arch.id === testCase.expectArchetype,
    `got ${arch.id}, want ${testCase.expectArchetype}`,
  );
  check(
    `${testCase.id} service`,
    !testCase.expectServiceSlug || blueprint.serviceSlug === testCase.expectServiceSlug,
    `got ${blueprint.serviceSlug}, want ${testCase.expectServiceSlug}`,
  );
}

/* ------------------- 2. blueprint intent (the original bug) ------------------- */

section("Explicit blueprint intent");
// Regression: these used to be read as "give me the blueprint", dumping the
// visitor into a generated plan two messages into the conversation.
for (const answer of [
  "yes",
  "Yes",
  "yeah",
  "ok",
  "okay",
  "sure",
  "please",
  "correct",
  "both",
  "no",
  "yes.",
]) {
  eq(`bare "${answer}" is not a blueprint request`, isExplicitBlueprintRequest(answer), false);
}
for (const ask of [
  "just show me the blueprint now please",
  "can I see the roadmap?",
  "send me the proposal",
  "what would the estimate be",
  "give me a quote",
]) {
  eq(`"${ask}" is a blueprint request`, isExplicitBlueprintRequest(ask), true);
}

/* ---------------------------- 3. slot normalization --------------------------- */

section("Slot normalization");
eq("size mult: 25 staff", inferSizeMult("about 25 staff use it"), 1);
eq("size mult: 8 people", inferSizeMult("8 people on the team"), 0.85);
eq("size mult: 400", inferSizeMult("around 400 employees"), 1.7);
eq("size mult: 60", inferSizeMult("60 users"), 1.3);
eq("size mult: solo", inferSizeMult("just me"), 0.85);
eq("size mult: neutral when silent", inferSizeMult("Customers and staff"), 1);
eq("timing: asap", normalizeTiming("we need it live as soon as possible"), "As soon as possible");
eq("timing: exploring", normalizeTiming("just exploring for now"), "Still exploring");
eq("timing: 3-6", normalizeTiming("3–6 months"), "3–6 months");
eq("timing: quarter", normalizeTiming("next quarter"), "Within 3 months");

/* ------------------------------ 4. slot merging ------------------------------- */

section("Slot merge semantics");
const base: Slots = {
  outcome: "Orders lost on WhatsApp during the dinner rush",
  audience: "Kitchen staff and the owner",
  v1: "Capture and confirm orders",
};

const afterEmpty = mergeSlots(base, {});
eq("empty patch keeps audience", afterEmpty.audience, "Kitchen staff and the owner");
eq("empty patch keeps v1", afterEmpty.v1, "Capture and confirm orders");

const afterCorrection = mergeSlots(base, { v1: "Capture, confirm, and kitchen board" });
eq("correction overwrites v1", afterCorrection.v1, "Capture, confirm, and kitchen board");

const afterNoise = mergeSlots(base, { audience: "unknown" });
eq('"unknown" does not overwrite', afterNoise.audience, "Kitchen staff and the owner");

const afterShorter = mergeSlots(base, { outcome: "orders" });
eq(
  "shorter outcome does not replace richer one",
  afterShorter.outcome,
  "Orders lost on WhatsApp during the dinner rush",
);

/* ---------------------------- 5. completeness gate ---------------------------- */

section("Completeness");
eq("incomplete slots", slotsComplete(base), false);
check("outcome too short is missing", missingSlots({ outcome: "hi" }).includes("outcome"));
const full: Slots = {
  outcome: "Orders lost on WhatsApp during the dinner rush",
  audience: "Kitchen staff and the owner",
  today: "WhatsApp and paper notebooks",
  v1: "Capture and confirm orders",
  timing: "As soon as possible",
};
eq("complete slots", slotsComplete(full), true);
eq("progress 100", slotProgress(full), 100);
eq("progress 60", slotProgress(base), 60);

/* ---------------------------- 6. streaming decoder ---------------------------- */

section("Partial JSON decoding");
const stream = '{"reply": "It sounds like you need';
const partial = extractPartialString(stream, "reply");
eq("decodes mid-stream", partial?.text, "It sounds like you need");
eq("knows it is incomplete", partial?.complete, false);

const closed = extractPartialString('{"reply": "All done.", "complete": true}', "reply");
eq("decodes closed string", closed?.text, "All done.");
eq("knows it is complete", closed?.complete, true);

const escaped = extractPartialString('{"reply": "Say \\"hi\\"\\nthen go"}', "reply");
eq("handles escapes", escaped?.text, 'Say "hi"\nthen go');

// A backslash split across chunks must not corrupt the output.
const truncated = extractPartialString('{"reply": "line\\', "reply");
eq("tolerates split escape", truncated?.text, "line");
eq("absent field returns null", extractPartialString('{"other": 1}', "reply"), null);

eq("parses fenced JSON", parseJsonLoose('```json\n{"a":1}\n```').a, 1);
eq("parses prose-wrapped JSON", parseJsonLoose('Here you go: {"a":2}').a, 2);

/* ------------------------------ 7. rules fallback ----------------------------- */

section("Rules fallback chat");
const cold = rulesChatTurn([{ role: "user", content: "hi" }], {});
eq("asks for the goal first", cold.reply.length > 0, true);
eq("does not claim readiness", cold.wantsBlueprint, false);

const warm = rulesChatTurn(
  [
    {
      role: "user",
      content:
        "We run a restaurant and lose WhatsApp orders for our kitchen staff. Need it live asap. First release should capture and confirm orders.",
    },
  ],
  {},
);
check(
  "infers audience from keywords",
  Boolean(warm.slots.audience && /staff|kitchen|customer/i.test(warm.slots.audience)),
  `got ${warm.slots.audience}`,
);
check(
  "infers today from WhatsApp",
  Boolean(warm.slots.today && /whatsapp|paper|call/i.test(warm.slots.today)),
  `got ${warm.slots.today}`,
);
eq("infers urgency", warm.slots.timing, "As soon as possible");

/* ============================== COST ESTIMATOR ============================== */

section("Estimator intent");
for (const answer of ["yes", "ok", "sure", "yeah", "correct", "no"]) {
  eq(`bare "${answer}" is not an estimate request`, isExplicitEstimateRequest(answer), false);
}
for (const ask of [
  "what would this cost?",
  "give me a ballpark",
  "show me the estimate",
  "how much is this going to be",
  "what's the price",
]) {
  eq(`"${ask}" is an estimate request`, isExplicitEstimateRequest(ask), true);
}

section("Estimator slot inference");
const mobile = inferEstimatorSlots("we need an iOS and Android app for our drivers", {});
eq("mobile app detected", mobile.projectType, "Mobile app");
eq("mobile platform detected", mobile.platform, "Mobile");
const mvp = inferEstimatorSlots("just an MVP to test the idea, asap", {});
eq("MVP scope detected", mvp.scope, "MVP — smallest thing that works");
eq("urgent timeline detected", mvp.timeline, "As soon as possible");
eq(
  "regulated data detected",
  inferEstimatorSlots("we store patient records under HIPAA", {}).regulated,
  true,
);

section("Pricing engine");
const project: EstimatorSlots = {
  summary: "A customer portal with role-based access and reporting for our clients",
  projectType: "Web app or platform",
  platform: "Web",
  scope: "Full product",
  timeline: "Next 6 months",
  scale: "1k–10k users",
  designState: "Brand exists, no product design",
  integrations: 2,
  regulated: false,
};

const priced = priceProject({ slots: project });
check("low is below high", priced.lowUsd < priced.highUsd, `${priced.lowUsd}/${priced.highUsd}`);
check("duration low <= high", priced.durationWeeks[0] <= priced.durationWeeks[1]);
check("effort is positive", priced.effortWeeks > 0);

const shareSum = priced.breakdown.reduce((sum, line) => sum + line.share, 0);
check("breakdown shares sum to 1", Math.abs(shareSum - 1) < 0.0001, `sum=${shareSum}`);

const lineSum = priced.breakdown.reduce((sum, line) => sum + line.lowUsd, 0);
check(
  "breakdown lows reconcile with the total",
  Math.abs(lineSum - priced.lowUsd) / priced.lowUsd < 0.05,
  `lines=${lineSum} total=${priced.lowUsd}`,
);

// Determinism is the whole reason pricing lives outside the model.
const repeat = priceProject({ slots: project });
eq("same inputs, same low", repeat.lowUsd, priced.lowUsd);
eq("same inputs, same high", repeat.highUsd, priced.highUsd);

section("Pricing levers are monotonic");
// Each of these makes a project strictly more expensive. If any stops holding,
// a lever is silently lying to the visitor.
const dearer: [string, LeverOverrides][] = [
  ["larger scale", { scale: "100k+ / high transaction volume" }],
  ["regulated data", { regulated: true }],
  ["more integrations", { integrations: 8 }],
  ["rush timeline", { timeline: "As soon as possible" }],
  ["design from scratch", { designState: "Nothing yet — start from scratch" }],
];
for (const [label, override] of dearer) {
  const adjusted = priceProject({ slots: project, overrides: override });
  check(
    `${label} raises the price`,
    adjusted.highUsd > priced.highUsd,
    `${priced.highUsd} → ${adjusted.highUsd}`,
  );
}
const cheaper = priceProject({ slots: project, overrides: { designState: "Designs ready to build" } });
check(
  "build-ready designs lower the price",
  cheaper.highUsd < priced.highUsd,
  `${priced.highUsd} → ${cheaper.highUsd}`,
);

section("Pricing confidence");
const bareSlots: EstimatorSlots = {
  summary: "We need software built for our team",
  projectType: "Web app or platform",
  platform: "Web",
  scope: "Full product",
  timeline: "Next 6 months",
};
const bare = priceProject({ slots: bareSlots });

check("unanswered refinements lower confidence", bare.confidence < priced.confidence);
const bareSpread = (bare.highUsd - bare.lowUsd) / bare.highUsd;
const knownSpread = (priced.highUsd - priced.lowUsd) / priced.highUsd;
check(
  "lower confidence widens the band",
  bareSpread > knownSpread,
  `${bareSpread.toFixed(3)} vs ${knownSpread.toFixed(3)}`,
);
eq("all four defaults disclosed as assumed", resolveInputs(bareSlots).assumed.length, 4);
eq("a confirmed refinement is not assumed", resolveInputs({ ...bareSlots, regulated: true }).assumed.length, 3);

section("Pricing sanity bounds");
// Guards against a multiplier typo producing an absurd quote.
const scenarios: [string, EstimatorSlots, number, number][] = [
  [
    "marketing site MVP",
    { summary: "A small marketing site for our studio", projectType: "Marketing website", platform: "Web", scope: "MVP — smallest thing that works", timeline: "Next 6 months", scale: "Under 1k users", designState: "Brand exists, no product design", integrations: 0, regulated: false },
    5_000,
    40_000,
  ],
  [
    "full web platform",
    project,
    40_000,
    200_000,
  ],
  [
    "large regulated web+mobile",
    { summary: "A regulated patient platform on web and mobile", projectType: "Web app or platform", platform: "Web + mobile", scope: "Full product", timeline: "As soon as possible", scale: "100k+ / high transaction volume", designState: "Nothing yet — start from scratch", integrations: 6, regulated: true },
    150_000,
    600_000,
  ],
];
for (const [label, slots, min, max] of scenarios) {
  const result = priceProject({ slots });
  check(
    `${label} lands in a sane band`,
    result.lowUsd >= min && result.highUsd <= max,
    `${result.lowUsd}–${result.highUsd}, expected within ${min}–${max}`,
  );
  check(`${label} has a positive duration`, result.durationWeeks[0] > 0);
}

section("Plan-driven pricing");
{
  // The point of the plan is that two projects sharing a projectType can cost
  // wildly different amounts. If these two converge, the lookup table has
  // effectively come back and the estimator is rule-based again.
  const automationSlots: EstimatorSlots = {
    summary: "Wire our Shopify orders into Slack and a Google Sheet with n8n",
    projectType: "AI / automation",
    platform: "Internal only",
    scope: "Add to an existing system",
    timeline: "This quarter",
    scale: "Under 1k users",
    designState: "Designs ready to build",
    integrations: 2,
    regulated: false,
  };
  const resolvedAutomation = resolveInputs(automationSlots);
  const baseline = {
    scale: resolvedAutomation.scale as "Under 1k users",
    designState: resolvedAutomation.designState as "Designs ready to build",
    integrations: resolvedAutomation.integrations,
    regulated: resolvedAutomation.regulated,
  };

  const smallPlan = BuildPlanSchema.parse({
    approach: "Two n8n workflows against the existing Shopify webhook.",
    tasks: [
      { name: "Map the order fields we care about", discipline: "Discovery & scoping", weeks: 0.5 },
      { name: "Build the Shopify → Slack workflow", discipline: "Engineering", weeks: 1 },
      { name: "Build the Sheet append and dedupe", discipline: "Engineering", weeks: 0.75 },
      { name: "Test against a week of live orders", discipline: "QA & hardening", weeks: 0.5 },
    ],
    runCosts: [
      { key: "n8n-cloud-starter", usage: [{ meter: "executions", volume: 1_800 }] },
      { key: "monitoring-basic" },
    ],
    baseline,
    source: "gemini",
  });

  const bigPlan = BuildPlanSchema.parse({
    approach: "A retrieval platform with its own ingestion pipeline and evaluation harness.",
    tasks: [
      { name: "Discovery and corpus audit", discipline: "Discovery & scoping", weeks: 3 },
      { name: "Ingestion and chunking pipeline", discipline: "AI & data", weeks: 6 },
      { name: "Retrieval API and reranking", discipline: "Engineering", weeks: 8 },
      { name: "Evaluation harness", discipline: "AI & data", weeks: 4 },
      { name: "Admin console", discipline: "Engineering", weeks: 5 },
      { name: "Hardening and load testing", discipline: "QA & hardening", weeks: 3 },
    ],
    runCosts: [
      {
        key: "gemini-pro",
        usage: [
          { meter: "input-tokens", volume: 120_000_000 },
          { meter: "output-tokens", volume: 20_000_000 },
        ],
      },
      { key: "aws-medium" },
    ],
    baseline,
    source: "gemini",
  });

  const small = priceProject({ slots: automationSlots, plan: smallPlan, rate: 4000 });
  const big = priceProject({ slots: automationSlots, plan: bigPlan, rate: 4000 });

  check(
    "a small automation prices far below a platform of the same project type",
    big.highUsd > small.highUsd * 4,
    `${small.lowUsd}–${small.highUsd} vs ${big.lowUsd}–${big.highUsd}`,
  );
  check(
    "a two-week automation is not quoted as a quarter of work",
    small.effortWeeks < 6,
    `${small.effortWeeks} person-weeks`,
  );

  const planShareSum = small.breakdown.reduce((sum, line) => sum + line.share, 0);
  check(
    "planned breakdown shares still sum to 1",
    Math.abs(planShareSum - 1) < 0.0001,
    `sum=${planShareSum}`,
  );
  check(
    "breakdown names the actual work, not generic workstreams",
    small.breakdown.some((line) => line.name.includes("Slack")),
    small.breakdown.map((l) => l.name).join(" | "),
  );

  // Determinism has to survive the plan, or the engine's whole promise fails.
  const planRepeat = priceProject({ slots: automationSlots, plan: smallPlan, rate: 4000 });
  eq("same plan, same low", planRepeat.lowUsd, small.lowUsd);
  eq("same plan, same high", planRepeat.highUsd, small.highUsd);

  section("Running costs");
  check("a costed plan produces a monthly bill", Boolean(small.runCosts));
  const run = small.runCosts!;
  eq("every catalog key resolved to a line", run.lines.length, 2);
  check(
    "monthly band brackets the midpoint",
    run.monthlyLowUsd <= run.monthlyMidUsd && run.monthlyMidUsd <= run.monthlyHighUsd,
    `${run.monthlyLowUsd}/${run.monthlyMidUsd}/${run.monthlyHighUsd}`,
  );
  check(
    "line monthlies reconcile with the total",
    Math.abs(run.lines.reduce((s, l) => s + l.monthlyUsd, 0) - run.monthlyMidUsd) < 1,
  );
  check(
    "usage inside an included allowance is not billed",
    run.lines.find((l) => l.key === "n8n-cloud-starter")?.meteredUsd === 0,
  );
  check(
    "first year exceeds the build alone",
    run.firstYearHighUsd > small.highUsd,
    `${run.firstYearHighUsd} vs ${small.highUsd}`,
  );

  // Token spend is the line clients are most often surprised by, so it has to
  // track volume rather than sitting at a flat placeholder.
  const aiRun = big.runCosts!;
  const aiLine = aiRun.lines.find((l) => l.key === "gemini-pro");
  check("model usage is metered, not flat", (aiLine?.meteredUsd ?? 0) > 300, `${aiLine?.meteredUsd}`);

  check(
    "licence fees are no longer listed as excluded once they are priced",
    !small.exclusions.some((e) => /licence and infrastructure/i.test(e)),
    small.exclusions.join(" | "),
  );

  section("Levers still move a planned estimate");
  const scaledUp = priceProject({
    slots: automationSlots,
    overrides: { scale: "100k+ / high transaction volume" },
    plan: smallPlan,
    rate: 4000,
  });
  check(
    "scaling up raises the build",
    scaledUp.highUsd > small.highUsd,
    `${small.highUsd} → ${scaledUp.highUsd}`,
  );
  check(
    "scaling up raises metered usage harder than the build",
    scaledUp.runCosts!.monthlyMidUsd > run.monthlyMidUsd,
    `${run.monthlyMidUsd} → ${scaledUp.runCosts!.monthlyMidUsd}`,
  );
  check(
    "a plan is not double-charged for the scale it was written at",
    Math.abs(priceProject({ slots: automationSlots, plan: smallPlan, rate: 4000 }).lowUsd - small.lowUsd) < 1,
  );
}

section("Prototype normalisation");
{
  // Everything a model gets wrong in one payload: a placeholder section, an
  // edge into a node that does not exist, a ragged table row, a bogus accent
  // and dashboard fields on a workflow.
  const messy = normalizePrototype({
    kind: "workflow",
    productName: "Bella Vista Orders",
    caption: "How an order would move through the system.",
    accent: "chartreuse",
    nodes: [
      { id: "a", label: "Order arrives on WhatsApp", kind: "trigger", app: "WhatsApp" },
      { id: "b", label: "Classify and route", kind: "ai" },
      { id: "c", label: "Write to the kitchen board", kind: "output" },
      { id: "", label: "unnamed", kind: "action" },
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c", label: "in stock" },
      { from: "b", to: "ghost" },
      { from: "c", to: "c" },
    ],
    kpis: [{ label: "Orders", value: "120" }],
    sections: [{ type: "hero", title: "Your headline here" }],
  });

  eq("a node without an id is dropped", messy.nodes.length, 3);
  eq("an edge to a missing node is dropped", messy.edges.length, 2);
  check("a self-edge is dropped", !messy.edges.some((e) => e.from === e.to));
  eq("an unknown accent falls back", messy.accent, "lime");
  eq("dashboard fields are cleared on a workflow", messy.kpis.length, 0);
  eq("section fields are cleared on a workflow", messy.sections.length, 0);
  check("a workflow with a trigger and an output renders", isRenderable(messy));

  const placeholders = normalizePrototype({
    kind: "landing",
    productName: "Bella Vista",
    caption: "A homepage concept for the restaurant.",
    accent: "amber",
    sections: [
      { type: "hero", title: "Your headline here", body: "Lorem ipsum dolor sit amet" },
      {
        type: "list",
        title: "Menu",
        items: [
          { title: "Tagliatelle al ragù", body: "Slow-cooked beef", price: "€18" },
          { title: "Feature One", body: "Placeholder" },
        ],
      },
    ],
  });

  check(
    "a placeholder hero is dropped rather than shown",
    !placeholders.sections.some((s) => s.type === "hero"),
  );
  eq("a placeholder item is dropped, its siblings kept", placeholders.sections[0]?.items.length, 1);
  check(
    "a landing page reduced to one section is not renderable",
    !isRenderable(placeholders),
    `${placeholders.sections.length} section(s)`,
  );

  const ragged = normalizePrototype({
    kind: "dashboard",
    productName: "Ops",
    caption: "The board your dispatchers would watch.",
    accent: "sky",
    kpis: [
      { label: "Missed orders", value: "4", delta: "12%", trend: "down", goodWhen: "down" },
      { label: "On time", value: "96%", delta: "3%", trend: "up" },
    ],
    chart: { title: "Orders per day", points: [{ label: "Mon", value: 12 }] },
    table: {
      title: "Live orders",
      columns: ["Order", "Driver", "Status"],
      rows: [["#1041", "Ana", "En route"], ["#1042"]],
      statusColumn: 9,
    },
  });

  check("a chart with too few points is dropped", ragged.chart === undefined);
  check(
    "a short table row is padded, not dropped",
    ragged.table?.rows.every((row) => row.length === 3) ?? false,
    JSON.stringify(ragged.table?.rows),
  );
  check("an out-of-range status column is discarded", ragged.table?.statusColumn === undefined);
  check("a dashboard with kpis and a table renders", isRenderable(ragged));

  // Service map wins over a model that emitted the wrong kind.
  const forced = normalizePrototype(
    {
      kind: "landing",
      productName: "FieldKit",
      caption: "Major screens for the field app.",
      accent: "emerald",
      screens: [
        {
          id: "login",
          title: "Login",
          purpose: "Sign in",
          sections: [{ type: "hero", title: "Welcome back", ctaPrimary: "Sign in" }],
        },
        {
          id: "home",
          title: "Jobs",
          sections: [{ type: "list", title: "Today", items: [{ title: "Site A", body: "09:00" }] }],
        },
        {
          id: "detail",
          title: "Job detail",
          sections: [{ type: "features", title: "Checklist", items: [{ title: "Photo", body: "Required" }] }],
        },
      ],
    },
    "mobile",
  );
  eq("forced kind overrides the model", forced.kind, "mobile");
  eq("mobile keeps screens", forced.screens.length, 3);
  check("a three-screen mobile journey renders", isRenderable(forced));

  const thinMobile = normalizePrototype(
    {
      kind: "mobile",
      productName: "App",
      caption: "Too thin",
      accent: "lime",
      screens: [
        { id: "a", title: "One", sections: [{ type: "cta", title: "Go", ctaPrimary: "Go" }] },
        { id: "b", title: "Two", sections: [{ type: "cta", title: "Next", ctaPrimary: "Next" }] },
      ],
    },
    "mobile",
  );
  check("fewer than three mobile screens do not render", !isRenderable(thinMobile));

  eq("web-development maps to pages", resolvePrototypeKind("web-development"), "pages");
  eq("mobile-app-development maps to mobile", resolvePrototypeKind("mobile-app-development"), "mobile");
  eq("ai-automation maps to workflow", resolvePrototypeKind("ai-automation"), "workflow");
  eq("content-automation maps to workflow", resolvePrototypeKind("content-automation"), "workflow");
  eq(
    "business-process-automation maps to workflow",
    resolvePrototypeKind("business-process-automation"),
    "workflow",
  );
  eq("data-science maps to landing", resolvePrototypeKind("data-science"), "landing");
  eq("ui-ux-design maps to pages", resolvePrototypeKind("ui-ux-design"), "pages");
  eq(
    "custom-software defaults to pages",
    resolvePrototypeKind("custom-software", { seed: "We need a portal for clients", current: "Email" }),
    "pages",
  );
  eq(
    "custom-software process problems map to workflow",
    resolvePrototypeKind("custom-software", {
      seed: "Automate approvals between sales and ops",
      current: "WhatsApp handoffs",
    }),
    "workflow",
  );

  const fallbackFlow = buildRulesPrototype({
    answers: {
      audience: "Dispatchers and drivers",
      today: "Manual WhatsApp routing",
      v1: "Ingest, assign, track",
      timing: "Within 3 months",
    },
    blueprint: {
      title: "Order intake automation",
      serviceTitle: "Business process automation",
      serviceSlug: "business-process-automation",
      features: ["Ingest jobs", "Assign drivers", "Track delivery"],
    },
    seed: "Automate dispatch from chat",
  });
  check("the offline automation prototype still renders", isRenderable(fallbackFlow));
  eq("the offline automation prototype is a flow", fallbackFlow.kind, "workflow");
  check(
    "the offline prototype chains every node",
    fallbackFlow.edges.length === fallbackFlow.nodes.length - 1,
  );

  const fallbackPages = buildRulesPrototype({
    answers: {
      audience: "Restaurant guests",
      today: "Paper menus",
      v1: "Homepage, menu, reservations",
      timing: "Within 3 months",
    },
    blueprint: {
      title: "Restaurant website with booking",
      serviceTitle: "Web development",
      serviceSlug: "web-development",
      features: ["Homepage", "Menu", "Reservations", "Contact"],
    },
    seed: "We need a website for our restaurant",
  });
  check("the offline web prototype still renders", isRenderable(fallbackPages));
  eq("the offline web prototype is a page map", fallbackPages.kind, "pages");
  check("the offline web prototype has at least three pages", fallbackPages.screens.length >= 3);
}

section("Catalog integrity");
{
  // Every key the model is offered has to price, or the bill silently loses a
  // line the client will still be charged for.
  for (const key of CATALOG_KEYS) {
    const entry = catalogEntry(key)!;
    const priced = priceSelection({
      key,
      qty: 2,
      usage: (entry.meters ?? []).map((m) => ({ meter: m.id, volume: m.per })),
    });
    check(`${key} prices`, Boolean(priced) && priced!.monthlyUsd >= 0);

    // A zero rate models unlimited usage on a fixed fee, which no vendor
    // sells — it would quote a client four times their allowance at the
    // entry-tier price and never flag it.
    for (const meter of entry.meters ?? []) {
      check(`${key}/${meter.id} charges for overage`, meter.unitUsd > 0);
    }
  }
  check("an unknown key is dropped, not guessed", priceSelection({ key: "not-a-real-key" }) === null);
}

section("Estimator fallback chat");
const estCold = rulesEstimatorTurn([{ role: "user", content: "hi" }], {});
eq("does not jump to pricing", estCold.wantsEstimate, false);
const estWarm = rulesEstimatorTurn(
  [{ role: "user", content: "We want an MVP mobile app for our delivery drivers, asap" }],
  {},
);
eq("infers project type", estWarm.slots.projectType, "Mobile app");
eq("infers scope", estWarm.slots.scope, "MVP — smallest thing that works");

/* ---------------------------------- summary ---------------------------------- */

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("All consultant + estimator checks passed.");
