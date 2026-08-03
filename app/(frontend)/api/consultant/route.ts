import { after } from "next/server";
import { z } from "zod";
import { extractSlots, streamConsultantTurn } from "@/lib/ai/chat";
import { sendBlueprintEmail } from "@/lib/ai/email";
import { generateBlueprint } from "@/lib/ai/gemini";
import { saveLead, updateLeadDelivery } from "@/lib/ai/leads";
import { getClientIp, limitConsultant, type LimitKind } from "@/lib/ai/rate-limit";
import { sanitizeChatMessage } from "@/lib/ai/sanitize";
import { slotsToAnswers, type Slots } from "@/lib/ai/schema";
import {
  appendMessage,
  getOrCreateSession,
  saveSession,
  type ConsultantSession,
} from "@/lib/ai/session";
import { mergeSlots, slotProgress, slotsComplete } from "@/lib/ai/slots";

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

const GateBody = z.object({
  action: z.literal("gate"),
  sessionId: SessionId,
  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[\p{L}\p{M}'’.\- ]+$/u, "Use a real name"),
  email: z.string().trim().email().max(160).toLowerCase(),
  consent: z.boolean().optional(),
});

const ResetBody = z.object({
  action: z.literal("reset"),
  sessionId: SessionId,
});

const BodySchema = z.discriminatedUnion("action", [
  ChatBody,
  BlueprintBody,
  GateBody,
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

  const session = await getOrCreateSession(parsed.data);
  return json({
    ok: true,
    messages: session.messages,
    blueprint: session.blueprint,
    captured: Boolean(session.lead),
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
    case "reset":
      return handleReset(body);
  }
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
          wantsBlueprint: wantsBlueprint && Boolean(slots.problem),
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
  const seed = slots.problem?.trim();
  if (!seed || seed.length < 8) {
    return json(
      { error: "Tell me a bit more about the problem first.", ...publicState(session) },
      400,
      limit.headers,
    );
  }

  const result = await generateBlueprint({ seed, answers });

  const next: ConsultantSession = {
    ...session,
    slots,
    blueprint: result.blueprint,
    stage: "blueprint",
  };
  await saveSession(next);

  return json(
    {
      ok: true,
      blueprint: result.blueprint,
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
  const saved = await saveLead({
    name: body.name,
    email: body.email,
    sessionId: session.id,
    slots: session.slots,
    blueprint,
    transcript: session.messages,
    email_result: { status: "skipped", reason: "queued" },
  });

  if (!saved.stored) {
    console.error("[consultant] lead not persisted:", saved.error);
  }

  await saveSession({
    ...session,
    stage: "captured",
    lead: { name: body.name, email: body.email, at: Date.now() },
  });

  // Delivery continues after the response is flushed.
  after(async () => {
    const result = await sendBlueprintEmail({
      to: body.email,
      name: body.name,
      blueprint,
      slots: session.slots,
    });

    if (result.status === "failed") {
      console.error("[consultant] blueprint email failed:", result.error);
    }
    if (saved.stored && saved.id !== undefined) {
      await updateLeadDelivery(saved.id, result);
    }
  });

  return json(
    {
      ok: true,
      email: body.email,
      name: body.name,
      queued: true,
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
    lead: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return json({ ok: true });
}
