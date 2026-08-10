import type { NurtureStepPayload } from "@/lib/notifications/types";

/**
 * The day 2 / 5 / 12 follow-up sequence.
 *
 * Roadmap delivery → day 2 relevant project → day 5 booking nudge → day 12
 * useful article, *all stopping on reply or booking*. Three emails over twelve
 * days is a deliberate ceiling — the site's whole pitch is that we don't run
 * sales sequences, so this has to stay short enough that the claim on the gate
 * ("no newsletter, no reselling") holds.
 *
 * Copy lives here rather than in the template so changing what we say on day 5
 * is a content edit, not a layout edit.
 */

export type NurtureStep = {
	key: string;
	/** Days after capture. */
	dayOffset: number;
	subject: string;
	preheader: string;
	heading: string;
	body: string[];
	ctaLabel: string;
	ctaPath: string;
};

export const NURTURE_STEPS: NurtureStep[] = [
	{
		key: "day-2-proof",
		dayOffset: 2,
		subject: "What this looked like when someone else did it",
		preheader: "A project close enough to yours to be worth ten minutes.",
		heading: "The version of this we already shipped",
		body: [
			"Your roadmap is an estimate built from one conversation. The useful next thing is not another estimate — it's seeing how a comparable build actually went: what the first phase turned out to be, what we got wrong in week three, and what it cost by the end.",
			"Our project write-ups are written that way on purpose. No logos-and-adjectives; the constraints, the decisions and the numbers.",
		],
		ctaLabel: "Browse the projects",
		ctaPath: "/portfolio",
	},
	{
		key: "day-5-booking",
		dayOffset: 5,
		subject: "Worth thirty minutes?",
		preheader: "Not a sales call — bring the assumptions you disagree with.",
		heading: "The assumptions in your roadmap are the interesting part",
		body: [
			"Every roadmap we generate states what it assumed. Those assumptions are where an estimate goes wrong, and they're much faster to test out loud than by email.",
			"Thirty minutes with a senior engineer: whether software is even the right lever here, what a first phase should contain, and where our numbers would move. If the answer is \"don't build this yet\", you'll get that too.",
		],
		ctaLabel: "Book a consultation",
		ctaPath: "/book",
	},
	{
		key: "day-12-article",
		dayOffset: 12,
		subject: "Why software projects overrun — and the parts you control",
		preheader: "Practical writing, then we'll leave you alone.",
		heading: "One more thing, then we stop",
		body: [
			"Two thirds of software projects overrun on budget or schedule. Most of the causes are structural and visible from the outside — scope that moves without being re-priced, progress reported as decks rather than deployments, releases that are events instead of routine.",
			"This is the last email in this sequence. If the timing isn't right, that's genuinely fine — the consultant and the estimator stay free and available whenever it is.",
		],
		ctaLabel: "Read the insights",
		ctaPath: "/insights",
	},
];

export const NURTURE_STEP_COUNT = NURTURE_STEPS.length;

/**
 * When step `index` (0-based) should go out, measured from capture.
 * Returns null once the sequence is exhausted.
 */
export function nextNurtureRun(stepIndex: number, from: Date): Date {
	const step = NURTURE_STEPS[stepIndex];
	if (!step) {
		// Callers guard on step count; a far-future date is a safer degenerate
		// value than a past one, which would make the cron re-send forever.
		return new Date(from.getTime() + 365 * 24 * 60 * 60 * 1000);
	}
	const previousOffset = stepIndex === 0 ? 0 : (NURTURE_STEPS[stepIndex - 1]?.dayOffset ?? 0);
	const gapDays = step.dayOffset - previousOffset;
	return new Date(from.getTime() + gapDays * 24 * 60 * 60 * 1000);
}

export function nurtureStepAt(index: number): NurtureStep | null {
	return NURTURE_STEPS[index] ?? null;
}

/** Bind a step's copy to one recipient's links. */
export function buildNurturePayload(input: {
	step: NurtureStep;
	appUrl: string;
	unsubscribeUrl: string;
}): NurtureStepPayload {
	const base = input.appUrl.replace(/\/$/, "");
	return {
		stepKey: input.step.key,
		subject: input.step.subject,
		preheader: input.step.preheader,
		heading: input.step.heading,
		body: input.step.body,
		ctaLabel: input.step.ctaLabel,
		ctaUrl: `${base}${input.step.ctaPath}`,
		unsubscribeUrl: input.unsubscribeUrl,
	};
}
