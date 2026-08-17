import {
  normalizeTiming,
  SlotsSchema,
  TIMING_OPTIONS,
  type Slots,
} from "@/lib/ai/schema";
import type { EstimatorSlots } from "@/lib/estimator/schema";

/**
 * Estimator → Consultant.
 *
 * Someone who has just been priced should not be asked the same five questions
 * again to get a roadmap. This maps what the estimator established onto the
 * consultant's slots and writes the opening message on the visitor's behalf.
 *
 * It maps *conservatively*:
 *
 * - **audience / today / v1** — the estimator never asks these. Inventing them
 *   from a project type would put a fabricated fact in front of the model.
 * - **timing** — clean map from estimator timeline vocabulary.
 * - **outcome** — the project summary carries as the goal seed.
 */

/** Estimator timeline vocabulary → consultant timing vocabulary. */
const TIMING_MAP: Record<string, (typeof TIMING_OPTIONS)[number]> = {
  "As soon as possible": "As soon as possible",
  "This quarter": "Within 3 months",
  "Next 6 months": "3–6 months",
  "Still exploring": "Still exploring",
};

export type HandoffResult = {
  /** Slots to merge onto the consultant session. */
  slots: Slots;
  /** The opening message, sent as if the visitor typed it. */
  prefill: string;
  /** Human labels for what carried across, for the UI to acknowledge. */
  carried: string[];
};

export function estimatorToConsultant(
  estimator: EstimatorSlots,
  priced?: { lowUsd: number; highUsd: number } | null,
): HandoffResult | null {
  const summary = estimator.summary?.trim();
  if (!summary || summary.length < 8) return null;

  const carried: string[] = ["What you're building"];
  const slots: Slots = { outcome: summary.slice(0, 1200) };

  const timing = estimator.timeline ? TIMING_MAP[estimator.timeline] : undefined;
  if (timing) {
    slots.timing = normalizeTiming(timing);
    carried.push("Timing");
  }

  /* The opening message. Written in the visitor's voice because that is whose
     turn it is — the model reads it as the first thing they said. */
  const facts = [
    estimator.projectType,
    estimator.platform ? `${estimator.platform.toLowerCase()} platform` : null,
    estimator.scope,
    estimator.timeline ? `timing: ${estimator.timeline.toLowerCase()}` : null,
    estimator.integrations
      ? `${estimator.integrations} system${estimator.integrations === 1 ? "" : "s"} to integrate`
      : null,
    estimator.regulated ? "regulated data" : null,
  ].filter(Boolean) as string[];

  const band = priced
    ? ` Your estimator put it at roughly $${Math.round(priced.lowUsd / 1000)}k–$${Math.round(priced.highUsd / 1000)}k.`
    : "";

  const prefill = [
    `I just used your estimator and I'd like the full solution roadmap.`,
    ``,
    summary,
    ``,
    facts.length > 0 ? `What I told it: ${facts.join(", ")}.${band}` : band.trim(),
  ]
    .join("\n")
    .trim()
    .slice(0, 3800);

  return { slots: SlotsSchema.parse(slots) as Slots, prefill, carried };
}
