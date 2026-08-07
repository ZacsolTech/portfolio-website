# Content layer (Sprint 3)

Payload CMS 3 is live against Neon Postgres. Most marketing content is now
code-only in `lib/content/`. Insights remain CMS-backed (with a static fallback).

## Admin

1. Start the app: `pnpm dev`
2. Open [http://localhost:3000/admin](http://localhost:3000/admin)
3. Create the first admin user (email + password) on first visit
4. Edit Insights, Media, and Sales collections (Leads, Bookings, Roadmaps, Subscribers)

## Seed

With the dev server running:

```bash
pnpm seed
# → POST http://localhost:3000/api/seed
```

Seeds **Insights** only. In production, set `SEED_SECRET` and send header `x-seed-secret: <value>`.

## Migrations

`pnpm payload migrate` fails on Node 24 in this repo
(`ERR_REQUIRE_ASYNC_MODULE` from `@payloadcms/richtext-lexical` top-level await
when the CLI `require()`s `payload.config.ts`). Use the direct SQL runner instead:

```bash
pnpm run migrate -- --list
pnpm run migrate -- <migration-name> --check
pnpm run migrate -- <migration-name> --apply
```

That writes the same SQL as `migrations/*.ts` and records a row in
`payload_migrations`.

## Collections

| Collection   | Source module                 | Drafts |
|--------------|-------------------------------|--------|
| Insights     | `lib/content/insights.ts`     | yes    |
| Media        | uploads → `public/media`      | —      |
| Users        | admin auth                    | —      |
| Leads        | runtime capture               | —      |
| Bookings     | runtime capture               | —      |
| Roadmaps     | runtime capture               | —      |
| Subscribers  | runtime capture               | —      |

Code-only (not in CMS): `lib/content/services.ts`, `lib/content/industries.ts`, `lib/content/portfolio.ts`, `lib/content/faqs.ts`, `lib/content/testimonials.ts`, `lib/content/team.ts`, `lib/content/site.ts`, `lib/content/zac.ts`.

## Frontend data

Insights pages call `lib/cms.ts` helpers (`getInsight`, `getInsights`). Flow:

1. Try Payload Local API
2. On failure / empty DB → fall back to `lib/content/insights.ts`

Services, industries, portfolio, FAQs, testimonials and team are imported directly from `lib/content/*`.

## Draft preview

Insights support **drafts** + **autosave**.

1. Set `PREVIEW_SECRET` in `.env` (see `.env.example`)
2. In `/admin`, open a document → click **Preview** (or open Live Preview)
3. That hits `/api/preview`, turns on Next.js Draft Mode, and shows unpublished content on the real page
4. A gold **Draft preview** bar appears at the top — use **Exit preview** when done

Frontend queries pass `draft: true` only while Draft Mode is enabled, so anonymous visitors never see unpublished content.

## Required env

```
DATABASE_URL=        # Neon connection string
PAYLOAD_SECRET=      # random 32+ chars
PREVIEW_SECRET=      # Draft / Live Preview (admin Preview button)
GEMINI_API_KEY=      # Sprint 4 AI (health-checked at /api/health)
NEXT_PUBLIC_APP_URL=
```

Optional: `SEED_SECRET`, `GEMINI_PRO_MODEL`, `GEMINI_FLASH_MODEL`

## Health

`GET /api/health` → `{ ok, gemini, database, payload }` (booleans only).
