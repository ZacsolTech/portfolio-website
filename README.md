# ZACSOL website

Production marketing site for ZACSOL, an AI-powered software agency. Next.js 16
(App Router) with an embedded Payload CMS admin, two AI-assisted lead tools, and
a self-hosted booking calendar.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 + design tokens in `src/app/tokens.css` |
| Theming | `next-themes` on `data-theme`, with a flash-free inline script |
| CMS | Payload 3 (`/admin`) on Neon Postgres |
| AI | Google Gemini via `@google/genai`, with a deterministic rules-engine fallback |
| Sessions & rate limits | Upstash Redis (in-memory fallback in dev) |
| Email | Resend |
| Bot protection | Cloudflare Turnstile |
| Hosting | Vercel (cron via `vercel.json`) |

## Getting started

```bash
pnpm install
cp .env.example .env      # then fill in values — see "Environment" below
pnpm dev
```

Open <http://localhost:3000>. The first visit to `/admin` creates the admin user.

The site is designed to boot on a fresh clone with almost nothing configured:
content falls back to typed modules in `src/lib/content/`, AI falls back to the
rules engine, sessions fall back to an in-process map, and email is skipped
(leads are still captured). Missing keys degrade features rather than break the
build — see `.env.example` for what each one unlocks.

## Project structure

```
src/
  app/
    (frontend)/          Public site — pages and this app's API routes
      api/               Route handlers: forms, AI, booking, cron
    (payload)/           Payload admin + its generated API/GraphQL routes
    globals.css          Tailwind entry + component layer
    tokens.css           Design tokens (the single source of visual truth)
    zac.css              Styles for the ZAC assistant dock
  collections/           Payload collection schemas
  components/
    home/                Homepage sections
    layout/              Header, footer, shell, page hero
    shared/              Forms, wizards, cross-page widgets
    ui/                  Design-system primitives (Button, Card, Section, …)
    zac/                 AI assistant dock, provider and launcher
    theme/               Theme provider, no-flash script, toggle
    motion/ roadmap/ seo/
  lib/
    ai/                  Consultant: prompts, slots, streaming, rules engine
    estimator/           Cost estimator: pricing, prompts, session
    booking/             Availability, ICS invites, cancellation
    leads/               One lead schema and capture path for every surface
    notifications/       Channel registry + email templates
    content/             Typed content modules (services, industries, …)
    nurture/ security/ cron/ store/ zac/
  migrations/            Payload migrations
  payload.config.ts
docs/                    Subsystem documentation (start here, see below)
scripts/                 Node tooling (migration runner, offline AI eval)
public/                  Static assets — brand, project screenshots
```

Import with the `@/` alias, which maps to `src/`:

```ts
import { Button } from "@/components/ui";
import { services } from "@/lib/content";
```

### Where things live

- **Visual change?** `src/app/tokens.css` first — most of the design system is
  tokens, not component code. `/styleguide` renders every primitive.
- **New page?** `src/app/(frontend)/<route>/page.tsx`, composed from
  `@/components/ui` primitives.
- **New form or lead source?** Add it to `src/lib/leads/schema.ts` and call
  `captureLead` — every surface lands in one table. See `docs/LEADS.md`.
- **Content edit?** `src/lib/content/*`. `/admin` is for leads, bookings and
  other operational collections, not page copy.

## Environment

`.env.example` is the reference and documents every variable, including which
features go dark when one is unset. Required for a real deployment:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres |
| `PAYLOAD_SECRET` | Payload signing secret |
| `NEXT_PUBLIC_APP_URL` | Absolute links in email, OG images, sitemap |
| `GEMINI_API_KEY` | AI consultant and estimator |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Sessions and rate limits across instances |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bot protection on public forms |
| `CRON_SECRET` | Authorises the nurture cron; routes refuse to run without it |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage |
| `/services`, `/industries`, `/portfolio`, `/insights` | Content pages |
| `/about`, `/contact` | Company and enquiry |
| `/consultant` | AI Solution Consultant — describe a problem, get a roadmap |
| `/tools/estimator` | AI Cost Estimator — describe a build, get a price band |
| `/book` | Booking calendar (native, or Cal.com when `NEXT_PUBLIC_CAL_LINK` is set) |
| `/roadmap/[id]` | Generated consultant roadmap document |
| `/styleguide` | Design-system primitives (excluded from robots) |
| `/admin` | Payload CMS |

## Commands

```bash
pnpm dev               # dev server
pnpm build             # production build (runs typecheck)
pnpm start             # serve the production build
pnpm lint              # ESLint
pnpm generate:types    # regenerate src/payload-types.ts from collections
pnpm eval:consultant   # offline AI regression checks — no API key, no network
pnpm migrate --list    # Payload migrations (see docs/CMS.md for why not `payload migrate`)
```

## Documentation

| Doc | Covers |
|-----|--------|
| [`docs/CMS.md`](docs/CMS.md) | Payload collections and migrations |
| [`docs/CONSULTANT.md`](docs/CONSULTANT.md) | AI consultant architecture and prompts |
| [`docs/ESTIMATOR.md`](docs/ESTIMATOR.md) | Pricing engine and estimator flow |
| [`docs/LEADS.md`](docs/LEADS.md) | Lead schema, notifications, nurture, booking |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel setup, env, cron |
| [`docs/STAGING.md`](docs/STAGING.md) | Staging environment |
| [`docs/BREAKPOINTS.md`](docs/BREAKPOINTS.md) | Locked layout breakpoints |

## Conventions

- Prices, availability and blueprints are computed **server-side**. The client
  holds a session id and nothing price-bearing — a crafted request must never be
  able to mail itself a fabricated quote.
- Public form handlers validate with Zod, verify Turnstile, and treat a filled
  honeypot as a silent success so bots get no signal to tune against.
- Comments explain *why*, not *what*. Several document non-obvious decisions
  (Payload's `push: false`, Gemini model pinning) — read them before changing
  the code they sit on.
