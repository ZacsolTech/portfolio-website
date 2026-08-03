/**
 * Prompt-injection and abuse guards for consultant free-text input.
 * Fail closed on obvious attacks; keep legitimate messy business language.
 */

const BLOCK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /system\s*prompt/i,
  /you\s+are\s+now\s+dan/i,
  /jailbreak/i,
  /<\s*script\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bUNION\s+SELECT\b/i,
];

const MAX_SEED_CHARS = 4000;
const MIN_SEED_CHARS = 8;

export type SanitizeResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export function sanitizeSeed(raw: unknown): SanitizeResult {
  return sanitizeText(raw, { min: MIN_SEED_CHARS, max: MAX_SEED_CHARS });
}

/** Chat follow-ups can be short ("retail", "ASAP", "about 20 people"). */
export function sanitizeChatMessage(raw: unknown): SanitizeResult {
  return sanitizeText(raw, { min: 1, max: MAX_SEED_CHARS });
}

function sanitizeText(
  raw: unknown,
  limits: { min: number; max: number },
): SanitizeResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Describe your problem in plain text." };
  }

  const text = raw.replace(/\0/g, "").trim();

  if (text.length < limits.min) {
    return { ok: false, error: "Please add a bit more detail." };
  }

  if (text.length > limits.max) {
    return { ok: false, error: `Keep your message under ${limits.max} characters.` };
  }

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      return {
        ok: false,
        error: "That input can't be processed. Please rephrase your business problem.",
      };
    }
  }

  const cleaned = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ");

  return { ok: true, text: cleaned };
}

export function assertSafeAnswer(option: string, allowed: readonly string[]): boolean {
  return allowed.includes(option);
}
