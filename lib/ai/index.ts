export {
  BLUEPRINT_MODELS,
  CHAT_MODELS,
  getGenAI,
  hasGemini,
} from "./client";
export {
  BlueprintSchema,
  ChatMessageSchema,
  PROMPT_VERSION,
  SCALE_OPTIONS,
  SERVICE_SLUGS,
  SLOT_KEYS,
  SLOT_LABELS,
  TIMELINE_OPTIONS,
  formatMoneyBand,
  normalizeScale,
  normalizeTimeline,
  slotsToAnswers,
  type Blueprint,
  type ChatMessage,
  type ChatTurn,
  type ConsultantAnswers,
  type SlotKey,
  type Slots,
  type Stage,
} from "./schema";
export {
  mergeSlots,
  missingSlots,
  nextSlot,
  slotProgress,
  slotsComplete,
} from "./slots";
export { generateBlueprint } from "./gemini";
export { extractSlots, rulesChatTurn, streamConsultantTurn, type ChatEvent } from "./chat";
export { buildRulesBlueprint, classifySeed } from "./rules-engine";
export { sanitizeChatMessage } from "./sanitize";
export { limitConsultant, limitForm, getClientIp, type LimitKind } from "./rate-limit";
export {
  getOrCreateSession,
  loadSession,
  saveSession,
  type ConsultantSession,
} from "./session";
export { CONSULTANT_EVAL_CASES } from "./eval-cases";
export {
  BLUEPRINT_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "./prompts";
