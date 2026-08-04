/**
 * Cloudflare Turnstile verification. Server-side only — `TURNSTILE_SECRET_KEY`
 * must never reach a client bundle, so this module is imported by route
 * handlers exclusively.
 *
 * Every public write endpoint on the site spends something — a Gemini call, a
 * Resend send, a database row — so each one is a free lever for a script. This
 * is the cheapest credible bot check available: invisible to real visitors, no
 * reCAPTCHA privacy baggage, and free at any volume we will see.
 *
 * When the keys are absent verification is skipped rather than failed. That is
 * a deliberate dev-ergonomics choice, and it is loud: the skip is logged once
 * per process so nobody ships to production believing they are protected.
 * `assertTurnstileConfigured()` turns it into a hard error in production.
 */

const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 8_000;

export type TurnstileResult =
	| { ok: true; skipped?: true }
	| { ok: false; error: string; codes?: string[] };

let warned = false;

export function isTurnstileConfigured(): boolean {
	return Boolean(
		process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
	);
}

function warnOnce(): void {
	if (warned) return;
	warned = true;
	const where = process.env.NODE_ENV === "production" ? "PRODUCTION" : "development";
	console.warn(
		`[turnstile] not configured (${where}) — bot protection is OFF. ` +
			"Set TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY.",
	);
}

/**
 * Cloudflare's documented failure codes, mapped to something a visitor can act
 * on. Anything unrecognised gets the generic retry message — the raw codes are
 * for our logs, not for the person filling in the form.
 */
function messageFor(codes: string[]): string {
	if (codes.includes("timeout-or-duplicate")) {
		return "That verification expired. Please try again.";
	}
	if (codes.includes("missing-input-response")) {
		return "Verification did not complete. Please try again.";
	}
	if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
		// Our misconfiguration, not theirs — never blame the visitor.
		return "Verification is temporarily unavailable. Please try again shortly.";
	}
	return "We could not verify that request. Please try again.";
}

export async function verifyTurnstile(input: {
	token: string | undefined | null;
	ip?: string;
	/** Correlates the failure with a surface in the logs. */
	action?: string;
}): Promise<TurnstileResult> {
	const secret = process.env.TURNSTILE_SECRET_KEY;

	if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
		warnOnce();
		return { ok: true, skipped: true };
	}

	if (!input.token) {
		return { ok: false, error: "Please complete the verification check." };
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

	try {
		const body = new FormData();
		body.append("secret", secret);
		body.append("response", input.token);
		// `unknown` is what our IP helper returns when no proxy header is set;
		// sending it would be rejected as a malformed address.
		if (input.ip && input.ip !== "unknown") body.append("remoteip", input.ip);

		const response = await fetch(VERIFY_ENDPOINT, {
			method: "POST",
			body,
			signal: controller.signal,
		});

		if (!response.ok) {
			console.error(`[turnstile] siteverify returned ${response.status}`);
			return { ok: false, error: messageFor([]) };
		}

		const data = (await response.json()) as {
			success: boolean;
			"error-codes"?: string[];
			action?: string;
		};

		if (data.success) return { ok: true };

		const codes = data["error-codes"] ?? [];
		console.warn(`[turnstile] rejected (${input.action ?? "unknown"}):`, codes.join(", "));
		return { ok: false, error: messageFor(codes), codes };
	} catch (err) {
		// Cloudflare being unreachable must not take every form on the site down
		// with it. Rate limits and the honeypot still cap the damage.
		const aborted = err instanceof Error && err.name === "AbortError";
		console.error(
			`[turnstile] verification unavailable (${aborted ? "timeout" : "network"}) — allowing request:`,
			err,
		);
		return { ok: true, skipped: true };
	} finally {
		// Without this the pending timer keeps the serverless invocation alive
		// for the full budget after a fast response.
		clearTimeout(timer);
	}
}
