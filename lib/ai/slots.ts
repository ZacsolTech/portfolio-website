import {
  SLOT_KEYS,
  SlotsSchema,
  normalizeScale,
  normalizeTimeline,
  type SlotKey,
  type Slots,
} from "./schema";

/**
 * Slot state is the single source of truth for "can we build a blueprint yet".
 *
 * The model proposes slot values every turn; we merge rather than replace so a
 * later turn that omits a field cannot erase what the visitor already told us.
 * Deliberate corrections still land, because a model that re-states a field is
 * expressing the newer value.
 */

const MIN_PROBLEM_CHARS = 16;

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  // Models sometimes echo "unknown"/"not specified" instead of omitting a slot.
  if (/^(unknown|not (specified|provided|mentioned)|n\/?a|none|tbd|null)$/i.test(text)) {
    return undefined;
  }
  return text.slice(0, max);
}

/** Merge a model-proposed patch onto existing slots. Empty values never clear. */
export function mergeSlots(current: Slots, patch: Slots | undefined): Slots {
  if (!patch) return current;

  const problem = cleanText(patch.problem, 1200);
  const industry = cleanText(patch.industry, 120);
  const currentProcess = cleanText(patch.current, 240);
  const scale = cleanText(patch.scale, 60);
  const timeline = cleanText(patch.timeline, 60);

  const next: Slots = {
    // Keep the richer problem statement — the model tends to compress on later
    // turns, and the blueprint is only as good as this field.
    problem:
      problem && problem.length >= (current.problem?.length ?? 0)
        ? problem
        : (current.problem ?? problem),
    industry: industry ?? current.industry,
    current: currentProcess ?? current.current,
    scale: scale ? normalizeScale(scale) : current.scale,
    timeline: timeline ? normalizeTimeline(timeline) : current.timeline,
  };

  return SlotsSchema.parse(stripUndefined(next));
}

function stripUndefined(slots: Slots): Slots {
  return Object.fromEntries(
    Object.entries(slots).filter(([, v]) => v !== undefined && v !== ""),
  ) as Slots;
}

export function isSlotFilled(slots: Slots, key: SlotKey): boolean {
  const value = slots[key];
  if (!value) return false;
  if (key === "problem") return value.trim().length >= MIN_PROBLEM_CHARS;
  return value.trim().length > 0;
}

export function missingSlots(slots: Slots): SlotKey[] {
  return SLOT_KEYS.filter((key) => !isSlotFilled(slots, key));
}

export function slotsComplete(slots: Slots): boolean {
  return missingSlots(slots).length === 0;
}

/** 0–100, for the intake progress meter in the UI. */
export function slotProgress(slots: Slots): number {
  const filled = SLOT_KEYS.filter((key) => isSlotFilled(slots, key)).length;
  return Math.round((filled / SLOT_KEYS.length) * 100);
}

/** Slot the consultant should ask about next, if any. */
export function nextSlot(slots: Slots): SlotKey | null {
  return missingSlots(slots)[0] ?? null;
}
