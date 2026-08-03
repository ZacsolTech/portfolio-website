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
  SCALE_OPTIONS,
  TIMELINE_OPTIONS,
  normalizeScale,
  normalizeTimeline,
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
        problem: { type: Type.STRING },
        industry: { type: Type.STRING },
        current: { type: Type.STRING },
        scale: { type: Type.STRING, enum: [...SCALE_OPTIONS] },
        timeline: { type: Type.STRING, enum: [...TIMELINE_OPTIONS] },
      },
    },
    /**
     * Verbatim quotes backing the two slots that move the price. Checked
     * against the transcript server-side — an enum field makes a model want to
     * pick *something*, and asking it to cite the words is the only guard that
     * actually holds. See verifyPricedSlots.
     */
    evidence: {
      type: Type.OBJECT,
      properties: {
        scale: { type: Type.STRING },
        timeline: { type: Type.STRING },
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
 * Drop `scale` / `timeline` when the model cannot quote the visitor saying it.
 *
 * These two fields multiply the quoted price, so a hallucinated value doesn't
 * just look sloppy — it quotes a stranger the wrong number. Anything the
 * visitor did not actually say goes back to being an open question.
 */
function verifyPricedSlots(
  slots: Slots,
  evidence: { scale?: string; timeline?: string },
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

  for (const key of ["scale", "timeline"] as const) {
    // Already established and re-sent — no need to re-cite every turn.
    if (previous[key] && slots[key] === previous[key]) continue;
    if (!slots[key]) continue;

    const quote = loosen(evidence[key] ?? "");
    if (quote.length >= 2 && haystack.includes(quote)) continue;

    console.info(`[consultant] dropped unevidenced ${key}="${slots[key]}"`);
    delete verified[key];
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
  if (typeof slotsRaw.problem === "string" && slotsRaw.problem.trim()) {
    slots.problem = slotsRaw.problem.trim().slice(0, 1200);
  }
  if (typeof slotsRaw.industry === "string" && slotsRaw.industry.trim()) {
    slots.industry = slotsRaw.industry.trim().slice(0, 120);
  }
  if (typeof slotsRaw.current === "string" && slotsRaw.current.trim()) {
    slots.current = slotsRaw.current.trim().slice(0, 240);
  }
  if (typeof slotsRaw.scale === "string" && slotsRaw.scale.trim()) {
    slots.scale = normalizeScale(slotsRaw.scale);
  }
  if (typeof slotsRaw.timeline === "string" && slotsRaw.timeline.trim()) {
    slots.timeline = normalizeTimeline(slotsRaw.timeline);
  }

  const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : [])
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, 3);

  const evidenceRaw = (raw.evidence ?? {}) as Record<string, unknown>;
  const verified = context.allowInference
    ? slots
    : verifyPricedSlots(
        slots,
        {
          scale: typeof evidenceRaw.scale === "string" ? evidenceRaw.scale : undefined,
          timeline:
            typeof evidenceRaw.timeline === "string" ? evidenceRaw.timeline : undefined,
        },
        context.messages,
        context.previous,
      );

  // The visitor's opening message is the problem statement, whether or not the
  // model bothered to echo it into a slot. Their own words also make a better
  // blueprint seed than the model's paraphrase.
  if (!verified.problem && !context.previous.problem) {
    const opener = context.messages.find(
      (m) => m.role === "user" && m.content.trim().length >= 16,
    );
    if (opener) verified.problem = opener.content.trim().slice(0, 1200);
  }

  // Backfill the descriptive slots by keyword when the model acknowledges an
  // answer in prose but forgets to record it — otherwise it re-asks the same
  // question every turn and intake never completes. Only industry and current,
  // never scale or timeline: these two don't multiply the quoted price, so a
  // rough match costs far less than an endless loop.
  if (!verified.industry || !verified.current) {
    const userText = context.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    const guessed = inferSlotsFromText(userText, {
      ...context.previous,
      ...verified,
    });
    if (!verified.industry && guessed.industry) verified.industry = guessed.industry;
    if (!verified.current && guessed.current) verified.current = guessed.current;
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
  problem: {
    reply:
      "Tell me what's actually going wrong — a sentence or two about the bottleneck is plenty to start.",
    suggestions: [],
  },
  industry: {
    reply: "Got it. What kind of business is this for?",
    suggestions: ["Retail", "Logistics", "Healthcare"],
  },
  current: {
    reply: "How does that work today — manually, spreadsheets, or some tool you've outgrown?",
    suggestions: ["Manual / paper", "Spreadsheets", "An off-the-shelf tool"],
  },
  scale: {
    reply: "Roughly how many people would end up using this?",
    suggestions: [...SCALE_OPTIONS.slice(0, 3)],
  },
  timeline: {
    reply: "And how soon do you need it live?",
    suggestions: [...TIMELINE_OPTIONS.slice(0, 3)],
  },
};

/** Cheap keyword inference so the rules path still advances the conversation. */
function inferSlotsFromText(text: string, current: Slots): Slots {
  const patch: Slots = {};
  const t = text.toLowerCase();

  if (!current.industry) {
    const industries: [RegExp, string][] = [
      [/restaurant|cafe|catering|food|hospitality|kitchen/, "Restaurant / hospitality"],
      [/retail|e-?commerce|shop|store|merchandis/, "Retail / e-commerce"],
      [/health|clinic|patient|medical|dental|pharma/, "Healthcare"],
      [/fintech|bank|lending|insurance|payment/, "Fintech"],
      [/logistic|delivery|fleet|courier|freight|dispatch|warehouse/, "Logistics"],
      [/school|educat|student|course|training/, "Education"],
      [/manufactur|factory|production line|assembly/, "Manufacturing"],
      [/real estate|property|letting|tenant/, "Real estate"],
      [/agency|consult|law firm|account(ing|ant)/, "Professional services"],
    ];
    for (const [re, label] of industries) {
      if (re.test(t)) {
        patch.industry = label;
        break;
      }
    }
  }

  if (!current.current) {
    if (/spreadsheet|excel|google sheet/.test(t)) patch.current = "Spreadsheets";
    else if (/whatsapp|phone call|paper|notebook|by hand|manual/.test(t)) {
      patch.current = "Entirely manual / paper";
    } else if (/\berp\b|\bcrm\b|legacy|existing system|custom (built|software)/.test(t)) {
      patch.current = "Custom software that needs replacing";
    } else if (/shopify|wordpress|wix|squarespace|saas|off.?the.?shelf|subscription tool/.test(t)) {
      patch.current = "An off-the-shelf tool that half-fits";
    }
  }

  if (!current.scale && /\b\d[\d,]*\b\s*(people|users|staff|employees|team|seats)?/.test(t)) {
    const num = Number(t.match(/\b(\d[\d,]*)\b/)?.[1]?.replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0 && num < 1_000_000) {
      patch.scale = normalizeScale(String(num));
    }
  }

  if (!current.timeline && /asap|urgent|month|quarter|week|explor|no rush|soon/.test(t)) {
    patch.timeline = normalizeTimeline(t);
  }

  if (!current.problem && text.trim().length >= 16) {
    patch.problem = text.trim().slice(0, 1200);
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

  if (!next.problem) {
    const firstSubstantial = messages.find(
      (m) => m.role === "user" && m.content.trim().length >= 16,
    );
    next = mergeSlots(next, {
      problem:
        firstSubstantial?.content.trim() ??
        userText.trim().slice(0, 1200) ??
        "Operational bottleneck that needs custom software",
    });
  }

  return mergeSlots(next, {
    industry: next.industry ?? "Other",
    current: next.current ?? "An off-the-shelf tool that half-fits",
    scale: next.scale ?? "10–50 users",
    timeline: next.timeline ?? "Within 3 months",
  });
}

export { missingSlots, nextSlot, slotsComplete };
