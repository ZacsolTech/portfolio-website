# Lead pipeline

Everything a visitor can do that produces a contactable person, and what happens
after they do it.

## The shape

Every surface produces the same record — the normalised lead from `PAGES.md`:

```ts
{ source, seed, answers, solution, contact, consent, utm }
```

Defined once in [`lib/leads/schema.ts`](../lib/leads/schema.ts), written once by
[`captureLead`](../lib/leads/capture.ts), stored in the `leads` collection.
Adding a surface means calling `captureLead` — not adding a column.

| Source | Where | Blocking? |
|---|---|---|
| `consultant` | Blur gate at the end of `/consultant` | Yes — the gate |
| `estimator` | Optional "send it to an engineer" on the result screen | No |
| `contact` | `/contact` | Yes |
| `booking` | `/book` | Yes |
| `newsletter` | Footer strip (stored in `subscribers`, not `leads`) | No |

Surface-specific fields go in `answers` (JSON). Anything price-bearing —
`solution`, `transcript`, `engine` — is filled **server-side from session state**,
never from the request body, so a crafted POST cannot file a fabricated quote.

### Merging

`captureLead` merges by email. Someone who runs the consultant and then books a
call is one lead with two touches (`touchCount`, `lastTouchChannel`), not two
rows. First touch wins on `channel` and on `utm` — a booking must not overwrite
the campaign that produced the original visit.

### Consent

Stored **per grant**, with the exact wording that was on screen:

```
consent.emailGranted / emailText / emailAt
consent.marketingGranted / marketingText / marketingAt
```

Two separate grants, never one bundled "I agree". When WhatsApp returns
(`TECH-STACK.md` §10) it gets its own third grant — that is a legal requirement,
not a preference.

### Attribution

First touch, captured in `sessionStorage` on the first page view by
[`AttributionTracker`](../components/shared/attribution-tracker.tsx). Not a
cookie and not `localStorage`: it dies with the tab and never leaves the origin,
which keeps it outside the consent banner.

## Notifications

`lib/notifications/` is a **channel registry**, not an email helper. Call sites
emit a semantic event; channels decide how to render it.

```ts
await notify(
  { type: "booking.confirmed", category: "transactional", name, booking, icsBase64 },
  { name, email },
);
```

| Event | Goes to | Category |
|---|---|---|
| `roadmap.delivered` | Lead | transactional |
| `booking.confirmed` | Lead (+ `.ics` attachment) | transactional |
| `booking.reminder` | Lead, 24h before | transactional |
| `booking.internal` | `LEADS_NOTIFY_EMAIL` | internal |
| `contact.received` | Lead | transactional |
| `contact.internal` | `LEADS_NOTIFY_EMAIL` | internal |
| `nurture.step` | Lead | marketing |

Two rules are enforced by the dispatcher rather than by call sites:

1. **Consent.** `marketing` events are dropped for a recipient without marketing
   consent. That is not something to trust six route handlers to remember.
2. **Never throw.** A failed send never fails the action that triggered it. The
   lead is already captured; a bounced email is ours to retry.

Adding WhatsApp is one new `NotificationChannel` in the registry. No route
handler changes.

## Follow-up sequence

Day 2 → case studies. Day 5 → booking nudge. Day 12 → one article, then it
stops. Copy lives in [`lib/nurture/sequence.ts`](../lib/nurture/sequence.ts).

Run by `GET /api/cron/nurture`, scheduled weekdays at 09:00 UTC in
[`vercel.json`](../vercel.json).

**It stops on all of these:**

| Trigger | Mechanism |
|---|---|
| Booking | `stopNurture()` from `/api/booking` |
| Unsubscribe | `/api/unsubscribe` — link in every footer, plus RFC 8058 one-click |
| A human picks it up | `afterChange` hook on `leads` when status → qualified / won / lost |
| Sequence finished | `nurtureStatus: "completed"` after day 12 |

The row is advanced **before** the send. Losing one follow-up to a timeout is a
non-event; sending day 5 three times is not.

> "Halted on reply" is implemented as *halted when a human moves the lead's
> status*. There is no inbound mail integration — a reply lands in the inbox and
> whoever handles it marks the lead Contacted or Qualified, which stops the
> sequence. If that ever needs to be automatic it wants Resend inbound webhooks,
> which is a separate piece of work.

## Bot protection

Cloudflare Turnstile on every public write endpoint: consultant gate, contact,
booking, estimator capture, newsletter. Plus an off-screen honeypot on each form
(a bot that fills it gets a **200**, so there is nothing to tune against) and
per-IP rate limits.

**Turnstile is skipped when the keys are absent**, with a warning logged once per
process. That keeps local development usable, and it means production without
`TURNSTILE_SECRET_KEY` is unprotected. Set both keys before launch.

If Cloudflare itself is unreachable, verification **allows** the request rather
than taking every form on the site down. Rate limits and the honeypot still cap
the damage.

## Booking

Two providers, chosen by one variable:

- **`NEXT_PUBLIC_CAL_LINK` set** → Cal.com owns scheduling entirely and the embed
  is rendered. Nothing below applies.
- **Unset (default)** → the built-in calendar. No third-party account needed.

The built-in path:

- Availability is generated from `BOOKING_*` office hours in
  [`lib/booking/availability.ts`](../lib/booking/availability.ts), minus anything
  already booked.
- Slots are offered as **UTC instants** and rendered in the *visitor's* timezone.
  A slot offered as 11:00 in Karachi is 08:00 in London; showing the wrong one is
  how a client misses a call.
- The submitted slot is **re-validated against freshly generated availability**,
  so a crafted request cannot book 03:00 on a Sunday.
- `bookings.slotKey` is **unique**. Two visitors clicking the same slot in the
  same second resolve to one booking and one honest "just taken" message.
  Cancelling suffixes the key rather than deleting the row, so the slot goes
  back on the market — a unique index on `startsAt` itself would have blocked
  that forever.
- Confirmation carries a real `.ics` (RFC 5545, CRLF, 75-octet folding, `VALARM`).
  Cancelling sends `METHOD:CANCEL`, which clears it from their calendar too.

### Rescheduling

The manage link goes to `/book?reschedule=<manageToken>`, which:

1. Prefills name, email, phone and topic from the existing booking — someone who
   followed that link from their own confirmation email has already told us all
   of it, and the token already identifies them.
2. Shows what is being moved, so nobody books a *second* consultation believing
   they moved the first.
3. On confirm, carries the old booking's `calendarUid` over and increments
   `sequence`. Same UID plus a higher SEQUENCE is exactly how RFC 5545 says "this
   meeting moved" — the attendee's calendar updates the existing entry instead of
   leaving a stale one next to the new one.
4. Releases the old slot **only after** the new row is safely stored. Cancelling
   first would cost them a slot and give nothing back if the insert failed.

`rescheduledFrom` keeps the audit trail.

Timezone conversion uses `Intl` rather than a date library — see the comment at
the top of `availability.ts` for why, and for the DST correctness argument.

## Shared roadmaps

`/roadmap/[id]` is keyed by a 192-bit token, not a row id: `/roadmap/47` would
let anyone walk every quote the site has issued.

- The blueprint is **frozen** into the row at mint time. Someone who forwards a
  roadmap to their board must be able to trust that the link still shows the
  numbers they forwarded.
- `noindex, nofollow, noarchive` and `force-dynamic`. These pages name an
  individual and a price; they must never be cached at a CDN or indexed.
- "Download PDF" is `window.print()` against print CSS. The page *is* the
  deliverable, so the export stays correct for free whenever the document changes
  — no second layout to drift, no headless browser in a serverless function.
- Set `revoked` on a roadmap to 404 the link without deleting the record.

## Where to look when something is wrong

| Symptom | Look at |
|---|---|
| Lead missing from admin | Logs for `[leads] PERSIST FAILED` — the full record is there |
| Email never arrived | `leads.emailStatus` / `emailError`; `bookings.confirmationStatus` |
| Sequence not sending | `nurtureStatus`, `nurtureNextAt`, `nurtureStoppedReason` |
| Cron silent | `CRON_SECRET` set? The routes 503 in production without it |
| Forms rejecting everyone | Turnstile keys mismatched between site and secret |
| No slots on `/book` | `BOOKING_MIN_NOTICE_HOURS` / `BOOKING_WORKING_DAYS` too strict |
