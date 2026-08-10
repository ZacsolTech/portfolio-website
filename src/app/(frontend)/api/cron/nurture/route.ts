import { authorizeCron } from "@/lib/cron/auth";
import { notify, summarize } from "@/lib/notifications";
import {
	buildNurturePayload,
	nextNurtureRun,
	NURTURE_STEP_COUNT,
	nurtureStepAt,
} from "@/lib/nurture/sequence";
import { createToken } from "@/lib/security/tokens";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * The follow-up sequence runner.
 *
 * Scheduled daily (see `vercel.json`). Each run picks up leads whose next step
 * is due and sends exactly one email each.
 *
 * Two properties matter more than throughput:
 *
 * 1. **Never send twice.** The row is advanced *before* the send, so a timeout
 *    or a retried invocation cannot re-deliver. Losing one follow-up is a
 *    non-event; sending the same person day 5 three times is not.
 * 2. **Bounded.** A batch cap keeps one run inside the function's time budget
 *    and inside Resend's rate limit — leftovers are simply due again tomorrow.
 */

const BATCH_SIZE = 40;

async function payloadClient() {
	const { getPayload } = await import("payload");
	const config = (await import("@payload-config")).default;
	return getPayload({ config });
}

export async function GET(request: Request) {
	const auth = authorizeCron(request);
	if (!auth.ok) return auth.response;

	const now = new Date();
	const summary = { due: 0, sent: 0, failed: 0, completed: 0, skipped: 0 };

	try {
		const payload = await payloadClient();

		const due = await payload.find({
			collection: "leads",
			where: {
				and: [
					{ nurtureStatus: { equals: "active" } },
					{ nurtureNextAt: { less_than_equal: now.toISOString() } },
				],
			},
			limit: BATCH_SIZE,
			sort: "nurtureNextAt",
			depth: 0,
			overrideAccess: true,
		});

		summary.due = due.docs.length;

		for (const lead of due.docs) {
			const stepIndex = typeof lead.nurtureStep === "number" ? lead.nurtureStep : 0;
			const step = nurtureStepAt(stepIndex);

			if (!step) {
				await payload.update({
					collection: "leads",
					id: lead.id,
					overrideAccess: true,
					data: { nurtureStatus: "completed", nurtureNextAt: null } as never,
				});
				summary.completed += 1;
				continue;
			}

			// A lead captured without marketing consent should never have been
			// activated; treat it as a bug we refuse to compound.
			if (!lead.consent?.emailGranted) {
				await payload.update({
					collection: "leads",
					id: lead.id,
					overrideAccess: true,
					data: {
						nurtureStatus: "stopped",
						nurtureNextAt: null,
						nurtureStoppedReason: "no email consent on record",
					} as never,
				});
				summary.skipped += 1;
				continue;
			}

			const unsubscribeToken = lead.unsubscribeToken || createToken();
			const isLast = stepIndex + 1 >= NURTURE_STEP_COUNT;

			// Advance first. A crash between here and the send costs one email;
			// the reverse order costs a duplicate, which is far worse.
			await payload.update({
				collection: "leads",
				id: lead.id,
				overrideAccess: true,
				data: {
					nurtureStep: stepIndex + 1,
					nurtureStatus: isLast ? "completed" : "active",
					nurtureNextAt: isLast ? null : nextNurtureRun(stepIndex + 1, now).toISOString(),
					unsubscribeToken,
				} as never,
			});

			const results = await notify(
				{
					type: "nurture.step",
					category: "marketing",
					name: lead.name,
					step: buildNurturePayload({
						step,
						appUrl: siteUrl,
						unsubscribeUrl: absoluteUrl(`/api/unsubscribe?token=${unsubscribeToken}`),
					}),
				},
				{
					name: lead.name,
					email: lead.email,
					// Email consent is what the gate and forms actually collect;
					// this three-message sequence is what it was granted for.
					marketingConsent: true,
				},
			);

			const outcome = summarize(results);
			if (outcome.status === "sent") summary.sent += 1;
			else if (outcome.status === "failed") summary.failed += 1;
			else summary.skipped += 1;

			await payload.update({
				collection: "leads",
				id: lead.id,
				overrideAccess: true,
				data: {
					emailStatus: outcome.status,
					emailError: outcome.detail,
				} as never,
			});
		}

		console.info("[cron:nurture]", JSON.stringify(summary));
		return Response.json({ ok: true, ...summary });
	} catch (err) {
		console.error("[cron:nurture] run failed:", err);
		return Response.json({ error: "Nurture run failed." }, { status: 500 });
	}
}
