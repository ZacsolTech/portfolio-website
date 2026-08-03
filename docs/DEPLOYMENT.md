# Deployment checklist

Everything that must be true before the AI tools work in production. Both fail
*quietly* if misconfigured — visitors still see a working page, so nothing
alerts you.

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

## 2. Database

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

Both tools degrade silently, so check them rather than assuming.

**Consultant** — `/consultant`
1. Send a message. The reply should stream in word by word.
2. The line above the blueprint should read *"Scoped by AI from your
   conversation"*. If it says *"Scoped from our delivered-project patterns"*,
   Gemini is unreachable — check `GEMINI_API_KEY` and model quota.
3. Submit the gate. The email must arrive, and its "Book 30 minutes" button
   must point at your real domain, not `localhost`.
4. Confirm the lead appears in `/admin` under Leads with `emailStatus: sent`.

**Estimator** — `/tools/estimator`
1. Describe a project; intake should reach 100% without repeating questions.
2. The estimate should appear with a cost breakdown.
3. Move a lever (e.g. regulated data) — the number must change immediately.
4. Reload: the adjusted estimate should still be there.

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

`/api/consultant` and `/api/estimator` are public, unauthenticated, and spend
money per call. Rate limits (150/IP/day, 5 blueprints and 5 estimates per
session per hour) cap the damage, but there is **no bot protection**.
`TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are stubbed in
`.env.example` if you want it before a public launch.

## Pre-push checks

```bash
npx tsc --noEmit        # types
npx eslint .            # lint — must be clean
pnpm eval:consultant    # 132 offline checks, no API key needed
npx next build          # production build
```
