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
import { CONSULTANT_EVAL_CASES } from "../lib/ai/eval-cases";
import { isExplicitBlueprintRequest, rulesChatTurn } from "../lib/ai/chat";
import { extractPartialString, parseJsonLoose } from "../lib/ai/partial-json";
import { buildRulesBlueprint, classifySeed } from "../lib/ai/rules-engine";
import {
  BlueprintSchema,
  normalizeScale,
  normalizeTimeline,
  type Slots,
} from "../lib/ai/schema";
import { mergeSlots, missingSlots, slotProgress, slotsComplete } from "../lib/ai/slots";
import {
  inferEstimatorSlots,
  isExplicitEstimateRequest,
  rulesEstimatorTurn,
} from "../lib/estimator/chat";
import { priceProject, resolveInputs } from "../lib/estimator/pricing";
import type { EstimatorSlots, LeverOverrides } from "../lib/estimator/schema";

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
eq("scale: 25 staff", normalizeScale("about 25 staff use it"), "10–50 users");
eq("scale: 8 people", normalizeScale("8 people"), "Under 10 users");
eq("scale: 400", normalizeScale("around 400 employees"), "250+ users");
eq("scale: 60", normalizeScale("60 users"), "50–250 users");
eq("scale: solo", normalizeScale("just me"), "Under 10 users");
eq("scale: passthrough", normalizeScale("250+ users"), "250+ users");
eq("timeline: asap", normalizeTimeline("we need it live as soon as possible"), "As soon as possible");
eq("timeline: exploring", normalizeTimeline("just exploring for now"), "Still exploring");
eq("timeline: 3-6", normalizeTimeline("3–6 months"), "3–6 months");
eq("timeline: quarter", normalizeTimeline("next quarter"), "Within 3 months");

/* ------------------------------ 4. slot merging ------------------------------- */

section("Slot merge semantics");
const base: Slots = {
  problem: "Orders lost on WhatsApp during the dinner rush",
  industry: "Restaurant",
  scale: "10–50 users",
};

const afterEmpty = mergeSlots(base, {});
eq("empty patch keeps industry", afterEmpty.industry, "Restaurant");
eq("empty patch keeps scale", afterEmpty.scale, "10–50 users");

const afterCorrection = mergeSlots(base, { scale: "250+ users" });
eq("correction overwrites scale", afterCorrection.scale, "250+ users");

const afterNoise = mergeSlots(base, { industry: "unknown" });
eq('"unknown" does not overwrite', afterNoise.industry, "Restaurant");

const afterShorter = mergeSlots(base, { problem: "orders" });
eq(
  "shorter problem does not replace richer one",
  afterShorter.problem,
  "Orders lost on WhatsApp during the dinner rush",
);

/* ---------------------------- 5. completeness gate ---------------------------- */

section("Completeness");
eq("incomplete slots", slotsComplete(base), false);
check("problem too short is missing", missingSlots({ problem: "hi" }).includes("problem"));
const full: Slots = {
  problem: "Orders lost on WhatsApp during the dinner rush",
  industry: "Restaurant",
  current: "Manual re-typing into the POS",
  scale: "10–50 users",
  timeline: "As soon as possible",
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
eq("asks for the problem first", cold.reply.length > 0, true);
eq("does not claim readiness", cold.wantsBlueprint, false);

const warm = rulesChatTurn(
  [
    {
      role: "user",
      content:
        "We run a restaurant and lose WhatsApp orders. About 25 staff. Need it live asap.",
    },
  ],
  {},
);
check(
  "infers industry from keywords",
  warm.slots.industry === "Restaurant / hospitality",
  `got ${warm.slots.industry}`,
);
eq("infers scale from a number", warm.slots.scale, "10–50 users");
eq("infers urgency", warm.slots.timeline, "As soon as possible");

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

const priced = priceProject(project);
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
const repeat = priceProject(project);
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
  const adjusted = priceProject(project, override);
  check(
    `${label} raises the price`,
    adjusted.highUsd > priced.highUsd,
    `${priced.highUsd} → ${adjusted.highUsd}`,
  );
}
const cheaper = priceProject(project, { designState: "Designs ready to build" });
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
const bare = priceProject(bareSlots);

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
  const result = priceProject(slots);
  check(
    `${label} lands in a sane band`,
    result.lowUsd >= min && result.highUsd <= max,
    `${result.lowUsd}–${result.highUsd}, expected within ${min}–${max}`,
  );
  check(`${label} has a positive duration`, result.durationWeeks[0] > 0);
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
