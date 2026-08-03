# AI Solution Consultant

Conversational intake → solution blueprint → blur gate → lead capture.

The visitor describes a problem in plain language. The consultant asks follow-ups
until it has five facts, then generates a scoped blueprint. Half the blueprint is
visible; the priced half is blurred behind an email gate.

## Routes

| Route | Role |
|-------|------|
| `/consultant` | Chat UI, blueprint, blur gate |
| `GET /api/consultant?sessionId=` | Restore an in-flight consultation |
| `POST /api/consultant` | `chat` (SSE), `blueprint`, `gate`, `reset` |

## Conversation model

State lives **server-side** (`lib/ai/session.ts`), keyed by an unguessable
session uuid held in the visitor's `sessionStorage`. The client sends only the
session id and the new message. It cannot supply transcript, slots or a
blueprint — otherwise a crafted request could forge assistant turns to steer the
model, skip the intake, or email itself a fabricated quote.

Redis (Upstash) when configured, in-process map otherwise. Sessions expire after
6 hours.

### Slots

Readiness is *"every required slot has a value"* — never a regex over what the
visitor typed.

| Slot | Meaning |
|------|---------|
| `problem` | What is broken or what they want built |
| `industry` | Business or sector |
| `current` | How the work happens today |
| `scale` | Roughly how many users |
| `timeline` | How soon they need it live |

`scale` and `timeline` multiply the quoted price, so they are guarded: the model
must return a **verbatim quote** from the visitor in `evidence` alongside the
value, and `verifyPricedSlots` drops the slot when the quote is not found in the
transcript. Without this, `gemini-3.1-flash-lite` reliably invents both from a
bare "yes" — an enum field makes a model want to pick *something*.

`problem` falls back to the visitor's first substantial message, since their own
words are a better blueprint seed than the model's paraphrase.

### Reaching the blueprint

Generation is never inferred from a conversational reply. It starts only when:

1. All slots are filled and the visitor clicks **Build my solution blueprint**
   (the recap shown alongside it lets them correct a wrong value first), or
2. The visitor explicitly asks — the model's own `wantsBlueprint`, supplemented
   by `isExplicitBlueprintRequest`, which requires a word like "blueprint" or
   "roadmap" that can never be an answer to a question, or
3. After six turns, an escape hatch offers to build with what is known.

> Historical note: a previous version matched `^(yes|ok|sure|…)` on both client
> and server, so answering "yes" to *"Is this handled manually?"* generated a
> blueprint from invented answers. `scripts/eval-consultant.ts` guards this.

## Models

`*-latest` aliases are **not** safe defaults. They float to the newest release,
and Google gives brand-new models a free-tier quota of 0–20 requests/day, so an
alias that worked last month starts returning 429 on every call with no code
change. Observed on this project's key:

| Model | Free-tier limit |
|-------|-----------------|
| `gemini-flash-latest` → `gemini-3.6-flash` | 20/day |
| `gemini-pro-latest` → `gemini-3.1-pro` | 0 |
| `gemini-2.5-flash`, `gemini-2.5-flash-lite` | 404, retired |
| `gemini-2.0-flash*`, `gemini-2.5-pro` | 0 |
| **`gemini-3.1-flash-lite`** | available — ~1.2s chat, ~3s blueprint |

Defaults are pinned to `gemini-3.1-flash-lite`. Re-check with
`GET https://generativelanguage.googleapis.com/v1beta/models` before changing
them, and override per environment once on a paid key.

Every call has a timeout, retries transient failures with backoff, and walks a
model ladder. Quota exhaustion moves to the next model immediately rather than
sleeping out a 34-second window. When every model fails, `rules-engine.ts`
produces a deterministic blueprint — a visitor always leaves with something
scoped, flagged in the UI as rules-sourced.

### Streaming

Chat turns stream over SSE. `responseSchema` pins `reply` first via
`propertyOrdering`, and `partial-json.ts` decodes that string as it arrives, so
text renders before the structured tail (slots, suggestions) lands. If a model
fails mid-reply, the server emits `reset` and the client clears the half-written
bubble before the next model starts.

## Blueprint

Cost and duration are always recomputed server-side from `applyMultipliers` —
the model proposes a base band for the scope, but scale and urgency pricing is a
business rule, not something the model improvises per visitor.

`stack` is constrained to `HOUSE_STACK` in the prompt **and** filtered by
`sanitizeStack`, which strips competitor vendors. Prompt guidance alone is not
enough: the model recommended "OpenAI GPT-4o" inside ZACSOL's own stack during
testing, and the stack list goes straight to a prospective client.

## Blur gate

`BlueprintTeaser` stays sharp — title, rationale, project type, duration, team —
so the visitor can see the recommendation is real and specific to them.
`BlueprintDetail` is veiled: investment band, features, stack, phased timeline,
assumptions, risks. Blurring the whole document gives them nothing to want.

The veiled block is capped at `34rem` so the gate panel is on screen without
scrolling past a wall of blur, and is `inert` so its content stays out of tab
order and the accessibility tree while locked.

## Lead capture

On submit: persist the lead, respond, then send the email via `after()`. The
first Resend call from a cold instance takes ~11s on DNS and the TLS handshake
(warm calls are ~600ms), so delivery must not block the response. The deferred
callback writes the outcome back to `emailStatus`.

The emailed blueprint is the one on the session, never one posted by the client.

Leads land in the `leads` Payload collection (`create: () => false` — the server
route is the only writer). If persistence fails, the full record is logged for
manual recovery.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Recommended | Without it, the rules engine serves everything |
| `GEMINI_CHAT_MODEL` / `GEMINI_BLUEPRINT_MODEL` | Optional | Override the ladder head |
| `GEMINI_CHAT_TIMEOUT_MS` / `GEMINI_BLUEPRINT_TIMEOUT_MS` | Optional | Default 20s / 35s |
| `UPSTASH_REDIS_REST_*` | Production | Sessions + rate limits; memory fallback otherwise |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Production | Blueprint delivery; skipped when unset |
| `RESEND_REPLY_TO` | Optional | Reply-to on the blueprint email |
| `DATABASE_URL` | Production | Lead storage |
| `NEXT_PUBLIC_APP_URL` | Yes for deploy | Absolute links in the email |

## Rate limits

Dual-key: IP (150/day) guards against one abuser, session guards the expensive
path — 60 chat turns/hour, 5 blueprints/hour, 5 gate submits/hour. `getClientIp`
prefers platform headers (`cf-connecting-ip`, `x-real-ip`) over caller-controlled
`x-forwarded-for`. A Redis outage falls back to in-memory rather than blocking
legitimate visitors.

## Quality

```bash
pnpm eval:consultant
```

90 offline checks — no API key, no network. Covers rules-engine archetypes,
blueprint intent (including the "yes" regression), slot normalization and merge
semantics, the completeness gate, the streaming decoder, and the rules fallback.

Prompt versions: `consultant-chat-v3`, `consultant-blueprint-v2`.
