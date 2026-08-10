import { after } from "next/server";
import { z } from "zod";
import { getClientIp, limitForm } from "@/lib/ai/rate-limit";
import { bookingConfig } from "@/lib/booking/config";
import { releaseBooking } from "@/lib/booking/cancel";
import { buildIcs, icsToBase64 } from "@/lib/booking/ics";
import { internalRecipient, notify, sendEmail } from "@/lib/notifications";
import { site } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import {
	formatDateTime,
	masthead,
	paragraph,
	shell,
	footer,
	textBlock,
} from "@/lib/notifications/templates/kit";

export const runtime = "nodejs";

/**
 * Cancel a booking from its management link.
 *
 * Authorised purely by possession of the token in the confirmation email —
 * there is no account to log into, and a 192-bit token is a stronger credential
 * than the password most people would have chosen. The token only ever
 * addresses one booking, so it cannot be used to enumerate others.
 */

const Body = z.object({
	token: z.string().min(10).max(128),
	action: z.literal("cancel"),
});

function json(data: unknown, status = 200) {
	return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

/**
 * Prefill for the reschedule flow.
 *
 * Returns only the fields the booking form re-populates. Someone who followed
 * the link from their own confirmation email should not have to retype their
 * name, address and topic — and the token they are holding already identifies
 * them, so asking again proves nothing.
 */
export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get("token") ?? "";
	if (!token || token.length > 128) return json({ error: "Invalid link." }, 400);

	const allowed = await limitForm({
		ip: getClientIp(request),
		kind: "booking-manage",
		max: 30,
	});
	if (!allowed) return json({ error: "Too many requests. Try again later." }, 429);

	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "bookings",
			where: { manageToken: { equals: token } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});

		const booking = found.docs[0];
		if (!booking) return json({ error: "That link is no longer valid." }, 404);

		return json({
			ok: true,
			booking: {
				reference: booking.reference,
				name: booking.name,
				email: booking.email,
				phone: booking.phone ?? null,
				topic: booking.topic ?? null,
				status: booking.status,
				// Formatted server-side, in the zone they booked in — an implicit
				// locale would render differently on the server and the client.
				whenLabel: formatDateTime(
					new Date(booking.startsAt).toISOString(),
					booking.timezone || bookingConfig.timezone,
				),
			},
		});
	} catch (err) {
		console.error("[booking] prefill lookup failed:", err);
		return json({ error: "Could not load that booking." }, 500);
	}
}

export async function POST(request: Request) {
	let body: z.infer<typeof Body>;
	try {
		body = Body.parse(await request.json());
	} catch {
		return json({ error: "Invalid request." }, 400);
	}

	const allowed = await limitForm({
		ip: getClientIp(request),
		kind: "booking-manage",
		max: 20,
	});
	if (!allowed) return json({ error: "Too many requests. Try again later." }, 429);

	try {
		const payload = await payloadClient();
		const found = await payload.find({
			collection: "bookings",
			where: { manageToken: { equals: body.token } },
			limit: 1,
			overrideAccess: true,
		});

		const booking = found.docs[0];
		if (!booking) return json({ error: "That link is no longer valid." }, 404);
		if (booking.status === "cancelled") return json({ ok: true, alreadyCancelled: true });

		await releaseBooking({
			id: booking.id,
			reference: booking.reference,
			startsAt: booking.startsAt,
		});

		// A CANCEL invite removes the event from the attendee's calendar; without
		// it the slot stays blocked in their diary even though we freed it.
		after(async () => {
			const ics = buildIcs({
				uid: `${booking.reference}@${site.domain}`,
				sequence: 1,
				status: "CANCELLED",
				start: new Date(booking.startsAt),
				end: new Date(booking.endsAt),
				summary: `${site.name} consultation — ${booking.name}`,
				description: "This consultation has been cancelled.",
				organizer: { name: site.name, email: site.email },
				attendee: { name: booking.name, email: booking.email },
			});

			const when = formatDateTime(
				new Date(booking.startsAt).toISOString(),
				booking.timezone || bookingConfig.timezone,
			);

			await sendEmail({
				to: booking.email,
				content: {
					subject: `Cancelled: ${when}`,
					html: shell({
						preheader: `Your ${site.name} consultation on ${when} is cancelled.`,
						body: [
							masthead({ overline: `${site.name} · Cancelled`, title: when }),
							paragraph(
								`Hi ${booking.name}, that consultation is cancelled and the slot is free again. The attached update removes it from your calendar.`,
							),
							paragraph(
								`Book another whenever suits: ${absoluteUrl("/book")}`,
								{ muted: true },
							),
							footer(),
						].join("\n"),
					}),
					text: textBlock([
						`Hi ${booking.name},`,
						"",
						`Your consultation on ${when} is cancelled.`,
						"",
						`Book another: ${absoluteUrl("/book")}`,
						"",
						site.name,
					]),
					attachments: [
						{
							filename: "cancelled.ics",
							content: icsToBase64(ics),
							contentType: "text/calendar; method=CANCEL; charset=utf-8",
						},
					],
				},
			});

			const internal = internalRecipient();
			if (internal) {
				await notify(
					{
						type: "booking.internal",
						category: "internal",
						booking: {
							reference: booking.reference,
							startsAt: new Date(booking.startsAt).toISOString(),
							endsAt: new Date(booking.endsAt).toISOString(),
							timezone: booking.timezone || bookingConfig.timezone,
							topic: `CANCELLED — ${booking.topic ?? "no topic given"}`,
							hostName: bookingConfig.hostName || site.name,
							meetingUrl: booking.meetingUrl,
							manageUrl: absoluteUrl(`/book/manage/${body.token}`),
						},
						lead: { name: booking.name, email: booking.email },
						adminUrl: absoluteUrl(`/admin/collections/bookings/${booking.id}`),
					},
					internal,
				);
			}
		});

		return json({ ok: true });
	} catch (err) {
		console.error("[booking] cancel failed:", err);
		return json({ error: "We couldn't cancel that. Please email us." }, 500);
	}
}
