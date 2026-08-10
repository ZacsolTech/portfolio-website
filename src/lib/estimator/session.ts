import { z } from "zod";
import { createSessionStore } from "@/lib/store/session-store";
import {
  ESTIMATOR_STAGES,
  EstimateSchema,
  EstimatorSlotsSchema,
  LeverOverridesSchema,
} from "./schema";

/**
 * Server-side estimator state. The client holds only a session id, so a
 * crafted request cannot forge transcript turns or hand us slots that would
 * bend the quoted price.
 */

export const ESTIMATOR_TTL_SECONDS = 60 * 60 * 6;
const MAX_MESSAGES = 40;

export const EstimatorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const EstimatorSessionSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(EstimatorMessageSchema).max(MAX_MESSAGES).default([]),
  slots: EstimatorSlotsSchema.default({}),
  /** Lever positions from the result screen, applied on top of slots. */
  overrides: LeverOverridesSchema.default({}),
  stage: z.enum(ESTIMATOR_STAGES).default("gathering"),
  estimate: EstimateSchema.nullable().default(null),
  /** Cached model prose; survives lever changes since it isn't price-bearing. */
  narrative: z.string().nullable().default(null),
  risks: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type EstimatorSession = z.infer<typeof EstimatorSessionSchema>;

export function emptyEstimatorSession(id: string): EstimatorSession {
  const now = Date.now();
  return {
    id,
    messages: [],
    slots: {},
    overrides: {},
    stage: "gathering",
    estimate: null,
    narrative: null,
    risks: [],
    createdAt: now,
    updatedAt: now,
  };
}

const store = createSessionStore({
  prefix: "zacsol:estimator:session",
  schema: EstimatorSessionSchema,
  ttlSeconds: ESTIMATOR_TTL_SECONDS,
});

export async function loadEstimatorSession(id: string): Promise<EstimatorSession | null> {
  return store.load(id);
}

export async function saveEstimatorSession(session: EstimatorSession): Promise<void> {
  await store.save(session.id, {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES),
    updatedAt: Date.now(),
  });
}

export async function getOrCreateEstimatorSession(id: string): Promise<EstimatorSession> {
  return (await loadEstimatorSession(id)) ?? emptyEstimatorSession(id);
}

export async function clearEstimatorSession(id: string): Promise<void> {
  await store.clear(id);
}

export function appendEstimatorMessage(
  session: EstimatorSession,
  message: { role: "user" | "assistant"; content: string },
): EstimatorSession {
  return {
    ...session,
    messages: [...session.messages, message].slice(-MAX_MESSAGES),
  };
}
