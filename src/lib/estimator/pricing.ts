import { PRICES_AS_OF, priceSelection, type RunCostLine } from "./catalog";
import {
  EstimateSchema,
  PRICING_VERSION,
  WORKSTREAMS,
  type BuildPlan,
  type Estimate,
  type EstimateLine,
  type EstimatorSlots,
  type LeverOverrides,
  type PlanBaseline,
  type RunCostSummary,
} from "./schema";

/**
 * Pricing engine.
 *
 * Deterministic, and the only place a dollar figure is ever produced. The
 * model may decide *what work a project needs* and *which products it will
 * pay for* — both judgement calls that a lookup table gets embarrassingly
 * wrong, because a three-node n8n workflow and a custom RAG platform are not
 * the same sixteen weeks. But it never multiplies anything. Effort becomes
 * money here, at our rate; subscriptions and usage become money in the
 * catalog, at list price.
 *
 * That split is what makes the number defensible. Every line has a source you
 * can point at, the same plan always prices identically, and a client who
 * challenges the figure can be walked through it line by line.
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

/**
 * Baseline effort in person-weeks for a full build of each project type.
 *
 * No longer the answer — the plan is. This is the sanity anchor a plan is
 * checked against, so that a model having a bad day cannot quote a six-month
 * platform as three weeks of work or a landing page as a year.
 */
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

/** Project types the estimator prices, in the order they are published. */
export const PROJECT_TYPES = Object.keys(BASE_EFFORT_WEEKS);

/**
 * Indicative build-cost band for a project type — MVP scope at the low end,
 * full product at the high end, both at the blended rate.
 *
 * Exists so the public estimator landing page can publish real numbers that
 * are derived from this engine rather than typed into a marketing file. If the
 * rate or the effort baselines move, the published bands move with them, and
 * the page can never quote a figure the tool itself would contradict.
 */
export function indicativeCostBand(
  projectType: string,
): { weeks: number; low: number; high: number } | null {
  const base = BASE_EFFORT_WEEKS[projectType];
  if (!base) return null;
  const rate = weeklyRateUsd();
  const round = (n: number) => Math.round(n / 1000) * 1000;
  return {
    weeks: base,
    low: round(base * SCOPE_MULT["MVP — smallest thing that works"] * rate),
    high: round(base * rate),
  };
}

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

/**
 * How metered usage scales with the user base.
 *
 * Steeper than `SCALE_MULT`, and deliberately so: ten times the users is
 * roughly ten times the API calls, but nothing like ten times the engineering.
 * Conflating the two is why "it's just a bigger version" quotes go wrong.
 */
export const SCALE_USAGE_MULT: Record<string, number> = {
  "Under 1k users": 0.35,
  "1k–10k users": 1,
  "10k–100k users": 4,
  "100k+ / high transaction volume": 14,
};

/** Rush premium: compressed schedules cost more per unit of work delivered. */
const TIMELINE_MULT: Record<string, number> = {
  "As soon as possible": 1.18,
  "This quarter": 1.05,
  "Next 6 months": 1,
  "Still exploring": 0.97,
};

/** Share of total effort spent on product/UI design. Legacy path only. */
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

/**
 * How far a plan may sit from the anchor before we pull it back.
 *
 * Wide on purpose. The whole reason the model plans the work is that project
 * types contain a huge spread — "AI / automation" covers both a weekend of
 * n8n wiring and a year of platform engineering — and a tight band would
 * quietly re-impose the lookup table this replaced. These bounds only catch
 * output that is obviously wrong, not output that is merely surprising.
 */
const PLAN_FLOOR_RATIO = 0.3;
const PLAN_CEILING_RATIO = 2.6;

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

/** The inputs a plan should be authored against, captured at plan time. */
export function planBaseline(resolved: ResolvedInputs): PlanBaseline {
  return {
    scale: resolved.scale as PlanBaseline["scale"],
    designState: resolved.designState as PlanBaseline["designState"],
    integrations: resolved.integrations,
    regulated: resolved.regulated,
  };
}

function round(value: number, to: number): number {
  return Math.round(value / to) * to;
}

/* ------------------------------ effort models ----------------------------- */

/**
 * Effort for a project of this shape, with no plan to go on.
 *
 * Also the anchor a plan is sanity-checked against, which is the only reason
 * the old lookup table survives at all.
 */
export function anchorEffortWeeks(input: ResolvedInputs): number {
  const base = BASE_EFFORT_WEEKS[input.projectType] ?? 18;
  const buildEffort =
    base *
    (SCOPE_MULT[input.scope] ?? 1) *
    (PLATFORM_MULT[input.platform] ?? 1) *
    (SCALE_MULT[input.scale] ?? 1) *
    (input.regulated ? REGULATED_MULT : 1) *
    (DESIGN_EFFORT_MULT[input.designState] ?? 1);

  return Math.max(2, buildEffort + input.integrations * INTEGRATION_WEEKS);
}

type PlanEffort = {
  effortWeeks: number;
  lines: EstimateLine[];
  /** True when the plan sat outside the sanity band and was pulled back. */
  clamped: boolean;
};

/**
 * Turn a plan's task list into total effort, applying lever deltas.
 *
 * The deltas are ratios rather than multipliers because the plan already
 * priced its own baseline: a plan written for 10k users at 1.2× must not be
 * multiplied by 1.2 again. Moving the scale lever to 100k applies 1.45/1.2,
 * which is the honest incremental effect of the change the visitor just made.
 */
function planEffort(
  plan: BuildPlan,
  input: ResolvedInputs,
  anchor: number,
): PlanEffort {
  const base = plan.baseline;

  const scaleDelta = (SCALE_MULT[input.scale] ?? 1) / (SCALE_MULT[base.scale] ?? 1);
  const designDelta =
    (DESIGN_EFFORT_MULT[input.designState] ?? 1) /
    (DESIGN_EFFORT_MULT[base.designState] ?? 1);
  const regulatedDelta =
    (input.regulated ? REGULATED_MULT : 1) / (base.regulated ? REGULATED_MULT : 1);

  const leverMult = scaleDelta * designDelta * regulatedDelta;

  const taskWeeks = plan.tasks.reduce((sum, task) => sum + task.weeks, 0);
  // Integration count is additive rather than multiplicative: adding a second
  // payment provider is a known unit of work, not a percentage of the project.
  const integrationDelta = (input.integrations - base.integrations) * INTEGRATION_WEEKS;

  const raw = Math.max(1, taskWeeks * leverMult + integrationDelta);

  const floor = anchor * PLAN_FLOOR_RATIO;
  const ceiling = anchor * PLAN_CEILING_RATIO;
  const effortWeeks = Math.min(ceiling, Math.max(floor, raw));
  const clamped = Math.abs(effortWeeks - raw) > 0.05;

  if (clamped) {
    console.warn(
      `[estimator] plan effort ${raw.toFixed(1)}w outside band ` +
        `[${floor.toFixed(1)}, ${ceiling.toFixed(1)}] for ${input.projectType}; ` +
        `pricing at ${effortWeeks.toFixed(1)}w`,
    );
  }

  // Scale every task by the same factor so the breakdown still sums to the
  // total. A breakdown whose lines do not add up to the headline is the
  // fastest way to lose an argument about a quote.
  const factor = raw > 0 ? effortWeeks / raw : 1;
  const scaledTaskWeeks = taskWeeks * leverMult * factor;

  const lines: EstimateLine[] = plan.tasks
    .map((task) => {
      const weeks = task.weeks * leverMult * factor;
      return {
        name: task.name,
        discipline: task.discipline,
        note: task.note,
        share: effortWeeks > 0 ? weeks / effortWeeks : 0,
        weeks: Math.round(weeks * 10) / 10,
        lowUsd: 0,
        highUsd: 0,
      };
    })
    .filter((line) => line.weeks > 0);

  // Lever-added integration work has to appear somewhere, or the visitor sees
  // the total move with nothing in the table explaining why.
  const residual = effortWeeks - scaledTaskWeeks;
  if (residual > 0.15) {
    const count = input.integrations - base.integrations;
    lines.push({
      name:
        count > 0
          ? `${count} additional integration${count === 1 ? "" : "s"}`
          : "Additional scope",
      discipline: "Integrations",
      share: residual / effortWeeks,
      weeks: Math.round(residual * 10) / 10,
      lowUsd: 0,
      highUsd: 0,
    });
  }

  return { effortWeeks, lines, clamped };
}

/** Generic six-workstream split, used when there is no plan to break down. */
function genericBreakdown(effortWeeks: number, designState: string): EstimateLine[] {
  const designShare = DESIGN_SHARE[designState] ?? 0.13;
  const baseTotal = Object.values(BASE_SHARES).reduce((s, v) => s + v, 0);
  // Scale the non-design streams so every share still sums to exactly 1.
  const scale = (1 - designShare) / baseTotal;

  return WORKSTREAMS.map((name) => {
    const share =
      name === "Product & UI design" ? designShare : (BASE_SHARES[name] ?? 0) * scale;
    return {
      name,
      discipline: name,
      share,
      weeks: Math.round(effortWeeks * share * 10) / 10,
      lowUsd: 0,
      highUsd: 0,
    };
  }).filter((line) => line.share > 0.001);
}

/** Money onto an effort breakdown, once the total cost is known. */
function costBreakdown(lines: EstimateLine[], costMid: number, spread: number): EstimateLine[] {
  return lines.map((line) => {
    const mid = costMid * line.share;
    return {
      ...line,
      lowUsd: round(mid * (1 - spread), 250),
      highUsd: round(mid * (1 + spread), 250),
    };
  });
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

/* ------------------------------- run costs ------------------------------- */

/**
 * Price the monthly bill.
 *
 * The band is asymmetric and that is not sloppiness. Subscriptions are a known
 * quantity — n8n Cloud Pro is $60 whatever happens. Metered usage is a
 * projection about someone else's business, and projections of API volume are
 * far more often low than high, so the ceiling sits further from the estimate
 * than the floor does.
 */
export function priceRunCosts(
  plan: BuildPlan | undefined,
  input: ResolvedInputs,
  buildMidUsd: number,
): RunCostSummary | undefined {
  if (!plan || plan.runCosts.length === 0) return undefined;

  const usageMultiplier =
    (SCALE_USAGE_MULT[input.scale] ?? 1) / (SCALE_USAGE_MULT[plan.baseline.scale] ?? 1);

  const lines: RunCostLine[] = [];
  for (const selection of plan.runCosts) {
    const line = priceSelection(selection, usageMultiplier);
    // A key that is not in the catalog is dropped rather than guessed at. The
    // prompt lists every valid key, so this is a model error, not a gap.
    if (!line) {
      console.warn(`[estimator] unknown catalog key from model: ${selection.key}`);
      continue;
    }
    lines.push(line);
  }

  if (lines.length === 0) return undefined;

  lines.sort((a, b) => b.monthlyUsd - a.monthlyUsd);

  const fixed = lines.reduce((sum, l) => sum + l.fixedUsd, 0);
  const metered = lines.reduce((sum, l) => sum + l.meteredUsd, 0);
  const mid = fixed + metered;

  const monthlyLowUsd = fixed + metered * 0.6;
  const monthlyHighUsd = fixed + metered * 2;

  return {
    lines,
    monthlyLowUsd: Math.round(monthlyLowUsd),
    monthlyMidUsd: Math.round(mid),
    monthlyHighUsd: Math.round(monthlyHighUsd),
    firstYearLowUsd: round(buildMidUsd * 0.85 + monthlyLowUsd * 12, 500),
    firstYearHighUsd: round(buildMidUsd * 1.15 + monthlyHighUsd * 12, 500),
    pricesAsOf: PRICES_AS_OF,
  };
}

/* --------------------------------- pricing -------------------------------- */

export type PriceProjectInput = {
  slots: EstimatorSlots;
  /** Interactive levers from the result screen. */
  overrides?: LeverOverrides;
  /** The model's build plan. Without it, pricing falls back to the anchor table. */
  plan?: BuildPlan;
  /** Server rate, passed through so the browser re-prices at the same figure. */
  rate?: number;
};

/**
 * Price a project.
 *
 * Pure and isomorphic: the result screen re-runs this in the browser when a
 * lever moves, so there is exactly one set of pricing rules and no chance of
 * the UI drifting from the server. Nothing here reads the network, and the
 * only environment it touches is the rate, which the caller can supply.
 */
export function priceProject({
  slots,
  overrides = {},
  plan,
  rate: rateOverride,
}: PriceProjectInput): Estimate {
  const input = resolveInputs(slots, overrides);
  const rate = weeklyRateUsd(rateOverride);
  const anchor = anchorEffortWeeks(input);

  const effort = plan
    ? planEffort(plan, input, anchor)
    : {
        effortWeeks: anchor,
        lines: genericBreakdown(anchor, input.designState),
        clamped: false,
      };

  const effortWeeks = Math.max(1, effort.effortWeeks);
  const timelineMult = TIMELINE_MULT[input.timeline] ?? 1;
  const costMid = effortWeeks * rate * timelineMult;

  // Confidence falls with each refinement the visitor never confirmed, and the
  // band widens to match — an estimate built on defaults should look like one.
  // A plan that had to be clamped is by definition one we trust less.
  const confidence = Math.max(
    0.35,
    1 -
      input.assumed.length * 0.11 -
      ((slots.summary?.length ?? 0) < 40 ? 0.1 : 0) -
      (effort.clamped ? 0.12 : 0) -
      (plan ? 0 : 0.05),
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
  const note = (driverLabel: string, mult: number) => {
    if (Math.abs(mult - 1) < 0.001) return;
    const pct = Math.round((mult - 1) * 100);
    drivers.push({ label: driverLabel, effect: `${pct > 0 ? "+" : ""}${pct}%` });
  };

  // With a plan, the multipliers below are already inside the task estimates,
  // so reporting them as drivers would claim an effect that was never applied
  // twice. What actually drove a planned quote is the work itself, so the
  // largest tasks are the honest answer.
  if (plan) {
    for (const line of [...effort.lines].sort((a, b) => b.weeks - a.weeks).slice(0, 5)) {
      drivers.push({
        label: line.name,
        effect: `${line.weeks} wk${line.weeks === 1 ? "" : "s"}`,
      });
    }
    note(`Timeline: ${input.timeline}`, timelineMult);
  } else {
    note(`Scope: ${input.scope.replace(/ —.*/, "")}`, SCOPE_MULT[input.scope] ?? 1);
    note(`Platform: ${input.platform}`, PLATFORM_MULT[input.platform] ?? 1);
    note(`Scale: ${input.scale}`, SCALE_MULT[input.scale] ?? 1);
    note(`Timeline: ${input.timeline}`, timelineMult);
    note(
      `Design: ${input.designState.replace(/ —.*/, "")}`,
      DESIGN_EFFORT_MULT[input.designState] ?? 1,
    );
    if (input.regulated) note("Regulated data handling", REGULATED_MULT);
    if (input.integrations > 0) {
      drivers.push({
        label: `${input.integrations} integration${input.integrations === 1 ? "" : "s"}`,
        effect: `+${Math.round(input.integrations * INTEGRATION_WEEKS * 10) / 10} wks`,
      });
    }
    drivers.sort(
      (a, b) => Math.abs(Number.parseFloat(b.effect)) - Math.abs(Number.parseFloat(a.effect)),
    );
  }

  const runCosts = priceRunCosts(plan, input, costMid);

  const assumptions = [
    `Blended delivery rate of ${formatRate(rate)} per person-week`,
    input.designState === "Designs ready to build"
      ? "Your existing designs are build-ready"
      : "Design is produced as part of this engagement",
    "One primary user journey in v1; secondary flows phased after launch",
  ];
  if (runCosts) {
    assumptions.push(
      `Third-party pricing checked ${runCosts.pricesAsOf}; usage volumes are projections, not commitments`,
    );
  } else {
    assumptions.push("Cloud hosting on a standard region, no bespoke data-residency requirement");
  }
  for (const key of input.assumed) {
    assumptions.push(`${assumedLabel(key)} assumed — adjust it above to re-price`);
  }

  // Licence and infrastructure fees are only an exclusion when we have not
  // costed them. Once the run-cost table exists, listing them as excluded is
  // simply false.
  const exclusions = [
    "Content production, copywriting and photography",
    "Ongoing support and maintenance (quoted separately)",
    "Paid acquisition, SEO retainers or marketing spend",
  ];
  if (!runCosts) {
    exclusions.unshift("Third-party licence and infrastructure fees (billed at cost)");
  } else {
    exclusions.push("Third-party fees are billed to you directly by each vendor, at cost");
  }

  return EstimateSchema.parse({
    lowUsd: round(costMid * (1 - spread), 500),
    highUsd: round(costMid * (1 + spread), 500),
    effortWeeks: Math.round(effortWeeks * 10) / 10,
    durationWeeks: [calendarWeeks, Math.ceil(calendarWeeks * 1.3)],
    team: label,
    teamSize: size,
    blendedRateUsd: rate,
    breakdown: costBreakdown(effort.lines, costMid, spread),
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
    exclusions: exclusions.slice(0, 8),
    runCosts,
    approach: plan?.approach || undefined,
    plan,
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
