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
 * The consultant fills these conversationally. Readiness is "every
 * required slot has a value" — never a regex over what the visitor typed.
 * ------------------------------------------------------------------ */

export const SCALE_OPTIONS = [
  "Under 10 users",
  "10–50 users",
  "50–250 users",
  "250+ users",
] as const;

export const TIMELINE_OPTIONS = [
  "As soon as possible",
  "Within 3 months",
  "3–6 months",
  "Still exploring",
] as const;

export const ScaleSchema = z.enum(SCALE_OPTIONS);
export const TimelineSchema = z.enum(TIMELINE_OPTIONS);

/** Order is the order we prefer to ask in when nudging the model. */
export const SLOT_KEYS = [
  "problem",
  "industry",
  "current",
  "scale",
  "timeline",
] as const;

export type SlotKey = (typeof SLOT_KEYS)[number];

export const SLOT_LABELS: Record<SlotKey, string> = {
  problem: "The problem",
  industry: "Industry",
  current: "How it works today",
  scale: "Scale",
  timeline: "Timeline",
};

export const SlotsSchema = z.object({
  problem: z.string().min(1).max(1200).optional(),
  industry: z.string().min(1).max(120).optional(),
  current: z.string().min(1).max(240).optional(),
  scale: ScaleSchema.optional(),
  timeline: TimelineSchema.optional(),
});

export type Slots = z.infer<typeof SlotsSchema>;

/** Legacy four-field shape the blueprint generator and rules engine consume. */
export const ConsultantAnswersSchema = z.object({
  industry: z.string().min(1).max(120),
  current: z.string().min(1).max(240),
  scale: z.string().min(1),
  timeline: z.string().min(1),
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
  slots: SlotsSchema.default({}),
  /** Model's own read on whether the visitor just asked to see the blueprint. */
  wantsBlueprint: z.boolean().default(false),
  /** Optional tappable suggestions for the next answer. */
  suggestions: z.array(z.string().min(1).max(48)).max(4).default([]),
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
  /** Inclusive week band after scale/urgency multipliers */
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

export const SCALE_MULT: Record<string, number> = {
  "Under 10 users": 0.8,
  "10–50 users": 1,
  "50–250 users": 1.3,
  "250+ users": 1.7,
};

export const URGENCY_MULT: Record<string, number> = {
  "As soon as possible": 1.2,
  "Within 3 months": 1.05,
  "3–6 months": 1,
  "Still exploring": 0.95,
};

export function normalizeScale(value: string | undefined): (typeof SCALE_OPTIONS)[number] {
  if (!value) return "10–50 users";
  const exact = SCALE_OPTIONS.find((o) => o === value);
  if (exact) return exact;

  const v = value.toLowerCase();
  // A bare number is the most common free-text answer ("about 30 staff").
  const num = Number(v.match(/\b(\d[\d,]*)\b/)?.[1]?.replace(/,/g, ""));
  if (Number.isFinite(num) && num > 0) {
    if (num >= 250) return "250+ users";
    if (num >= 50) return "50–250 users";
    if (num >= 10) return "10–50 users";
    return "Under 10 users";
  }
  if (/enterprise|nationwide|thousands|hundreds/.test(v)) return "250+ users";
  if (/mid|medium|department/.test(v)) return "50–250 users";
  if (/solo|just me|myself|handful|tiny|couple/.test(v)) return "Under 10 users";
  if (/small team|dozen|small/.test(v)) return "10–50 users";
  return "10–50 users";
}

export function normalizeTimeline(
  value: string | undefined,
): (typeof TIMELINE_OPTIONS)[number] {
  if (!value) return "Within 3 months";
  const exact = TIMELINE_OPTIONS.find((o) => o === value);
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

/** Coerce partial/free-text slots into the canonical answer shape. */
export function slotsToAnswers(slots: Slots): ConsultantAnswers {
  return {
    industry: slots.industry?.trim().slice(0, 120) || "Other",
    current: slots.current?.trim().slice(0, 240) || "Entirely manual / paper",
    scale: normalizeScale(slots.scale),
    timeline: normalizeTimeline(slots.timeline),
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
  answers: Pick<ConsultantAnswers, "scale" | "timeline">,
): { costBandUsd: [number, number]; durationWeeks: [number, number] } {
  const mult = (SCALE_MULT[answers.scale] ?? 1) * (URGENCY_MULT[answers.timeline] ?? 1);
  const costLo = base[0] * mult;
  const costHi = base[1] * mult;
  const wLo = Math.max(1, Math.round(phaseWeeks * (mult < 1 ? mult : 1)));
  const wHi = Math.max(wLo + 1, Math.round(phaseWeeks * (mult > 1 ? mult : 1) + 2));
  return { costBandUsd: [costLo, costHi], durationWeeks: [wLo, wHi] };
}

export const PROMPT_VERSION = "consultant-blueprint-v2";
