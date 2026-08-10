# Project Cost Estimator

Conversational intake → deterministic price → adjustable assumptions.

**Free and ungated.** No email capture, no lead gate, nothing blurred. The
visitor gets the whole estimate the moment it exists. (The consultant's
blur-gate is deliberately *not* reused here.)

## Routes

| Route | Role |
|-------|------|
| `/tools/estimator` | Chat UI, estimate, cost levers |
| `GET /api/estimator?sessionId=` | Restore an in-flight session |
| `POST /api/estimator` | `chat` (SSE), `estimate`, `adjust`, `reset` |

## Why the model doesn't set the price

The consultant answers *"what should we build?"*; the estimator answers
*"what will it cost?"*. That difference drives the architecture.

`src/lib/estimator/pricing.ts` computes every figure. The model runs the
conversation and writes the narrative, and is explicitly forbidden from
quoting a number in chat. This is not caution for its own sake:

- **Reproducible.** The same answers always produce the same quote. A visitor
  who returns, or a salesperson who re-runs it, sees the same figure.
- **Defensible.** Each multiplier is named in the output, so a client who
  pushes back can be walked through the arithmetic line by line.
- **Testable.** `pnpm eval:consultant` asserts monotonicity and sane bounds. A
  model improvising prices per visitor could not be regression-tested at all.

Prose is generated *after* pricing, given the final numbers, and told not to
recalculate them. If that call fails the estimate stands on its own — the
narrative is presentation, not substance.

### The model

```
effort  = base[projectType]
        × scope × platform × scale × regulated × design
        + integrations × 1.2 weeks
cost    = effort × blendedRate × timelineRush
band    = cost ± (0.15 + (1 − confidence) × 0.22)
```

Calendar duration is derived separately — adding people shortens a project
sub-linearly, so effort is divided by team size with a 1.25 coordination
factor and a per-scope floor. Discovery and release cycles take calendar time
however many engineers are on the job.

Blended rate defaults to **$4,000 per person-week**; override with
`ESTIMATOR_WEEKLY_RATE_USD`.

### Confidence

Starts at 1.0 and falls 0.11 for each refinement the visitor never confirmed,
plus 0.1 for a thin description. Lower confidence widens the band, so an
estimate built mostly on defaults visibly looks like one:

| | Band | Label |
|---|---|---|
| All inputs confirmed | ±15% | Reasonably firm |
| Some assumed | ±22% | Directional |
| Mostly defaults | ±30% | Indicative |

## Conversation

Five slots must be established: `summary`, `projectType`, `platform`, `scope`,
`timeline`. State is server-side (`src/lib/estimator/session.ts`) — the client
sends only a session id and a message, so no payload can bend the price.

Four more (`scale`, `designState`, `integrations`, `regulated`) are **never
blocking questions**. They default to the common case, are listed in the output
as assumed, and appear as levers the visitor can change. Getting to a number in
four turns beats an eight-question interrogation.

### Slot backfill

The model reliably answers in prose and forgets to write the value into
`slots` — "web mainly, but staff use tablets" was acknowledged and then asked
again three turns running, leaving intake stuck at 40%. `inferEstimatorSlots`
backfills the enum slots by keyword when a required one is still missing.

This is safe here in a way it would not be for a hidden field: inference fires
only on explicit keywords, and the result screen shows exactly what was priced
with levers to correct it. A visible approximate value beats an invisible loop.

### Reaching the estimate

Never inferred from a conversational reply:

1. All five slots filled → **Show me the numbers**, or
2. An explicit ask — the model's `wantsEstimate`, supplemented by
   `isExplicitEstimateRequest`, which needs a word like "cost" or "ballpark"
   that can never be an answer to a question, or
3. After four turns, an escape hatch prices it with defaults.

A bare "yes" or "ok" is an answer, never a request. Guarded by the eval suite.

## Levers

The result screen re-prices in the browser by calling the **same**
`priceProject` function the server runs, seeded with the server's
`blendedRateUsd` — `ESTIMATOR_WEEKLY_RATE_USD` is server-only, so a client
falling back to the default would silently disagree with the server. Positions
persist via a debounced `adjust` call so a reload keeps the adjusted figure.

There is deliberately no second copy of the pricing rules for the UI.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Recommended | Without it, keyword intake still reaches an estimate |
| `ESTIMATOR_WEEKLY_RATE_USD` | Optional | Blended person-week rate, default 4000 |
| `UPSTASH_REDIS_REST_*` | Production | Session storage; memory fallback otherwise |

Model selection, timeouts, retries and the fallback ladder are shared with the
consultant — see [CONSULTANT.md](./CONSULTANT.md#models). The `*-latest` alias
trap applies here too.

## Rate limits

Shares the consultant's limiter under an `estimator:` key prefix, so the two
tools cannot exhaust each other's budget. `adjust` is pure arithmetic with no
model call and returns immediately.

## Quality

```bash
pnpm eval:consultant
```

Estimator coverage: intent detection, keyword inference, breakdown shares
summing to exactly 1, line items reconciling with the total, determinism,
lever monotonicity (every upgrade must raise the price, build-ready designs
must lower it), confidence widening the band, and sanity bounds catching a
multiplier typo before it quotes someone absurdly.
