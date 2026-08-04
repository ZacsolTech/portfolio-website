import type { Blueprint, Slots } from "@/lib/ai/schema";

/**
 * Channel-agnostic notification contract.
 *
 * `TECH-STACK.md` §10 defers WhatsApp out of v1 but requires the notification
 * layer to be designed for it now: call sites emit a *semantic event* — "this
 * roadmap was delivered", "this booking is confirmed" — and never a rendered
 * message. Adding WhatsApp later means writing one more `NotificationChannel`
 * and registering it; no route handler changes.
 *
 * The events below are the vocabulary. Anything a channel needs to render a
 * message must be in the payload, because a channel is not allowed to reach
 * into the database or the session store.
 */

export type ChannelId = "email" | "whatsapp";

/**
 * Transactional messages answer something the recipient just did and are sent
 * regardless of marketing consent. Marketing messages require it, and the
 * dispatcher enforces that rather than trusting every call site to remember.
 */
export type NotificationCategory = "transactional" | "marketing" | "internal";

export type BookingSummary = {
	reference: string;
	/** ISO instant. Rendered per-recipient in `timezone`. */
	startsAt: string;
	endsAt: string;
	/** IANA zone the visitor booked in, so the email reads in their local time. */
	timezone: string;
	topic?: string | null;
	hostName: string;
	meetingUrl?: string | null;
	manageUrl: string;
};

export type NurtureStepPayload = {
	stepKey: string;
	subject: string;
	preheader: string;
	heading: string;
	/** Paragraphs of body copy, already written for this step. */
	body: string[];
	ctaLabel: string;
	ctaUrl: string;
	unsubscribeUrl: string;
};

export type NotificationEvent =
	| {
			type: "roadmap.delivered";
			category: "transactional";
			name: string;
			blueprint: Blueprint;
			slots: Slots;
			/** Shareable `/roadmap/[id]` link, when one was minted. */
			roadmapUrl?: string | null;
	  }
	| {
			type: "booking.confirmed";
			category: "transactional";
			name: string;
			booking: BookingSummary;
			/**
			 * Base64 `.ics`. Channel-specific, but generating it once at the call
			 * site is cheaper than every channel rebuilding the same invite — and
			 * channels that cannot attach files simply ignore it.
			 */
			icsBase64?: string;
			/** Reframes the copy as a move rather than a new booking. */
			rescheduled?: boolean;
	  }
	| {
			type: "booking.internal";
			category: "internal";
			booking: BookingSummary;
			lead: { name: string; email: string; company?: string | null };
			adminUrl?: string | null;
	  }
	| {
			type: "contact.received";
			category: "transactional";
			name: string;
			message: string;
			service?: string | null;
	  }
	| {
			type: "contact.internal";
			category: "internal";
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
	  }
	| {
			type: "nurture.step";
			category: "marketing";
			name: string;
			step: NurtureStepPayload;
	  };

export type NotificationType = NotificationEvent["type"];

export type Recipient = {
	name: string;
	email: string;
	phone?: string | null;
	/**
	 * Whether this person agreed to marketing contact. `marketing` events are
	 * dropped without it; transactional ones are not gated.
	 */
	marketingConsent?: boolean;
};

export type DeliveryResult =
	| { status: "sent"; channel: ChannelId; id?: string }
	| { status: "skipped"; channel: ChannelId; reason: string }
	| { status: "failed"; channel: ChannelId; error: string };

export interface NotificationChannel {
	readonly id: ChannelId;
	/** False when the channel's credentials are absent. */
	isConfigured(): boolean;
	/** False when this channel has no template for the event. */
	supports(event: NotificationEvent): boolean;
	send(event: NotificationEvent, recipient: Recipient): Promise<DeliveryResult>;
}
