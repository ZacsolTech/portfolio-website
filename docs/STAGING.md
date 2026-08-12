# Staging environment

Sprint 5 deliverable: a place to run UAT that is not production and is not
someone's laptop.

## What staging is

The Vercel **Preview** environment on a long-lived `staging` branch, with its own
database and its own credentials for every third party. Preview deploys per PR
already exist; staging is the one that stays up, holds real-shaped content, and
is the URL the client is asked to sign off against in Sprint 7.

## Why a separate database is non-negotiable

`DEPLOYMENT.md` records that this schema has never been managed by migrations —
every table was created by Payload's dev-mode auto-push against the Neon database
in `.env`, and production points at that same database.

That is survivable for production alone. It is not survivable once a second
environment exists: UAT means people creating test leads, test bookings and test
roadmaps, and those would land in the same table as real ones. **Staging gets its
own Neon branch.**

Neon branches are cheap and instant, and a branch starts as a copy, so staging
begins with the real content and none of the risk:

```bash
# In the Neon console, or with the CLI:
neonctl branches create --name staging --parent main
```

Take the pooled connection string from the new branch and set it as
`DATABASE_URL` on the Preview environment only.

## Environment variables

Scope every value to **Preview** in Vercel. Anything shared with production is a
way for a UAT click to reach a real customer.

| Variable | Staging value |
|---|---|
| `DATABASE_URL` | Neon `staging` branch — **never** the production branch |
| `NEXT_PUBLIC_APP_URL` | The staging URL. Wrong value = every email links to the wrong host |
| `PAYLOAD_SECRET` | Its own value. A shared secret means a staging session is valid in production |
| `RESEND_API_KEY` | Its own key, so staging sends are separable in the Resend dashboard |
| `RESEND_FROM_EMAIL` | A subdomain sender, e.g. `staging@mail.zacsol.tech` — a staging bounce must not damage the production domain's reputation |
| `LEADS_NOTIFY_EMAIL` | A team address, not the real sales inbox |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Its own Upstash database. Sharing means staging traffic burns production rate-limit budget |
| `GEMINI_API_KEY` | Can be shared; watch the shared quota |
| `TURNSTILE_*` | Cloudflare's **testing keys** (always-pass), so UAT is not blocked by a challenge |
| `CRON_SECRET` | Its own value |
| `BOOKING_*` | Same as production, so what is signed off is what ships |
| `NEXT_PUBLIC_CAL_LINK` | Unset, or a Cal.com test event type — do not point it at the real calendar |

## Crons on staging

`vercel.json` crons run on **production deployments only**. Staging therefore
never sends a nurture email on its own, which is the behaviour you
want — a UAT lead should not start receiving a sequence.

To exercise it deliberately:

```bash
curl -H "Authorization: Bearer $STAGING_CRON_SECRET" \
  https://staging.zacsol.tech/api/cron/nurture
```

It returns a JSON summary (`due`, `sent`, `failed`) rather than an empty 200, so
a run that did nothing is distinguishable from a run that failed.

## Standing it up

1. Create the `staging` branch and push it.
2. In Vercel → Settings → Git, set the Preview branch to track `staging`.
3. Create the Neon branch and set `DATABASE_URL` on Preview.
4. Set every variable in the table above, scoped to Preview.
5. Verify a Payload user exists on the staging database — it is a fresh copy, so
   an admin login must be created if the branch predates one.
6. Deploy and run the smoke test below.

## Staging smoke test

The point of staging is that nothing degrades *silently*. Every item below fails
quietly in a misconfigured environment.

- [ ] `/admin` — log in, Leads / Roadmaps / Bookings collections all present
- [ ] `/consultant` — reply streams word by word; the line above the blueprint
      reads "Scoped by ZAC from your conversation", not "from our
      delivered-project patterns" (that means Gemini is unreachable)
- [ ] Submit the gate — lead appears in admin with `emailStatus: sent`, and a
      roadmap link appears on the success panel
- [ ] Open the roadmap link — document renders, print preview is clean, page is
      `noindex`
- [ ] Blueprint email arrives; **"Book 30 minutes" points at the staging host**,
      not `localhost`
- [ ] `/book` — real slots load, shown in your own timezone
- [ ] Book one — confirmation arrives with a `.ics` that opens in a calendar app
- [ ] Booking appears in admin; the matching lead's `nurtureStatus` is `stopped`
- [ ] Open the manage link, cancel — the slot returns to `/book` and a
      `METHOD:CANCEL` update arrives
- [ ] `/contact` — acknowledgement to the sender, alert to `LEADS_NOTIFY_EMAIL`
- [ ] `/tools/estimator` — estimate appears, a lever changes the number, the
      optional capture stores a lead with source `estimator`
- [ ] Trigger `/api/cron/nurture` by hand — a lead advances one step
- [ ] Click the unsubscribe link — sequence stops, `nurtureStoppedReason` is set
- [ ] Every form: submit with the Turnstile widget removed via devtools; the
      server must reject it once real keys are set

## Promoting to production

Trunk-based: merge `staging` into `main`. The only thing that must be checked by
hand is that **no staging value leaked into the Production scope** in Vercel —
particularly `DATABASE_URL` and `NEXT_PUBLIC_APP_URL`.
