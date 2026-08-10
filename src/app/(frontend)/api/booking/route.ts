import { after } from "next/server";
import { z } from "zod";
import { getClientIp, limitForm } from "@/lib/ai/rate-limit";
import { generateAvailability, isSlotAvailable } from "@/lib/booking/availability";
import { releaseBooking } from "@/lib/booking/cancel";
import { bookingConfig, calLink } from "@/lib/booking/config";
import { buildIcs, icsToBase64 } from "@/lib/booking/ics";
import { captureLead, stopNurture, updateLead } from "@/lib/leads/capture";
import {
	AttributionSchema,
	consentRecord,
	EmailSchema,
	PersonNameSchema,
} from "@/lib/leads/schema";
import { internalRecipient, notify, summarize, type BookingSummary } from "@/lib/notifications";
import { createReference, createToken } from "@/lib/security/tokens";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/content";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Booking API.
 *
 * `GET` returns the slots we are prepared to offer. `POST` takes one of them.
 *
 * The two are deliberately derived from the same `generateAvailability` call:
 * the slot the client sends back is re-validated against freshly generated
 * availability, so a crafted request cannot book 03:00 on a Sunday, a slot in
 * the past, or one outside the horizon. The unique index on `bookings.slotKey`
 * is the last line of defence — two visitors clicking the same slot in the same
 * second resolve to one booking and one honest "just taken" message.
 */

const EMAIL_CONSENT_TEXT =
	"Email me a calendar invite for this consultation.";

const Body = z.object({
	startsAt: z.string().datetime(),
	name: PersonNameSchema,
	email: EmailSchema,
	phone: z.string().trim().max(40).optional(),
	topic: z.string().trim().max(1500).optional(),
	/** IANA zone from the browser; used to render every email in their local time. */
	timezone: z.string().trim().max(64).optional(),
	consent: z.literal(true, {
		message: "We need your agreement to email the invite.",
	}),
	marketingConsent: z.boolean().optional(),
	utm: AttributionSchema.optional(),
	turnstileToken: z.string().max(4000).optional(),
	/**
	 * Manage token of a booking this one replaces. When present the old slot is
	 * released and the calendar UID is carried over, so the attendee's calendar
	 * moves the existing event rather than gaining a second one.
	 */
	rescheduleToken: z.string().max(128).optional(),
	/** Honeypot — accepted so a bot gets no signal, checked below. */
	company: z.string().max(200).optional(),
});

type PriorBooking = {
	id: string | number;
	reference: string;
	startsAt: string;
	calendarUid: string;
	sequence: number;
};

/**
 * Resolve the booking being replaced.
 *
 * A bad or already-cancelled token is not an error: the visitor still wants the
 * new slot, and refusing it because their old link expired would be perverse.
 */
async function findPriorBooking(token: string | undefined): Promise<PriorBooking | null> {
	if (!token) return null;
	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "bookings",
			where: { manageToken: { equals: token } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});

		const doc = found.docs[0];
		if (!doc || doc.status === "cancelled") return null;

		return {
			id: doc.id,
			reference: doc.reference,
			startsAt: new Date(doc.startsAt).toISOString(),
			// Older rows predate calendarUid; fall back to how their UID was built.
			calendarUid: doc.calendarUid || `${doc.reference}@${site.domain}`,
			sequence: typeof doc.sequence === "number" ? doc.sequence : 0,
		};
	} catch (err) {
		console.error("[booking] could not load the booking being replaced:", err);
		return null;
	}
}

function json(data: unknown, status = 200) {
	return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

function hostName(): string {
	return bookingConfig.hostName || `a ${site.name} senior engineer`;
}

function validTimezone(value: string | undefined): string {
	if (!value) return bookingConfig.timezone;
	try {
		new Intl.DateTimeFormat("en-GB", { timeZone: value });
		return value;
	} catch {
		return bookingConfig.timezone;
	}
}

/** Instants already spoken for, so they are never offered twice. */
async function takenSlots(from: Date, to: Date): Promise<Set<string>> {
	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "bookings",
			where: {
				and: [
					{ startsAt: { greater_than_equal: from.toISOString() } },
					{ startsAt: { less_than_equal: to.toISOString() } },
					{ status: { not_equals: "cancelled" } },
				],
			},
			limit: 500,
			depth: 0,
			overrideAccess: true,
		});
		return new Set(found.docs.map((doc) => new Date(doc.startsAt).toISOString()));
	} catch (err) {
		// Offering a slot that turns out to be taken is recoverable — the POST
		// rejects it. Refusing to show any calendar is not.
		console.error("[booking] could not read existing bookings:", err);
		return new Set();
	}
}

async function currentAvailability(now = new Date()) {
	const horizonEnd = new Date(
		now.getTime() + bookingConfig.horizonDays * 24 * 60 * 60 * 1000,
	);
	const taken = await takenSlots(now, horizonEnd);
	return generateAvailability({ now, taken });
}

export async function GET() {
	const cal = calLink();
	if (cal) {
		// Cal.com owns scheduling when it is configured; the native calendar is
		// not rendered, so there is nothing to compute.
		return json({ ok: true, provider: "cal.com", calLink: cal, days: [] });
	}

	const days = await currentAvailability();

	return json({
		ok: true,
		provider: "native",
		timezone: bookingConfig.timezone,
		durationMinutes: bookingConfig.durationMinutes,
		hostName: hostName(),
		days,
	});
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

	// Silent success: a bot that filled the honeypot gets nothing to tune against.
	if (body.company) {
		return json({ ok: true, reference: createReference() });
	}

	const ip = getClientIp(request);

	const human = await verifyTurnstile({
		token: body.turnstileToken,
		ip,
		action: "booking",
	});
	if (!human.ok) return json({ error: human.error }, 403);

	const allowed = await limitForm({ ip, kind: "booking", max: 5 });
	if (!allowed) {
		return json(
			{ error: "Too many booking attempts from this network. Try again later." },
			429,
		);
	}

	const now = new Date();
	const days = await currentAvailability(now);
	const slot = isSlotAvailable(new Date(body.startsAt).toISOString(), days);

	if (!slot) {
		return json(
			{
				error: "That time is no longer available. Pick another and we'll confirm it.",
				code: "slot_unavailable",
			},
			409,
		);
	}

	const timezone = validTimezone(body.timezone);
	const reference = createReference();
	const manageToken = createToken();
	const manageUrl = absoluteUrl(`/book/manage/${manageToken}`);

	const prior = await findPriorBooking(body.rescheduleToken);
	// Same UID, higher SEQUENCE: that is precisely how RFC 5545 expresses "this
	// meeting moved", and it is what makes a calendar client update the event in
	// place instead of leaving the old one sitting there.
	const calendarUid = prior?.calendarUid ?? `${reference}@${site.domain}`;
	const sequence = prior ? prior.sequence + 1 : 0;

	/* ------------------------------ persist ------------------------------ */

	let bookingId: string | number | undefined;
	try {
		const payload = await payloadClient();
		const doc = await payload.create({
			collection: "bookings",
			overrideAccess: true,
			data: {
				reference,
				name: body.name,
				email: body.email,
				phone: body.phone ?? null,
				topic: body.topic ?? null,
				startsAt: slot.startsAt,
				endsAt: slot.endsAt,
				// Unique while the booking is live; the cancel path suffixes it so
				// the slot returns to the calendar.
				slotKey: slot.startsAt,
				timezone,
				status: "confirmed",
				provider: "native",
				manageToken,
				calendarUid,
				sequence,
				rescheduledFrom: prior?.reference ?? null,
				meetingUrl: bookingConfig.meetingUrl,
				confirmationStatus: "pending",
			} as never,
		});
		bookingId = doc.id;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);

		// A unique-constraint violation on slotKey means someone else took the
		// slot between our availability read and this insert. That is a 409 the
		// visitor can act on, not a 500.
		if (/unique|duplicate/i.test(message)) {
			return json(
				{
					error: "Someone just took that slot. Pick another and we'll confirm it.",
					code: "slot_unavailable",
				},
				409,
			);
		}

		console.error(
			"[booking] PERSIST FAILED — recover from this log:",
			JSON.stringify({
				at: now.toISOString(),
				reference,
				name: body.name,
				email: body.email,
				startsAt: slot.startsAt,
				timezone,
			}),
			message,
		);
		return json(
			{ error: "We couldn't save that booking. Please try again in a moment." },
			500,
		);
	}

	// Released only now: if the insert above had failed, cancelling first would
	// have cost them a slot and given nothing back.
	if (prior) {
		try {
			await releaseBooking(prior);
		} catch (err) {
			console.error(`[booking] could not release ${prior.reference} after reschedule:`, err);
		}
	}

	/* -------------------------------- lead -------------------------------- */

	const lead = await captureLead({
		source: "booking",
		seed: body.topic,
		answers: { startsAt: slot.startsAt, timezone, reference },
		contact: { name: body.name, email: body.email, phone: body.phone },
		consent: {
			email: consentRecord(true, EMAIL_CONSENT_TEXT),
			...(body.marketingConsent
				? { marketing: consentRecord(true, EMAIL_CONSENT_TEXT) }
				: {}),
		},
		utm: body.utm ?? {},
	});

	const summary: BookingSummary = {
		reference,
		startsAt: slot.startsAt,
		endsAt: slot.endsAt,
		timezone,
		topic: body.topic ?? null,
		hostName: hostName(),
		meetingUrl: bookingConfig.meetingUrl,
		manageUrl,
	};

	/* ----------------------------- notify ----------------------------- */

	// Everything below runs after the response is flushed. A cold Resend
	// connection takes ~11s and the visitor has already made their choice.
	after(async () => {
		// A booked call ends the sequence — "all stop on reply or booking".
		await stopNurture(body.email, "booked a consultation");

		if (lead.stored && lead.id !== undefined && bookingId !== undefined) {
			await updateBookingLead(bookingId, lead.id);
		}

		const ics = buildIcs({
			uid: calendarUid,
			sequence,
			start: new Date(slot.startsAt),
			end: new Date(slot.endsAt),
			summary: `${site.name} consultation — ${body.name}`,
			description: [
				`Thirty minutes with ${hostName()}.`,
				body.topic ? `\nTopic: ${body.topic}` : "",
				`\nReschedule or cancel: ${manageUrl}`,
			].join(""),
			location: bookingConfig.meetingUrl ?? "Video call — link to follow",
			url: bookingConfig.meetingUrl,
			organizer: { name: site.name, email: site.email },
			attendee: { name: body.name, email: body.email },
			reminderMinutes: 15,
		});

		const results = await notify(
			{
				type: "booking.confirmed",
				category: "transactional",
				name: body.name,
				booking: summary,
				icsBase64: icsToBase64(ics),
				rescheduled: Boolean(prior),
			},
			{ name: body.name, email: body.email },
		);

		const outcome = summarize(results);
		await updateBookingDelivery(bookingId, outcome);

		const internal = internalRecipient();
		if (internal) {
			await notify(
				{
					type: "booking.internal",
					category: "internal",
					booking: summary,
					lead: { name: body.name, email: body.email },
					adminUrl: bookingId !== undefined ? absoluteUrl(`/admin/collections/bookings/${bookingId}`) : null,
				},
				internal,
			);
		}
	});

	return json({
		ok: true,
		reference,
		startsAt: slot.startsAt,
		endsAt: slot.endsAt,
		timezone,
		manageUrl,
		rescheduled: Boolean(prior),
		message: prior
			? "Moved. An updated invite is on its way to your inbox."
			: "Booked. The invite is on its way to your inbox.",
	});
}

/* ------------------------------- persistence ------------------------------ */

async function updateBookingLead(
	bookingId: string | number,
	leadId: string | number,
): Promise<void> {
	try {
		const payload = await payloadClient();
		await payload.update({
			collection: "bookings",
			id: bookingId,
			overrideAccess: true,
			data: { lead: leadId } as never,
		});
		await updateLead(leadId, { lastTouchChannel: "booking" });
	} catch (err) {
		console.error("[booking] could not link booking to lead:", err);
	}
}

async function updateBookingDelivery(
	bookingId: string | number | undefined,
	outcome: { status: string; detail: string | null },
): Promise<void> {
	if (bookingId === undefined) return;
	try {
		const payload = await payloadClient();
		await payload.update({
			collection: "bookings",
			id: bookingId,
			overrideAccess: true,
			data: {
				confirmationStatus: outcome.status,
				confirmationError: outcome.detail,
			} as never,
		});
	} catch (err) {
		console.error("[booking] could not record confirmation status:", err);
	}
}
