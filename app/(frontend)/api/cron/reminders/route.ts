import { bookingConfig } from "@/lib/booking/config";
import { authorizeCron } from "@/lib/cron/auth";
import { notify } from "@/lib/notifications";
import { absoluteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Booking reminders.
 *
 * Scheduled hourly (see `vercel.json`). Sends one reminder per booking inside
 * the lead window, marked on the row so a re-run cannot duplicate it.
 *
 * The `.ics` attached at booking time already carries a 15-minute alarm; this
 * catches the case that actually loses meetings — someone who never opened the
 * invite and has nothing in their calendar at all.
 */

const REMINDER_LEAD_HOURS = 24;
const BATCH_SIZE = 50;

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

export async function GET(request: Request) {
	const auth = authorizeCron(request);
	if (!auth.ok) return auth.response;

	const now = new Date();
	const window = new Date(now.getTime() + REMINDER_LEAD_HOURS * 60 * 60 * 1000);
	const summary = { due: 0, sent: 0, failed: 0 };

	try {
		const payload = await payloadClient();

		const due = await payload.find({
			collection: "bookings",
			where: {
				and: [
					{ status: { equals: "confirmed" } },
					{ startsAt: { greater_than: now.toISOString() } },
					{ startsAt: { less_than_equal: window.toISOString() } },
					{ reminderSentAt: { exists: false } },
				],
			},
			limit: BATCH_SIZE,
			sort: "startsAt",
			depth: 0,
			overrideAccess: true,
		});

		summary.due = due.docs.length;

		for (const booking of due.docs) {
			// Marked before sending: a duplicate reminder reads as a system with a
			// bug, a missed one reads as nothing at all.
			await payload.update({
				collection: "bookings",
				id: booking.id,
				overrideAccess: true,
				data: { reminderSentAt: now.toISOString() } as never,
			});

			const results = await notify(
				{
					type: "booking.reminder",
					category: "transactional",
					name: booking.name,
					booking: {
						reference: booking.reference,
						startsAt: new Date(booking.startsAt).toISOString(),
						endsAt: new Date(booking.endsAt).toISOString(),
						timezone: booking.timezone || bookingConfig.timezone,
						topic: booking.topic ?? null,
						hostName: bookingConfig.hostName || "a senior engineer",
						meetingUrl: booking.meetingUrl ?? bookingConfig.meetingUrl,
						manageUrl: absoluteUrl(`/book/manage/${booking.manageToken ?? ""}`),
					},
				},
				{ name: booking.name, email: booking.email },
			);

			if (results.some((result) => result.status === "sent")) summary.sent += 1;
			else summary.failed += 1;
		}

		console.info("[cron:reminders]", JSON.stringify(summary));
		return Response.json({ ok: true, ...summary });
	} catch (err) {
		console.error("[cron:reminders] run failed:", err);
		return Response.json({ error: "Reminder run failed." }, { status: 500 });
	}
}
