import { Type } from "@google/genai";
import {
  CHAT_MODELS,
  TIMEOUTS,
  classifyError,
  errorText,
  getGenAI,
  hasGemini,
  runWithLadder,
  type GeminiFailure,
} from "./client";
import { extractPartialString, parseJsonLoose } from "./partial-json";
import {
  CHAT_SYSTEM_PROMPT,
  EXTRACT_SYSTEM_PROMPT,
  buildChatUserPayload,
  buildExtractUserPayload,
} from "./prompts";
import {
  ChatTurnSchema,
  TIMING_OPTIONS,
  normalizeTiming,
  type ChatMessage,
  type ChatTurn,
  type SlotKey,
  type Slots,
} from "./schema";
import { mergeSlots, missingSlots, nextSlot, slotsComplete } from "./slots";

const MAX_OUTPUT_TOKENS = 1400;

/**
 * `propertyOrdering` is load-bearing: it forces `reply` to serialise first so
 * the stream can render text before the structured tail arrives.
 */
const chatResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    slots: {
      type: Type.OBJECT,
      properties: {
        outcome: { type: Type.STRING },
        audience: { type: Type.STRING },
        today: { type: Type.STRING },
        v1: { type: Type.STRING },
        timing: { type: Type.STRING, enum: [...TIMING_OPTIONS] },
      },
    },
    /**
     * Verbatim quotes backing the slot that moves the price. Checked against
     * the transcript server-side — an enum field makes a model want to pick
     * *something*, and asking it to cite the words is the only guard that
     * actually holds. See verifyPricedSlots.
     */
    evidence: {
      type: Type.OBJECT,
      properties: {
        timing: { type: Type.STRING },
      },
    },
    wantsBlueprint: { type: Type.BOOLEAN },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["reply", "wantsBlueprint"],
  propertyOrdering: ["reply", "slots", "evidence", "wantsBlueprint", "suggestions"],
};

/** Normalise for quote matching: case, punctuation and spacing all vary. */
function loosen(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Drop `timing` when the model cannot quote the visitor saying it.
 *
 * Timing multiplies the quoted price, so a hallucinated urgency doesn't just
 * look sloppy — it quotes a stranger the wrong number. Anything the visitor
 * did not actually say goes back to being an open question.
 */
function verifyPricedSlots(
  slots: Slots,
  evidence: { timing?: string },
  messages: ChatMessage[],
  previous: Slots,
): Slots {
  const haystack = loosen(
    messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" "),
  );

  const verified: Slots = { ...slots };

  if (slots.timing && !(previous.timing && slots.timing === previous.timing)) {
    const quote = loosen(evidence.timing ?? "");
    if (!(quote.length >= 2 && haystack.includes(quote))) {
      console.info(`[consultant] dropped unevidenced timing="${slots.timing}"`);
      delete verified.timing;
    }
  }

  return verified;
}

/**
 * Explicit, unambiguous requests to see the blueprint.
 *
 * Deliberately narrow: it requires a word that can only mean "the document"
 * and can never be an answer to a question. A bare "yes"/"ok"/"sure" must NOT
 * match — treating those as a blueprint request was the original bug that
 * dumped visitors into a generated plan two messages into the conversation.
 */
export function isExplicitBlueprintRequest(text: string): boolean {
  const t = text.trim();
  if (t.length > 200) return false;
  if (/^(yes|yep|yeah|yup|ok|okay|sure|please|correct|right|both|no)\b[\s.!]*$/i.test(t)) {
    return false;
  }
  return /\b(blueprint|roadmap|proposal|the plan|estimate|quote|costing)\b/i.test(t);
}

export type ChatEvent =
  | { type: "delta"; text: string }
  /** Discard text streamed so far — a model failed mid-reply and we retried. */
  | { type: "reset" }
  | { type: "done"; turn: ChatTurn; model: string | null; usedFallback: boolean };

function coerceTurn(
  raw: Record<string, unknown>,
  context: {
    messages: ChatMessage[];
    previous: Slots;
    /** Extraction deliberately infers the last gaps; skip the evidence gate. */
    allowInference?: boolean;
  },
): ChatTurn {
  const slotsRaw = (raw.slots ?? {}) as Record<string, unknown>;

  const slots: Slots = {};
  if (typeof slotsRaw.outcome === "string" && slotsRaw.outcome.trim()) {
    slots.outcome = slotsRaw.outcome.trim().slice(0, 1200);
  }
  if (typeof slotsRaw.audience === "string" && slotsRaw.audience.trim()) {
    slots.audience = slotsRaw.audience.trim().slice(0, 160);
  }
  if (typeof slotsRaw.today === "string" && slotsRaw.today.trim()) {
    slots.today = slotsRaw.today.trim().slice(0, 280);
  }
  if (typeof slotsRaw.v1 === "string" && slotsRaw.v1.trim()) {
    slots.v1 = slotsRaw.v1.trim().slice(0, 400);
  }
  if (typeof slotsRaw.timing === "string" && slotsRaw.timing.trim()) {
    slots.timing = normalizeTiming(slotsRaw.timing);
  }

  const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, 2);

  const evidenceRaw = (raw.evidence ?? {}) as Record<string, unknown>;
  const verified = context.allowInference
    ? slots
    : verifyPricedSlots(
        slots,
        {
          timing: typeof evidenceRaw.timing === "string" ? evidenceRaw.timing : undefined,
        },
        context.messages,
        context.previous,
      );

  // The visitor's opening message is the goal, whether or not the model
  // bothered to echo it into a slot. Their own words also make a better
  // blueprint seed than the model's paraphrase.
  if (!verified.outcome && !context.previous.outcome) {
    const opener = context.messages.find(
      (m) => m.role === "user" && m.content.trim().length >= 16,
    );
    if (opener) verified.outcome = opener.content.trim().slice(0, 1200);
  }

  // Backfill descriptive slots by keyword when the model acknowledges an
  // answer in prose but forgets to record it — otherwise it re-asks the same
  // question every turn and intake never completes. Never timing: that
  // multiplies the quoted price, so a rough match is not worth a wrong quote.
  if (!verified.audience || !verified.today || !verified.v1) {
    const userText = context.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    const guessed = inferSlotsFromText(userText, {
      ...context.previous,
      ...verified,
    });
    if (!verified.audience && guessed.audience) verified.audience = guessed.audience;
    if (!verified.today && guessed.today) verified.today = guessed.today;
    if (!verified.v1 && guessed.v1) verified.v1 = guessed.v1;
  }

  const lastUser = [...context.messages].reverse().find((m) => m.role === "user");

  return ChatTurnSchema.parse({
    reply: String(raw.reply ?? "").trim() || "Could you tell me a bit more about that?",
    slots: verified,
    // Trust the model's read, but don't let it miss an unmistakable ask.
    wantsBlueprint:
      Boolean(raw.wantsBlueprint) ||
      (lastUser ? isExplicitBlueprintRequest(lastUser.content) : false),
    suggestions,
  });
}

/* --------------------------- deterministic fallback --------------------------- */

const FALLBACK_QUESTIONS: Record<SlotKey, { reply: string; suggestions: string[] }> = {
  outcome: {
    reply:
      "What should get better if we fix this — more sales, fewer mistakes, faster handoffs, or a product you can sell?",
    suggestions: [],
  },
  audience: {
    reply: "Who is this mainly for — your customers, your team, or both?",
    suggestions: ["Customers", "Our team"],
  },
  today: {
    reply: "How do you cope today — WhatsApp, spreadsheets, calls, or a tool that half-fits?",
    suggestions: ["WhatsApp / calls", "Spreadsheets"],
  },
  v1: {
    reply: "For a first release, what must work — name the three things that matter most.",
    suggestions: ["Capture + track", "Core screens only"],
  },
  timing: {
    reply: "And how soon do you need it live?",
    suggestions: [...TIMING_OPTIONS.slice(0, 2)],
  },
};

/** Cheap keyword inference so the rules path still advances the conversation. */
function inferSlotsFromText(text: string, current: Slots): Slots {
  const patch: Slots = {};
  const t = text.toLowerCase();

  if (!current.audience) {
    if (/\b(customer|client|patient|guest|buyer|shopper)s?\b/.test(t) && /\b(staff|team|employee|internal|ops)\b/.test(t)) {
      patch.audience = "Customers and the internal team";
    } else if (/\b(customer|client|patient|guest|buyer|shopper|public|visitor)s?\b/.test(t)) {
      patch.audience = "Customers / end users";
    } else if (/\b(staff|team|employee|internal|ops|field engineer|dispatch)/.test(t)) {
      patch.audience = "Internal team / staff";
    } else if (/\bboth\b/.test(t)) {
      patch.audience = "Customers and the internal team";
    }
  }

  if (!current.today) {
    if (/spreadsheet|excel|google sheet/.test(t)) patch.today = "Spreadsheets";
    else if (/whatsapp|phone call|paper|notebook|by hand|manual|diary/.test(t)) {
      patch.today = "WhatsApp, calls, or paper";
    } else if (/\berp\b|\bcrm\b|legacy|existing system|custom (built|software)/.test(t)) {
      patch.today = "Custom software that needs replacing";
    } else if (/shopify|wordpress|wix|squarespace|saas|off.?the.?shelf|subscription tool/.test(t)) {
      patch.today = "An off-the-shelf tool that half-fits";
    }
  }

  if (!current.v1) {
    if (/first (version|release|mvp)|must (have|ship|work)|v1\b|minimum|core (path|loop|flow)/.test(t)) {
      const clip = text.trim().slice(0, 400);
      if (clip.length >= 8) patch.v1 = clip;
    }
  }

  if (!current.timing && /asap|urgent|month|quarter|week|explor|no rush|soon/.test(t)) {
    patch.timing = normalizeTiming(t);
  }

  if (!current.outcome && text.trim().length >= 16) {
    patch.outcome = text.trim().slice(0, 1200);
  }

  return patch;
}

/**
 * Deterministic turn used when Gemini is unreachable. Deliberately never
 * pretends to be the model — it asks the next unanswered question and nothing
 * more, so the visitor still reaches a blueprint.
 */
export function rulesChatTurn(messages: ChatMessage[], slots: Slots): ChatTurn {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const inferred = mergeSlots(slots, inferSlotsFromText(lastUser?.content ?? "", slots));
  const missing = missingSlots(inferred);

  if (missing.length === 0) {
    return ChatTurnSchema.parse({
      reply:
        "That's everything I need. I can put your solution blueprint together whenever you're ready.",
      slots: inferred,
      wantsBlueprint: false,
      suggestions: [],
    });
  }

  const key = missing[0]!;
  const question = FALLBACK_QUESTIONS[key];
  return ChatTurnSchema.parse({
    reply: question.reply,
    slots: inferred,
    wantsBlueprint: false,
    suggestions: question.suggestions,
  });
}

/* ------------------------------- streaming ------------------------------- */

/**
 * Stream one consultant turn.
 *
 * Yields `delta` events carrying newly decoded characters of `reply`, then a
 * single `done` event with the parsed turn. Falls back to the rules engine
 * without throwing — the visitor always gets a reply.
 */
export async function* streamConsultantTurn(input: {
  messages: ChatMessage[];
  slots: Slots;
}): AsyncGenerator<ChatEvent> {
  const { messages, slots } = input;

  if (!hasGemini()) {
    const turn = rulesChatTurn(messages, slots);
    yield { type: "delta", text: turn.reply };
    yield { type: "done", turn, model: null, usedFallback: true };
    return;
  }

  const payload = buildChatUserPayload({
    messages,
    slots,
    missing: missingSlots(slots),
  });

  const failures: GeminiFailure[] = [];
  let emitted = 0;

  for (const model of CHAT_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUTS.chat);

    try {
      const ai = getGenAI();
      const stream = await ai.models.generateContentStream({
        model,
        contents: payload,
        config: {
          systemInstruction: CHAT_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: chatResponseSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.6,
          abortSignal: controller.signal,
        },
      });

      let raw = "";
      let decoded = 0;

      for await (const chunk of stream) {
        if (!chunk.text) continue;
        raw += chunk.text;

        // Decode and forward `reply` as it arrives; the structured tail
        // (slots, suggestions) is parsed once the document closes.
        const partial = extractPartialString(raw, "reply");
        if (partial && partial.text.length > decoded) {
          const delta = partial.text.slice(decoded);
          decoded = partial.text.length;
          emitted += delta.length;
          yield { type: "delta", text: delta };
        }
      }

      if (!raw.trim()) throw new Error(`Empty response from ${model}`);

      const turn = coerceTurn(parseJsonLoose(raw), { messages, previous: slots });
      // Escapes split across the final chunks can leave a character behind.
      if (emitted < turn.reply.length) {
        yield { type: "delta", text: turn.reply.slice(emitted) };
      }
      yield { type: "done", turn, model, usedFallback: false };
      return;
    } catch (err) {
      const { kind } = classifyError(err);
      failures.push({ model, kind, message: errorText(err).slice(0, 240) });
      console.warn(`[consultant] chat ${model} failed (${kind}):`, errorText(err).slice(0, 200));

      // Text already reached the client, so the next attempt must not append
      // to a half-written sentence.
      if (emitted > 0) {
        yield { type: "reset" };
        emitted = 0;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  console.error(
    "[consultant] all chat models failed, using rules:",
    failures.map((f) => `${f.model}[${f.kind}]`).join(", "),
  );
  const turn = rulesChatTurn(messages, slots);
  yield { type: "delta", text: turn.reply };
  yield { type: "done", turn, model: null, usedFallback: true };
}

/**
 * Fill any remaining slots from the transcript in one shot.
 *
 * Used when the visitor asks for the blueprint before every slot is filled —
 * better to infer the last field than to block them behind another question.
 */
export async function extractSlots(input: {
  messages: ChatMessage[];
  slots: Slots;
}): Promise<{ slots: Slots; usedFallback: boolean }> {
  const { messages, slots } = input;

  if (!hasGemini() || slotsComplete(slots)) {
    return { slots: fillRemaining(messages, slots), usedFallback: !hasGemini() };
  }

  try {
    const { value } = await runWithLadder(
      CHAT_MODELS,
      TIMEOUTS.chat,
      async (model, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model,
          contents: buildExtractUserPayload({ messages, slots }),
          config: {
            systemInstruction: EXTRACT_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: chatResponseSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            abortSignal: signal,
          },
        });
        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty extract response from ${model}`);
        return text;
      },
      { label: "consultant:extract", attemptsPerModel: 1 },
    );

    const turn = coerceTurn(parseJsonLoose(value), {
      messages,
      previous: slots,
      allowInference: true,
    });
    return { slots: fillRemaining(messages, mergeSlots(slots, turn.slots)), usedFallback: false };
  } catch {
    return { slots: fillRemaining(messages, slots), usedFallback: true };
  }
}

/**
 * Last-resort defaults so a blueprint can always be produced. Only reached
 * when both the model and keyword inference came up empty for a field.
 */
function fillRemaining(messages: ChatMessage[], slots: Slots): Slots {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  let next = mergeSlots(slots, inferSlotsFromText(userText, slots));

  if (!next.outcome) {
    const firstSubstantial = messages.find(
      (m) => m.role === "user" && m.content.trim().length >= 16,
    );
    next = mergeSlots(next, {
      outcome:
        firstSubstantial?.content.trim() ??
        userText.trim().slice(0, 1200) ??
        "Operational bottleneck that needs custom software",
    });
  }

  return mergeSlots(next, {
    audience: next.audience ?? "Not specified yet",
    today: next.today ?? "An off-the-shelf tool that half-fits",
    v1: next.v1 ?? "Core path only",
    timing: next.timing ?? "Within 3 months",
  });
}

export { missingSlots, nextSlot, slotsComplete };
