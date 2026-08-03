import { z } from "zod";
import { getClientIp, limitConsultant } from "@/lib/ai/rate-limit";
import { sanitizeChatMessage } from "@/lib/ai/sanitize";
import {
  estimatorProgress,
  extractEstimatorSlots,
  generateNarrative,
  mergeEstimatorSlots,
  missingRequired,
  requiredComplete,
  streamEstimatorTurn,
} from "@/lib/estimator/chat";
import { priceProject, resolveInputs } from "@/lib/estimator/pricing";
import {
  LeverOverridesSchema,
  type EstimatorSlots,
  type Estimate,
} from "@/lib/estimator/schema";
import {
  appendEstimatorMessage,
  clearEstimatorSession,
  getOrCreateEstimatorSession,
  saveEstimatorSession,
  type EstimatorSession,
} from "@/lib/estimator/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cost estimator API.
 *
 * Free and ungated — no email capture, no lead gate, nothing withheld. The
 * visitor gets the whole estimate as soon as it exists.
 *
 * Conversation state is server-side; the client sends a session id and a
 * message. Prices come from the deterministic engine in lib/estimator/pricing,
 * never from the model, so no request payload can move the number.
 *
 * Actions: chat (SSE) · estimate · adjust (levers) · reset
 */

const SessionId = z.string().uuid();

const ChatBody = z.object({
  action: z.literal("chat"),
  sessionId: SessionId,
  message: z.string().min(1).max(4000),
});

const EstimateBody = z.object({
  action: z.literal("estimate"),
  sessionId: SessionId,
});

const AdjustBody = z.object({
  action: z.literal("adjust"),
  sessionId: SessionId,
  overrides: LeverOverridesSchema,
});

const ResetBody = z.object({ action: z.literal("reset"), sessionId: SessionId });

const BodySchema = z.discriminatedUnion("action", [
  ChatBody,
  EstimateBody,
  AdjustBody,
  ResetBody,
]);

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

function rateHeaders(r: { remaining: number; reset: number; limit: number }) {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.reset),
  };
}

async function guard(request: Request, sessionId: string, kind: "turn" | "blueprint") {
  const limited = await limitConsultant({
    ip: getClientIp(request),
    sessionId: `estimator:${sessionId}`,
    kind,
  });

  if (!limited.success) {
    const waitMs = Math.max(0, limited.reset - Date.now());
    const minutes = Math.ceil(waitMs / 60_000);
    return {
      ok: false as const,
      response: json(
        {
          error: `Too many requests. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          retryAfterMs: waitMs,
        },
        429,
        { ...rateHeaders(limited), "Retry-After": String(Math.ceil(waitMs / 1000)) },
      ),
    };
  }
  return { ok: true as const, headers: rateHeaders(limited) };
}

function publicState(session: EstimatorSession) {
  return {
    stage: session.stage,
    slots: session.slots,
    overrides: session.overrides,
    progress: estimatorProgress(session.slots),
    complete: requiredComplete(session.slots),
    missing: missingRequired(session.slots),
  };
}

/** Everything the result screen needs, including what was assumed. */
function estimatePayload(session: EstimatorSession, estimate: Estimate) {
  const resolved = resolveInputs(session.slots, session.overrides);
  return {
    estimate: {
      ...estimate,
      narrative: session.narrative ?? undefined,
      risks: session.risks.length ? session.risks : undefined,
    },
    resolved: {
      projectType: resolved.projectType,
      platform: resolved.platform,
      scope: resolved.scope,
      timeline: resolved.timeline,
      scale: resolved.scale,
      designState: resolved.designState,
      integrations: resolved.integrations,
      regulated: resolved.regulated,
      assumed: resolved.assumed,
    },
  };
}

export async function GET(request: Request) {
  const parsed = SessionId.safeParse(
    new URL(request.url).searchParams.get("sessionId"),
  );
  if (!parsed.success) return json({ error: "Invalid session id." }, 400);

  const session = await getOrCreateEstimatorSession(parsed.data);
  return json({
    ok: true,
    messages: session.messages,
    ...publicState(session),
    ...(session.estimate ? estimatePayload(session, session.estimate) : { estimate: null }),
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
    case "estimate":
      return handleEstimate(request, body);
    case "adjust":
      return handleAdjust(request, body);
    case "reset":
      await clearEstimatorSession(body.sessionId);
      return json({ ok: true });
  }
}

/* ---------------------------------- chat ---------------------------------- */

function sse(controller: ReadableStreamDefaultController, event: Record<string, unknown>) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

async function handleChat(request: Request, body: z.infer<typeof ChatBody>) {
  const clean = sanitizeChatMessage(body.message);
  if (!clean.ok) return json({ error: clean.error }, 400);

  const limit = await guard(request, body.sessionId, "turn");
  if (!limit.ok) return limit.response;

  let session = await getOrCreateEstimatorSession(body.sessionId);
  session = appendEstimatorMessage(session, { role: "user", content: clean.text });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };
      const onAbort = () => safeClose();
      request.signal.addEventListener("abort", onAbort);

      try {
        let reply = "";
        let slots: EstimatorSlots = session.slots;
        let wantsEstimate = false;
        let suggestions: string[] = [];
        let usedFallback = false;

        for await (const event of streamEstimatorTurn({
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
            slots = mergeEstimatorSlots(session.slots, event.turn.slots);
            wantsEstimate = event.turn.wantsEstimate;
            suggestions = event.turn.suggestions;
            usedFallback = event.usedFallback;
          }
        }

        if (request.signal.aborted) {
          safeClose();
          return;
        }

        session = appendEstimatorMessage(
          { ...session, slots },
          { role: "assistant", content: reply },
        );
        // Once priced, further chat refines inputs but keeps the result stage.
        if (session.stage !== "estimate") {
          session.stage = requiredComplete(slots) ? "ready" : "gathering";
        }
        await saveEstimatorSession(session);

        sse(controller, {
          type: "done",
          reply,
          suggestions,
          usedFallback,
          // The model's own read, plus an unmistakable ask. Never a bare "yes".
          wantsEstimate: wantsEstimate && Boolean(slots.summary),
          ...publicState(session),
        });
      } catch (err) {
        console.error("[estimator] chat stream failed:", err);
        sse(controller, {
          type: "error",
          error: "The estimator hit a problem. Try sending that again.",
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
      "X-Accel-Buffering": "no",
    },
  });
}

/* -------------------------------- estimate -------------------------------- */

async function handleEstimate(request: Request, body: z.infer<typeof EstimateBody>) {
  const session = await getOrCreateEstimatorSession(body.sessionId);

  if (session.messages.length === 0) {
    return json({ error: "Tell me what you're building first." }, 400);
  }

  const limit = await guard(request, body.sessionId, "blueprint");
  if (!limit.ok) return limit.response;

  // Infer anything still missing rather than blocking someone who asked for
  // the number — the result screen shows what was assumed and lets them fix it.
  const slots = await extractEstimatorSlots({
    messages: session.messages,
    slots: session.slots,
  });

  if (!slots.summary || slots.summary.trim().length < 8) {
    return json(
      { error: "Tell me a bit more about the project first.", ...publicState(session) },
      400,
      limit.headers,
    );
  }

  // Pricing is deterministic and instant; the model only writes prose about it.
  const estimate = priceProject(slots, session.overrides);
  const resolved = resolveInputs(slots, session.overrides);

  const prose = await generateNarrative({
    summary: slots.summary,
    projectType: resolved.projectType,
    platform: resolved.platform,
    scope: resolved.scope,
    timeline: resolved.timeline,
    scale: resolved.scale,
    designState: resolved.designState,
    integrations: resolved.integrations,
    regulated: resolved.regulated,
    low: estimate.lowUsd,
    high: estimate.highUsd,
    durationWeeks: estimate.durationWeeks,
    team: estimate.team,
  });

  const next: EstimatorSession = {
    ...session,
    slots,
    estimate: { ...estimate, source: prose ? "engine+ai" : "engine" },
    narrative: prose?.narrative ?? null,
    risks: prose?.risks ?? [],
    stage: "estimate",
  };
  await saveEstimatorSession(next);

  return json(
    { ok: true, ...publicState(next), ...estimatePayload(next, next.estimate!) },
    200,
    limit.headers,
  );
}

/* --------------------------------- adjust --------------------------------- */

/**
 * Re-price with new lever positions.
 *
 * Runs through the same `priceProject` call as the initial estimate, so the
 * levers can never drift from the original pricing rules. No model call —
 * this is pure arithmetic and returns immediately.
 */
async function handleAdjust(request: Request, body: z.infer<typeof AdjustBody>) {
  const limit = await guard(request, body.sessionId, "turn");
  if (!limit.ok) return limit.response;

  const session = await getOrCreateEstimatorSession(body.sessionId);
  if (!session.estimate) {
    return json({ error: "No estimate on this session yet." }, 409, limit.headers);
  }

  const estimate = priceProject(session.slots, body.overrides);
  const next: EstimatorSession = {
    ...session,
    overrides: body.overrides,
    // Keep the narrative: it explains the project, not the exact figures.
    estimate: { ...estimate, source: session.narrative ? "engine+ai" : "engine" },
  };
  await saveEstimatorSession(next);

  return json(
    { ok: true, ...publicState(next), ...estimatePayload(next, next.estimate!) },
    200,
    limit.headers,
  );
}
