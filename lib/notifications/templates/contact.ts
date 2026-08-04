import type { EmailContent } from "../email";
import {
	absolute,
	button,
	card,
	definitionRows,
	esc,
	footer,
	label,
	masthead,
	palette,
	paragraph,
	shell,
	textBlock,
} from "./kit";

/**
 * Contact form: one acknowledgement to the sender, one alert to us.
 *
 * The acknowledgement exists so nobody is left wondering whether the form
 * worked — the single most common reason a lead gives up and emails a
 * competitor instead.
 */

export function renderContactAck(input: {
	name: string;
	message: string;
	service?: string | null;
}): EmailContent {
	const body = [
		masthead({
			overline: "ZACSOL",
			title: "Brief received.",
			lede: "A senior engineer replies within one business day — with a direction, whether or not you hire us.",
		}),
		paragraph(`Hi ${input.name}, thanks for the detail. Here's what you sent:`),
		card(
			`${label(input.service ? `About ${input.service}` : "Your message")}
       <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:${palette.body};white-space:pre-wrap;">${esc(input.message)}</p>`,
		),
		paragraph(
			"If you'd rather not wait, ZAC Consultant will scope the problem and hand you a costed roadmap in about three minutes.",
			{ muted: true },
		),
		button({
			href: absolute("/consultant"),
			label: "Try ZAC Consultant",
			note: "Free, no call required.",
		}),
		footer({ note: "You can reply to this email and it reaches a person." }),
	].join("\n");

	return {
		subject: "We've got your brief — ZACSOL",
		html: shell({
			preheader: "A senior engineer replies within one business day.",
			body,
		}),
		text: textBlock([
			`Hi ${input.name},`,
			"",
			"Thanks for the detail — a senior engineer replies within one business day.",
			"",
			"What you sent:",
			input.message,
			"",
			`In a hurry? ZAC Consultant scopes it in three minutes: ${absolute("/consultant")}`,
			"",
			"ZACSOL",
		]),
	};
}

export function renderContactInternal(input: {
	lead: {
		name: string;
		email: string;
		phone?: string | null;
		company?: string | null;
		service?: string | null;
		budget?: string | null;
		message: string;
		source: string;
		utm?: Record<string, string | undefined>;
	};
	adminUrl?: string | null;
}): EmailContent {
	const { lead } = input;

	const rows = [
		{ term: "Name", value: lead.name },
		{ term: "Email", value: lead.email },
		lead.phone ? { term: "Phone", value: lead.phone } : null,
		lead.company ? { term: "Company", value: lead.company } : null,
		lead.service ? { term: "Service", value: lead.service } : null,
		lead.budget ? { term: "Budget", value: lead.budget } : null,
		{ term: "Source", value: lead.source },
	].filter((row): row is { term: string; value: string } => Boolean(row));

	const utmRows = Object.entries(lead.utm ?? {})
		.filter(([, value]) => Boolean(value))
		.map(([term, value]) => ({ term, value: String(value) }));

	const body = [
		masthead({ overline: "New lead", title: lead.name, lede: lead.email }),
		`<div style="margin:24px 0 0;padding:20px;background:${palette.paper};border:1px solid ${palette.line};border-radius:12px;">
      ${definitionRows(rows)}
    </div>`,
		card(
			`${label("Message")}
       <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:${palette.body};white-space:pre-wrap;">${esc(lead.message)}</p>`,
		),
		utmRows.length
			? card(`${label("Attribution")}${definitionRows(utmRows)}`)
			: "",
		input.adminUrl ? button({ href: input.adminUrl, label: "Open in admin" }) : "",
		footer(),
	].join("\n");

	return {
		subject: `New lead — ${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
		html: shell({ preheader: `${lead.source} · ${lead.email}`, body }),
		text: textBlock([
			"New lead",
			"",
			...rows.map((row) => `${row.term}: ${row.value}`),
			"",
			"Message:",
			lead.message,
			utmRows.length ? "" : null,
			utmRows.length ? "Attribution:" : null,
			...utmRows.map((row) => `  ${row.term}: ${row.value}`),
			input.adminUrl ? `\nAdmin: ${input.adminUrl}` : null,
		]),
		// So a reply from the inbox goes straight back to the lead.
		replyTo: lead.email,
	};
}
