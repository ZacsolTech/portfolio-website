# Deployment checklist

Everything that must be true before the site works in production. Almost all of
it fails *quietly* if misconfigured — visitors still see a working page, so
nothing alerts you.

See also [LEADS.md](./LEADS.md) for how the lead pipeline fits together, and
[STAGING.md](./STAGING.md) for standing up a pre-production environment.

## 1. Environment variables on the host

| Variable | If missing / wrong |
|----------|--------------------|
| `NEXT_PUBLIC_APP_URL` | **Every link in the blueprint email points at `localhost`.** Recipients get "connection refused". Also breaks canonical URLs, OG tags and the sitemap. Must be the real origin, e.g. `https://zacsol.com` |
| `RESEND_FROM_EMAIL` | Blueprint delivery is skipped. `onboarding@resend.dev` only delivers to the Resend account owner — it is a testing sender, not a production one. Needs a verified domain |
| `RESEND_API_KEY` | Same: delivery skipped. The lead is still captured and logged |
| `GEMINI_API_KEY` | Both tools silently fall back to their deterministic engines. Visitors get canned replies, not a conversation |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Sessions fall back to in-process memory. Serverless instances do not share memory, so a visitor whose second request lands on a different instance loses the conversation. **Effectively required in production** |
| `DATABASE_URL` | Leads are not stored (they are logged for manual recovery) |
| `PAYLOAD_SECRET` | Admin auth breaks |
| `ESTIMATOR_WEEKLY_RATE_USD` | Optional. Defaults to 4000 — every estimator figure scales off it |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **Bot protection is OFF.** Verification is skipped and a warning is logged once per process. Both keys are required together |
| `CRON_SECRET` | The nurture cron **refuses to run** (503). No lead follow-ups |
| `LEADS_NOTIFY_EMAIL` | New-lead and new-booking alerts fall back to `RESEND_REPLY_TO`; with neither, nobody is told a lead arrived |
| `BOOKING_TIMEZONE` and friends | Optional. Defaults are Mon–Fri, 09:30–16:30 Asia/Karachi, 30 min, 12h notice, 28-day horizon |
| `NEXT_PUBLIC_CAL_LINK` | Optional. Set it to hand scheduling to Cal.com; unset uses the built-in calendar |

## 2. Database

> **Sprint 5 adds schema changes**: new `roadmaps` and `bookings`
> collections, and new columns on `leads` (`channel`, `phone`, `company`, `seed`,
> `answers`, `consent.*`, `utm.*`, `nurture*`, `touchCount`, `owner`, `roadmap`).
> Nothing is renamed or dropped — the existing `source` column keeps its
> gemini/rules meaning and the new acquisition source is `channel` — so no data
> is at risk. But **the tables must exist before a gate submission or a booking
> can persist.**
>
> Run `pnpm dev` once against the target database to let Payload's auto-push
> create them, then confirm in `/admin` that Roadmaps and Bookings appear.
> Auto-push does not run outside development, so if production points at a
> database that has never seen a dev boot, baseline it with migrations first.

The schema in this project has **never been managed by migrations**.
`payload_migrations` holds a single `dev` row: every table was created by
Payload's dev-mode auto-push against the Neon database in `.env`.

That is fine as long as **production uses the same `DATABASE_URL`** — the
`leads` table already exists there. Confirm the host matches before deploying:

```
ep-rapid-darkness-az8gm1tz-pooler.c-3.ap-southeast-1.aws.neon.tech
```

If production points at a *different* database, `leads` will not exist there.
`@payloadcms/db-postgres` does not auto-push outside development, so gate
submissions would fail to persist (they are logged, never lost, but not
stored). In that case baseline the schema with migrations before deploying.

Adopting migrations properly is a project-wide task — it needs a baseline
covering all existing collections, not just `leads`.

## 3. Verify after deploy

Every one of these degrades silently, so check them rather than assuming.

**Consultant** — `/consultant`
1. Send a message. The reply should stream in word by word.
2. The line above the blueprint should read *"Scoped by ZAC from your
   conversation"*. If it says *"Scoped from our delivered-project patterns"*,
   Gemini is unreachable — check `GEMINI_API_KEY` and model quota.
3. Submit the gate. The email must arrive, and its "Book 30 minutes" button
   must point at your real domain, not `localhost`.
4. Confirm the lead appears in `/admin` under Leads with `emailStatus: sent`.
5. The success panel offers a roadmap link — open it. The document must render,
   print cleanly, and be `noindex`.

**Estimator** — `/tools/estimator`
1. Describe a project; intake should reach 100% without repeating questions.
2. The estimate should appear with a cost breakdown.
3. Move a lever (e.g. regulated data) — the number must change immediately.
4. Reload: the adjusted estimate should still be there.
5. "Send it to an engineer" stores a lead with source `estimator`.

**Booking** — `/book`
1. Real slots load, rendered in *your* timezone (not the agency's).
2. Book one. The confirmation must carry a `.ics` that opens in a calendar app.
3. The booking appears in `/admin`, and the matching lead's `nurtureStatus`
   flips to `stopped` — a booked call ends the sequence.
4. Open the manage link and cancel: the slot returns to `/book`, and a
   `METHOD:CANCEL` update arrives.
5. Book again, then use "Pick a different time" from the manage link. The form
   must arrive prefilled, the old slot must be released, and the updated invite
   must **move** the existing calendar entry rather than adding a second one.

**Contact** — `/contact`
1. Submit. The sender gets an acknowledgement, `LEADS_NOTIFY_EMAIL` gets an alert.
2. The lead lands in `/admin` with its consent wording and UTM attribution stored.

**Crons** — after deploy, trigger the nurture job by hand and read the JSON summary:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://zacsol.com/api/cron/nurture
```

## 4. Model quota

The single most likely cause of "the AI stopped working". Gemini's `*-latest`
aliases float to new releases that ship with a free-tier quota of 0–20
requests/day. Defaults are pinned to `gemini-3.1-flash-lite` for this reason.

Check what a model actually resolves to and whether it has quota:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

A 429 with `limit: 0` means that model has no free-tier allowance — pick
another or move to a paid key. See [CONSULTANT.md](./CONSULTANT.md#models).

## 5. Abuse surface

Every public write endpoint — `/api/consultant`, `/api/estimator`,
`/api/contact`, `/api/booking`, `/api/subscribe` — is unauthenticated and costs
something per call: a Gemini call, a Resend send, or a database row.

Three layers cap the damage:

1. **Rate limits.** 150/IP/day on the AI tools, 5 blueprints and 5 estimates per
   session per hour, 5/hour per IP on contact and booking.
2. **Honeypots.** Every form carries an off-screen field. A bot that fills it
   gets a **200** — no signal to tune against.
3. **Turnstile.** Only if both keys are set. **Without them verification is
   skipped**, and the only warning is one log line per process. Set them before
   a public launch.

`/api/cron/*` refuses to run in production without `CRON_SECRET`, so the
follow-up sequence cannot be triggered by anyone who finds the URL.

## Pre-push checks

```bash
npx tsc --noEmit        # types
npx eslint .            # lint — must be clean
pnpm eval:consultant    # 132 offline checks, no API key needed
npx next build          # production build
```
