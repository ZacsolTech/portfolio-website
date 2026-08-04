import { bookingConfig } from "./config";

/**
 * Slot generation without a date library.
 *
 * Everything here reduces to one hard problem: "what UTC instant is 09:30 on
 * 12 March in Asia/Karachi?". `Intl.DateTimeFormat` can answer the inverse —
 * what local time a given instant maps to — so we use it to measure the zone's
 * offset at a candidate instant and correct for it, twice, which converges even
 * across a DST boundary. That is the whole trick, and it is why this file does
 * not pull in a 60KB timezone dependency for one function.
 *
 * All stored and transmitted times are UTC ISO strings. The agency timezone
 * only decides *which* instants are offered; the browser renders them in the
 * visitor's own zone, because "11:00" means nothing without one.
 */

const MINUTE = 60 * 1000;

const partsFormatter = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
	let cached = partsFormatter.get(timeZone);
	if (!cached) {
		cached = new Intl.DateTimeFormat("en-GB", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		partsFormatter.set(timeZone, cached);
	}
	return cached;
}

type CivilTime = {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
	second: number;
};

/** Wall-clock time in `timeZone` at a given instant. */
export function civilTimeIn(date: Date, timeZone: string): CivilTime {
	const parts = formatter(timeZone).formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		Number.parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

	return {
		year: get("year"),
		month: get("month"),
		day: get("day"),
		hour: get("hour"),
		minute: get("minute"),
		second: get("second"),
	};
}

/** Zone offset in milliseconds at a given instant (east of UTC is positive). */
function offsetAt(date: Date, timeZone: string): number {
	const civil = civilTimeIn(date, timeZone);
	const asUtc = Date.UTC(
		civil.year,
		civil.month - 1,
		civil.day,
		civil.hour,
		civil.minute,
		civil.second,
	);
	return asUtc - date.getTime();
}

/**
 * The UTC instant of a wall-clock time in `timeZone`.
 *
 * Applied twice: the first correction can land on the wrong side of a DST
 * transition, and re-measuring at the corrected instant fixes it. A third pass
 * would never change the answer for any real zone.
 */
export function zonedTimeToUtc(
	civil: { year: number; month: number; day: number; hour: number; minute: number },
	timeZone: string,
): Date {
	const naive = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute);
	const firstPass = new Date(naive - offsetAt(new Date(naive), timeZone));
	return new Date(naive - offsetAt(firstPass, timeZone));
}

/** ISO weekday, 1 = Monday … 7 = Sunday, in the given zone. */
function isoWeekday(date: Date, timeZone: string): number {
	const name = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(date);
	const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name);
	return index === -1 ? 1 : index + 1;
}

export type Slot = {
	/** UTC ISO instant the meeting starts. */
	startsAt: string;
	endsAt: string;
};

export type AvailableDay = {
	/** `YYYY-MM-DD` in the agency timezone — the calendar grid's key. */
	date: string;
	slots: Slot[];
};

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function parseSlotTime(value: string): { hour: number; minute: number } | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value);
	if (!match) return null;
	const hour = Number.parseInt(match[1], 10);
	const minute = Number.parseInt(match[2], 10);
	if (hour > 23 || minute > 59) return null;
	return { hour, minute };
}

/**
 * Every bookable slot in the horizon, minus anything already taken.
 *
 * `taken` is the set of UTC ISO instants that already have a live booking.
 * Passing it in keeps this function pure and trivially testable — the database
 * query lives with the route.
 */
export function generateAvailability(options?: {
	now?: Date;
	taken?: Set<string>;
}): AvailableDay[] {
	const now = options?.now ?? new Date();
	const taken = options?.taken ?? new Set<string>();
	const { timezone, horizonDays, minNoticeHours, durationMinutes, workingDays } =
		bookingConfig;

	const earliest = now.getTime() + minNoticeHours * 60 * MINUTE;
	const latest = now.getTime() + horizonDays * 24 * 60 * MINUTE;

	const slotTimes = bookingConfig.slots
		.map(parseSlotTime)
		.filter((s): s is { hour: number; minute: number } => s !== null);

	const days: AvailableDay[] = [];

	// Walk forward one calendar day at a time in the agency zone. Stepping by
	// 24h from the zone's local midnight keeps the date arithmetic correct
	// across DST without ever constructing a local-time Date.
	for (let offset = 0; offset <= horizonDays; offset += 1) {
		const probe = new Date(now.getTime() + offset * 24 * 60 * MINUTE);
		const civil = civilTimeIn(probe, timezone);
		const dateKey = `${civil.year}-${pad(civil.month)}-${pad(civil.day)}`;

		if (!workingDays.includes(isoWeekday(probe, timezone))) continue;

		const slots: Slot[] = [];
		for (const time of slotTimes) {
			const start = zonedTimeToUtc(
				{ year: civil.year, month: civil.month, day: civil.day, ...time },
				timezone,
			);
			const startMs = start.getTime();
			if (startMs < earliest || startMs > latest) continue;

			const startsAt = start.toISOString();
			if (taken.has(startsAt)) continue;

			slots.push({
				startsAt,
				endsAt: new Date(startMs + durationMinutes * MINUTE).toISOString(),
			});
		}

		if (slots.length > 0) days.push({ date: dateKey, slots });
	}

	return days;
}

/**
 * Confirm a requested instant is one we actually offer.
 *
 * The browser sends back a slot it was given, but nothing stops a crafted
 * request naming 03:00 on a Sunday — availability is re-derived here so the
 * offered list is the only thing that can be booked.
 */
export function isSlotAvailable(startsAt: string, days: AvailableDay[]): Slot | null {
	for (const day of days) {
		const match = day.slots.find((slot) => slot.startsAt === startsAt);
		if (match) return match;
	}
	return null;
}
