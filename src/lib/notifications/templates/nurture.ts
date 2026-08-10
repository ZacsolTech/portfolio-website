import type { NurtureStepPayload } from "../types";
import type { EmailContent } from "../email";
import { button, footer, masthead, paragraph, shell, textBlock } from "./kit";

/**
 * Follow-up sequence body.
 *
 * The copy lives in `lib/nurture/sequence.ts` — this file only knows how to
 * lay it out, so changing what we say on day 5 never means touching a template.
 * Every one of these carries a working unsubscribe link, which is both the law
 * in most of the markets we sell into and the honest thing to do.
 */
export function renderNurtureEmail(input: {
	name: string;
	step: NurtureStepPayload;
}): EmailContent {
	const { name, step } = input;

	const body = [
		masthead({ overline: "ZACSOL", title: step.heading }),
		paragraph(`Hi ${name},`),
		...step.body.map((text) => paragraph(text)),
		button({ href: step.ctaUrl, label: step.ctaLabel }),
		footer({ unsubscribeUrl: step.unsubscribeUrl }),
	].join("\n");

	return {
		subject: step.subject,
		html: shell({ preheader: step.preheader, body }),
		text: textBlock([
			`Hi ${name},`,
			"",
			...step.body.flatMap((text) => [text, ""]),
			`${step.ctaLabel}: ${step.ctaUrl}`,
			"",
			"ZACSOL",
			`Unsubscribe: ${step.unsubscribeUrl}`,
		]),
		headers: {
			// One-click unsubscribe. Gmail and Outlook surface this as a native
			// control, and its absence is a measurable deliverability penalty.
			"List-Unsubscribe": `<${step.unsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
	};
}
