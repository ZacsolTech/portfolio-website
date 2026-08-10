/**
 * Booking configuration.
 *
 * All of it is env-driven with sane defaults so `/book` works on a fresh clone
 * with no third-party account, and so changing office hours is a deploy setting
 * rather than a code change.
 */

function intEnv(name: string, fallback: number, min: number, max: number): number {
	const raw = process.env[name];
	if (!raw) return fallback;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
		console.warn(`[booking] ${name}="${raw}" is out of range — using ${fallback}.`);
		return fallback;
	}
	return parsed;
}

/** Validated once at module load so a typo surfaces in logs, not in Intl. */
function timezoneEnv(fallback: string): string {
	const raw = process.env.BOOKING_TIMEZONE;
	if (!raw) return fallback;
	try {
		new Intl.DateTimeFormat("en-GB", { timeZone: raw });
		return raw;
	} catch {
		console.warn(`[booking] BOOKING_TIMEZONE="${raw}" is not a valid IANA zone.`);
		return fallback;
	}
}

export const bookingConfig = {
	/** The zone office hours are expressed in. */
	timezone: timezoneEnv("Asia/Karachi"),
	/** Local start times, in the agency timezone. Matches the design's `.slot` row. */
	slots: (process.env.BOOKING_SLOTS || "09:30,11:00,13:30,15:00,16:30")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean),
	durationMinutes: intEnv("BOOKING_DURATION_MINUTES", 30, 15, 120),
	/** How far ahead the calendar opens. */
	horizonDays: intEnv("BOOKING_HORIZON_DAYS", 28, 7, 90),
	/** Nothing bookable inside this window — nobody wants a call in ten minutes. */
	minNoticeHours: intEnv("BOOKING_MIN_NOTICE_HOURS", 12, 0, 168),
	/** 1 = Monday … 7 = Sunday. */
	workingDays: (process.env.BOOKING_WORKING_DAYS || "1,2,3,4,5")
		.split(",")
		.map((d) => Number.parseInt(d.trim(), 10))
		.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
	meetingUrl: process.env.BOOKING_MEETING_URL || null,
	hostName: process.env.BOOKING_HOST_NAME || null,
} as const;

/**
 * Cal.com takes over scheduling entirely when a link is configured — it owns
 * availability, invites and reminders, and the native path below is bypassed.
 */
export function calLink(): string | null {
	return process.env.NEXT_PUBLIC_CAL_LINK || null;
}
