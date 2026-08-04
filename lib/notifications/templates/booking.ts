import type { BookingSummary } from "../types";
import type { EmailContent } from "../email";
import {
	button,
	definitionRows,
	esc,
	footer,
	formatDateTime,
	masthead,
	palette,
	paragraph,
	secondaryLink,
	shell,
	textBlock,
} from "./kit";

/**
 * Booking confirmation.
 *
 * The confirmation carries a real `.ics` attachment (built in lib/booking/ics)
 * so the meeting lands in the recipient's calendar with one click, in every
 * client, without us integrating with any of them.
 */

function details(booking: BookingSummary): { term: string; value: string }[] {
	return [
		{ term: "When", value: formatDateTime(booking.startsAt, booking.timezone) },
		{ term: "Length", value: "30 minutes" },
		{ term: "With", value: booking.hostName },
		booking.meetingUrl
			? { term: "Where", value: booking.meetingUrl }
			: { term: "Where", value: "Video link follows before the call" },
		booking.topic ? { term: "Topic", value: booking.topic } : null,
		{ term: "Reference", value: booking.reference },
	].filter((row): row is { term: string; value: string } => Boolean(row));
}

export function renderBookingConfirmation(input: {
	name: string;
	booking: BookingSummary;
	icsBase64?: string;
	rescheduled?: boolean;
}): EmailContent {
	const { name, booking, rescheduled } = input;
	const when = formatDateTime(booking.startsAt, booking.timezone);

	const body = [
		masthead({
			overline: rescheduled ? "ZACSOL · Consultation moved" : "ZACSOL · Consultation booked",
			title: when,
			lede: `Thirty minutes with ${booking.hostName}. Not a sales call.`,
		}),
		paragraph(
			rescheduled
				? `Hi ${name}, that's moved. The attached invite updates the existing entry in your calendar — there is nothing to delete.`
				: `Hi ${name}, you're booked. The invite is attached — open it once and it's in your calendar.`,
		),
		`<div style="margin:24px 0 0;padding:20px;background:${palette.paper};border:1px solid ${palette.line};border-radius:12px;">
      ${definitionRows(details(booking))}
    </div>`,
		paragraph(
			"Come with the thing that is actually costing you time. We'll cover whether software is the right lever, what a first phase looks like, and the tradeoffs we'd expect you to push back on.",
			{ muted: true },
		),
		booking.meetingUrl
			? button({ href: booking.meetingUrl, label: "Join the call" })
			: "",
		secondaryLink({ href: booking.manageUrl, label: "Reschedule or cancel →" }),
		footer({ note: "Need to move it? Use the link above — no need to reply." }),
	].join("\n");

	const text = textBlock([
		`Hi ${name},`,
		"",
		rescheduled ? "Your consultation has moved." : "Your consultation is booked.",
		"",
		...details(booking).map((row) => `${row.term}: ${row.value}`),
		"",
		"Come with the thing that is actually costing you time.",
		"",
		`Reschedule or cancel: ${booking.manageUrl}`,
		"",
		"ZACSOL",
	]);

	return {
		subject: rescheduled
			? `Moved: now ${when} with ${booking.hostName}`
			: `Confirmed: ${when} with ${booking.hostName}`,
		html: shell({ preheader: `${when} · 30 minutes · ${booking.hostName}`, body }),
		text,
		attachments: input.icsBase64
			? [
					{
						filename: "zacsol-consultation.ics",
						content: input.icsBase64,
						contentType: "text/calendar; method=REQUEST; charset=utf-8",
					},
				]
			: undefined,
	};
}

/** Internal heads-up so a booking is never a surprise on the day. */
export function renderBookingInternal(input: {
	booking: BookingSummary;
	lead: { name: string; email: string; company?: string | null };
	adminUrl?: string | null;
}): EmailContent {
	const { booking, lead } = input;
	const when = formatDateTime(booking.startsAt, booking.timezone);

	const rows = [
		{ term: "When", value: `${when} (${booking.timezone})` },
		{ term: "Who", value: `${lead.name} <${lead.email}>` },
		lead.company ? { term: "Company", value: lead.company } : null,
		booking.topic ? { term: "Topic", value: booking.topic } : null,
		{ term: "Reference", value: booking.reference },
	].filter((row): row is { term: string; value: string } => Boolean(row));

	const body = [
		masthead({ overline: "New booking", title: when }),
		`<div style="margin:24px 0 0;padding:20px;background:${palette.paper};border:1px solid ${palette.line};border-radius:12px;">
      ${definitionRows(rows)}
    </div>`,
		input.adminUrl ? button({ href: input.adminUrl, label: "Open in admin" }) : "",
		footer(),
	].join("\n");

	return {
		subject: `New booking — ${lead.name}, ${when}`,
		html: shell({ preheader: `${lead.name} booked ${when}`, body }),
		text: textBlock([
			"New booking",
			"",
			...rows.map((row) => `${row.term}: ${row.value}`),
			input.adminUrl ? `\nAdmin: ${esc(input.adminUrl)}` : null,
		]),
	};
}
