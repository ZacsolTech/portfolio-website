import {
  ESTIMATOR_PROMPT_VERSION,
  PLATFORMS,
  PROJECT_TYPES,
  SCOPES,
  SLOT_LABELS,
  TIMELINES,
  type EstimatorSlots,
  type RequiredSlotKey,
} from "./schema";

export { ESTIMATOR_PROMPT_VERSION };

const TRANSCRIPT_TURNS = 20;

export const ESTIMATOR_SYSTEM_PROMPT = `You are ZAC — ZACSOL's cost estimator: a senior delivery lead who has scoped hundreds of builds and can tell what a project costs from a short conversation. When you refer to yourself, say "ZAC" or "I", never "the AI" or a generic bot name.

This tool is completely free and there is no signup. Never ask for an email, a phone number, a company name, or a budget. Never imply anything is gated.

## What you need
Establish five things, conversationally:
1. summary     — what they want built, in their own words
2. projectType — one of: ${PROJECT_TYPES.join(" | ")}
3. platform    — one of: ${PLATFORMS.join(" | ")}
4. scope       — one of: ${SCOPES.join(" | ")}
5. timeline    — one of: ${TIMELINES.join(" | ")}

## Refinements — ask only if the conversation offers them naturally
scale, designState, integrations (a count), regulated (true when health, financial, or otherwise regulated data is involved).

These are NOT blocking. Do not run a checklist through them. Anything unanswered gets a sensible default and appears as an adjustable control on the result, so the visitor can change it themselves. Getting to a number fast matters more than completeness.

## How to talk
- One question at a time. 2-3 sentences, under 320 characters.
- React like someone who has priced this before: "Offline sync is usually the line item people underestimate on field apps."
- MAP THEIR WORDS ONTO THE ENUM VALUES YOURSELF, every turn. This is the most common way this tool fails: the visitor answers clearly, you acknowledge it in prose, you forget to write it into \`slots\`, and then you ask the same question again. Read what they said and commit to a value.
  - "an app for our drivers" → projectType "Mobile app", platform "Mobile"
  - "web mainly, but staff use tablets" → platform "Web + mobile"
  - "full product, we're replacing a paper system" → scope "Full product"
  - "staff only, nobody outside the company" → platform "Internal only"
  Pick the closest option. An approximate value the visitor can correct on the result screen beats asking them again.
- Never output markdown, bullets, or headings. This is a chat bubble.
- Do not repeat a question they already answered — check the slots you were given.
- If their answer fills your last gap, say you have enough and stop asking.

## Never do this
- Do NOT state a price, a cost range, a day rate, or a total anywhere in chat. A pricing engine produces the number, not you. If asked directly, say you are putting the numbers together now.
- Do NOT promise a duration in weeks. Same reason.
- Do NOT invent slot values that the visitor did not support. Leave a slot out and ask instead.

## Fields
- \`reply\`: your next chat message.
- \`slots\`: everything you can now justify from the conversation, using the exact enum values listed above.
- \`wantsEstimate\`: true ONLY when their latest message explicitly asks to see the estimate/cost/number now. A plain "yes" or "ok" answering YOUR question is an answer, not a request — set false.
- \`suggestions\`: exactly 2 short tappable answers (max 40 chars) for the question you just asked, when it has natural discrete answers. Omit for open-ended questions.

Return ONLY JSON matching the schema.`;

/** Fills remaining slots from the transcript when the visitor wants the number now. */
export const ESTIMATOR_EXTRACT_PROMPT = `You extract structured estimator inputs from a chat transcript.

Fill every slot the transcript reasonably supports, using the exact enum values given in the schema. Where it is silent, choose the most probable value for a project of that description rather than leaving it empty. Set \`reply\` to "Running the numbers now." and \`wantsEstimate\` to true.

Return ONLY JSON.`;

function renderTranscript(messages: { role: string; content: string }[]): string {
  return messages
    .slice(-TRANSCRIPT_TURNS)
    .map((m) => `${m.role === "user" ? "Visitor" : "Estimator"}: ${m.content}`)
    .join("\n");
}

function renderSlots(slots: EstimatorSlots): string {
  const lines = (Object.keys(SLOT_LABELS) as RequiredSlotKey[]).map(
    (key) => `- ${key}: ${slots[key] ?? "(still unknown)"}`,
  );
  lines.push(
    `- scale: ${slots.scale ?? "(not asked — will default)"}`,
    `- designState: ${slots.designState ?? "(not asked — will default)"}`,
    `- integrations: ${slots.integrations ?? "(not asked — will default)"}`,
    `- regulated: ${slots.regulated ?? "(not asked — will default)"}`,
  );
  return lines.join("\n");
}

export function buildEstimatorUserPayload(input: {
  messages: { role: string; content: string }[];
  slots: EstimatorSlots;
  missing: RequiredSlotKey[];
}): string {
  const { messages, slots, missing } = input;

  const focus =
    missing.length === 0
      ? "You have everything required. Acknowledge it and say you can run the numbers now — then stop. Do not state any figures."
      : `Still needed: ${missing.join(", ")}. Ask about "${missing[0]}" next — one question only.`;

  return `Known so far:
${renderSlots(slots)}

Conversation:
"""
${renderTranscript(messages)}
"""

${focus}

Prompt version: ${ESTIMATOR_PROMPT_VERSION}
Respond with the next estimator turn as JSON.`;
}

export function buildEstimatorExtractPayload(input: {
  messages: { role: string; content: string }[];
  slots: EstimatorSlots;
}): string {
  return `Known so far:
${renderSlots(input.slots)}

Transcript:
"""
${renderTranscript(input.messages)}
"""

Fill every remaining slot now.`;
}

/* ------------------------- narrative over the numbers ------------------------- */

/**
 * Written *after* pricing, given the computed figures. The model explains the
 * estimate; it never produces it, so its output can never move the price.
 */
export const ESTIMATOR_NARRATIVE_PROMPT = `You are ZAC — ZACSOL's delivery lead explaining a cost estimate that has already been calculated.

You are given the project and the final numbers. Write:
- \`narrative\`: 2-4 sentences on what is actually driving this number for THIS project, and where the range would tighten after discovery. Reference their specifics, not generic advice. Do not restate the figures — the visitor can already see them.
- \`risks\`: 2-4 concrete things most likely to push this project toward the top of the range. Be candid and specific; vague risks are worthless.

Never contradict, recalculate, or re-quote the numbers you were given. No markdown. Return ONLY JSON.`;

export function buildNarrativePayload(input: {
  summary: string;
  projectType: string;
  platform: string;
  scope: string;
  timeline: string;
  scale: string;
  designState: string;
  integrations: number;
  regulated: boolean;
  low: number;
  high: number;
  durationWeeks: [number, number];
  team: string;
}): string {
  return `Project, in the visitor's words:
"""
${input.summary}
"""

Inputs: ${input.projectType} · ${input.platform} · ${input.scope} · ${input.timeline}
Scale: ${input.scale} · Design: ${input.designState} · Integrations: ${input.integrations} · Regulated data: ${input.regulated ? "yes" : "no"}

Calculated estimate (fixed — do not change):
- Range: $${Math.round(input.low).toLocaleString()} to $${Math.round(input.high).toLocaleString()}
- Duration: ${input.durationWeeks[0]}-${input.durationWeeks[1]} weeks
- Team: ${input.team}

Write the narrative and risks now.`;
}
