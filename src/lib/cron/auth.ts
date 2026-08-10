import { safeEqual } from "@/lib/security/tokens";

/**
 * Cron endpoint authorisation.
 *
 * These routes send email and mutate rows, so they must not be openly callable.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when the secret is set,
 * which is the same header a human can use to trigger a run by hand.
 *
 * With no secret configured the route refuses to run in production rather than
 * running unprotected — a nurture endpoint anyone can hit is a way to mail a
 * customer the same message forty times.
 */
export function authorizeCron(request: Request): { ok: true } | { ok: false; response: Response } {
	const secret = process.env.CRON_SECRET;

	if (!secret) {
		if (process.env.NODE_ENV === "production") {
			console.error("[cron] CRON_SECRET is not set — refusing to run.");
			return {
				ok: false,
				response: Response.json({ error: "Cron is not configured." }, { status: 503 }),
			};
		}
		// Local runs are convenient and harmless: no real recipients, no secret.
		return { ok: true };
	}

	const header = request.headers.get("authorization") ?? "";
	const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

	if (!provided || !safeEqual(provided, secret)) {
		return {
			ok: false,
			response: Response.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	return { ok: true };
}
