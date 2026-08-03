/**
 * Incremental extraction of one string field from a JSON document that is
 * still being streamed.
 *
 * Gemini streams structured output as raw JSON text, so a naive `JSON.parse`
 * fails on every chunk until the last one. Because the response schema pins
 * `reply` as the first property, we can decode that string as it arrives and
 * render it token by token, then parse the completed document normally.
 */

export type PartialString = {
  /** Decoded content so far, safe to render. */
  text: string;
  /** True once the closing quote has arrived. */
  complete: boolean;
};

const ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/** Index of the opening quote of `key`'s string value, or -1. */
function findValueStart(raw: string, key: string): number {
  const needle = `"${key}"`;
  const keyAt = raw.indexOf(needle);
  if (keyAt < 0) return -1;

  let i = keyAt + needle.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== ":") return -1;
  i += 1;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== '"') return -1;
  return i;
}

/**
 * Decode the (possibly unterminated) JSON string value of `key`.
 * Returns null when the field has not started arriving yet.
 */
export function extractPartialString(raw: string, key: string): PartialString | null {
  const start = findValueStart(raw, key);
  if (start < 0) return null;

  let out = "";
  let i = start + 1;

  while (i < raw.length) {
    const ch = raw[i]!;

    if (ch === '"') return { text: out, complete: true };

    if (ch === "\\") {
      const next = raw[i + 1];
      // Escape sequence split across chunks — stop here and resume next time.
      if (next === undefined) break;

      if (next === "u") {
        const hex = raw.slice(i + 2, i + 6);
        if (hex.length < 4) break;
        const code = Number.parseInt(hex, 16);
        if (Number.isNaN(code)) break;
        out += String.fromCharCode(code);
        i += 6;
        continue;
      }

      const mapped = ESCAPES[next];
      if (mapped === undefined) break;
      out += mapped;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return { text: out, complete: false };
}

/**
 * Parse a complete JSON object, tolerating the wrappers models add when they
 * ignore `responseMimeType` — code fences, or a sentence before the brace.
 */
export function parseJsonLoose(raw: string): Record<string, unknown> {
  const text = raw.trim();

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // fall through
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim()) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1)) as Record<string, unknown>;
    } catch {
      // fall through
    }
  }

  throw new SyntaxError("Model did not return parseable JSON");
}
