import { Type } from "@google/genai";
import {
  BLUEPRINT_MODELS,
  GeminiLadderError,
  TIMEOUTS,
  getGenAI,
  hasGemini,
  runWithLadder,
} from "./client";
import { parseJsonLoose } from "./partial-json";
import { BLUEPRINT_SYSTEM_PROMPT, PROMPT_VERSION, buildBlueprintUserPrompt } from "./prompts";
import { buildRulesBlueprint } from "./rules-engine";
import {
  BlueprintSchema,
  SERVICE_SLUGS,
  applyMultipliers,
  type Blueprint,
  type ConsultantAnswers,
} from "./schema";

const MAX_OUTPUT_TOKENS = 3000;

const geminiBlueprintSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    why: { type: Type.STRING },
    serviceSlug: { type: Type.STRING, enum: [...SERVICE_SLUGS] },
    serviceTitle: { type: Type.STRING },
    features: { type: Type.ARRAY, items: { type: Type.STRING } },
    stack: { type: Type.ARRAY, items: { type: Type.STRING } },
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, weeks: { type: Type.NUMBER } },
        required: ["name", "weeks"],
      },
    },
    team: { type: Type.STRING },
    costBandUsd: { type: Type.ARRAY, items: { type: Type.NUMBER } },
    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "title",
    "why",
    "serviceSlug",
    "serviceTitle",
    "features",
    "stack",
    "phases",
    "team",
    "costBandUsd",
  ],
};

const DEFAULT_ASSUMPTIONS = [
  "Scope is confirmed in a short discovery before build starts",
  "Integrations depend on the relevant API access being available",
  "Timeline assumes timely feedback and decisions from your side",
];

function clip(value: unknown, max: number): string {
  const text = String(value ?? "").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function stringList(value: unknown, max: number, cap: number): string[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => clip(item, max))
    .filter(Boolean)
    .slice(0, cap);
}

/**
 * Vendors we must never appear to be reselling. The prompt already says so,
 * but a stack list goes straight to a prospective client — a model that drifts
 * once shouldn't be able to put a competitor's logo in our proposal.
 */
const OFF_BRAND =
  /\b(openai|gpt-?[345]|gpt-4o|chatgpt|claude|anthropic|copilot|llama|mistral|cohere|deepseek|grok|perplexity)\b/i;

function sanitizeStack(stack: string[]): string[] {
  const cleaned = stack.filter((item) => !OFF_BRAND.test(item));
  if (cleaned.length === stack.length) return cleaned;

  console.warn(
    "[consultant] stripped off-brand stack entries:",
    stack.filter((item) => OFF_BRAND.test(item)).join(", "),
  );
  // Anything AI-shaped that got removed is work we do on Gemini.
  if (!cleaned.some((item) => /gemini/i.test(item))) cleaned.push("Gemini");
  return cleaned;
}

/**
 * Coerce a model draft into a valid Blueprint.
 *
 * Cost and duration are always recomputed from our own multipliers: the model
 * proposes a base band for the scope, but scale and urgency pricing is a
 * business rule, not something we let the model improvise per visitor.
 */
function normalizeGeminiJson(raw: unknown, answers: ConsultantAnswers): Blueprint {
  const draft = (typeof raw === "string" ? parseJsonLoose(raw) : raw) as Record<string, unknown>;

  const phases = (Array.isArray(draft.phases) ? draft.phases : [])
    .slice(0, 6)
    .map((p) => {
      const phase = p as { name?: unknown; weeks?: unknown };
      return {
        name: clip(phase.name, 120),
        weeks: Math.min(16, Math.max(1, Math.round(Number(phase.weeks) || 1))),
      };
    })
    .filter((p) => p.name.length >= 2);

  while (phases.length < 2) {
    phases.push({ name: phases.length === 0 ? "Discovery & scope" : "Build & launch", weeks: 3 });
  }

  const phaseWeeks = phases.reduce((sum, p) => sum + p.weeks, 0);

  const bandRaw = Array.isArray(draft.costBandUsd) ? draft.costBandUsd : [];
  const lo = Number(bandRaw[0]);
  const hi = Number(bandRaw[1]);
  const baseTuple: [number, number] = [
    Number.isFinite(lo) && lo > 0 ? lo : 15000,
    Number.isFinite(hi) && hi > 0 ? hi : 35000,
  ];
  // Guard against an inverted band before multipliers compound the mistake.
  if (baseTuple[1] < baseTuple[0]) baseTuple[1] = baseTuple[0] * 2;

  const { costBandUsd, durationWeeks } = applyMultipliers(
    baseTuple,
    Math.max(phaseWeeks, 6),
    answers,
  );

  const features = stringList(draft.features, 80, 12);
  while (features.length < 4) features.push(`Core capability ${features.length + 1}`);

  const stack = sanitizeStack(stringList(draft.stack, 40, 10));
  const stackDefaults = ["Next.js", "Node.js", "PostgreSQL"];
  for (const fallback of stackDefaults) {
    if (stack.length >= 3) break;
    if (!stack.includes(fallback)) stack.push(fallback);
  }

  const assumptions = stringList(draft.assumptions, 200, 8);
  while (assumptions.length < 2) assumptions.push(DEFAULT_ASSUMPTIONS[assumptions.length]!);

  const slug = SERVICE_SLUGS.includes(draft.serviceSlug as never)
    ? (draft.serviceSlug as Blueprint["serviceSlug"])
    : "custom-software";

  return BlueprintSchema.parse({
    title: clip(draft.title, 160) || "Custom software platform built around your workflow",
    why: clip(draft.why, 800),
    serviceSlug: slug,
    serviceTitle: clip(draft.serviceTitle, 80) || "Custom software",
    features,
    stack,
    phases,
    team: clip(draft.team, 120) || "1 lead · 2 engineers",
    costBandUsd,
    durationWeeks,
    assumptions,
    risks: stringList(draft.risks, 200, 5),
    promptVersion: PROMPT_VERSION,
    source: "gemini",
  });
}

export type GenerateBlueprintResult = {
  blueprint: Blueprint;
  usedFallback: boolean;
  model?: string;
  error?: string;
};

/**
 * Generate a blueprint, degrading to the deterministic rules engine rather
 * than failing. A visitor always leaves with something scoped.
 */
export async function generateBlueprint(input: {
  seed: string;
  answers: ConsultantAnswers;
}): Promise<GenerateBlueprintResult> {
  if (!hasGemini()) {
    return {
      blueprint: buildRulesBlueprint(input.seed, input.answers),
      usedFallback: true,
      error: "GEMINI_API_KEY missing",
    };
  }

  try {
    const { value, model, failures } = await runWithLadder(
      BLUEPRINT_MODELS,
      TIMEOUTS.blueprint,
      async (model, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model,
          contents: buildBlueprintUserPrompt(input),
          config: {
            systemInstruction: BLUEPRINT_SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: geminiBlueprintSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.45,
            abortSignal: signal,
          },
        });
        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty blueprint response (${model})`);
        return normalizeGeminiJson(text, input.answers);
      },
      { label: "consultant:blueprint" },
    );

    if (failures.length) {
      console.info(
        `[consultant] blueprint via ${model} after ${failures.map((f) => f.model).join(", ")}`,
      );
    }
    return { blueprint: value, usedFallback: false, model };
  } catch (err) {
    const error =
      err instanceof GeminiLadderError
        ? err.failures.map((f) => `${f.model}[${f.kind}]`).join(" | ")
        : String(err);
    console.error("[consultant] blueprint fell back to rules engine:", error);
    return {
      blueprint: buildRulesBlueprint(input.seed, input.answers),
      usedFallback: true,
      error,
    };
  }
}
