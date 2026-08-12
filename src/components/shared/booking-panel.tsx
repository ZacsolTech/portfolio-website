"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Field, Input, Panel, Textarea } from "@/components/ui";
import { Turnstile, useTurnstile } from "@/components/shared/turnstile";
import { CalEmbed } from "@/components/shared/cal-embed";
import { readAttribution } from "@/lib/leads/attribution";
import { site, team } from "@/lib/content";

/**
 * Booking panel.
 *
 * Availability comes from the server on mount rather than from a hard-coded
 * grid, and every instant is rendered in the *visitor's* timezone — a slot
 * offered as "11:00" in Karachi is 08:00 in London, and showing them the wrong
 * one is how a client misses a call.
 *
 * When Cal.com is configured the server says so and this defers to its embed
 * entirely, so there is never a second, drifting source of availability.
 *
 * `?reschedule=<manageToken>` puts it in move mode: the existing booking's
 * details are prefilled, and the server releases the old slot once the new one
 * is confirmed. Somebody who followed that link from their own confirmation
 * email should not have to retype anything they already told us.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const EMAIL_CONSENT_TEXT =
	"Email me a calendar invite for this consultation.";

type Slot = { startsAt: string; endsAt: string };

type AvailabilityResponse = {
	ok: boolean;
	provider: "native" | "cal.com";
	calLink?: string;
	timezone?: string;
	durationMinutes?: number;
	hostName?: string;
	days: { date: string; slots: Slot[] }[];
};

type Status = "loading" | "ready" | "empty" | "error";

type Prefill = {
	reference: string;
	name: string;
	email: string;
	phone: string | null;
	topic: string | null;
	whenLabel: string;
	status: string;
};

/* --------------------------------- dates ---------------------------------
 *
 * These deliberately use the *implicit* locale and timezone — the visitor's
 * own. That is only safe because every one of them is reached after the
 * availability fetch resolves, so none of it renders on the server. Formatting
 * a date with an implicit locale in an SSR'd branch produces "August 5" in the
 * HTML and "5 August" on hydration; if you ever need a date before the fetch,
 * format it on the server and pass the string down (see /book/manage).
 * ------------------------------------------------------------------------- */

/** `YYYY-MM-DD` for an instant, in the browser's own timezone. */
function localDateKey(iso: string): string {
	const date = new Date(iso);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function formatTime(iso: string): string {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(new Date(iso));
}

function formatDayLabel(iso: string): string {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(new Date(iso));
}

function monthLabel(year: number, month: number): string {
	return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
		new Date(year, month - 1, 1),
	);
}

/** Monday-first grid cells for a calendar month, padded with adjacent days. */
function monthGrid(year: number, month: number): { key: string; day: number; inMonth: boolean }[] {
	const first = new Date(year, month - 1, 1);
	const lead = (first.getDay() + 6) % 7;
	const daysInMonth = new Date(year, month, 0).getDate();
	const daysInPrev = new Date(year, month - 1, 0).getDate();

	const cells: { key: string; day: number; inMonth: boolean }[] = [];

	for (let i = lead; i > 0; i -= 1) {
		cells.push({ key: `lead-${i}`, day: daysInPrev - i + 1, inMonth: false });
	}
	for (let day = 1; day <= daysInMonth; day += 1) {
		const mm = String(month).padStart(2, "0");
		const dd = String(day).padStart(2, "0");
		cells.push({ key: `${year}-${mm}-${dd}`, day, inMonth: true });
	}
	// Complete the final week so the grid never reflows as months change.
	while (cells.length % 7 !== 0) {
		cells.push({ key: `trail-${cells.length}`, day: cells.length % 7, inMonth: false });
	}

	return cells;
}

function browserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

/** Pure fetch — no state, so both the mount effect and the retry button use it. */
async function fetchAvailability(signal?: AbortSignal): Promise<AvailabilityResponse> {
	const res = await fetch("/api/booking", { cache: "no-store", signal });
	if (!res.ok) throw new Error("availability unavailable");
	return (await res.json()) as AvailabilityResponse;
}

/** Details of the booking being moved. Failure is non-fatal — they just retype. */
async function fetchPrefill(token: string, signal?: AbortSignal): Promise<Prefill | null> {
	const res = await fetch(`/api/booking/manage?token=${encodeURIComponent(token)}`, {
		cache: "no-store",
		signal,
	});
	if (!res.ok) return null;
	const data = (await res.json()) as { booking?: Prefill };
	return data.booking ?? null;
}

/* -------------------------------- component ------------------------------- */

export function BookingPanel() {
	const host = team[0];
	const rescheduleToken = useSearchParams().get("reschedule");

	const [status, setStatus] = useState<Status>("loading");
	const [provider, setProvider] = useState<"native" | "cal.com">("native");
	const [calLink, setCalLink] = useState<string | null>(null);
	const [hostName, setHostName] = useState<string>(host?.name ?? "a senior engineer");
	const [slots, setSlots] = useState<Slot[]>([]);

	// Selection is stored as an *override* and everything else is derived from
	// availability. Keeping a synced copy in state would need effects to repair
	// it every time the calendar reloads, and those effects are exactly what
	// produces a flash of the wrong day.
	const [pickedDate, setPickedDate] = useState<string | null>(null);
	const [pickedSlot, setPickedSlot] = useState<string | null>(null);
	const [monthOverride, setMonthOverride] = useState<{ year: number; month: number } | null>(
		null,
	);

	const [consent, setConsent] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmed, setConfirmed] = useState<{
		reference: string;
		startsAt: string;
		manageUrl: string;
		rescheduled: boolean;
	} | null>(null);

	const [prefill, setPrefill] = useState<Prefill | null>(null);

	const turnstile = useTurnstile();

	/* ----------------------------- availability ---------------------------- */

	const apply = useCallback((data: AvailabilityResponse) => {
		if (data.provider === "cal.com" && data.calLink) {
			setProvider("cal.com");
			setCalLink(data.calLink);
			setStatus("ready");
			return;
		}

		const flat = data.days.flatMap((day) => day.slots);
		setSlots(flat);
		if (data.hostName) setHostName(data.hostName);
		setStatus(flat.length > 0 ? "ready" : "empty");
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const data = await fetchAvailability(controller.signal);
				if (!cancelled) apply(data);
			} catch (err) {
				if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
				setStatus("error");
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [apply]);

	useEffect(() => {
		if (!rescheduleToken) return;
		const controller = new AbortController();
		let cancelled = false;

		(async () => {
			try {
				const data = await fetchPrefill(rescheduleToken, controller.signal);
				if (!cancelled && data) setPrefill(data);
			} catch {
				// Prefill is a convenience. A failure means an empty form, not a
				// broken page — the booking itself still works.
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [rescheduleToken]);

	/** Manual refresh — from the retry button, and after a slot is lost to a race. */
	const reload = useCallback(async () => {
		setStatus("loading");
		try {
			apply(await fetchAvailability());
		} catch {
			setStatus("error");
		}
	}, [apply]);

	/** Slots grouped by the visitor's own calendar day. */
	const byDate = useMemo(() => {
		const map = new Map<string, Slot[]>();
		for (const slot of slots) {
			const key = localDateKey(slot.startsAt);
			const bucket = map.get(key);
			if (bucket) bucket.push(slot);
			else map.set(key, [slot]);
		}
		for (const bucket of map.values()) {
			bucket.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
		}
		return map;
	}, [slots]);

	const availableDates = useMemo(() => [...byDate.keys()].sort(), [byDate]);

	// Defaults to the first day that has anything, rather than to today.
	const selectedDate =
		pickedDate && byDate.has(pickedDate) ? pickedDate : (availableDates[0] ?? null);

	const daySlots = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

	const selectedSlot =
		pickedSlot && daySlots.some((slot) => slot.startsAt === pickedSlot)
			? pickedSlot
			: (daySlots[0]?.startsAt ?? null);

	const month = useMemo(() => {
		if (monthOverride) return monthOverride;
		if (!selectedDate) return null;
		const [year, monthPart] = selectedDate.split("-");
		return { year: Number(year), month: Number(monthPart) };
	}, [monthOverride, selectedDate]);

	const monthRange = useMemo(() => {
		if (availableDates.length === 0) return null;
		const toKey = (value: string) => {
			const [y, m] = value.split("-");
			return { year: Number(y), month: Number(m) };
		};
		return { first: toKey(availableDates[0]), last: toKey(availableDates.at(-1) as string) };
	}, [availableDates]);

	const shiftMonth = useCallback(
		(direction: -1 | 1) => {
			if (!month) return;
			const next = new Date(month.year, month.month - 1 + direction, 1);
			setMonthOverride({ year: next.getFullYear(), month: next.getMonth() + 1 });
		},
		[month],
	);

	const canGoBack =
		month && monthRange
			? month.year * 12 + month.month > monthRange.first.year * 12 + monthRange.first.month
			: false;
	const canGoForward =
		month && monthRange
			? month.year * 12 + month.month < monthRange.last.year * 12 + monthRange.last.month
			: false;

	const confirmLabel = selectedSlot
		? `Confirm ${formatTime(selectedSlot)}, ${formatDayLabel(selectedSlot)}`
		: "Pick a time";

	/* -------------------------------- submit ------------------------------- */

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy || !selectedSlot || !consent) return;

		const form = event.currentTarget;
		const data = new FormData(form);

		setBusy(true);
		setError(null);

		try {
			const res = await fetch("/api/booking", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					startsAt: selectedSlot,
					name: String(data.get("name") ?? "").trim(),
					email: String(data.get("email") ?? "").trim(),
					phone: String(data.get("phone") ?? "").trim() || undefined,
					topic: String(data.get("topic") ?? "").trim() || undefined,
					company: String(data.get("company") ?? ""),
					timezone: browserTimezone(),
					consent: true,
					utm: readAttribution(),
					turnstileToken: turnstile.token ?? undefined,
					rescheduleToken: rescheduleToken ?? undefined,
				}),
			});

			const payload = (await res.json().catch(() => null)) as
				| {
						reference?: string;
						startsAt?: string;
						manageUrl?: string;
						rescheduled?: boolean;
						error?: string;
						code?: string;
				  }
				| null;

			if (!res.ok || !payload?.reference) {
				// A taken slot is not a failed form — refresh and let them re-pick.
				if (payload?.code === "slot_unavailable") {
					setPickedSlot(null);
					await reload();
				}
				throw new Error(payload?.error ?? "Could not confirm that booking.");
			}

			setConfirmed({
				reference: payload.reference,
				startsAt: payload.startsAt ?? selectedSlot,
				manageUrl: payload.manageUrl ?? "/book",
				rescheduled: Boolean(payload.rescheduled),
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not confirm that booking.");
			turnstile.reset();
		} finally {
			setBusy(false);
		}
	}

	/* -------------------------------- render ------------------------------- */

	return (
		<div className="book-grid">
			<div>
				<span className="overline">Consultation</span>
				<h1 className="d2" style={{ marginTop: "0.75rem" }}>
					Thirty minutes. <span className="em-serif">Not a sales call.</span>
				</h1>
				<p className="lead" style={{ marginTop: "1.25rem" }}>
					We cover the bottleneck, whether software is the right lever, and what a first
					phase would look like — with honest tradeoffs.
				</p>

				{host ? (
					<div className="book-host">
						<div className="team-avatar book-host__avatar" aria-hidden>
							{host.initials}
						</div>
						<div>
							<p className="d4 book-host__name">{host.name}</p>
							<p className="body-sm book-host__role">{host.role}</p>
						</div>
					</div>
				) : null}

				<ul className="book-points">
					<li>What&apos;s actually broken vs what feels urgent</li>
					<li>Whether to build, buy or wait</li>
					<li>A rough phase plan you can challenge</li>
				</ul>
			</div>

			{provider === "cal.com" && calLink ? (
				<Panel className="booking-panel" style={{ padding: "0.75rem" }}>
					<CalEmbed calLink={calLink} />
				</Panel>
			) : confirmed ? (
				<Panel className="booking-panel" style={{ padding: "1.75rem" }}>
					<div className="book-done" role="status">
						<div className="book-done__check" aria-hidden>
							✓
						</div>
						<h2 className="d4">{confirmed.rescheduled ? "Moved" : "You're booked"}</h2>
						<p className="lead book-done__when">
							{formatDayLabel(confirmed.startsAt)} at {formatTime(confirmed.startsAt)}
						</p>
						<p className="body-sm">
							Thirty minutes with {hostName}.{" "}
							{confirmed.rescheduled
								? "An updated invite is on its way — it moves the entry already in your calendar, so there is nothing to delete."
								: "The calendar invite is on its way to your inbox — open it once and it's in your calendar."}{" "}
							Reference <strong>{confirmed.reference}</strong>.
						</p>
						<p className="body-sm" style={{ marginTop: "1rem" }}>
							Need to change it?{" "}
							<Link href={confirmed.manageUrl} className="link-u">
								Reschedule or cancel
							</Link>
							.
						</p>
					</div>
				</Panel>
			) : (
				<Panel className="booking-panel" style={{ padding: "1.25rem" }}>
					{prefill ? (
						<div className="book-moving" role="status">
							<span className="overline overline--gold">Moving your booking</span>
							<p className="body-sm">
								Currently {prefill.whenLabel}. Pick a new time — your details carry
								over, and the old slot is released once this is confirmed.
							</p>
						</div>
					) : null}

					{status === "loading" ? (
						<p className="body-sm" role="status" aria-busy="true">
							Loading available times…
						</p>
					) : null}

					{status === "error" ? (
						<div role="alert">
							<p className="body-sm">
								We couldn&apos;t load the calendar just now.
							</p>
							<button
								type="button"
								className="btn btn--ghost btn--sm"
								style={{ marginTop: "0.75rem" }}
								onClick={() => void reload()}
							>
								Try again
							</button>
						</div>
					) : null}

					{status === "empty" ? (
						<div role="status">
							<p className="body-sm">
								Nothing free in the next few weeks. Email{" "}
								<a href={`mailto:${site.email}`}>{site.email}</a> and we&apos;ll find a
								time.
							</p>
						</div>
					) : null}

					{status === "ready" && month ? (
						<>
							<div className="cal-head">
								<button
									type="button"
									className="cal-nav"
									onClick={() => shiftMonth(-1)}
									disabled={!canGoBack}
									aria-label="Previous month"
								>
									‹
								</button>
								<p className="overline" style={{ margin: 0 }}>
									{monthLabel(month.year, month.month)}
								</p>
								<button
									type="button"
									className="cal-nav"
									onClick={() => shiftMonth(1)}
									disabled={!canGoForward}
									aria-label="Next month"
								>
									›
								</button>
							</div>

							<div className="cal" style={{ marginTop: "1rem" }} role="group" aria-label="Select a day">
								{WEEKDAYS.map((weekday) => (
									<div key={weekday} className="cal__wd" aria-hidden>
										{weekday}
									</div>
								))}
								{monthGrid(month.year, month.month).map((cell) => {
									const open = cell.inMonth && byDate.has(cell.key);
									const active = open && cell.key === selectedDate;
									return (
										<button
											key={cell.key}
											type="button"
											className={`cal__d${open ? "" : " cal__d--off"}${active ? " cal__d--on" : ""}`}
											disabled={!open}
											aria-pressed={active}
											onClick={() => {
												setPickedDate(cell.key);
												setPickedSlot(null);
											}}
										>
											{cell.day}
										</button>
									);
								})}
							</div>

							<p className="overline" style={{ marginTop: "1.75rem" }}>
								Time slots
								{selectedDate ? (
									<span className="cal-tz"> · your local time</span>
								) : null}
							</p>
							<div className="slots" style={{ marginTop: "0.75rem" }}>
								{daySlots.map((slot) => (
									<button
										key={slot.startsAt}
										type="button"
										className={`slot${selectedSlot === slot.startsAt ? " slot--on" : ""}`}
										aria-pressed={selectedSlot === slot.startsAt}
										onClick={() => setPickedSlot(slot.startsAt)}
									>
										{formatTime(slot.startsAt)}
									</button>
								))}
								{daySlots.length === 0 ? (
									<p className="body-sm">Pick a highlighted day to see times.</p>
								) : null}
							</div>

							<form onSubmit={onSubmit} style={{ marginTop: "1.75rem" }} noValidate>
								<div className="grid-2" style={{ gap: "1rem" }}>
									<Field label="Name" htmlFor="book-name">
										<Input
											// Remounts when the prefill lands, so `defaultValue` is
											// actually applied — an uncontrolled input ignores a
											// default that arrives after the first render.
											key={`name-${prefill?.reference ?? "new"}`}
											id="book-name"
											name="name"
											required
											autoComplete="name"
											minLength={2}
											maxLength={80}
											defaultValue={prefill?.name ?? ""}
										/>
									</Field>
									<Field label="Email" htmlFor="book-email">
										<Input
											key={`email-${prefill?.reference ?? "new"}`}
											id="book-email"
											name="email"
											type="email"
											required
											autoComplete="email"
											maxLength={160}
											defaultValue={prefill?.email ?? ""}
										/>
									</Field>
								</div>

								<Field label="Phone (optional)" htmlFor="book-phone">
									<Input
										key={`phone-${prefill?.reference ?? "new"}`}
										id="book-phone"
										name="phone"
										type="tel"
										autoComplete="tel"
										maxLength={40}
										defaultValue={prefill?.phone ?? ""}
										style={{ marginTop: "1rem" }}
									/>
								</Field>

								<Field label="Topic" htmlFor="book-topic">
									<Textarea
										key={`topic-${prefill?.reference ?? "new"}`}
										id="book-topic"
										name="topic"
										rows={3}
										maxLength={1500}
										placeholder="What should we focus on?"
										defaultValue={prefill?.topic ?? ""}
										style={{ marginTop: "1rem" }}
									/>
								</Field>

								{/* Honeypot — off-screen, not display:none, so bots still fill it. */}
								<input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />

								<label className="consent">
									<input
										type="checkbox"
										checked={consent}
										onChange={(event) => setConsent(event.target.checked)}
										required
									/>
									<span>
										{EMAIL_CONSENT_TEXT} See <Link href="/privacy">privacy</Link>.
									</span>
								</label>

								<Turnstile
									key={turnstile.nonce}
									action="booking"
									onToken={turnstile.setToken}
								/>

								<button
									type="submit"
									className="btn btn--gold btn--lg"
									style={{ marginTop: "1.5rem", width: "100%" }}
									disabled={busy || !selectedSlot || !consent}
								>
									{busy ? "Confirming…" : confirmLabel}
								</button>

								{error ? (
									<p role="alert" className="form-error">
										{error}
									</p>
								) : null}
							</form>
						</>
					) : null}
				</Panel>
			)}
		</div>
	);
}
