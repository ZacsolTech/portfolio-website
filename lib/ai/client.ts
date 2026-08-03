import { GoogleGenAI } from "@google/genai";

/**
 * Gemini access layer: model ladders, timeouts, retry/backoff and error
 * classification.
 *
 * Model choice matters more than it looks. The `*-latest` aliases float to the
 * newest release, and Google gives brand-new models a free-tier quota of 0–20
 * requests/day — so an alias that worked last month starts returning 429 on
 * every call with no code change. Defaults below are pinned to models that
 * actually serve traffic; override per environment once you have a paid key.
 */

let cached: GoogleGenAI | null = null;
let cachedKey: string | null = null;

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getGenAI(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  if (!cached || cachedKey !== key) {
    cached = new GoogleGenAI({ apiKey: key });
    cachedKey = key;
  }
  return cached;
}

function ladder(primary: string | undefined, fallbacks: string[]): string[] {
  const list = [primary, ...fallbacks].filter((m): m is string => Boolean(m));
  return list.filter((m, i) => list.indexOf(m) === i);
}

/**
 * Conversation turns: latency dominates perceived quality, so lead with the
 * fastest model that reliably honours a response schema.
 */
export const CHAT_MODELS = ladder(process.env.GEMINI_CHAT_MODEL, [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
]);

/** Blueprint generation: one call per session, so reasoning beats latency. */
export const BLUEPRINT_MODELS = ladder(process.env.GEMINI_BLUEPRINT_MODEL, [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
]);

export const TIMEOUTS = {
  chat: Number(process.env.GEMINI_CHAT_TIMEOUT_MS) || 20_000,
  blueprint: Number(process.env.GEMINI_BLUEPRINT_TIMEOUT_MS) || 35_000,
} as const;

export type GeminiFailure = {
  model: string;
  kind: "quota" | "unavailable" | "timeout" | "invalid" | "auth" | "unknown";
  message: string;
  /** Seconds the API asked us to wait, when it told us. */
  retryAfter?: number;
};

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Map an SDK error onto a retry decision. Quota and 5xx are worth another
 * model; auth and schema errors will fail identically on every model.
 */
export function classifyError(err: unknown): {
  kind: GeminiFailure["kind"];
  retryAfter?: number;
  retryable: boolean;
} {
  const text = errorText(err);
  const status = Number(text.match(/"code":\s*(\d+)/)?.[1] ?? 0);
  const retryAfter = Number(text.match(/retry in ([\d.]+)s/i)?.[1] ?? 0) || undefined;

  if (err instanceof Error && err.name === "AbortError") {
    return { kind: "timeout", retryable: true };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
    return { kind: "quota", retryAfter, retryable: true };
  }
  if (status === 503 || status === 500 || /UNAVAILABLE|overloaded|internal/i.test(text)) {
    return { kind: "unavailable", retryAfter, retryable: true };
  }
  if (status === 401 || status === 403 || /API key|PERMISSION_DENIED/i.test(text)) {
    return { kind: "auth", retryable: false };
  }
  if (status === 400 || status === 404 || /INVALID_ARGUMENT|not found|no longer available/i.test(text)) {
    return { kind: "invalid", retryable: false };
  }
  return { kind: "unknown", retryable: true };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type LadderResult<T> = {
  value: T;
  model: string;
  /** Models that failed before this one succeeded. */
  failures: GeminiFailure[];
};

/**
 * Run `fn` down the model ladder until one succeeds.
 *
 * Each model gets `attemptsPerModel` tries with exponential backoff, but only
 * for transient failures — a quota of 0 or a retired model never recovers, so
 * we move on immediately rather than burning the request budget.
 */
export async function runWithLadder<T>(
  models: string[],
  timeoutMs: number,
  fn: (model: string, signal: AbortSignal) => Promise<T>,
  opts: { attemptsPerModel?: number; label?: string } = {},
): Promise<LadderResult<T>> {
  const attempts = opts.attemptsPerModel ?? 2;
  const label = opts.label ?? "gemini";
  const failures: GeminiFailure[] = [];

  for (const model of models) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const value = await fn(model, controller.signal);
        return { value, model, failures };
      } catch (err) {
        const { kind, retryAfter, retryable } = classifyError(err);
        const message = errorText(err).slice(0, 240);
        failures.push({ model, kind, message, retryAfter });

        const lastAttempt = attempt === attempts - 1;
        // Waiting out a long quota window would blow the request budget; a
        // different model is cheaper than a 34-second sleep.
        const worthRetrying =
          retryable && kind !== "quota" && !lastAttempt && (retryAfter ?? 0) < 3;

        if (!retryable || !worthRetrying) break;
        await sleep(2 ** attempt * 400);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  const summary = failures.map((f) => `${f.model}[${f.kind}]`).join(" → ");
  console.error(`[${label}] all models failed: ${summary}`, failures[0]?.message ?? "");
  throw new GeminiLadderError(failures);
}

export class GeminiLadderError extends Error {
  readonly failures: GeminiFailure[];
  constructor(failures: GeminiFailure[]) {
    super(
      failures.length
        ? `All Gemini models failed: ${failures.map((f) => `${f.model} (${f.kind})`).join(", ")}`
        : "No Gemini models configured",
    );
    this.name = "GeminiLadderError";
    this.failures = failures;
  }
}

/** @deprecated Use CHAT_MODELS / BLUEPRINT_MODELS — kept for older imports. */
export const models = {
  flash: CHAT_MODELS[0]!,
  pro: BLUEPRINT_MODELS[0]!,
} as const;
