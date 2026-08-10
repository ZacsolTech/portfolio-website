import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Unguessable, URL-safe tokens.
 *
 * Used for anything that is authorised by possession of a link — shared
 * roadmaps, booking management, unsubscribe. These are bearer credentials, so
 * they come from the CSPRNG, never from `Math.random`, a timestamp, or a row id.
 *
 * 24 bytes gives 192 bits of entropy: brute-forcing one is not a threat model
 * anybody has to reason about again.
 */

const TOKEN_BYTES = 24;

export function createToken(bytes = TOKEN_BYTES): string {
	return randomBytes(bytes).toString("base64url");
}

/**
 * Short human-quotable reference, e.g. `ZC-7K2QF9`.
 *
 * Not a secret — it appears in emails and gets read aloud on calls. Ambiguous
 * characters (0/O, 1/I) are excluded so a client reading one back gets it right.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createReference(prefix = "ZC"): string {
	const bytes = randomBytes(6);
	let out = "";
	for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
	return `${prefix}-${out}`;
}

/**
 * Constant-time comparison for secrets that arrive in a header or query string
 * — a plain `===` on a shared secret leaks its prefix through timing.
 */
export function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	// Length is not secret, and timingSafeEqual throws on a mismatch.
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}
