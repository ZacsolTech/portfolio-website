"use client";

import Link from "next/link";
import { useState } from "react";
import { Panel } from "@/components/ui";

/**
 * Reschedule or cancel from the link in the confirmation email.
 *
 * "Reschedule" is cancel-then-rebook rather than an in-place move: it frees the
 * old slot immediately, reuses the one booking flow that already validates
 * availability, and avoids a second code path that could hold two slots at once.
 */

type Booking = {
	reference: string;
	name: string;
	/**
	 * Formatted on the server, in the timezone the visitor booked in.
	 *
	 * Deliberately not formatted here: `Intl` with an implicit locale resolves
	 * to the Node default on the server and the browser's own locale on the
	 * client, which renders "August 5" into HTML and "5 August" on hydration.
	 */
	whenLabel: string;
	topic: string | null;
	status: string;
};

export function BookingManage({ token, booking }: { token: string; booking: Booking }) {
	const [status, setStatus] = useState<string>(booking.status);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirming, setConfirming] = useState(false);

	async function cancel() {
		if (busy) return;
		setBusy(true);
		setError(null);

		try {
			const res = await fetch("/api/booking/manage", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, action: "cancel" }),
			});
			const data = (await res.json().catch(() => null)) as { error?: string } | null;
			if (!res.ok) throw new Error(data?.error ?? "Could not cancel that booking.");
			setStatus("cancelled");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not cancel that booking.");
		} finally {
			setBusy(false);
			setConfirming(false);
		}
	}

	if (status === "cancelled") {
		return (
			<Panel style={{ padding: "2rem" }}>
				<span className="overline">Cancelled</span>
				<h1 className="d3" style={{ marginTop: "0.75rem" }}>
					That consultation is cancelled.
				</h1>
				<p className="lead" style={{ marginTop: "1rem" }}>
					The slot is free again and we&apos;ve sent a calendar update so it clears from
					your diary too.
				</p>
				<div className="btn-row">
					<Link href="/book" className="btn btn--gold">
						Book another time
					</Link>
					<Link href="/consultant" className="btn btn--ghost">
						Try ZAC Consultant instead
					</Link>
				</div>
			</Panel>
		);
	}

	return (
		<Panel style={{ padding: "2rem" }}>
			<span className="overline">Your booking</span>
			<h1 className="d3" style={{ marginTop: "0.75rem" }}>
				{booking.whenLabel}
			</h1>
			<p className="body-sm" style={{ marginTop: "0.75rem" }}>
				Reference {booking.reference} · booked for {booking.name}
			</p>
			{booking.topic ? (
				<p className="lead" style={{ marginTop: "1.25rem" }}>
					{booking.topic}
				</p>
			) : null}

			<div className="btn-row">
				{/* Carries the token so /book prefills their details and releases
				    this slot once the new one is confirmed. */}
				<Link href={`/book?reschedule=${encodeURIComponent(token)}`} className="btn btn--gold">
					Pick a different time
				</Link>
				{confirming ? (
					<>
						<button type="button" className="btn btn--ghost" onClick={() => void cancel()} disabled={busy}>
							{busy ? "Cancelling…" : "Yes, cancel it"}
						</button>
						<button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
							Keep it
						</button>
					</>
				) : (
					<button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
						Cancel this booking
					</button>
				)}
			</div>

			<p className="body-sm" style={{ marginTop: "1.25rem" }}>
				Picking a different time moves this booking — your details carry over, the old
				slot is released, and your calendar entry updates itself.
			</p>

			{error ? (
				<p role="alert" className="form-error">
					{error}
				</p>
			) : null}
		</Panel>
	);
}
