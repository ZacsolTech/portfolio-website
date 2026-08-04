import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingManage } from "@/components/shared/booking-manage";
import { bookingConfig } from "@/lib/booking/config";
// Deliberately the same formatter the confirmation email uses, so the page and
// the email never disagree about what time the meeting is.
import { formatDateTime } from "@/lib/notifications/templates/kit";

export const dynamic = "force-dynamic";

/** A link that identifies one person's meeting has no business in an index. */
export const metadata: Metadata = {
	title: "Manage your booking",
	robots: { index: false, follow: false, nocache: true },
};

async function loadBooking(token: string) {
	if (!token || token.length > 128) return null;
	try {
		const { getPayload } = await import("payload");
		const config = (await import("@payload-config")).default;
		const payload = await getPayload({ config });

		const found = await payload.find({
			collection: "bookings",
			where: { manageToken: { equals: token } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});

		const doc = found.docs[0];
		if (!doc) return null;

		// Only what the page renders — the token holder gets their own booking,
		// never the row. The time is formatted here rather than in the client
		// component so server and browser cannot disagree on locale.
		return {
			reference: doc.reference,
			name: doc.name,
			whenLabel: formatDateTime(
				new Date(doc.startsAt).toISOString(),
				doc.timezone || bookingConfig.timezone,
			),
			topic: doc.topic ?? null,
			status: doc.status as string,
		};
	} catch (err) {
		console.error("[booking] manage lookup failed:", err);
		return null;
	}
}

export default async function ManageBookingPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const booking = await loadBooking(token);

	if (!booking) notFound();

	return (
		<section className="section section--paper section--after-nav">
			<div className="container container--narrow">
				<BookingManage token={token} booking={booking} />
			</div>
		</section>
	);
}
