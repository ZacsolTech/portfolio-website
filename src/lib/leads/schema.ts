import { z } from "zod";

/**
 * One lead shape for every surface on the site.
 *
 * `PAGES.md` specifies `{ source, seed, answers, solution, contact, consent, utm }`
 * as the normalised record every form and gate produces. Keeping that contract
 * in one schema means the consultant gate, the contact form, the booking panel
 * and the newsletter strip all land in the same table with the same columns —
 * so "where did this lead come from and what did they tell us?" is one query,
 * not five.
 *
 * Anything surface-specific goes in `answers` (free-form JSON) rather than
 * growing a column per form.
 */

/* --------------------------------- source --------------------------------- */

export const LEAD_SOURCES = [
	"consultant",
	"estimator",
	"contact",
	"booking",
	"newsletter",
] as const;

export const LeadSourceSchema = z.enum(LEAD_SOURCES);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

/* -------------------------------- contact -------------------------------- */

/**
 * Names are validated against a letter/mark class rather than `\w` so people
 * with accents, apostrophes or hyphens are not told their name is invalid.
 */
export const PersonNameSchema = z
	.string()
	.trim()
	.min(2)
	.max(80)
	.regex(/^[\p{L}\p{M}'’.\- ]+$/u, "Use a real name");

export const EmailSchema = z.string().trim().email().max(160).toLowerCase();

export const ContactSchema = z.object({
	name: PersonNameSchema,
	email: EmailSchema,
	/** Free-form: international formats vary too much to validate usefully. */
	phone: z.string().trim().max(40).optional(),
	company: z.string().trim().max(120).optional(),
});

export type LeadContact = z.infer<typeof ContactSchema>;

/* -------------------------------- consent -------------------------------- */

/**
 * Consent is stored per channel, never as one bundled "I agree".
 *
 * `TECH-STACK.md` §10 requires WhatsApp consent to be legally separate from
 * email when that channel returns. Modelling it as a map from channel to a
 * timestamped record means adding WhatsApp later is a new key, not a schema
 * migration — and the exact wording the visitor agreed to is retained, which
 * is what actually matters if consent is ever challenged.
 */
export const ConsentRecordSchema = z.object({
	granted: z.boolean(),
	/** The exact wording shown next to the checkbox. */
	text: z.string().max(500),
	at: z.string().datetime(),
});

export const ConsentSchema = z.object({
	email: ConsentRecordSchema.optional(),
	marketing: ConsentRecordSchema.optional(),
});

export type LeadConsent = z.infer<typeof ConsentSchema>;

/* ---------------------------------- utm ---------------------------------- */

/**
 * First-touch attribution.
 *
 * Captured on the visitor's first page view and kept for the session, so a
 * lead that arrives three pages later still carries the campaign that brought
 * them. Every field is optional and length-capped: this is untrusted query
 * string data and it is never used in a query or rendered as HTML.
 */
const utmField = z.string().trim().max(200).optional();

export const AttributionSchema = z.object({
	source: utmField,
	medium: utmField,
	campaign: utmField,
	term: utmField,
	content: utmField,
	/** Ad click ids, useful for offline conversion upload later. */
	gclid: utmField,
	fbclid: utmField,
	/** External referrer at first touch, empty for direct traffic. */
	referrer: z.string().trim().max(500).optional(),
	/** Path the visitor first landed on. */
	landingPath: z.string().trim().max(300).optional(),
	firstSeenAt: z.string().datetime().optional(),
});

export type Attribution = z.infer<typeof AttributionSchema>;

/* -------------------------------- solution -------------------------------- */

/** Whatever the visitor was shown — a blueprint, an estimate, or nothing. */
export const SolutionSchema = z.object({
	title: z.string().max(200).optional(),
	serviceSlug: z.string().max(80).optional(),
	costLowUsd: z.number().nonnegative().optional(),
	costHighUsd: z.number().nonnegative().optional(),
	durationLowWeeks: z.number().int().nonnegative().optional(),
	durationHighWeeks: z.number().int().nonnegative().optional(),
	/** Full generated document, exactly as delivered. */
	document: z.unknown().optional(),
});

export type LeadSolution = z.infer<typeof SolutionSchema>;

/* -------------------------------- the lead -------------------------------- */

export const LeadInputSchema = z.object({
	source: LeadSourceSchema,
	/** The originating problem statement in the visitor's own words. */
	seed: z.string().max(2000).optional(),
	/** Surface-specific answers: intake slots, form selects, estimator levers. */
	answers: z.record(z.string(), z.unknown()).optional(),
	solution: SolutionSchema.optional(),
	contact: ContactSchema,
	consent: ConsentSchema.default({}),
	utm: AttributionSchema.default({}),
	/** Consultant/estimator session this came from, when there is one. */
	sessionId: z.string().max(64).optional(),
	/** Conversation that produced the solution, when there is one. */
	transcript: z.unknown().optional(),
	/** Which engine produced the solution — Gemini or the offline fallback. */
	engine: z.enum(["gemini", "rules"]).optional(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;

/** Build a timestamped consent record from a checkbox and its visible label. */
export function consentRecord(granted: boolean, text: string) {
	return { granted, text, at: new Date().toISOString() };
}
