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
} from "@/lib/ai/client";
import { extractPartialString, parseJsonLoose } from "@/lib/ai/partial-json";
import {
  ESTIMATOR_EXTRACT_PROMPT,
  ESTIMATOR_NARRATIVE_PROMPT,
  ESTIMATOR_SYSTEM_PROMPT,
  buildEstimatorExtractPayload,
  buildEstimatorUserPayload,
  buildNarrativePayload,
} from "./prompts";
import {
  DESIGN_STATES,
  EstimatorChatTurnSchema,
  PLATFORMS,
  PROJECT_TYPES,
  REQUIRED_SLOTS,
  SCALES,
  SCOPES,
  TIMELINES,
  type EstimatorChatTurn,
  type EstimatorSlots,
  type RequiredSlotKey,
} from "./schema";

const MAX_OUTPUT_TOKENS = 1200;
const MIN_SUMMARY_CHARS = 12;

/** `reply` is ordered first so it can stream before the structured tail. */
const estimatorResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING },
    slots: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        projectType: { type: Type.STRING, enum: [...PROJECT_TYPES] },
        platform: { type: Type.STRING, enum: [...PLATFORMS] },
        scope: { type: Type.STRING, enum: [...SCOPES] },
        timeline: { type: Type.STRING, enum: [...TIMELINES] },
        scale: { type: Type.STRING, enum: [...SCALES] },
        designState: { type: Type.STRING, enum: [...DESIGN_STATES] },
        integrations: { type: Type.NUMBER },
        regulated: { type: Type.BOOLEAN },
      },
    },
    wantsEstimate: { type: Type.BOOLEAN },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["reply", "wantsEstimate"],
  propertyOrdering: ["reply", "slots", "wantsEstimate", "suggestions"],
};

export type EstimatorMessage = { role: "user" | "assistant"; content: string };

function stripUndefined(slots: EstimatorSlots): EstimatorSlots {
  return Object.fromEntries(
    Object.entries(slots).filter(([, value]) => value !== undefined),
  ) as EstimatorSlots;
}

export type EstimatorChatEvent =
  | { type: "delta"; text: string }
  | { type: "reset" }
  | {
      type: "done";
      turn: EstimatorChatTurn;
      model: string | null;
      usedFallback: boolean;
    };

/* -------------------------------- slot logic ------------------------------- */

export function missingRequired(slots: EstimatorSlots): RequiredSlotKey[] {
  return REQUIRED_SLOTS.filter((key) => {
    const value = slots[key];
    if (!value) return true;
    if (key === "summary") return String(value).trim().length < MIN_SUMMARY_CHARS;
    return false;
  });
}

export function requiredComplete(slots: EstimatorSlots): boolean {
  return missingRequired(slots).length === 0;
}

export function estimatorProgress(slots: EstimatorSlots): number {
  const filled = REQUIRED_SLOTS.length - missingRequired(slots).length;
  return Math.round((filled / REQUIRED_SLOTS.length) * 100);
}

/** Merge a patch onto existing slots; empty values never clear a known answer. */
export function mergeEstimatorSlots(
  current: EstimatorSlots,
  patch: EstimatorSlots | undefined,
): EstimatorSlots {
  if (!patch) return current;

  const next: EstimatorSlots = { ...current };

  // Keep the richer summary — models compress on later turns, and this text
  // is what the narrative and the visitor's own recap are built from.
  if (patch.summary && patch.summary.trim().length >= (current.summary?.length ?? 0)) {
    next.summary = patch.summary.trim().slice(0, 1200);
  }
  if (patch.projectType) next.projectType = patch.projectType;
  if (patch.platform) next.platform = patch.platform;
  if (patch.scope) next.scope = patch.scope;
  if (patch.timeline) next.timeline = patch.timeline;
  if (patch.scale) next.scale = patch.scale;
  if (patch.designState) next.designState = patch.designState;
  if (typeof patch.integrations === "number" && Number.isFinite(patch.integrations)) {
    next.integrations = Math.max(0, Math.min(20, Math.round(patch.integrations)));
  }
  if (typeof patch.regulated === "boolean") next.regulated = patch.regulated;

  return next;
}

/**
 * Explicit asks for the number. Narrow by design: it requires a word that can
 * only mean "the result", never a bare "yes"/"ok" answering a question.
 */
export function isExplicitEstimateRequest(text: string): boolean {
  const t = text.trim();
  if (t.length > 200) return false;
  if (/^(yes|yep|yeah|yup|ok|okay|sure|please|correct|right|both|no)\b[\s.!]*$/i.test(t)) {
    return false;
  }
  return /\b(estimate|cost|price|quote|budget|how much|ballpark|figure|number)\b/i.test(t);
}

function coerceTurn(
  raw: Record<string, unknown>,
  context: { messages: EstimatorMessage[]; previous: EstimatorSlots },
): EstimatorChatTurn {
  const slotsRaw = (raw.slots ?? {}) as Record<string, unknown>;
  const pickEnum = <T extends readonly string[]>(value: unknown, allowed: T) =>
    typeof value === "string" && (allowed as readonly string[]).includes(value)
      ? (value as T[number])
      : undefined;

  const slots: EstimatorSlots = {
    summary:
      typeof slotsRaw.summary === "string" && slotsRaw.summary.trim()
        ? slotsRaw.summary.trim().slice(0, 1200)
        : undefined,
    projectType: pickEnum(slotsRaw.projectType, PROJECT_TYPES),
    platform: pickEnum(slotsRaw.platform, PLATFORMS),
    scope: pickEnum(slotsRaw.scope, SCOPES),
    timeline: pickEnum(slotsRaw.timeline, TIMELINES),
    scale: pickEnum(slotsRaw.scale, SCALES),
    designState: pickEnum(slotsRaw.designState, DESIGN_STATES),
    integrations:
      typeof slotsRaw.integrations === "number" && Number.isFinite(slotsRaw.integrations)
        ? Math.max(0, Math.min(20, Math.round(slotsRaw.integrations)))
        : undefined,
    regulated: typeof slotsRaw.regulated === "boolean" ? slotsRaw.regulated : undefined,
  };

  // The opening message is the project description, whether or not the model
  // echoed it into a slot — and the visitor's own words beat a paraphrase.
  if (!slots.summary && !context.previous.summary) {
    const opener = context.messages.find(
      (m) => m.role === "user" && m.content.trim().length >= MIN_SUMMARY_CHARS,
    );
    if (opener) slots.summary = opener.content.trim().slice(0, 1200);
  }

  // Backfill enum slots by keyword when the model answers in prose but forgets
  // to record the value. Without this it re-asks the same question every turn
  // and intake never completes — observed repeatedly with "web mainly, but
  // staff use tablets". Inference only fires on explicit keywords, and the
  // result screen shows exactly what was priced with levers to correct it, so
  // a wrong guess is visible and fixable where a silent loop is neither.
  const merged = { ...context.previous, ...stripUndefined(slots) };
  if (missingRequired(merged).length > 0) {
    const userText = context.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");
    const guessed = inferEstimatorSlots(userText, merged);
    slots.projectType = slots.projectType ?? merged.projectType ?? guessed.projectType;
    slots.platform = slots.platform ?? merged.platform ?? guessed.platform;
    slots.scope = slots.scope ?? merged.scope ?? guessed.scope;
    slots.timeline = slots.timeline ?? merged.timeline ?? guessed.timeline;
  }

  const lastUser = [...context.messages].reverse().find((m) => m.role === "user");

  return EstimatorChatTurnSchema.parse({
    reply: String(raw.reply ?? "").trim() || "Tell me a bit more about what you need.",
    slots,
    wantsEstimate:
      Boolean(raw.wantsEstimate) ||
      (lastUser ? isExplicitEstimateRequest(lastUser.content) : false),
    suggestions: (Array.isArray(raw.suggestions) ? raw.suggestions : [])
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim().slice(0, 48))
      .filter(Boolean)
      .slice(0, 3),
  });
}

/* ---------------------------- deterministic path ---------------------------- */

const FALLBACK_QUESTIONS: Record<
  RequiredSlotKey,
  { reply: string; suggestions: string[] }
> = {
  summary: {
    reply: "What are you looking to build? A sentence or two is plenty.",
    suggestions: [],
  },
  projectType: {
    reply: "What kind of project is it closest to?",
    suggestions: ["Web app or platform", "Mobile app", "Internal tool"],
  },
  platform: {
    reply: "Where does it need to run?",
    suggestions: ["Web", "Mobile", "Web + mobile"],
  },
  scope: {
    reply: "Are we talking about a first version, or the full product?",
    suggestions: ["MVP — smallest thing that works", "Full product", "Add to an existing system"],
  },
  timeline: {
    reply: "And how soon do you need it live?",
    suggestions: ["As soon as possible", "This quarter", "Next 6 months"],
  },
};

/** Keyword inference so the offline path still advances the conversation. */
export function inferEstimatorSlots(
  text: string,
  current: EstimatorSlots,
): EstimatorSlots {
  const t = text.toLowerCase();
  const patch: EstimatorSlots = {};

  if (!current.projectType) {
    if (/\b(mobile|ios|android|app store|play store)\b/.test(t)) patch.projectType = "Mobile app";
    else if (/\b(shop|store|checkout|cart|e-?commerce|sell online)\b/.test(t)) {
      patch.projectType = "E-commerce";
    } else if (/\b(ai|automat|chatbot|llm|agent)\b/.test(t)) patch.projectType = "AI / automation";
    else if (/\b(dashboard|analytic|report|warehouse|forecast|\bbi\b)\b/.test(t)) {
      patch.projectType = "Data & analytics";
    } else if (/\b(internal|admin|back.?office|ops tool)\b/.test(t)) {
      patch.projectType = "Internal tool";
    } else if (/\b(marketing site|landing page|brochure|website)\b/.test(t)) {
      patch.projectType = "Marketing website";
    } else if (/\b(platform|portal|saas|web app|system)\b/.test(t)) {
      patch.projectType = "Web app or platform";
    }
  }

  if (!current.platform) {
    const web = /\bweb\b|browser|website|portal/.test(t);
    const mobile = /\bmobile\b|ios|android|phone|tablet/.test(t);
    if (web && mobile) patch.platform = "Web + mobile";
    else if (mobile) patch.platform = "Mobile";
    else if (/\binternal\b|staff only|back.?office/.test(t)) patch.platform = "Internal only";
    else if (web) patch.platform = "Web";
  }

  if (!current.scope) {
    // An explicit statement wins over an incidental verb: "full product, we're
    // replacing a paper system" is a full product, not a software rebuild.
    if (/\bmvp\b|prototype|pilot|first version|proof of concept|\bpoc\b/.test(t)) {
      patch.scope = "MVP — smallest thing that works";
    } else if (/full product|the whole thing|complete build/.test(t)) {
      patch.scope = "Full product";
    } else if (/add to|extend|bolt on|integrate into our|plug into/.test(t)) {
      patch.scope = "Add to an existing system";
    } else if (
      /rebuild|rewrite|migrat|legacy|replace (our|the|an) (existing |current |old )?(system|software|app|platform|site|portal|tool)/.test(
        t,
      )
    ) {
      patch.scope = "Rebuild of something existing";
    }
  }

  if (!current.timeline) {
    if (/asap|urgent|immediately|right away|as soon/.test(t)) patch.timeline = "As soon as possible";
    else if (/this quarter|next few months|3 months/.test(t)) patch.timeline = "This quarter";
    else if (/explor|not sure|no rush|just looking/.test(t)) patch.timeline = "Still exploring";
    else if (/6 months|half year|next year/.test(t)) patch.timeline = "Next 6 months";
  }

  if (current.regulated === undefined && /hipaa|\bphi\b|patient|medical|\bpci\b|financial data|\bgdpr\b|regulated/.test(t)) {
    patch.regulated = true;
  }

  if (!current.summary && text.trim().length >= MIN_SUMMARY_CHARS) {
    patch.summary = text.trim().slice(0, 1200);
  }

  return patch;
}

/** Deterministic turn used when Gemini is unreachable. */
export function rulesEstimatorTurn(
  messages: EstimatorMessage[],
  slots: EstimatorSlots,
): EstimatorChatTurn {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const merged = mergeEstimatorSlots(
    slots,
    inferEstimatorSlots(lastUser?.content ?? "", slots),
  );
  const missing = missingRequired(merged);

  if (missing.length === 0) {
    return EstimatorChatTurnSchema.parse({
      reply: "That's everything I need — I can run the numbers whenever you're ready.",
      slots: merged,
      wantsEstimate: false,
      suggestions: [],
    });
  }

  const question = FALLBACK_QUESTIONS[missing[0]!];
  return EstimatorChatTurnSchema.parse({
    reply: question.reply,
    slots: merged,
    wantsEstimate: false,
    suggestions: question.suggestions,
  });
}

/* -------------------------------- streaming -------------------------------- */

export async function* streamEstimatorTurn(input: {
  messages: EstimatorMessage[];
  slots: EstimatorSlots;
}): AsyncGenerator<EstimatorChatEvent> {
  const { messages, slots } = input;

  if (!hasGemini()) {
    const turn = rulesEstimatorTurn(messages, slots);
    yield { type: "delta", text: turn.reply };
    yield { type: "done", turn, model: null, usedFallback: true };
    return;
  }

  const payload = buildEstimatorUserPayload({
    messages,
    slots,
    missing: missingRequired(slots),
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
          systemInstruction: ESTIMATOR_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: estimatorResponseSchema,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.55,
          abortSignal: controller.signal,
        },
      });

      let raw = "";
      let decoded = 0;

      for await (const chunk of stream) {
        if (!chunk.text) continue;
        raw += chunk.text;

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
      if (emitted < turn.reply.length) {
        yield { type: "delta", text: turn.reply.slice(emitted) };
      }
      yield { type: "done", turn, model, usedFallback: false };
      return;
    } catch (err) {
      const { kind } = classifyError(err);
      failures.push({ model, kind, message: errorText(err).slice(0, 240) });
      console.warn(`[estimator] chat ${model} failed (${kind}):`, errorText(err).slice(0, 200));

      // Text already reached the client; the retry must not append to a
      // half-written sentence.
      if (emitted > 0) {
        yield { type: "reset" };
        emitted = 0;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  console.error(
    "[estimator] all chat models failed, using rules:",
    failures.map((f) => `${f.model}[${f.kind}]`).join(", "),
  );
  const turn = rulesEstimatorTurn(messages, slots);
  yield { type: "delta", text: turn.reply };
  yield { type: "done", turn, model: null, usedFallback: true };
}

/** Fill remaining slots in one shot when the visitor asks for the number early. */
export async function extractEstimatorSlots(input: {
  messages: EstimatorMessage[];
  slots: EstimatorSlots;
}): Promise<EstimatorSlots> {
  const { messages, slots } = input;
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  const withGuesses = mergeEstimatorSlots(slots, inferEstimatorSlots(userText, slots));

  if (!hasGemini() || requiredComplete(withGuesses)) return withGuesses;

  try {
    const { value } = await runWithLadder(
      CHAT_MODELS,
      TIMEOUTS.chat,
      async (model, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model,
          contents: buildEstimatorExtractPayload({ messages, slots: withGuesses }),
          config: {
            systemInstruction: ESTIMATOR_EXTRACT_PROMPT,
            responseMimeType: "application/json",
            responseSchema: estimatorResponseSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            abortSignal: signal,
          },
        });
        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty extract response from ${model}`);
        return text;
      },
      { label: "estimator:extract", attemptsPerModel: 1 },
    );

    const turn = coerceTurn(parseJsonLoose(value), {
      messages,
      previous: withGuesses,
    });
    return mergeEstimatorSlots(withGuesses, turn.slots);
  } catch {
    return withGuesses;
  }
}

/* -------------------------------- narrative -------------------------------- */

const narrativeSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["narrative"],
};

/**
 * Prose explaining an already-computed estimate. Returns null on any failure —
 * the estimate stands on its own, so this is presentation, not substance.
 */
export async function generateNarrative(
  input: Parameters<typeof buildNarrativePayload>[0],
): Promise<{ narrative: string; risks: string[] } | null> {
  if (!hasGemini()) return null;

  try {
    const { value } = await runWithLadder(
      CHAT_MODELS,
      TIMEOUTS.chat,
      async (model, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model,
          contents: buildNarrativePayload(input),
          config: {
            systemInstruction: ESTIMATOR_NARRATIVE_PROMPT,
            responseMimeType: "application/json",
            responseSchema: narrativeSchema,
            maxOutputTokens: 900,
            temperature: 0.5,
            abortSignal: signal,
          },
        });
        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty narrative from ${model}`);
        return text;
      },
      { label: "estimator:narrative", attemptsPerModel: 1 },
    );

    const parsed = parseJsonLoose(value);
    const narrative = String(parsed.narrative ?? "").trim().slice(0, 700);
    if (!narrative) return null;

    return {
      narrative,
      risks: (Array.isArray(parsed.risks) ? parsed.risks : [])
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim().slice(0, 200))
        .filter(Boolean)
        .slice(0, 4),
    };
  } catch (err) {
    console.warn("[estimator] narrative unavailable:", errorText(err).slice(0, 160));
    return null;
  }
}
