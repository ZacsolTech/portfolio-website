import {
  SLOT_KEYS,
  SlotsSchema,
  normalizeTiming,
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

const MIN_OUTCOME_CHARS = 16;

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

  const outcome = cleanText(patch.outcome, 1200);
  const audience = cleanText(patch.audience, 160);
  const today = cleanText(patch.today, 280);
  const v1 = cleanText(patch.v1, 400);
  const timing = cleanText(patch.timing, 60);

  const next: Slots = {
    // Keep the richer outcome — the model tends to compress on later turns,
    // and the blueprint is only as good as this field.
    outcome:
      outcome && outcome.length >= (current.outcome?.length ?? 0)
        ? outcome
        : (current.outcome ?? outcome),
    audience: audience ?? current.audience,
    today: today ?? current.today,
    v1: v1 ?? current.v1,
    timing: timing ? normalizeTiming(timing) : current.timing,
  };

  return SlotsSchema.parse(stripUndefined(next)) as Slots;
}

function stripUndefined(slots: Slots): Slots {
  return Object.fromEntries(
    Object.entries(slots).filter(([, v]) => v !== undefined && v !== ""),
  ) as Slots;
}

export function isSlotFilled(slots: Slots, key: SlotKey): boolean {
  const value = slots[key];
  if (!value) return false;
  if (key === "outcome") return value.trim().length >= MIN_OUTCOME_CHARS;
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
