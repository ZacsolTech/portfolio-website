import { createSessionStore } from "@/lib/store/session-store";
import {
  BlueprintSchema,
  ChatMessageSchema,
  SlotsSchema,
  STAGES,
  type Blueprint,
  type ChatMessage,
  type Slots,
  type Stage,
} from "./schema";
import { z } from "zod";

/**
 * Server-authoritative conversation state.
 *
 * The client only ever sends a session id plus the new message. Transcript,
 * slots and the generated blueprint live here, so a crafted request cannot
 * forge assistant turns to steer the model, skip the intake, or swap in a
 * blueprint with a fabricated price before the gate emails it out.
 *
 * Upstash Redis when configured; an in-process map otherwise. The map is
 * correct for a single dev server and degrades gracefully across serverless
 * instances — a cold instance just re-greets rather than losing the visitor.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 6;
const MAX_MESSAGES = 40;
const MEMORY_MAX_SESSIONS = 500;

export const ConsultantSessionSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(ChatMessageSchema).max(MAX_MESSAGES).default([]),
  slots: SlotsSchema.default({}),
  stage: z.enum(STAGES).default("gathering"),
  blueprint: BlueprintSchema.nullable().default(null),
  /** Set once the visitor passes the gate, so we never double-email. */
  lead: z
    .object({ name: z.string(), email: z.string(), at: z.number() })
    .nullable()
    .default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ConsultantSession = z.infer<typeof ConsultantSessionSchema>;

export function emptySession(id: string): ConsultantSession {
  const now = Date.now();
  return {
    id,
    messages: [],
    slots: {},
    stage: "gathering",
    blueprint: null,
    lead: null,
    createdAt: now,
    updatedAt: now,
  };
}

/* ------------------------------- public API ------------------------------- */

const store = createSessionStore({
  prefix: "zacsol:consultant:session",
  schema: ConsultantSessionSchema,
  ttlSeconds: SESSION_TTL_SECONDS,
  maxMemorySessions: MEMORY_MAX_SESSIONS,
});

export async function loadSession(id: string): Promise<ConsultantSession | null> {
  return store.load(id);
}

export async function saveSession(session: ConsultantSession): Promise<void> {
  await store.save(session.id, {
    ...session,
    messages: session.messages.slice(-MAX_MESSAGES),
    updatedAt: Date.now(),
  });
}

export async function getOrCreateSession(id: string): Promise<ConsultantSession> {
  return (await loadSession(id)) ?? emptySession(id);
}

export function appendMessage(
  session: ConsultantSession,
  message: ChatMessage,
): ConsultantSession {
  return {
    ...session,
    messages: [...session.messages, message].slice(-MAX_MESSAGES),
  };
}

export function withStage(session: ConsultantSession, stage: Stage): ConsultantSession {
  return { ...session, stage };
}

export function withSlots(session: ConsultantSession, slots: Slots): ConsultantSession {
  return { ...session, slots };
}

export function withBlueprint(
  session: ConsultantSession,
  blueprint: Blueprint,
): ConsultantSession {
  return { ...session, blueprint, stage: "blueprint" };
}
