import { z } from "zod";

/**
 * Cost estimator contract.
 *
 * The estimator answers "what will this cost?", where the consultant answers
 * "what should we build?". That difference drives the design: the model runs
 * the conversation, but the number itself comes from a deterministic pricing
 * engine (see pricing.ts). The same answers must always produce the same
 * quote, and every figure has to be explainable to a client who pushes back.
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
  name: z.string().min(2).max(60),
  /** Share of total effort, 0–1. */
  share: z.number().min(0).max(1),
  lowUsd: z.number().nonnegative(),
  highUsd: z.number().nonnegative(),
  weeks: z.number().nonnegative(),
});

export type EstimateLine = z.infer<typeof EstimateLineSchema>;

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
  source: z.enum(["engine", "engine+ai"]),
});

export type Estimate = z.infer<typeof EstimateSchema>;

/* ------------------------------ conversation ----------------------------- */

export const EstimatorChatTurnSchema = z.object({
  reply: z.string().min(1).max(1500),
  slots: EstimatorSlotsSchema.default({}),
  wantsEstimate: z.boolean().default(false),
  suggestions: z.array(z.string().min(1).max(48)).max(4).default([]),
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

export const ESTIMATOR_PROMPT_VERSION = "estimator-chat-v1";
export const PRICING_VERSION = "estimator-pricing-v1";
