/**
 * iCalendar invite generation (RFC 5545).
 *
 * Hand-written because the format is small, stable and fully specified, and
 * because an attached `.ics` is the only calendar integration that works in
 * every client without us holding an OAuth token for anybody's calendar.
 *
 * The fiddly parts of the spec that clients actually enforce, and that a
 * naive implementation gets wrong:
 *
 * - CRLF line endings, not LF. Outlook rejects LF-only files.
 * - Lines folded at 75 octets with a leading space on continuations.
 * - `,` `;` `\` and newlines escaped inside text values.
 * - A stable `UID`, so a later update replaces the event instead of duplicating it.
 * - `SEQUENCE` incremented on every revision, or updates are silently ignored.
 */

const CRLF = "\r\n";

function escapeText(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");
}

/**
 * Fold to 75 octets per line. Counting octets rather than characters matters
 * the moment a topic contains an em dash or an accented name.
 */
function fold(line: string): string {
	const bytes = Buffer.from(line, "utf8");
	if (bytes.length <= 75) return line;

	const parts: string[] = [];
	let start = 0;
	let limit = 75;

	while (start < bytes.length) {
		let end = Math.min(start + limit, bytes.length);
		// Never split a multi-byte sequence: back off to a lead byte.
		while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
		parts.push(bytes.subarray(start, end).toString("utf8"));
		start = end;
		limit = 74; // continuation lines lose one octet to the leading space
	}

	return parts.join(`${CRLF} `);
}

/** `20260812T093000Z` — the UTC form every client accepts. */
function icsDate(date: Date): string {
	return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

export type CalendarInvite = {
	uid: string;
	sequence?: number;
	start: Date;
	end: Date;
	summary: string;
	description: string;
	/** Video link, or a plain description of where the call happens. */
	location?: string | null;
	url?: string | null;
	organizer: { name: string; email: string };
	attendee: { name: string; email: string };
	status?: "CONFIRMED" | "CANCELLED";
	/** Minutes before the start to fire the client-side alarm. */
	reminderMinutes?: number;
};

export function buildIcs(invite: CalendarInvite): string {
	const method = invite.status === "CANCELLED" ? "CANCEL" : "REQUEST";
	const reminder = invite.reminderMinutes ?? 15;

	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//ZACSOL//Consultation//EN",
		"CALSCALE:GREGORIAN",
		`METHOD:${method}`,
		"BEGIN:VEVENT",
		`UID:${invite.uid}`,
		`SEQUENCE:${invite.sequence ?? 0}`,
		`DTSTAMP:${icsDate(new Date())}`,
		`DTSTART:${icsDate(invite.start)}`,
		`DTEND:${icsDate(invite.end)}`,
		`SUMMARY:${escapeText(invite.summary)}`,
		`DESCRIPTION:${escapeText(invite.description)}`,
		invite.location ? `LOCATION:${escapeText(invite.location)}` : null,
		invite.url ? `URL:${escapeText(invite.url)}` : null,
		`ORGANIZER;CN=${escapeText(invite.organizer.name)}:mailto:${invite.organizer.email}`,
		`ATTENDEE;CN=${escapeText(invite.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${invite.attendee.email}`,
		`STATUS:${invite.status ?? "CONFIRMED"}`,
		"TRANSP:OPAQUE",
		"BEGIN:VALARM",
		`TRIGGER:-PT${reminder}M`,
		"ACTION:DISPLAY",
		`DESCRIPTION:${escapeText(invite.summary)}`,
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	].filter((line): line is string => line !== null);

	return `${lines.map(fold).join(CRLF)}${CRLF}`;
}

export function icsToBase64(ics: string): string {
	return Buffer.from(ics, "utf8").toString("base64");
}
