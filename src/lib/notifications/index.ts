import { emailChannel } from "./email";
import type {
	ChannelId,
	DeliveryResult,
	NotificationChannel,
	NotificationEvent,
	Recipient,
} from "./types";

export type {
	BookingSummary,
	ChannelId,
	DeliveryResult,
	NotificationCategory,
	NotificationChannel,
	NotificationEvent,
	NotificationType,
	NurtureStepPayload,
	Recipient,
} from "./types";

export { sendEmail, type EmailContent } from "./email";

/**
 * Notification dispatch.
 *
 * The registry is the extension point `TECH-STACK.md` §10 asks for: WhatsApp
 * returns as one more entry here, and every call site that already emits
 * `booking.confirmed` starts sending on both channels without being touched.
 *
 * Two rules are enforced centrally rather than trusted to callers:
 *
 * 1. **Consent.** `marketing` events are dropped for a recipient who never
 *    granted marketing consent. Getting this wrong is a legal problem, so it
 *    does not live in six route handlers.
 * 2. **Never throw.** A notification failure must not fail the action that
 *    triggered it. The lead is already captured and the visitor has already
 *    seen their confirmation; a bounced email is our problem to retry, not a
 *    500 for them.
 */

const CHANNELS: NotificationChannel[] = [emailChannel];

function enabledChannels(only?: ChannelId[]): NotificationChannel[] {
	return CHANNELS.filter(
		(channel) => !only || only.includes(channel.id),
	).filter((channel) => channel.isConfigured());
}

export async function notify(
	event: NotificationEvent,
	recipient: Recipient,
	options?: { channels?: ChannelId[] },
): Promise<DeliveryResult[]> {
	if (event.category === "marketing" && !recipient.marketingConsent) {
		return [
			{
				status: "skipped",
				channel: "email",
				reason: "no marketing consent on record",
			},
		];
	}

	const channels = enabledChannels(options?.channels).filter((channel) =>
		channel.supports(event),
	);

	if (channels.length === 0) {
		return [
			{
				status: "skipped",
				channel: "email",
				reason: "no configured channel supports this event",
			},
		];
	}

	const results = await Promise.all(
		channels.map(async (channel): Promise<DeliveryResult> => {
			try {
				return await channel.send(event, recipient);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				return { status: "failed", channel: channel.id, error: message };
			}
		}),
	);

	for (const result of results) {
		if (result.status === "failed") {
			console.error(
				`[notifications] ${event.type} via ${result.channel} failed:`,
				result.error,
			);
		}
	}

	return results;
}

/** Collapse a multi-channel outcome into one status for storage. */
export function summarize(results: DeliveryResult[]): {
	status: "sent" | "failed" | "skipped";
	detail: string | null;
} {
	if (results.some((r) => r.status === "sent")) return { status: "sent", detail: null };

	const failed = results.find((r) => r.status === "failed");
	if (failed && failed.status === "failed") {
		return { status: "failed", detail: failed.error.slice(0, 240) };
	}

	const skipped = results.find((r) => r.status === "skipped");
	return {
		status: "skipped",
		detail: skipped && skipped.status === "skipped" ? skipped.reason.slice(0, 240) : null,
	};
}

/**
 * Where internal alerts go. Falls back to the reply-to address so a deployment
 * that forgets `LEADS_NOTIFY_EMAIL` still reaches a human.
 */
export function internalRecipient(): Recipient | null {
	const email = process.env.LEADS_NOTIFY_EMAIL || process.env.RESEND_REPLY_TO;
	if (!email) return null;
	return { name: "ZACSOL", email };
}
