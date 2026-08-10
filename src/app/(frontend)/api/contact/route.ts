import { after } from "next/server";
import { z } from "zod";
import { getClientIp, limitForm } from "@/lib/ai/rate-limit";
import { captureLead, updateLead } from "@/lib/leads/capture";
import {
	AttributionSchema,
	consentRecord,
	EmailSchema,
	PersonNameSchema,
} from "@/lib/leads/schema";
import { internalRecipient, notify, summarize } from "@/lib/notifications";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Contact form.
 *
 * Three things happen and only one of them can fail the request: the lead is
 * stored, we get an alert, and the sender gets an acknowledgement. The
 * acknowledgement matters more than it looks — a form that gives no receipt is
 * the most common reason someone assumes it didn't work and emails a competitor
 * instead.
 */

const CONSENT_TEXT =
	"I agree to be contacted by email about this enquiry. We don't sell your details.";

const Body = z.object({
	name: PersonNameSchema,
	email: EmailSchema,
	phone: z.string().trim().max(40).optional(),
	service: z.string().trim().max(80).optional(),
	budget: z.string().trim().max(40).optional(),
	message: z.string().trim().min(1, "Add a short message.").max(4000),
	consent: z.literal(true, { message: "We need your agreement to reply by email." }),
	utm: AttributionSchema.optional(),
	turnstileToken: z.string().max(4000).optional(),
	/** Honeypot — accepted so a bot gets no signal, checked below. */
	company: z.string().max(200).optional(),
});

function json(data: unknown, status = 200) {
	return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
	let body: z.infer<typeof Body>;
	try {
		body = Body.parse(await request.json());
	} catch (err) {
		const message =
			err instanceof z.ZodError
				? (err.issues[0]?.message ?? "Check the form and try again.")
				: "Check the form and try again.";
		return json({ error: message }, 400);
	}

	// Silent success: a bot that filled the honeypot gets no signal to tune against.
	if (body.company) return json({ ok: true });

	const ip = getClientIp(request);

	const human = await verifyTurnstile({
		token: body.turnstileToken,
		ip,
		action: "contact",
	});
	if (!human.ok) return json({ error: human.error }, 403);

	const allowed = await limitForm({ ip, kind: "contact", max: 5 });
	if (!allowed) {
		return json(
			{ error: "Too many messages from this network. Try again in an hour." },
			429,
		);
	}

	const lead = await captureLead({
		source: "contact",
		seed: body.message,
		answers: {
			service: body.service ?? null,
			budget: body.budget ?? null,
			message: body.message,
		},
		contact: { name: body.name, email: body.email, phone: body.phone },
		consent: { email: consentRecord(true, CONSENT_TEXT) },
		utm: body.utm ?? {},
	});

	// Neither send blocks the response: a cold Resend connection costs ~11s and
	// the sender has already done their part.
	after(async () => {
		const results = await notify(
			{
				type: "contact.received",
				category: "transactional",
				name: body.name,
				message: body.message,
				service: body.service,
			},
			{ name: body.name, email: body.email },
		);

		if (lead.stored && lead.id !== undefined) {
			const outcome = summarize(results);
			await updateLead(lead.id, {
				emailStatus: outcome.status,
				emailError: outcome.detail,
			});
		}

		const internal = internalRecipient();
		if (internal) {
			await notify(
				{
					type: "contact.internal",
					category: "internal",
					lead: {
						name: body.name,
						email: body.email,
						phone: body.phone,
						service: body.service,
						budget: body.budget,
						message: body.message,
						source: "contact",
						utm: {
							source: body.utm?.source,
							medium: body.utm?.medium,
							campaign: body.utm?.campaign,
							referrer: body.utm?.referrer,
							landingPath: body.utm?.landingPath,
						},
					},
					adminUrl:
						lead.stored && lead.id !== undefined
							? absoluteUrl(`/admin/collections/leads/${lead.id}`)
							: null,
				},
				internal,
			);
		}
	});

	return json({
		ok: true,
		message: "Brief received. A senior engineer replies within one business day.",
	});
}
