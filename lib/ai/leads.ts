import type { EmailResult } from "./email";
import type { Blueprint, ChatMessage, Slots } from "./schema";

/**
 * Lead persistence.
 *
 * Storage failures must never cost us the lead, so every path here logs the
 * full record before rethrowing nothing — an operator can recover it from logs
 * even if Postgres was down when the visitor submitted.
 */

export type LeadRecord = {
  name: string;
  email: string;
  sessionId: string;
  slots: Slots;
  blueprint: Blueprint;
  transcript: ChatMessage[];
  email_result: EmailResult;
};

export type SaveLeadResult = { stored: boolean; id?: string | number; error?: string };

async function payloadClient() {
  const { getPayload } = await import("payload");
  const config = (await import("@payload-config")).default;
  return getPayload({ config });
}

/** Record the outcome of the deferred send against an already-stored lead. */
export async function updateLeadDelivery(
  id: string | number,
  result: EmailResult,
): Promise<void> {
  try {
    const payload = await payloadClient();
    await payload.update({
      collection: "leads",
      id,
      overrideAccess: true,
      data: {
        emailStatus: result.status,
        emailError:
          result.status === "failed"
            ? result.error.slice(0, 240)
            : result.status === "skipped"
              ? result.reason.slice(0, 240)
              : null,
      },
    });
  } catch (err) {
    console.error(`[consultant] could not record delivery for lead ${id}:`, err);
  }
}

export async function saveLead(record: LeadRecord): Promise<SaveLeadResult> {
  const {
    name,
    email,
    sessionId,
    slots,
    blueprint,
    transcript,
    email_result: emailResult,
  } = record;

  try {
    const payload = await payloadClient();

    const doc = await payload.create({
      collection: "leads",
      // The collection denies public create; this is the trusted server path.
      overrideAccess: true,
      data: {
        name,
        email,
        status: "new",
        sessionId,
        problem: slots.problem ?? null,
        industry: slots.industry ?? null,
        currentProcess: slots.current ?? null,
        scale: slots.scale ?? null,
        timeline: slots.timeline ?? null,
        solutionTitle: blueprint.title,
        serviceSlug: blueprint.serviceSlug,
        costLowUsd: Math.round(blueprint.costBandUsd[0]),
        costHighUsd: Math.round(blueprint.costBandUsd[1]),
        durationLowWeeks: blueprint.durationWeeks[0],
        durationHighWeeks: blueprint.durationWeeks[1],
        blueprint,
        transcript,
        source: blueprint.source,
        emailStatus: emailResult.status === "sent" ? "sent" : emailResult.status,
        emailError:
          emailResult.status === "failed"
            ? emailResult.error.slice(0, 240)
            : emailResult.status === "skipped"
              ? emailResult.reason.slice(0, 240)
              : null,
      },
    });

    return { stored: true, id: doc.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[consultant] LEAD PERSIST FAILED — recover from this log:",
      JSON.stringify({
        name,
        email,
        sessionId,
        slots,
        solutionTitle: blueprint.title,
        at: new Date().toISOString(),
      }),
      message,
    );
    return { stored: false, error: message };
  }
}
