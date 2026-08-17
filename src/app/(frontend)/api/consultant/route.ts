import { after } from "next/server";
import { z } from "zod";
import { extractSlots, streamConsultantTurn } from "@/lib/ai/chat";
import { generateBlueprint } from "@/lib/ai/gemini";
import { generatePrototype } from "@/lib/ai/prototype";
import { isRenderable } from "@/lib/ai/prototype-schema";
import { getClientIp, limitConsultant, type LimitKind } from "@/lib/ai/rate-limit";
import { sanitizeChatMessage } from "@/lib/ai/sanitize";
import { slotsToAnswers, type Slots } from "@/lib/ai/schema";
import { captureLead, findCaptureBySessionId, updateLead } from "@/lib/leads/capture";
import {
	AttributionSchema,
	consentRecord,
	EmailSchema,
	PersonNameSchema,
} from "@/lib/leads/schema";
import { internalRecipient, notify, summarize } from "@/lib/notifications";
import { createRoadmap } from "@/lib/roadmaps/store";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { absoluteUrl } from "@/lib/seo";
import {
  appendMessage,
  getOrCreateSession,
  saveSession,
  type ConsultantSession,
} from "@/lib/ai/session";
import { mergeSlots, slotProgress, slotsComplete } from "@/lib/ai/slots";
import { loadEstimatorSession } from "@/lib/estimator/session";
import { estimatorToConsultant } from "@/lib/zac/handoff";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Consultant API.
 *
 * The conversation lives server-side (see lib/ai/session). Clients send a
 * session id and the new message only — they cannot supply transcript, slots,
 * or a blueprint, so none of those can be forged to skew pricing or the
 * emailed document.
 *
 * Actions:
 * - chat      → SSE stream of the next consultant turn
 * - blueprint → explicit generation, only once intake is complete
 * - gate      → capture the lead, persist it, email the blueprint
 * - reset     → clear the session
 */

const SessionId = z.string().uuid();

const ChatBody = z.object({
  action: z.literal("chat"),
  sessionId: SessionId,
  message: z.string().min(1).max(4000),
});

const BlueprintBody = z.object({
  action: z.literal("blueprint"),
  sessionId: SessionId,
});

/**
 * The wording next to the gate's submit button. Stored verbatim with the
 * consent record — what someone agreed to is the part that matters if it is
 * ever challenged, and it changes when the copy does.
 */
const GATE_CONSENT_TEXT =
  "Email me the complete blueprint. One email with your blueprint, plus a short follow-up sequence you can stop at any time.";

const GateBody = z.object({
  action: z.literal("gate"),
  sessionId: SessionId,
  name: PersonNameSchema,
  email: EmailSchema,
  consent: z.boolean().optional(),
  utm: AttributionSchema.optional(),
  turnstileToken: z.string().max(4000).optional(),
  /**
   * Honeypot — must not be named `company`/`name`/`email` or browser autofill
   * fills it and the real visitor is silently discarded.
   */
  hp: z.string().max(200).optional(),
});

const ResetBody = z.object({
  action: z.literal("reset"),
  sessionId: SessionId,
});

/**
 * Carry a finished estimate into a fresh consultation.
 *
 * Both ids come from the visitor's own sessionStorage and both sessions are
 * read server-side — the client sends no slots and no prices, so a crafted
 * request can only ever hand the visitor their own earlier answers.
 */
const HandoffBody = z.object({
  action: z.literal("handoff"),
  sessionId: SessionId,
  fromSessionId: SessionId,
});

const BodySchema = z.discriminatedUnion("action", [
  ChatBody,
  BlueprintBody,
  GateBody,
  HandoffBody,
  ResetBody,
]);

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function rateHeaders(result: { remaining: number; reset: number; limit: number }) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

async function guard(
  request: Request,
  sessionId: string,
  kind: LimitKind,
): Promise<{ ok: true; headers: HeadersInit } | { ok: false; response: Response }> {
  const limited = await limitConsultant({
    ip: getClientIp(request),
    sessionId,
    kind,
  });

  if (!limited.success) {
    const waitMs = Math.max(0, limited.reset - Date.now());
    const minutes = Math.ceil(waitMs / 60_000);
    return {
      ok: false,
      response: json(
        {
          error:
            kind === "blueprint"
              ? "You've generated several blueprints already. Try again later, or book a call to go deeper."
              : `Too many messages. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          retryAfterMs: waitMs,
        },
        429,
        { ...rateHeaders(limited), "Retry-After": String(Math.ceil(waitMs / 1000)) },
      ),
    };
  }

  return { ok: true, headers: rateHeaders(limited) };
}

/** State the client mirrors after every action. */
function publicState(session: ConsultantSession) {
  return {
    stage: session.stage,
    slots: session.slots,
    progress: slotProgress(session.slots),
    complete: slotsComplete(session.slots),
  };
}

/**
 * Restore an in-flight consultation after a reload.
 * Returns only what the visitor already saw — never another session's data,
 * since the id is an unguessable uuid held in their own sessionStorage.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const parsed = SessionId.safeParse(sessionId);
  if (!parsed.success) return json({ error: "Invalid session id." }, 400);

  let session = await getOrCreateSession(parsed.data);

  /*
    Session store is short-lived (Redis TTL / in-memory). The lead row in
    Postgres is durable. If the visitor already passed the gate but the
    session forgot `lead`, recover it so refresh does not re-ask for email.
  */
  if (session.blueprint && !session.lead) {
    const capture = await findCaptureBySessionId(parsed.data);
    if (capture) {
      session = {
        ...session,
        stage: "captured",
        lead: {
          name: capture.name,
          email: capture.email,
          at: Date.now(),
          roadmapUrl: capture.roadmapUrl,
        },
      };
      await saveSession(session);
    }
  }

  return json({
    ok: true,
    messages: session.messages,
    blueprint: session.blueprint,
    prototype: session.prototype,
    captured: Boolean(session.lead),
    roadmapUrl: session.lead?.roadmapUrl ?? null,
    ...publicState(session),
  });
}

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Invalid request body.")
        : "Invalid request body.";
    return json({ error: message }, 400);
  }

  switch (body.action) {
    case "chat":
      return handleChat(request, body);
    case "blueprint":
      return handleBlueprint(request, body);
    case "gate":
      return handleGate(request, body);
    case "handoff":
      return handleHandoff(body);
    case "reset":
      return handleReset(body);
  }
}

/* --------------------------------- handoff -------------------------------- */

async function handleHandoff(body: z.infer<typeof HandoffBody>) {
  const estimator = await loadEstimatorSession(body.fromSessionId);
  if (!estimator) {
    return json({ error: "That estimate has expired. Start here instead." }, 404);
  }

  const session = await getOrCreateSession(body.sessionId);

  // A consultation already under way is the visitor's work — never overwrite
  // it with a replay of an older estimate.
  if (session.messages.length > 0) {
    return json({ ok: true, applied: false, ...publicState(session) });
  }

  const mapped = estimatorToConsultant(
    estimator.slots,
    estimator.estimate
      ? { lowUsd: estimator.estimate.lowUsd, highUsd: estimator.estimate.highUsd }
      : null,
  );
  if (!mapped) {
    return json({ error: "That estimate didn't capture enough to carry over." }, 409);
  }

  await saveSession({ ...session, slots: mergeSlots(session.slots, mapped.slots) });

  return json({
    ok: true,
    applied: true,
    prefill: mapped.prefill,
    carried: mapped.carried,
    ...publicState({ ...session, slots: mapped.slots }),
  });
}

/* ---------------------------------- chat ---------------------------------- */

type SseEvent = Record<string, unknown> & { type: string };

function sse(controller: ReadableStreamDefaultController, event: SseEvent) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

async function handleChat(request: Request, body: z.infer<typeof ChatBody>) {
  const clean = sanitizeChatMessage(body.message);
  if (!clean.ok) return json({ error: clean.error }, 400);

  const limit = await guard(request, body.sessionId, "turn");
  if (!limit.ok) return limit.response;

  let session = await getOrCreateSession(body.sessionId);

  // Nothing more to gather once a blueprint exists — the UI moves to the gate.
  if (session.stage === "blueprint" || session.stage === "captured") {
    return json(
      { error: "This consultation already produced a blueprint.", ...publicState(session) },
      409,
      limit.headers,
    );
  }

  session = appendMessage(session, { role: "user", content: clean.text });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      // A visitor navigating away shouldn't leave the model call running.
      const onAbort = () => safeClose();
      request.signal.addEventListener("abort", onAbort);

      try {
        let reply = "";
        let slots: Slots = session.slots;
        let wantsBlueprint = false;
        let suggestions: string[] = [];
        let usedFallback = false;

        for await (const event of streamConsultantTurn({
          messages: session.messages,
          slots: session.slots,
        })) {
          if (request.signal.aborted) break;

          if (event.type === "delta") {
            reply += event.text;
            sse(controller, { type: "delta", text: event.text });
          } else if (event.type === "reset") {
            reply = "";
            sse(controller, { type: "reset" });
          } else {
            reply = event.turn.reply;
            slots = mergeSlots(session.slots, event.turn.slots);
            wantsBlueprint = event.turn.wantsBlueprint;
            suggestions = event.turn.suggestions;
            usedFallback = event.usedFallback;
          }
        }

        if (request.signal.aborted) {
          safeClose();
          return;
        }

        const complete = slotsComplete(slots);
        session = appendMessage({ ...session, slots }, { role: "assistant", content: reply });
        session.stage = complete ? "ready" : "gathering";
        await saveSession(session);

        sse(controller, {
          type: "done",
          reply,
          suggestions,
          usedFallback,
          // The model's own read of intent — never a regex over "yes"/"ok".
          // An explicit ask is honoured before every slot is filled: the
          // blueprint step infers the remainder rather than stonewalling
          // someone who just told us what they want.
          wantsBlueprint: wantsBlueprint && Boolean(slots.outcome),
          ...publicState(session),
        });
      } catch (err) {
        console.error("[consultant] chat stream failed:", err);
        sse(controller, {
          type: "error",
          error: "The consultant hit a problem. Try sending that again.",
        });
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...limit.headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx/proxy buffering would defeat streaming entirely.
      "X-Accel-Buffering": "no",
    },
  });
}

/* -------------------------------- blueprint ------------------------------- */

async function handleBlueprint(request: Request, body: z.infer<typeof BlueprintBody>) {
  const session = await getOrCreateSession(body.sessionId);

  if (session.messages.length === 0) {
    return json({ error: "Start the conversation first." }, 400);
  }

  // Idempotent: refreshing or double-clicking returns the same document.
  if (session.blueprint) {
    return json({
      ok: true,
      blueprint: session.blueprint,
      prototype: session.prototype,
      usedFallback: session.blueprint.source === "rules",
      ...publicState(session),
    });
  }

  const limit = await guard(request, body.sessionId, "blueprint");
  if (!limit.ok) return limit.response;

  // Fill anything still missing from the transcript rather than blocking the
  // visitor behind another question when they've asked to see the result.
  const { slots } = await extractSlots({
    messages: session.messages,
    slots: session.slots,
  });

  const answers = slotsToAnswers(slots);
  const seed = slots.outcome?.trim();
  if (!seed || seed.length < 8) {
    return json(
      { error: "Tell me a bit more about the goal first.", ...publicState(session) },
      400,
      limit.headers,
    );
  }

  const result = await generateBlueprint({ seed, answers });

  // The mock is drawn from the blueprint, so it has to wait for it — but it
  // must never be able to cost the visitor the blueprint itself. `generate
  // Prototype` swallows its own failures and returns null; this is the only
  // reason the two are not run in parallel.
  const drawn = await generatePrototype({
    seed,
    answers,
    blueprint: result.blueprint,
  });
  const prototype = isRenderable(drawn.prototype) ? drawn.prototype : null;

  const next: ConsultantSession = {
    ...session,
    slots,
    blueprint: result.blueprint,
    prototype,
    stage: "blueprint",
  };
  await saveSession(next);

  return json(
    {
      ok: true,
      blueprint: result.blueprint,
      prototype,
      usedFallback: result.usedFallback,
      model: result.model ?? null,
      ...publicState(next),
    },
    200,
    limit.headers,
  );
}

/* ----------------------------------- gate ---------------------------------- */

async function handleGate(request: Request, body: z.infer<typeof GateBody>) {
  // Honeypot used to short-circuit with `{ ok: true }` and no unlock flags.
  // Browser autofill (and password managers) routinely fill hidden text inputs,
  // which made real visitors see "Could not unlock your roadmap" after a 20ms
  // round-trip. Log the trip for bot telemetry; Turnstile + rate limits own
  // the real bot gate.
  if (body.hp?.trim()) {
    console.warn("[consultant] gate honeypot filled — continuing (autofill-safe)", {
      sessionId: body.sessionId,
    });
  }

  const human = await verifyTurnstile({
    token: body.turnstileToken,
    ip: getClientIp(request),
    action: "consultant-gate",
  });
  if (!human.ok) return json({ error: human.error }, 403);

  const limit = await guard(request, body.sessionId, "gate");
  if (!limit.ok) return limit.response;

  const session = await getOrCreateSession(body.sessionId);

  // The blueprint we email is the one we generated, never one posted by the
  // client — otherwise anyone could mail themselves an arbitrary quote.
  if (!session.blueprint) {
    return json(
      { error: "No blueprint on this session yet.", ...publicState(session) },
      409,
      limit.headers,
    );
  }

  if (session.lead) {
    return json(
      {
        ok: true,
        alreadySent: true,
        email: session.lead.email,
        roadmapUrl: session.lead.roadmapUrl ?? null,
        message: "That roadmap is already on its way.",
        ...publicState(session),
      },
      200,
      limit.headers,
    );
  }

  const blueprint = session.blueprint;

  // Capture the lead before anything that can be slow. A cold Resend
  // connection takes ~11s; the visitor must not wait on it to see the unlock,
  // and we must not lose the lead if delivery fails.
  const saved = await captureLead({
    source: "consultant",
    seed: session.slots.outcome,
    answers: {
      audience: session.slots.audience ?? null,
      today: session.slots.today ?? null,
      v1: session.slots.v1 ?? null,
      timing: session.slots.timing ?? null,
    },
    solution: {
      title: blueprint.title,
      serviceSlug: blueprint.serviceSlug,
      costLowUsd: blueprint.costBandUsd[0],
      costHighUsd: blueprint.costBandUsd[1],
      durationLowWeeks: blueprint.durationWeeks[0],
      durationHighWeeks: blueprint.durationWeeks[1],
      document: blueprint,
    },
    contact: { name: body.name, email: body.email },
    consent: {
      email: consentRecord(true, GATE_CONSENT_TEXT),
      marketing: consentRecord(true, GATE_CONSENT_TEXT),
    },
    utm: body.utm ?? {},
    sessionId: session.id,
    transcript: session.messages,
    engine: blueprint.source,
  });

  if (!saved.stored) {
    console.error("[consultant] lead not persisted:", saved.error);
  }

  // Minted before the response so the visitor can open their document
  // immediately, without waiting on the email that also carries the link.
  const roadmap = await createRoadmap({
    name: body.name,
    email: body.email,
    blueprint,
    // Frozen with the blueprint: the recipient of a forwarded link must see
    // the same mock the sender saw, not one regenerated on read.
    prototype: session.prototype,
    slots: session.slots,
    leadId: saved.stored ? saved.id : undefined,
  });

  await saveSession({
    ...session,
    stage: "captured",
    lead: {
      name: body.name,
      email: body.email,
      at: Date.now(),
      roadmapUrl: roadmap?.url ?? null,
    },
  });

  // Delivery continues after the response is flushed.
  after(async () => {
    if (saved.stored && saved.id !== undefined && roadmap) {
      await updateLead(saved.id, { roadmap: roadmap.id });
    }

    const results = await notify(
      {
        type: "roadmap.delivered",
        category: "transactional",
        name: body.name,
        blueprint,
        slots: session.slots,
        roadmapUrl: roadmap?.url ?? null,
      },
      { name: body.name, email: body.email },
    );

    if (saved.stored && saved.id !== undefined) {
      const outcome = summarize(results);
      await updateLead(saved.id, {
        emailStatus: outcome.status,
        emailError: outcome.detail,
      });
    }

    const internal = internalRecipient();
    if (internal) {
      await notify(
        {
          type: "contact.internal",
          category: "internal",
          lead: {
            name: body.name,
            email: body.email,
            message: [
              session.slots.outcome ?? "(no goal statement captured)",
              "",
              `Recommended: ${blueprint.title}`,
              `Band: $${Math.round(blueprint.costBandUsd[0])}–$${Math.round(blueprint.costBandUsd[1])} over ${blueprint.durationWeeks[0]}–${blueprint.durationWeeks[1]} weeks`,
              roadmap ? `Roadmap: ${roadmap.url}` : "",
            ].join("\n"),
            service: blueprint.serviceTitle,
            source: "consultant",
            utm: {
              source: body.utm?.source,
              medium: body.utm?.medium,
              campaign: body.utm?.campaign,
              referrer: body.utm?.referrer,
              landingPath: body.utm?.landingPath,
            },
          },
          adminUrl:
            saved.stored && saved.id !== undefined
              ? absoluteUrl(`/admin/collections/leads/${saved.id}`)
              : null,
        },
        internal,
      );
    }
  });

  return json(
    {
      ok: true,
      email: body.email,
      name: body.name,
      queued: true,
      roadmapUrl: roadmap?.url ?? null,
      message: "On its way — check your inbox in the next minute or two.",
      ...publicState({ ...session, stage: "captured" }),
    },
    200,
    limit.headers,
  );
}

/* ---------------------------------- reset --------------------------------- */

async function handleReset(body: z.infer<typeof ResetBody>) {
  await saveSession({
    id: body.sessionId,
    messages: [],
    slots: {},
    stage: "gathering",
    blueprint: null,
    prototype: null,
    lead: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return json({ ok: true });
}
