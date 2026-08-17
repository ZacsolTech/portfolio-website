import { z } from "zod";

/** Service lines the consultant may recommend (matches lib/content/services). */
export const SERVICE_SLUGS = [
  "web-development",
  "mobile-app-development",
  "ai-automation",
  "data-science",
  "custom-software",
  "ui-ux-design",
  "business-process-automation",
  "content-automation",
] as const;

export const ServiceSlugSchema = z.enum(SERVICE_SLUGS);
export type ServiceSlug = z.infer<typeof ServiceSlugSchema>;

/* ------------------------------------------------------------------ *
 * Intake slots
 *
 * Production discovery shape — outcome → who → today → v1 → timing —
 * the same spine a senior SE uses on a first call. Readiness is "every
 * required slot has a value", never a regex over what the visitor typed.
 * ------------------------------------------------------------------ */

export const TIMING_OPTIONS = [
  "As soon as possible",
  "Within 3 months",
  "3–6 months",
  "Still exploring",
] as const;

export const TimingSchema = z.enum(TIMING_OPTIONS);

/** @deprecated Prefer TIMING_OPTIONS — kept for estimator handoff maps. */
export const TIMELINE_OPTIONS = TIMING_OPTIONS;
/** @deprecated Prefer TimingSchema */
export const TimelineSchema = TimingSchema;

/** Order is the order we prefer to ask in when nudging the model. */
export const SLOT_KEYS = ["outcome", "audience", "today", "v1", "timing"] as const;

export type SlotKey = (typeof SLOT_KEYS)[number];

export const SLOT_LABELS: Record<SlotKey, string> = {
  outcome: "Goal",
  audience: "Who it's for",
  today: "How you cope now",
  v1: "First release",
  timing: "Timing",
};

const SlotsObjectSchema = z.object({
  outcome: z.string().min(1).max(1200).optional(),
  audience: z.string().min(1).max(160).optional(),
  today: z.string().min(1).max(280).optional(),
  v1: z.string().min(1).max(400).optional(),
  timing: TimingSchema.optional(),
});

/**
 * Accept in-flight sessions that still carry the old slot names
 * (problem/industry/current/scale/timeline) and map them forward once.
 */
export const SlotsSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (o.problem && !o.outcome) o.outcome = o.problem;
  if (o.industry && !o.audience) o.audience = o.industry;
  if (o.current && !o.today) o.today = o.current;
  if (o.scale && !o.v1) o.v1 = `Rough scale mentioned: ${String(o.scale)}`;
  if (o.timeline && !o.timing) o.timing = o.timeline;
  delete o.problem;
  delete o.industry;
  delete o.current;
  delete o.scale;
  delete o.timeline;
  return o;
}, SlotsObjectSchema);

export type Slots = z.infer<typeof SlotsObjectSchema>;

/** Shape the blueprint generator and rules engine consume. */
export const ConsultantAnswersSchema = z.object({
  audience: z.string().min(1).max(160),
  today: z.string().min(1).max(280),
  v1: z.string().min(1).max(400),
  timing: z.string().min(1),
});

export type ConsultantAnswers = z.infer<typeof ConsultantAnswersSchema>;

/* ------------------------------------------------------------------ *
 * Conversation
 * ------------------------------------------------------------------ */

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * `gathering` → still asking. `ready` → all slots filled, waiting for the
 * visitor to confirm. `blueprint` → generated. `captured` → lead submitted.
 */
export const STAGES = ["gathering", "ready", "blueprint", "captured"] as const;
export type Stage = (typeof STAGES)[number];

/** What one model turn returns. `reply` streams; the rest arrives at the end. */
export const ChatTurnSchema = z.object({
  reply: z.string().min(1).max(1500),
  slots: SlotsObjectSchema.default({}),
  /** Model's own read on whether the visitor just asked to see the blueprint. */
  wantsBlueprint: z.boolean().default(false),
  /** Optional tappable suggestions for the next answer. */
  suggestions: z.array(z.string().min(1).max(48)).max(2).default([]),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

/* ------------------------------------------------------------------ *
 * Blueprint
 * ------------------------------------------------------------------ */

export const BlueprintPhaseSchema = z.object({
  name: z.string().min(2).max(120),
  weeks: z.number().int().min(1).max(16),
});

export const BlueprintSchema = z.object({
  title: z.string().min(8).max(160),
  why: z.string().min(20).max(800),
  serviceSlug: ServiceSlugSchema,
  /** Human service-line label shown as project-type badge */
  serviceTitle: z.string().min(2).max(80),
  features: z.array(z.string().min(2).max(80)).min(4).max(12),
  stack: z.array(z.string().min(1).max(40)).min(3).max(10),
  phases: z.array(BlueprintPhaseSchema).min(2).max(6),
  team: z.string().min(4).max(120),
  /** Inclusive USD band before display formatting */
  costBandUsd: z.tuple([z.number().positive(), z.number().positive()]),
  /** Inclusive week band after urgency multipliers */
  durationWeeks: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  assumptions: z.array(z.string().min(4).max(200)).min(2).max(8).optional(),
  /** Concrete next actions shown behind the gate. */
  risks: z.array(z.string().min(4).max(200)).max(5).optional(),
  promptVersion: z.string().optional(),
  source: z.enum(["gemini", "rules"]),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintPhase = z.infer<typeof BlueprintPhaseSchema>;

/* ------------------------------------------------------------------ *
 * Sizing multipliers
 * ------------------------------------------------------------------ */

export const URGENCY_MULT: Record<string, number> = {
  "As soon as possible": 1.2,
  "Within 3 months": 1.05,
  "3–6 months": 1,
  "Still exploring": 0.95,
};

/**
 * Soft size signal from "who it's for" — only when they volunteer headcount.
 * Neutral (1) when they don't; we no longer force a fake user-count band.
 */
export function inferSizeMult(audience: string | undefined): number {
  if (!audience) return 1;
  const v = audience.toLowerCase();
  const num = Number(v.match(/\b(\d[\d,]*)\b/)?.[1]?.replace(/,/g, ""));
  if (Number.isFinite(num) && num > 0) {
    if (num >= 250) return 1.7;
    if (num >= 50) return 1.3;
    if (num >= 10) return 1;
    return 0.85;
  }
  if (/enterprise|nationwide|thousands|hundreds of/.test(v)) return 1.7;
  if (/department|whole company|all staff/.test(v)) return 1.3;
  if (/solo|just me|myself|only me|one person/.test(v)) return 0.85;
  if (/small team|handful|few people|couple of/.test(v)) return 0.95;
  return 1;
}

export function normalizeTiming(
  value: string | undefined,
): (typeof TIMING_OPTIONS)[number] {
  if (!value) return "Within 3 months";
  const exact = TIMING_OPTIONS.find((o) => o === value);
  if (exact) return exact;

  const v = value.toLowerCase();
  if (/asap|urgent|immediate|right away|as soon|yesterday|this month/.test(v)) {
    return "As soon as possible";
  }
  if (/explor|not sure|no rush|someday|just looking|research/.test(v)) {
    return "Still exploring";
  }
  if (/3\s*[-–]\s*6|six month|6 month|half year|two quarters/.test(v)) return "3–6 months";
  if (/month|quarter|soon|this year|weeks?/.test(v)) return "Within 3 months";
  return "Within 3 months";
}

/** @deprecated Prefer normalizeTiming */
export const normalizeTimeline = normalizeTiming;

/** Coerce partial/free-text slots into the canonical answer shape. */
export function slotsToAnswers(slots: Slots): ConsultantAnswers {
  return {
    audience: slots.audience?.trim().slice(0, 160) || "Not specified yet",
    today: slots.today?.trim().slice(0, 280) || "Not described yet",
    v1: slots.v1?.trim().slice(0, 400) || "Core path only",
    timing: normalizeTiming(slots.timing),
  };
}

export function formatMoneyBand(lo: number, hi: number): string {
  const round = (n: number) => Math.round(n / 500) * 500;
  const fmt = (n: number) => {
    const k = round(n) / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  };
  return `${fmt(lo)} – ${fmt(hi)}`;
}

export function applyMultipliers(
  base: [number, number],
  phaseWeeks: number,
  answers: Pick<ConsultantAnswers, "audience" | "timing">,
): { costBandUsd: [number, number]; durationWeeks: [number, number] } {
  const mult = inferSizeMult(answers.audience) * (URGENCY_MULT[answers.timing] ?? 1);
  const costLo = base[0] * mult;
  const costHi = base[1] * mult;
  const wLo = Math.max(1, Math.round(phaseWeeks * (mult < 1 ? mult : 1)));
  const wHi = Math.max(wLo + 1, Math.round(phaseWeeks * (mult > 1 ? mult : 1) + 2));
  return { costBandUsd: [costLo, costHi], durationWeeks: [wLo, wHi] };
}

export const PROMPT_VERSION = "consultant-blueprint-v3";
