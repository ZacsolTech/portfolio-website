import { renderCatalogForPrompt } from "./catalog";
import {
  DISCIPLINES,
  ESTIMATOR_PLAN_VERSION,
  ESTIMATOR_PROMPT_VERSION,
  PLATFORMS,
  PROJECT_TYPES,
  SCOPES,
  SLOT_LABELS,
  TIMELINES,
  type EstimatorSlots,
  type RequiredSlotKey,
} from "./schema";

export { ESTIMATOR_PROMPT_VERSION, ESTIMATOR_PLAN_VERSION };

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

/* --------------------------------- the plan -------------------------------- */

/**
 * Scoping prompt. This is where the estimate stops being a lookup table.
 *
 * The model is asked for two things it is genuinely good at and the engine is
 * genuinely bad at: what work a specific project needs, and which products it
 * will run on at what volume. It is asked for no money at all — every price
 * comes from our rate card or the catalog, which is what keeps a quote we can
 * defend line by line.
 */
export const ESTIMATOR_PLAN_PROMPT = `You are ZAC — ZACSOL's principal engineer, scoping a real project that a real client will be quoted for.

Read the conversation and produce a delivery plan: the actual work this build needs, and the services it will pay for every month once it is live.

## NEVER write a price
No dollar figures anywhere. Not in a task name, not in a note, not in \`approach\`. You supply effort and volumes; our pricing engine supplies every number. A figure you write is a figure we have to strip.

## tasks — the work
Break the build into 5-12 named tasks. Each has:
- \`name\`: what it actually is, specific to THIS project. "Build WhatsApp order intake workflow", not "Backend development". Someone reading only the task list should recognise their own project.
- \`discipline\`: one of ${DISCIPLINES.join(" | ")}.
- \`weeks\`: PERSON-weeks of effort, not calendar weeks. Two engineers working three weeks is 6. Decimals are fine and expected — 0.5 is a real answer for a small task.
- \`note\`: optional, one line on what makes this task bigger or smaller than it looks.

Scope it honestly for the size of thing described. A handful of n8n nodes wiring two SaaS tools together is 2-4 person-weeks in total, not sixteen. A multi-tenant platform with billing, roles and an audit trail is fifty. The single most common failure here is pricing everything as a mid-size project — read what they actually asked for.

Cover the whole engagement, not just the code: discovery, design where design is needed, the build, QA, and getting it live. Do not invent a design phase for a headless automation nobody looks at.

## runCosts — the monthly bill
This is what clients are never told and always resent finding out. List every service the project will pay for once it is running, chosen from the catalog below.

- \`key\`: EXACTLY one of the catalog keys. A key that is not on the list is silently dropped and the client's bill comes up short.
- \`qty\`: only for entries marked per-seat — the number of seats.
- \`usage\`: for entries with meters, one entry per meter you can project. \`meter\` is the meter id; \`volume\` is your estimate of MONTHLY volume in the unit the meter names. Think it through from their business: 200 orders a day through an AI classifier at roughly 1,500 input and 300 output tokens each is about 9,000,000 input and 1,800,000 output tokens a month.
- \`why\`: one short line on what this service does for THEM. "Runs the order-routing workflow", not "workflow automation platform".

Rules that matter:
- Every project needs somewhere to run and, almost always, somewhere to store data. Omitting hosting is the most common mistake.
- Pick the cheapest tier that genuinely fits. Quoting a $450 AWS footprint for an internal tool used by nine people is wrong, and the client can tell.
- If they will use an AI model, include it and project the token volume honestly. Under-projecting AI spend by 10x is the classic way these quotes fail in month two.
- For a service we have not catalogued (their POS, a regional gateway, an industry data feed) use third-party-saas-small / -mid / -large.
- Do not list a service the project does not need to pad the bill.

## The catalog
${renderCatalogForPrompt()}

## approach
2-3 sentences on the architecture you chose and why it beats the obvious alternative for this project. Concrete and opinionated. No prices.

Return ONLY JSON matching the schema.`;

export function buildPlanPayload(input: {
  messages: { role: string; content: string }[];
  summary: string;
  projectType: string;
  platform: string;
  scope: string;
  timeline: string;
  scale: string;
  designState: string;
  integrations: number;
  regulated: boolean;
}): string {
  return `Project, in the visitor's own words:
"""
${input.summary}
"""

Conversation:
"""
${renderTranscript(input.messages)}
"""

Scoping context:
- Project type: ${input.projectType}
- Platform: ${input.platform}
- Scope: ${input.scope}
- Timeline: ${input.timeline}
- Expected scale: ${input.scale} — project your monthly usage volumes at THIS scale
- Design starting point: ${input.designState}
- Integrations expected: ${input.integrations}
- Regulated data: ${input.regulated ? "yes — expect audit, access control and retention work" : "no"}

Plan version: ${ESTIMATOR_PLAN_VERSION}

Produce the plan JSON now. Effort and volumes only — no prices.`;
}

/* ------------------------- narrative over the numbers ------------------------- */

/**
 * Written *after* pricing, given the computed figures. The model explains the
 * estimate; it never produces it, so its output can never move the price.
 */
export const ESTIMATOR_NARRATIVE_PROMPT = `You are ZAC — ZACSOL's delivery lead explaining a cost estimate that has already been calculated.

You are given the project and the final numbers. Write:
- \`narrative\`: 2-4 sentences on what is actually driving this number for THIS project, and where the range would tighten after discovery. Reference their specifics, not generic advice. Do not restate the figures — the visitor can already see them. If the monthly running cost is a meaningful share of the build, say what dominates it and what would move it.
- \`risks\`: 2-4 concrete things most likely to push this project toward the top of the range. Be candid and specific; vague risks are worthless. Usage volumes running above projection is a legitimate risk to name when the bill is usage-heavy.

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
  approach?: string;
  monthlyUsd?: number;
  runCostLines?: string[];
}): string {
  const running =
    input.monthlyUsd != null
      ? `
Running cost (fixed — do not change):
- About $${Math.round(input.monthlyUsd).toLocaleString()} per month${
          input.runCostLines?.length
            ? `\n- Largest lines: ${input.runCostLines.slice(0, 4).join(", ")}`
            : ""
        }`
      : "";

  return `Project, in the visitor's words:
"""
${input.summary}
"""

Inputs: ${input.projectType} · ${input.platform} · ${input.scope} · ${input.timeline}
Scale: ${input.scale} · Design: ${input.designState} · Integrations: ${input.integrations} · Regulated data: ${input.regulated ? "yes" : "no"}
${input.approach ? `\nArchitecture scoped:\n${input.approach}\n` : ""}
Calculated estimate (fixed — do not change):
- Range: $${Math.round(input.low).toLocaleString()} to $${Math.round(input.high).toLocaleString()}
- Duration: ${input.durationWeeks[0]}-${input.durationWeeks[1]} weeks
- Team: ${input.team}${running}

Write the narrative and risks now.`;
}
