/**
 * Freeing a booked slot.
 *
 * One helper because there are two callers — an explicit cancellation, and the
 * reschedule path releasing the old slot — and the `slotKey` suffixing is the
 * thing that makes the slot bookable again. Getting it right in one place and
 * wrong in the other would silently take a slot off the calendar forever.
 */

type CancellableBooking = {
	id: string | number;
	reference: string;
	startsAt: string | Date;
};

export function cancelledSlotKey(booking: CancellableBooking): string {
	return `${new Date(booking.startsAt).toISOString()}#cancelled#${booking.reference}`;
}

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

export async function releaseBooking(booking: CancellableBooking): Promise<void> {
	const payload = await payloadClient();
	await payload.update({
		collection: "bookings",
		id: booking.id,
		overrideAccess: true,
		data: {
			status: "cancelled",
			// `slotKey` is unique, so it has to stop equalling the instant before
			// anyone else can book it.
			slotKey: cancelledSlotKey(booking),
		} as never,
	});
}
