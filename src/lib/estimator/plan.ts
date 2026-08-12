import { Type } from "@google/genai";
import {
  BLUEPRINT_MODELS,
  GeminiLadderError,
  TIMEOUTS,
  errorText,
  getGenAI,
  hasGemini,
  runWithLadder,
} from "@/lib/ai/client";
import { parseJsonLoose } from "@/lib/ai/partial-json";
import { CATALOG_KEYS, catalogEntry } from "./catalog";
import { anchorEffortWeeks, SCALE_USAGE_MULT, type ResolvedInputs } from "./pricing";
import { ESTIMATOR_PLAN_PROMPT, buildPlanPayload } from "./prompts";
import {
  BuildPlanSchema,
  DISCIPLINES,
  type BuildPlan,
  type BuildTask,
  type PlanBaseline,
  type RunCostSelection,
} from "./schema";

/**
 * Build-plan generation.
 *
 * One model call per estimate, made only when the visitor asks for the number.
 * It is the expensive step and the one that makes the quote specific, so it
 * gets the reasoning ladder rather than the chat ladder, and it degrades to a
 * deterministic plan rather than failing — a visitor always leaves with a
 * costed answer, even when Gemini is down.
 *
 * Nothing here produces money. The model returns effort and usage volumes;
 * `pricing.ts` and `catalog.ts` turn those into figures.
 */

const MAX_OUTPUT_TOKENS = 3500;

const geminiPlanSchema = {
  type: Type.OBJECT,
  properties: {
    approach: { type: Type.STRING },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          discipline: { type: Type.STRING, enum: [...DISCIPLINES] },
          weeks: { type: Type.NUMBER },
          note: { type: Type.STRING },
        },
        required: ["name", "discipline", "weeks"],
      },
    },
    runCosts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          // An enum here is worth more than any amount of prompt text: a key
          // outside the catalog has no price, so the line would be dropped and
          // the client's monthly bill would silently come up short.
          key: { type: Type.STRING, enum: [...CATALOG_KEYS] },
          qty: { type: Type.NUMBER },
          usage: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                meter: { type: Type.STRING },
                volume: { type: Type.NUMBER },
              },
              required: ["meter", "volume"],
            },
          },
          why: { type: Type.STRING },
        },
        required: ["key"],
      },
    },
  },
  required: ["approach", "tasks", "runCosts"],
  propertyOrdering: ["approach", "tasks", "runCosts"],
};

function clip(value: unknown, max: number): string {
  const text = String(value ?? "").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Money the model wrote anyway.
 *
 * The prompt forbids figures, and the prompt is not a guarantee. A task named
 * "API integration ($4,000)" undermines the entire premise that one engine
 * owns every number, so the figure is stripped rather than the task discarded.
 */
const MONEY = /[$€£]\s?\d[\d,.]*\s?[kmKM]?\b|\b\d[\d,.]*\s?(usd|dollars|eur)\b/gi;

function stripMoney(text: string): string {
  return text.replace(MONEY, "").replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s{2,}/g, " ").trim();
}

function normalizeTasks(raw: unknown): BuildTask[] {
  const list = Array.isArray(raw) ? raw : [];

  const tasks: BuildTask[] = [];
  for (const item of list.slice(0, 16)) {
    const task = item as { name?: unknown; discipline?: unknown; weeks?: unknown; note?: unknown };
    const name = stripMoney(clip(task.name, 90));
    if (name.length < 3) continue;

    const weeks = Number(task.weeks);
    if (!Number.isFinite(weeks) || weeks <= 0) continue;

    const discipline = (DISCIPLINES as readonly string[]).includes(String(task.discipline))
      ? (task.discipline as BuildTask["discipline"])
      : "Engineering";

    const note = stripMoney(clip(task.note, 220));

    tasks.push({
      name,
      discipline,
      // Two decimal places of person-week precision is already more than the
      // underlying judgement supports; more would be false confidence.
      weeks: Math.min(40, Math.max(0.2, Math.round(weeks * 20) / 20)),
      note: note.length >= 4 ? note : undefined,
    });
  }

  return tasks;
}

function normalizeRunCosts(raw: unknown): RunCostSelection[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const selections: RunCostSelection[] = [];

  for (const item of list.slice(0, 14)) {
    const sel = item as { key?: unknown; qty?: unknown; usage?: unknown; why?: unknown };
    const key = String(sel.key ?? "");
    const entry = catalogEntry(key);
    if (!entry) continue;
    // Two lines for the same product read as a billing error, not a stack.
    if (seen.has(key)) continue;
    seen.add(key);

    const meterIds = new Set((entry.meters ?? []).map((m) => m.id));
    const usage = (Array.isArray(sel.usage) ? sel.usage : [])
      .map((u) => {
        const row = u as { meter?: unknown; volume?: unknown };
        return { meter: String(row.meter ?? ""), volume: Number(row.volume) };
      })
      .filter((u) => meterIds.has(u.meter) && Number.isFinite(u.volume) && u.volume >= 0)
      .slice(0, 6);

    const qty = Number(sel.qty);

    selections.push({
      key,
      qty: Number.isFinite(qty) && qty >= 1 ? Math.min(500, Math.round(qty)) : undefined,
      usage: usage.length ? usage : undefined,
      why: stripMoney(clip(sel.why, 200)) || undefined,
    });
  }

  return selections;
}

/* ------------------------------ rules fallback ----------------------------- */

/** Effort split when there is no plan to go on — the six standard workstreams. */
const FALLBACK_SHARES: [BuildTask["discipline"], string, number][] = [
  ["Discovery & scoping", "Discovery, architecture and written scope", 0.09],
  ["Product & UI design", "Product and interface design", 0.13],
  ["Engineering", "Core build", 0.5],
  ["Integrations", "Third-party integrations", 0.06],
  ["QA & hardening", "QA, accessibility and performance", 0.11],
  ["Delivery management", "Delivery management", 0.06],
  ["Launch & handover", "Launch, documentation and handover", 0.05],
];

/**
 * Run costs inferred from keywords.
 *
 * Crude next to the model's read, and still far better than the previous
 * behaviour, which was to put every third-party fee in the exclusions list and
 * let the client discover it later. Volumes are scaled off the same curve the
 * scale lever uses, so an offline estimate and a planned one move the same way.
 */
function rulesRunCosts(input: ResolvedInputs, summary: string): RunCostSelection[] {
  const text = `${summary} ${input.projectType}`.toLowerCase();
  const usageMult = SCALE_USAGE_MULT[input.scale] ?? 1;
  const scaled = (base: number) => Math.round(base * usageMult);

  const picks: RunCostSelection[] = [];

  const wantsAi = /\bai\b|automat|chatbot|llm|agent|classif|summar|extract|rag\b/.test(text);
  const wantsWorkflow = /n8n|make\.com|zapier|workflow|pipeline|automat/.test(text);
  const internal = input.platform === "Internal only";

  if (wantsWorkflow) {
    picks.push({
      key: usageMult > 1 ? "n8n-cloud-pro" : "n8n-cloud-starter",
      usage: [{ meter: "executions", volume: scaled(4_000) }],
      why: "Runs and retries the automation workflows",
    });
  }

  if (wantsAi) {
    picks.push({
      key: "gemini-flash",
      usage: [
        { meter: "input-tokens", volume: scaled(6_000_000) },
        { meter: "output-tokens", volume: scaled(1_200_000) },
      ],
      why: "Model calls behind the automated steps",
    });
  }

  // Everything has to run somewhere. Omitting hosting is the single most
  // common way a running-cost estimate is wrong.
  if (internal || (wantsWorkflow && !/\bweb app|portal|platform|site\b/.test(text))) {
    picks.push({ key: "vps-small", why: "Hosts the service and its scheduler" });
  } else {
    picks.push({ key: "vercel-pro", qty: 2, why: "Hosting, CDN and preview environments" });
  }

  if (input.projectType !== "Marketing website") {
    picks.push({
      key: usageMult >= 4 ? "managed-postgres-ha" : "supabase-pro",
      why: "Application database, auth and file storage",
    });
  }

  if (input.projectType === "E-commerce" || /checkout|payment|subscription|billing/.test(text)) {
    picks.push({
      key: "stripe",
      usage: [{ meter: "volume", volume: scaled(40_000) }],
      why: "Card processing on transactions taken through the platform",
    });
  }

  if (/sms|text message|whatsapp|notification/.test(text)) {
    picks.push({
      key: /whatsapp/.test(text) ? "twilio-whatsapp" : "twilio-sms",
      usage: [
        { meter: /whatsapp/.test(text) ? "conversations" : "messages", volume: scaled(3_000) },
      ],
      why: "Customer notifications",
    });
  }

  picks.push({ key: "monitoring-basic", why: "Error tracking and uptime alerting" });

  return picks;
}

/**
 * A plan built without the model.
 *
 * Prices identically to the pre-plan engine by construction — the task shares
 * reproduce the old workstream split of the same anchor effort — so losing
 * Gemini costs the visitor specificity, never a broken or wildly different
 * number.
 */
export function rulesBuildPlan(input: ResolvedInputs, summary: string): BuildPlan {
  const effort = anchorEffortWeeks(input);
  const baseline = baselineFrom(input);
  const skipDesign = input.designState === "Designs ready to build";

  const tasks: BuildTask[] = FALLBACK_SHARES.filter(
    ([discipline]) => !(skipDesign && discipline === "Product & UI design"),
  ).map(([discipline, name, share]) => ({
    name,
    discipline,
    weeks: Math.max(0.2, Math.round(effort * share * 20) / 20),
  }));

  return BuildPlanSchema.parse({
    approach: "",
    tasks,
    runCosts: rulesRunCosts(input, summary),
    baseline,
    source: "rules",
  });
}

/**
 * `ResolvedInputs` carries plain strings because the levers can widen them;
 * the enum narrowing is re-established by `PlanBaselineSchema` on parse, so
 * this cast is checked a line later rather than trusted.
 */
function baselineFrom(input: ResolvedInputs): PlanBaseline {
  return {
    scale: input.scale as PlanBaseline["scale"],
    designState: input.designState as PlanBaseline["designState"],
    integrations: input.integrations,
    regulated: input.regulated,
  };
}

/* -------------------------------- generation ------------------------------- */

export type GenerateBuildPlanResult = {
  plan: BuildPlan;
  usedFallback: boolean;
  model?: string;
  error?: string;
};

export async function generateBuildPlan(input: {
  messages: { role: string; content: string }[];
  summary: string;
  resolved: ResolvedInputs;
}): Promise<GenerateBuildPlanResult> {
  const { resolved, summary, messages } = input;
  const baseline = baselineFrom(resolved);

  if (!hasGemini()) {
    return {
      plan: rulesBuildPlan(resolved, summary),
      usedFallback: true,
      error: "GEMINI_API_KEY missing",
    };
  }

  try {
    const { value, model } = await runWithLadder(
      BLUEPRINT_MODELS,
      TIMEOUTS.blueprint,
      async (candidate, signal) => {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: candidate,
          contents: buildPlanPayload({
            messages,
            summary,
            projectType: resolved.projectType,
            platform: resolved.platform,
            scope: resolved.scope,
            timeline: resolved.timeline,
            scale: resolved.scale,
            designState: resolved.designState,
            integrations: resolved.integrations,
            regulated: resolved.regulated,
          }),
          config: {
            systemInstruction: ESTIMATOR_PLAN_PROMPT,
            responseMimeType: "application/json",
            responseSchema: geminiPlanSchema,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // Low: this is a quote, and two visitors describing the same
            // project should not be handed materially different scopes.
            temperature: 0.3,
            abortSignal: signal,
          },
        });

        const text = response.text;
        if (!text?.trim()) throw new Error(`Empty plan response (${candidate})`);

        const draft = parseJsonLoose(text) as Record<string, unknown>;
        const tasks = normalizeTasks(draft.tasks);
        // A plan with no work in it is not a plan. Better to fall through to
        // the next model than to price an empty task list at the floor.
        if (tasks.length === 0) throw new Error(`Plan had no usable tasks (${candidate})`);

        return BuildPlanSchema.parse({
          approach: stripMoney(clip(draft.approach, 600)),
          tasks,
          runCosts: normalizeRunCosts(draft.runCosts),
          baseline,
          source: "gemini",
        });
      },
      { label: "estimator:plan", attemptsPerModel: 1 },
    );

    return { plan: value, usedFallback: false, model };
  } catch (err) {
    const error =
      err instanceof GeminiLadderError
        ? err.failures.map((f) => `${f.model}[${f.kind}]`).join(" | ")
        : errorText(err);
    console.error("[estimator] plan fell back to rules:", error);
    return { plan: rulesBuildPlan(resolved, summary), usedFallback: true, error };
  }
}
