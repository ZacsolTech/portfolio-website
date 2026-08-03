# Content layer (Sprint 3)

Payload CMS 3 is live against Neon Postgres. Static TypeScript modules in `lib/content/` remain as the fallback and seed source.

## Admin

1. Start the app: `pnpm dev`
2. Open [http://localhost:3000/admin](http://localhost:3000/admin)
3. Create the first admin user (email + password) on first visit
4. Edit Services, Industries, Portfolio, Insights, Team, Testimonials, FAQs, Media

## Seed

With the dev server running:

```bash
pnpm seed
# → POST http://localhost:3000/api/seed
```

In production, set `SEED_SECRET` and send header `x-seed-secret: <value>`.

## Collections

| Collection   | Source module                 | Drafts |
|--------------|-------------------------------|--------|
| Services     | `lib/content/services.ts`     | yes    |
| Industries   | `lib/content/industries.ts`   | yes    |
| Portfolio    | `lib/content/portfolio.ts`    | yes    |
| Insights     | `lib/content/insights.ts`     | yes    |
| Team         | `lib/content/team.ts`         | no     |
| Testimonials | `lib/content/testimonials.ts` | no     |
| Faqs         | `lib/content/faqs.ts`         | no     |
| Media        | uploads → `public/media`      | —      |
| Users        | admin auth                    | —      |

## Frontend data

Pages call `lib/cms.ts` helpers (`getServices`, `getPortfolioItem`, …). Flow:

1. Try Payload Local API
2. On failure / empty DB → fall back to `lib/content/*`

## Required env

```
DATABASE_URL=        # Neon connection string
PAYLOAD_SECRET=      # random 32+ chars (auto-generated locally)
GEMINI_API_KEY=      # Sprint 4 AI (health-checked at /api/health)
NEXT_PUBLIC_APP_URL=
```

Optional: `SEED_SECRET`, `GEMINI_PRO_MODEL`, `GEMINI_FLASH_MODEL`

## Health

`GET /api/health` → `{ ok, gemini, database, payload }` (booleans only).
