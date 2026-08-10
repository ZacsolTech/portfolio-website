import { getClientIp, limitForm } from "@/lib/ai/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe.
 *
 * `GET` for the link in the footer, `POST` for the RFC 8058 one-click header
 * that Gmail and Outlook render as a native control. Both do the same thing and
 * neither asks for confirmation — an unsubscribe that takes two clicks gets
 * reported as spam instead, which costs the whole domain.
 *
 * The token addresses exactly one lead and grants exactly one action, so it is
 * safe in a URL that will end up in logs and proxies.
 */

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

async function unsubscribe(token: string): Promise<boolean> {
	if (!token || token.length > 128) return false;

	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "leads",
			where: { unsubscribeToken: { equals: token } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});

		const lead = found.docs[0];
		if (!lead) return false;

		await payload.update({
			collection: "leads",
			id: lead.id,
			overrideAccess: true,
			data: {
				nurtureStatus: "stopped",
				nurtureNextAt: null,
				nurtureStoppedReason: "unsubscribed",
				consent: {
					...(typeof lead.consent === "object" && lead.consent ? lead.consent : {}),
					marketingGranted: false,
				},
			} as never,
		});

		return true;
	} catch (err) {
		console.error("[unsubscribe] failed:", err);
		return false;
	}
}

function page(title: string, body: string, status = 200): Response {
	// A standalone document rather than a redirect into the app: this is the
	// last thing an annoyed recipient sees, so it must render instantly with no
	// JavaScript and no chance of a client-side error on the way.
	return new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f4f5;
    font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b}
  main{max-width:32rem;padding:2.5rem;background:#fff;border-radius:16px;border:1px solid #e4e4e7;margin:1rem}
  h1{margin:0 0 .75rem;font-size:1.375rem}
  p{margin:0 0 1rem;color:#3f3f46}
  a{color:#18181b}
</style></head>
<body><main><h1>${title}</h1>${body}<p><a href="/">Back to zacsol.com</a></p></main></body></html>`,
		{
			status,
			headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
		},
	);
}

export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get("token") ?? "";

	const allowed = await limitForm({
		ip: getClientIp(request),
		kind: "unsubscribe",
		max: 30,
	});
	if (!allowed) {
		return page("Too many requests", "<p>Try that link again in a few minutes.</p>", 429);
	}

	const done = await unsubscribe(token);

	return done
		? page(
				"You're unsubscribed",
				"<p>You won't get any more follow-ups from us. Anything you asked us to send — a roadmap, a booking confirmation — still comes through.</p>",
			)
		: page(
				"That link has expired",
				"<p>It may already have been used. If you're still getting emails from us, reply to any of them and we'll stop them by hand.</p>",
				404,
			);
}

/** RFC 8058 one-click. Mail providers POST here without opening a browser. */
export async function POST(request: Request) {
	const url = new URL(request.url);
	let token = url.searchParams.get("token") ?? "";

	if (!token) {
		const form = await request.formData().catch(() => null);
		token = String(form?.get("token") ?? "");
	}

	const done = await unsubscribe(token);
	return Response.json({ ok: done }, { status: done ? 200 : 404 });
}
