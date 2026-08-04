import type {
	DeliveryResult,
	NotificationChannel,
	NotificationEvent,
	Recipient,
} from "./types";
import {
	renderBookingConfirmation,
	renderBookingInternal,
} from "./templates/booking";
import { renderContactAck, renderContactInternal } from "./templates/contact";
import { renderNurtureEmail } from "./templates/nurture";
import { renderRoadmapEmail } from "./templates/roadmap";

/**
 * Email delivery over Resend's REST API.
 *
 * Called direct over HTTP rather than through the SDK: this is one POST with a
 * JSON body, and keeping it dependency-free keeps the serverless bundle small
 * on a path that runs inside `after()` on every lead capture.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Generous on purpose: the first call from a cold instance spends ~11s on DNS
 * and the TLS handshake, while warm calls return in well under a second. A
 * tighter budget silently drops the very first message after every deploy.
 */
const SEND_TIMEOUT_MS = 25_000;

export type EmailAttachment = {
	filename: string;
	/** Base64-encoded content — what Resend's API expects. */
	content: string;
	contentType?: string;
};

export type EmailContent = {
	subject: string;
	html: string;
	text: string;
	attachments?: EmailAttachment[];
	replyTo?: string;
	headers?: Record<string, string>;
};

function fromAddress(): string | null {
	const from = process.env.RESEND_FROM_EMAIL;
	if (!from) return null;
	return from.includes("<") ? from : `ZACSOL <${from}>`;
}

/** Turn a semantic event into a rendered message, or null if unsupported. */
function render(event: NotificationEvent): EmailContent | null {
	switch (event.type) {
		case "roadmap.delivered":
			return renderRoadmapEmail({
				name: event.name,
				blueprint: event.blueprint,
				slots: event.slots,
				roadmapUrl: event.roadmapUrl,
			});
		case "booking.confirmed":
			return renderBookingConfirmation({
				name: event.name,
				booking: event.booking,
				icsBase64: event.icsBase64,
				rescheduled: event.rescheduled,
			});
		case "booking.internal":
			return renderBookingInternal({
				booking: event.booking,
				lead: event.lead,
				adminUrl: event.adminUrl,
			});
		case "contact.received":
			return renderContactAck({
				name: event.name,
				message: event.message,
				service: event.service,
			});
		case "contact.internal":
			return renderContactInternal({ lead: event.lead, adminUrl: event.adminUrl });
		case "nurture.step":
			return renderNurtureEmail({ name: event.name, step: event.step });
		default:
			return null;
	}
}

export async function sendEmail(input: {
	to: string;
	content: EmailContent;
	/** Overrides the default reply-to for this message only. */
	replyTo?: string;
}): Promise<DeliveryResult> {
	const apiKey = process.env.RESEND_API_KEY;
	const from = fromAddress();

	if (!apiKey || !from) {
		return {
			status: "skipped",
			channel: "email",
			reason: !apiKey ? "RESEND_API_KEY not set" : "RESEND_FROM_EMAIL not set",
		};
	}

	const { content } = input;
	const replyTo = input.replyTo ?? content.replyTo ?? process.env.RESEND_REPLY_TO;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

	try {
		const response = await fetch(RESEND_ENDPOINT, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			signal: controller.signal,
			body: JSON.stringify({
				from,
				to: [input.to],
				subject: content.subject,
				html: content.html,
				text: content.text,
				...(replyTo ? { reply_to: replyTo } : {}),
				...(content.headers ? { headers: content.headers } : {}),
				...(content.attachments?.length
					? {
							attachments: content.attachments.map((attachment) => ({
								filename: attachment.filename,
								content: attachment.content,
								...(attachment.contentType
									? { content_type: attachment.contentType }
									: {}),
							})),
						}
					: {}),
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => "");
			return {
				status: "failed",
				channel: "email",
				error: `Resend ${response.status}: ${body.slice(0, 200)}`,
			};
		}

		const data = (await response.json().catch(() => ({}))) as { id?: string };
		return { status: "sent", channel: "email", id: data.id };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			status: "failed",
			channel: "email",
			error:
				err instanceof Error && err.name === "AbortError" ? "Resend timed out" : message,
		};
	} finally {
		clearTimeout(timer);
	}
}

export const emailChannel: NotificationChannel = {
	id: "email",

	isConfigured() {
		return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
	},

	supports(event) {
		return render(event) !== null;
	},

	async send(event: NotificationEvent, recipient: Recipient): Promise<DeliveryResult> {
		const content = render(event);
		if (!content) {
			return {
				status: "skipped",
				channel: "email",
				reason: `no email template for ${event.type}`,
			};
		}
		return sendEmail({ to: recipient.email, content });
	},
};
