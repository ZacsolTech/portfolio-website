import {
  EstimateSchema,
  PRICING_VERSION,
  WORKSTREAMS,
  type Estimate,
  type EstimateLine,
  type EstimatorSlots,
  type LeverOverrides,
} from "./schema";

/**
 * Deterministic pricing engine.
 *
 * Every number a visitor sees comes from here, never from the model. The same
 * answers always produce the same quote, each multiplier is named in the
 * output, and a client who challenges the figure can be walked through it line
 * by line. A language model improvising prices per visitor would be
 * indefensible in a sales conversation and impossible to regression-test.
 *
 * Effort is modelled in person-weeks; money is effort × blended rate. Calendar
 * duration is derived separately, because adding people shortens a project
 * sub-linearly.
 */

export const DEFAULT_WEEKLY_RATE_USD = 4000;

/**
 * Blended person-week rate. Override per market without touching the model.
 *
 * `override` exists so the browser can re-price levers instantly using the
 * exact rate the server used: `ESTIMATOR_WEEKLY_RATE_USD` is server-only, so a
 * client running this module would otherwise silently fall back to the default
 * and disagree with the server's figures.
 */
function weeklyRateUsd(override?: number): number {
  if (Number.isFinite(override) && (override ?? 0) > 0) return override!;
  const configured = Number(process.env.ESTIMATOR_WEEKLY_RATE_USD);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_WEEKLY_RATE_USD;
}

/** Baseline effort in person-weeks for a full build of each project type. */
const BASE_EFFORT_WEEKS: Record<string, number> = {
  "Marketing website": 6,
  "Internal tool": 12,
  "AI / automation": 16,
  "Data & analytics": 16,
  "E-commerce": 18,
  "Web app or platform": 20,
  "Mobile app": 20,
};

const SCOPE_MULT: Record<string, number> = {
  "MVP — smallest thing that works": 0.65,
  "Full product": 1,
  "Rebuild of something existing": 1.15,
  "Add to an existing system": 0.55,
};

const PLATFORM_MULT: Record<string, number> = {
  Web: 1,
  Mobile: 1,
  "Web + mobile": 1.45,
  "Internal only": 0.9,
};

const SCALE_MULT: Record<string, number> = {
  "Under 1k users": 0.9,
  "1k–10k users": 1,
  "10k–100k users": 1.2,
  "100k+ / high transaction volume": 1.45,
};

/** Rush premium: compressed schedules cost more per unit of work delivered. */
const TIMELINE_MULT: Record<string, number> = {
  "As soon as possible": 1.18,
  "This quarter": 1.05,
  "Next 6 months": 1,
  "Still exploring": 0.97,
};

/** Share of total effort spent on product/UI design. */
const DESIGN_SHARE: Record<string, number> = {
  "Nothing yet — start from scratch": 0.18,
  "Brand exists, no product design": 0.13,
  "Designs ready to build": 0.04,
};

/**
 * Design maturity also changes total effort, not just how it is split. A
 * client arriving with build-ready designs genuinely removes work; starting
 * from a blank page adds discovery and revision cycles. Without this the
 * design lever would only reshuffle the breakdown and leave the price static.
 */
const DESIGN_EFFORT_MULT: Record<string, number> = {
  "Nothing yet — start from scratch": 1.08,
  "Brand exists, no product design": 1,
  "Designs ready to build": 0.88,
};

/** Floor on calendar time: some phases cannot be parallelised away. */
const MIN_CALENDAR_WEEKS: Record<string, number> = {
  "MVP — smallest thing that works": 4,
  "Full product": 8,
  "Rebuild of something existing": 8,
  "Add to an existing system": 3,
};

const INTEGRATION_WEEKS = 1.2;
const REGULATED_MULT = 1.25;

/** Defaults applied when the chat didn't establish a refinement. */
export const REFINEMENT_DEFAULTS = {
  scale: "1k–10k users",
  designState: "Brand exists, no product design",
  integrations: 2,
  regulated: false,
} as const;

/** Non-design workstream weights, normalised against whatever design takes. */
const BASE_SHARES: Record<string, number> = {
  "Discovery & scoping": 0.09,
  Engineering: 0.55,
  "QA & hardening": 0.13,
  "Delivery management": 0.11,
  "Launch & handover": 0.06,
};

export type PricingInput = EstimatorSlots & { _overrides?: LeverOverrides };

export type ResolvedInputs = {
  projectType: string;
  platform: string;
  scope: string;
  timeline: string;
  scale: string;
  designState: string;
  integrations: number;
  regulated: boolean;
  /** Refinements the visitor never confirmed — these widen the band. */
  assumed: string[];
};

/**
 * Merge chat answers, lever overrides and defaults into a full input set,
 * tracking which values the visitor never actually confirmed.
 */
export function resolveInputs(
  slots: EstimatorSlots,
  overrides: LeverOverrides = {},
): ResolvedInputs {
  const assumed: string[] = [];

  const pick = <K extends keyof typeof REFINEMENT_DEFAULTS>(
    key: K,
    fromSlots: unknown,
    fromOverride: unknown,
  ) => {
    if (fromOverride !== undefined) return fromOverride;
    if (fromSlots !== undefined) return fromSlots;
    assumed.push(key);
    return REFINEMENT_DEFAULTS[key];
  };

  return {
    projectType: slots.projectType ?? "Web app or platform",
    platform: slots.platform ?? "Web",
    scope: slots.scope ?? "Full product",
    timeline: overrides.timeline ?? slots.timeline ?? "Next 6 months",
    scale: pick("scale", slots.scale, overrides.scale) as string,
    designState: pick("designState", slots.designState, overrides.designState) as string,
    integrations: pick("integrations", slots.integrations, overrides.integrations) as number,
    regulated: pick("regulated", slots.regulated, overrides.regulated) as boolean,
    assumed,
  };
}

function round(value: number, to: number): number {
  return Math.round(value / to) * to;
}

function buildBreakdown(
  effortWeeks: number,
  costMid: number,
  spread: number,
  designState: string,
): EstimateLine[] {
  const designShare = DESIGN_SHARE[designState] ?? 0.13;
  const baseTotal = Object.values(BASE_SHARES).reduce((s, v) => s + v, 0);
  // Scale the non-design streams so every share still sums to exactly 1.
  const scale = (1 - designShare) / baseTotal;

  const shares = new Map<string, number>();
  for (const name of WORKSTREAMS) {
    shares.set(
      name,
      name === "Product & UI design" ? designShare : (BASE_SHARES[name] ?? 0) * scale,
    );
  }

  return WORKSTREAMS.map((name) => {
    const share = shares.get(name) ?? 0;
    const mid = costMid * share;
    return {
      name,
      share,
      lowUsd: round(mid * (1 - spread), 250),
      highUsd: round(mid * (1 + spread), 250),
      weeks: Math.round(effortWeeks * share * 10) / 10,
    };
  }).filter((line) => line.share > 0.001);
}

function teamShape(effortWeeks: number, timeline: string): { size: number; label: string } {
  // Bigger jobs justify more parallelism, but a small team is not made faster
  // by adding people to it.
  let size = Math.min(6, Math.max(2, Math.round(effortWeeks / 6)));
  if (timeline === "As soon as possible") size = Math.min(7, size + 1);

  if (size <= 2) return { size, label: "1 lead · 1 engineer" };
  if (size === 3) return { size, label: "1 lead · 2 engineers" };
  if (size === 4) return { size, label: "1 lead · 2 engineers · 1 designer" };
  if (size === 5) return { size, label: "1 lead · 3 engineers · 1 designer" };
  return { size, label: "1 lead · 3 engineers · 1 designer · 1 QA" };
}

function confidenceLabel(value: number): Estimate["confidenceLabel"] {
  if (value >= 0.8) return "Reasonably firm";
  if (value >= 0.6) return "Directional";
  return "Indicative";
}

/**
 * Price a project.
 *
 * `overrides` carries the interactive levers from the result screen, so moving
 * a toggle re-prices through this exact function — there is no second set of
 * pricing rules living in the UI to drift out of sync.
 */
export function priceProject(
  slots: EstimatorSlots,
  overrides: LeverOverrides = {},
  rateOverride?: number,
): Estimate {
  const input = resolveInputs(slots, overrides);
  const rate = weeklyRateUsd(rateOverride);

  const base = BASE_EFFORT_WEEKS[input.projectType] ?? 18;
  const scopeMult = SCOPE_MULT[input.scope] ?? 1;
  const platformMult = PLATFORM_MULT[input.platform] ?? 1;
  const scaleMult = SCALE_MULT[input.scale] ?? 1;
  const regulatedMult = input.regulated ? REGULATED_MULT : 1;
  const timelineMult = TIMELINE_MULT[input.timeline] ?? 1;
  const designMult = DESIGN_EFFORT_MULT[input.designState] ?? 1;

  const buildEffort =
    base * scopeMult * platformMult * scaleMult * regulatedMult * designMult;
  const integrationEffort = input.integrations * INTEGRATION_WEEKS;
  const effortWeeks = Math.max(2, buildEffort + integrationEffort);

  const costMid = effortWeeks * rate * timelineMult;

  // Confidence falls with each refinement the visitor never confirmed, and the
  // band widens to match — an estimate built on defaults should look like one.
  const confidence = Math.max(
    0.35,
    1 - input.assumed.length * 0.11 - ((slots.summary?.length ?? 0) < 40 ? 0.1 : 0),
  );
  const spread = 0.15 + (1 - confidence) * 0.22;

  const { size, label } = teamShape(effortWeeks, input.timeline);
  // Coordination overhead (N people never deliver N times as fast) plus a
  // floor, because discovery, review and release cycles take calendar time
  // however many engineers are on the job.
  const calendarWeeks = Math.max(
    MIN_CALENDAR_WEEKS[input.scope] ?? 4,
    Math.ceil((effortWeeks / size) * 1.25),
  );

  const drivers: Estimate["drivers"] = [];
  const note = (label: string, mult: number) => {
    if (Math.abs(mult - 1) < 0.001) return;
    const pct = Math.round((mult - 1) * 100);
    drivers.push({ label, effect: `${pct > 0 ? "+" : ""}${pct}%` });
  };
  note(`Scope: ${input.scope.replace(/ —.*/, "")}`, scopeMult);
  note(`Platform: ${input.platform}`, platformMult);
  note(`Scale: ${input.scale}`, scaleMult);
  note(`Timeline: ${input.timeline}`, timelineMult);
  note(`Design: ${input.designState.replace(/ —.*/, "")}`, designMult);
  if (input.regulated) note("Regulated data handling", REGULATED_MULT);
  if (input.integrations > 0) {
    drivers.push({
      label: `${input.integrations} integration${input.integrations === 1 ? "" : "s"}`,
      effect: `+${Math.round(integrationEffort * 10) / 10} wks`,
    });
  }
  drivers.sort(
    (a, b) => Math.abs(Number.parseFloat(b.effect)) - Math.abs(Number.parseFloat(a.effect)),
  );

  const assumptions = [
    `Blended delivery rate of ${formatRate(rate)} per person-week`,
    input.designState === "Designs ready to build"
      ? "Your existing designs are build-ready"
      : "Design is produced as part of this engagement",
    "One primary user journey in v1; secondary flows phased after launch",
    "Cloud hosting on a standard region, no bespoke data-residency requirement",
  ];
  for (const key of input.assumed) {
    assumptions.push(`${assumedLabel(key)} assumed — adjust it above to re-price`);
  }

  return EstimateSchema.parse({
    lowUsd: round(costMid * (1 - spread), 500),
    highUsd: round(costMid * (1 + spread), 500),
    effortWeeks: Math.round(effortWeeks * 10) / 10,
    durationWeeks: [calendarWeeks, Math.ceil(calendarWeeks * 1.3)],
    team: label,
    teamSize: size,
    blendedRateUsd: rate,
    breakdown: buildBreakdown(effortWeeks, costMid, spread, input.designState),
    confidence: Math.round(confidence * 100) / 100,
    confidenceLabel: confidenceLabel(confidence),
    drivers: drivers.slice(0, 8),
    assumptions: assumptions.slice(0, 8),
    inclusions: [
      "Discovery, architecture and a written scope you sign off",
      "Product and interface design through to production-ready specs",
      "Engineering, code review and automated test coverage",
      "QA, accessibility pass and performance budgets",
      "CI/CD, staging environment and one-command rollback",
      "Handover: documentation, runbooks and the code in your account",
    ],
    exclusions: [
      "Third-party licence and infrastructure fees (billed at cost)",
      "Content production, copywriting and photography",
      "Ongoing support and maintenance (quoted separately)",
      "Paid acquisition, SEO retainers or marketing spend",
    ],
    source: "engine",
  });
}

function assumedLabel(key: string): string {
  const labels: Record<string, string> = {
    scale: "User scale",
    designState: "Design starting point",
    integrations: "Integration count",
    regulated: "Non-regulated data",
  };
  return labels[key] ?? key;
}

function formatRate(rate: number): string {
  return `$${(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)}k`;
}

export { PRICING_VERSION };
