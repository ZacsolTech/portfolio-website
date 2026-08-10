import { nextNurtureRun } from "@/lib/nurture/sequence";
import type { LeadInput } from "./schema";

/**
 * The single write path for leads.
 *
 * Every surface — consultant gate, contact form, booking panel, newsletter —
 * funnels through `captureLead`, so there is exactly one place that decides
 * what a lead row looks like and exactly one place to change when it evolves.
 *
 * Storage failures must never cost the lead. Postgres being down is our
 * problem, not the visitor's: the full record is written to the log in a
 * recoverable shape and the caller carries on, because the visitor has already
 * done their part and the follow-up email still goes out.
 */

export type CaptureResult = {
	stored: boolean;
	id?: string | number;
	/** True when this email already existed and the row was enriched instead. */
	merged?: boolean;
	error?: string;
};

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

/**
 * Payload's generated types treat collection data loosely enough that a
 * hand-built partial fails structurally. The shape is enforced upstream by
 * `LeadInputSchema`, so the cast is at the boundary rather than in the logic.
 */
type LeadData = Record<string, unknown>;

function toLeadData(input: LeadInput): LeadData {
	const { contact, solution, utm, consent } = input;

	return {
		name: contact.name,
		email: contact.email,
		phone: contact.phone ?? null,
		company: contact.company ?? null,
		status: "new",
		channel: input.source,
		sessionId: input.sessionId ?? null,
		seed: input.seed ?? null,
		answers: input.answers ?? null,
		transcript: input.transcript ?? null,

		solutionTitle: solution?.title ?? null,
		serviceSlug: solution?.serviceSlug ?? null,
		costLowUsd: solution?.costLowUsd != null ? Math.round(solution.costLowUsd) : null,
		costHighUsd: solution?.costHighUsd != null ? Math.round(solution.costHighUsd) : null,
		durationLowWeeks: solution?.durationLowWeeks ?? null,
		durationHighWeeks: solution?.durationHighWeeks ?? null,
		blueprint: solution?.document ?? null,
		source: input.engine ?? null,

		consent: {
			emailGranted: consent.email?.granted ?? false,
			emailText: consent.email?.text ?? null,
			emailAt: consent.email?.at ?? null,
			marketingGranted: consent.marketing?.granted ?? false,
			marketingText: consent.marketing?.text ?? null,
			marketingAt: consent.marketing?.at ?? null,
		},

		utm: {
			utmSource: utm.source ?? null,
			utmMedium: utm.medium ?? null,
			utmCampaign: utm.campaign ?? null,
			utmTerm: utm.term ?? null,
			utmContent: utm.content ?? null,
			clickId: utm.gclid ?? utm.fbclid ?? null,
			referrer: utm.referrer ?? null,
			landingPath: utm.landingPath ?? null,
		},
	};
}

/**
 * What to log when the database is unreachable.
 *
 * Enough to re-key the lead by hand, without dumping a whole transcript into
 * the log stream — the conversation is recoverable from the session store, the
 * contact details are not recoverable from anywhere else.
 */
function recoveryRecord(input: LeadInput) {
	return {
		at: new Date().toISOString(),
		source: input.source,
		name: input.contact.name,
		email: input.contact.email,
		phone: input.contact.phone,
		company: input.contact.company,
		sessionId: input.sessionId,
		seed: input.seed?.slice(0, 400),
		solutionTitle: input.solution?.title,
		utm: input.utm,
	};
}

/**
 * Persist a lead, merging into an existing row when the address is already
 * known.
 *
 * Someone who runs the consultant and then books a call is one lead with two
 * touches, not two leads — merging keeps the sales view honest and stops the
 * nurture sequence from mailing the same person twice. First-touch attribution
 * and the original source are never overwritten.
 */
export async function captureLead(input: LeadInput): Promise<CaptureResult> {
	const data = toLeadData(input);

	try {
		const payload = await payloadClient();

		const existing = await payload.find({
			collection: "leads",
			where: { email: { equals: input.contact.email } },
			limit: 1,
			sort: "createdAt",
			overrideAccess: true,
		});

		const current = existing.docs[0];

		if (current) {
			// Keep whatever we already knew: a booking that carries no company
			// name must not erase the one the contact form captured.
			const merged: LeadData = {};
			for (const [key, value] of Object.entries(data)) {
				if (value === null || value === undefined) continue;
				merged[key] = value;
			}

			// First touch wins on origin and campaign.
			delete merged.channel;
			delete merged.utm;
			delete merged.status;

			// The follow-up sequence is deliberately not restarted on a repeat
			// touch: someone who already unsubscribed, or whom a human has
			// already picked up, must not be re-enrolled by their own second visit.
			const touches =
				typeof current.touchCount === "number" ? current.touchCount : 1;

			await payload.update({
				collection: "leads",
				id: current.id,
				overrideAccess: true,
				data: {
					...merged,
					touchCount: touches + 1,
					lastTouchChannel: input.source,
					lastTouchAt: new Date().toISOString(),
				} as never,
			});

			return { stored: true, id: current.id, merged: true };
		}

		const doc = await payload.create({
			collection: "leads",
			// The collection denies public create; this is the trusted server path.
			overrideAccess: true,
			data: {
				...data,
				touchCount: 1,
				lastTouchChannel: input.source,
				lastTouchAt: new Date().toISOString(),
				nurtureStatus: input.consent.email?.granted ? "active" : "stopped",
				nurtureStep: 0,
				nurtureNextAt: input.consent.email?.granted
					? nextNurtureRun(0, new Date()).toISOString()
					: null,
				nurtureStoppedReason: input.consent.email?.granted
					? null
					: "no email consent",
			} as never,
		});

		return { stored: true, id: doc.id };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(
			"[leads] PERSIST FAILED — recover from this log:",
			JSON.stringify(recoveryRecord(input)),
			message,
		);
		return { stored: false, error: message };
	}
}

/** Patch a stored lead. Never throws — a failed annotation is not a failed lead. */
export async function updateLead(
	id: string | number,
	data: Record<string, unknown>,
): Promise<void> {
	try {
		const payload = await payloadClient();
		await payload.update({
			collection: "leads",
			id,
			overrideAccess: true,
			data: data as never,
		});
	} catch (err) {
		console.error(`[leads] could not update lead ${id}:`, err);
	}
}

/**
 * Stop the nurture sequence for an address.
 *
 * Called when the lead books a call, unsubscribes, or a human moves them along
 * in the admin — "all stop on reply or booking" from `PAGES.md`.
 */
export async function stopNurture(email: string, reason: string): Promise<void> {
	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "leads",
			where: { email: { equals: email.toLowerCase() } },
			limit: 5,
			overrideAccess: true,
		});

		await Promise.all(
			found.docs
				.filter((doc) => doc.nurtureStatus === "active")
				.map((doc) =>
					payload.update({
						collection: "leads",
						id: doc.id,
						overrideAccess: true,
						data: {
							nurtureStatus: "stopped",
							nurtureNextAt: null,
							nurtureStoppedReason: reason.slice(0, 200),
						} as never,
					}),
				),
		);
	} catch (err) {
		console.error(`[leads] could not stop nurture for ${email}:`, err);
	}
}
