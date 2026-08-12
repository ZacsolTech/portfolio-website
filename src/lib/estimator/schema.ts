import { z } from "zod";
import { RUN_COST_CATEGORIES } from "./catalog";

/**
 * Cost estimator contract.
 *
 * The estimator answers "what will this cost?", where the consultant answers
 * "what should we build?". That difference drives the design.
 *
 * Cost has two halves and they are produced differently. The *build* is a plan:
 * the model reads the conversation and proposes the actual pieces of work this
 * specific project needs, and the engine turns person-weeks into money at our
 * rate. The *running* cost is a shopping list: the model picks products and
 * projects how hard they get used, and `catalog.ts` supplies every price.
 *
 * Neither half lets the model emit a dollar figure. It contributes judgement —
 * how much work, which tools, what volume — and arithmetic stays in code, so
 * the same plan always prices identically and any line can be defended to a
 * client who pushes back on it.
 */

/* --------------------------------- inputs -------------------------------- */

export const PROJECT_TYPES = [
  "Web app or platform",
  "Mobile app",
  "Marketing website",
  "Internal tool",
  "AI / automation",
  "Data & analytics",
  "E-commerce",
] as const;

export const PLATFORMS = ["Web", "Mobile", "Web + mobile", "Internal only"] as const;

export const SCOPES = [
  "MVP — smallest thing that works",
  "Full product",
  "Rebuild of something existing",
  "Add to an existing system",
] as const;

export const SCALES = [
  "Under 1k users",
  "1k–10k users",
  "10k–100k users",
  "100k+ / high transaction volume",
] as const;

export const TIMELINES = [
  "As soon as possible",
  "This quarter",
  "Next 6 months",
  "Still exploring",
] as const;

export const DESIGN_STATES = [
  "Nothing yet — start from scratch",
  "Brand exists, no product design",
  "Designs ready to build",
] as const;

export const ProjectTypeSchema = z.enum(PROJECT_TYPES);
export const PlatformSchema = z.enum(PLATFORMS);
export const ScopeSchema = z.enum(SCOPES);
export const ScaleSchema = z.enum(SCALES);
export const TimelineSchema = z.enum(TIMELINES);
export const DesignStateSchema = z.enum(DESIGN_STATES);

/** The five the conversation must establish before pricing. */
export const REQUIRED_SLOTS = [
  "summary",
  "projectType",
  "platform",
  "scope",
  "timeline",
] as const;

export type RequiredSlotKey = (typeof REQUIRED_SLOTS)[number];

export const SLOT_LABELS: Record<RequiredSlotKey, string> = {
  summary: "What you're building",
  projectType: "Project type",
  platform: "Platform",
  scope: "Scope",
  timeline: "Timeline",
};

export const EstimatorSlotsSchema = z.object({
  /** Free-text description in the visitor's own words. */
  summary: z.string().min(1).max(1200).optional(),
  projectType: ProjectTypeSchema.optional(),
  platform: PlatformSchema.optional(),
  scope: ScopeSchema.optional(),
  timeline: TimelineSchema.optional(),

  /**
   * Refinements. Never blocking questions — they default to the common case
   * and surface as adjustable levers on the result, so the chat stays short
   * while the visitor still controls what drives the number.
   */
  scale: ScaleSchema.optional(),
  designState: DesignStateSchema.optional(),
  integrations: z.number().int().min(0).max(20).optional(),
  regulated: z.boolean().optional(),
});

export type EstimatorSlots = z.infer<typeof EstimatorSlotsSchema>;

/* --------------------------------- levers -------------------------------- */

/**
 * Post-estimate toggles. Each maps onto the same pricing engine inputs the
 * chat fills, so moving a lever re-prices through exactly one code path —
 * there is no second, drifting set of pricing rules for the UI.
 */
export const LEVER_KEYS = [
  "scale",
  "designState",
  "integrations",
  "regulated",
  "timeline",
] as const;

export type LeverKey = (typeof LEVER_KEYS)[number];

export const LeverOverridesSchema = z.object({
  scale: ScaleSchema.optional(),
  designState: DesignStateSchema.optional(),
  integrations: z.number().int().min(0).max(20).optional(),
  regulated: z.boolean().optional(),
  timeline: TimelineSchema.optional(),
});

export type LeverOverrides = z.infer<typeof LeverOverridesSchema>;

/* ------------------------------- build plan ------------------------------- */

/**
 * Disciplines a task can belong to. Kept short and recognisable: this is the
 * axis the breakdown groups by, and a client scanning it should be able to
 * tell design work from engineering work without reading the task names.
 */
export const DISCIPLINES = [
  "Discovery & scoping",
  "Product & UI design",
  "Engineering",
  "AI & data",
  "Integrations",
  "QA & hardening",
  "Delivery management",
  "Launch & handover",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

/**
 * One named piece of work. `weeks` is person-weeks of effort, not calendar
 * time — two engineers on a 4-week task is 8 person-weeks — because money
 * tracks effort while the schedule tracks parallelism.
 */
export const BuildTaskSchema = z.object({
  name: z.string().min(3).max(90),
  discipline: z.enum(DISCIPLINES),
  weeks: z.number().min(0.2).max(40),
  /** Why this task is here, in project terms. Shown on expand. */
  note: z.string().max(220).optional(),
});

export type BuildTask = z.infer<typeof BuildTaskSchema>;

/** A product the project will pay for monthly. Keys are validated against the catalog. */
export const RunCostSelectionSchema = z.object({
  key: z.string().min(2).max(60),
  /** Seats or instances. Only meaningful for per-seat entries. */
  qty: z.number().int().min(1).max(500).optional(),
  usage: z
    .array(
      z.object({
        meter: z.string().min(1).max(40),
        volume: z.number().min(0).max(1e12),
      }),
    )
    .max(6)
    .optional(),
  why: z.string().max(200).optional(),
});

export type RunCostSelection = z.infer<typeof RunCostSelectionSchema>;

/**
 * The conditions a plan was authored under.
 *
 * Filled by the server from the resolved inputs at plan time, never by the
 * model. It exists so the result-screen levers can work without a second model
 * call: the plan already accounts for the scale and design maturity it was
 * written for, so dragging a lever applies the *ratio* between planned and
 * current rather than stacking a multiplier the model already priced in.
 */
export const PlanBaselineSchema = z.object({
  scale: ScaleSchema,
  designState: DesignStateSchema,
  integrations: z.number().int().min(0).max(20),
  regulated: z.boolean(),
});

export type PlanBaseline = z.infer<typeof PlanBaselineSchema>;

/** The model's read on how to build this thing. */
export const BuildPlanSchema = z.object({
  /** 1-2 sentences on the architecture chosen and why. */
  approach: z.string().max(600).default(""),
  tasks: z.array(BuildTaskSchema).min(1).max(16),
  runCosts: z.array(RunCostSelectionSchema).max(14).default([]),
  baseline: PlanBaselineSchema,
  source: z.enum(["gemini", "rules"]),
});

export type BuildPlan = z.infer<typeof BuildPlanSchema>;

/* --------------------------------- output -------------------------------- */

export const WORKSTREAMS = [
  "Discovery & scoping",
  "Product & UI design",
  "Engineering",
  "QA & hardening",
  "Delivery management",
  "Launch & handover",
] as const;

export const EstimateLineSchema = z.object({
  name: z.string().min(2).max(90),
  /** Share of total effort, 0–1. */
  share: z.number().min(0).max(1),
  lowUsd: z.number().nonnegative(),
  highUsd: z.number().nonnegative(),
  weeks: z.number().nonnegative(),
  /** Absent on legacy estimates priced before the plan-driven engine. */
  discipline: z.string().max(40).optional(),
  note: z.string().max(220).optional(),
});

export type EstimateLine = z.infer<typeof EstimateLineSchema>;

/* ------------------------------- run costs ------------------------------- */

export const RunCostLineSchema = z.object({
  key: z.string(),
  vendor: z.string().max(60),
  plan: z.string().max(80),
  category: z.enum(RUN_COST_CATEGORIES),
  /** Subscription portion — a number we can state with confidence. */
  fixedUsd: z.number().nonnegative(),
  /** Usage portion — a projection, and the part that actually moves. */
  meteredUsd: z.number().nonnegative(),
  monthlyUsd: z.number().nonnegative(),
  meterDetail: z.array(z.string().max(160)).max(6).default([]),
  why: z.string().max(200).optional(),
  note: z.string().max(240).optional(),
  cheaperAlternative: z.string().max(240).optional(),
});

export type RunCostLine = z.infer<typeof RunCostLineSchema>;

/**
 * The monthly bill, and what a first year actually costs.
 *
 * `firstYearUsd` exists because the build price alone has misled every client
 * who has ever signed one. A $20k automation that costs $600 a month to run is
 * a $27k first year, and they should see that before they sign, not in month
 * three.
 */
export const RunCostSummarySchema = z.object({
  lines: z.array(RunCostLineSchema).max(16),
  monthlyLowUsd: z.number().nonnegative(),
  monthlyMidUsd: z.number().nonnegative(),
  monthlyHighUsd: z.number().nonnegative(),
  /** Build (mid) plus twelve months of running cost, as a band. */
  firstYearLowUsd: z.number().nonnegative(),
  firstYearHighUsd: z.number().nonnegative(),
  /** Month the catalog prices were last verified. */
  pricesAsOf: z.string().max(20),
});

export type RunCostSummary = z.infer<typeof RunCostSummarySchema>;

export const EstimateSchema = z.object({
  lowUsd: z.number().positive(),
  highUsd: z.number().positive(),
  /** Person-weeks of effort behind the band, before rate. */
  effortWeeks: z.number().positive(),
  /** Calendar duration, which parallelism makes shorter than effort. */
  durationWeeks: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  team: z.string().min(4).max(120),
  teamSize: z.number().positive(),
  blendedRateUsd: z.number().positive(),
  breakdown: z.array(EstimateLineSchema).min(3),
  /** 0–1. Falls as unanswered refinements accumulate. */
  confidence: z.number().min(0).max(1),
  confidenceLabel: z.enum(["Indicative", "Directional", "Reasonably firm"]),
  /** Human-readable multipliers that moved the number, biggest first. */
  drivers: z.array(z.object({ label: z.string(), effect: z.string() })).max(8),
  assumptions: z.array(z.string()).min(2).max(8),
  inclusions: z.array(z.string()).min(3).max(10),
  exclusions: z.array(z.string()).min(2).max(8),
  /** Model-written context. Never the source of any number. */
  narrative: z.string().max(700).optional(),
  risks: z.array(z.string().max(200)).max(5).optional(),

  /** The monthly bill. Absent only when the project genuinely has no run cost. */
  runCosts: RunCostSummarySchema.optional(),
  /** The model's one-paragraph read on the architecture it scoped. */
  approach: z.string().max(600).optional(),
  /**
   * The plan this was priced from, carried on the estimate so the result
   * screen can re-price levers in the browser through the same function the
   * server used — see the note on `priceProject`.
   */
  plan: BuildPlanSchema.optional(),
  source: z.enum(["engine", "engine+ai"]),
});

export type Estimate = z.infer<typeof EstimateSchema>;

/* ------------------------------ conversation ----------------------------- */

export const EstimatorChatTurnSchema = z.object({
  reply: z.string().min(1).max(1500),
  slots: EstimatorSlotsSchema.default({}),
  wantsEstimate: z.boolean().default(false),
  suggestions: z.array(z.string().min(1).max(48)).max(2).default([]),
});

export type EstimatorChatTurn = z.infer<typeof EstimatorChatTurnSchema>;

export const ESTIMATOR_STAGES = ["gathering", "ready", "estimate"] as const;
export type EstimatorStage = (typeof ESTIMATOR_STAGES)[number];

/* -------------------------------- display -------------------------------- */

export function formatUsd(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${k >= 100 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

export function formatBand(low: number, high: number): string {
  return `${formatUsd(low)} – ${formatUsd(high)}`;
}

/**
 * Monthly figures are small and compared against each other, so they keep
 * their real digits — "$84/mo" and "$91/mo" both collapsing to "$0.1k" would
 * make the run-cost table useless.
 */
export function formatMonthly(value: number): string {
  if (value === 0) return "$0";
  if (value < 10) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString()}`;
}

export const ESTIMATOR_PROMPT_VERSION = "estimator-chat-v2";
export const ESTIMATOR_PLAN_VERSION = "estimator-plan-v1";
export const PRICING_VERSION = "estimator-pricing-v2";
