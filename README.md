# ZACSOL website

Next.js 16 (App Router) production site for ZACSOL — AI-powered software agency.

## Stack

- Next.js 16 · TypeScript · Tailwind CSS v4
- Design tokens in `app/tokens.css`
- `next-themes` with `data-theme` (flash-free inline script)
- Space Grotesk + JetBrains Mono via `next/font`
- Content: typed modules in `lib/content/` (Payload when Neon is ready — see `docs/CMS.md`)

## Develop

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage (teaser sections) |
| `/styleguide` | Design system primitives |
| `/admin` | Payload CMS admin |
| `/services`, `/portfolio`, `/industries`, `/insights` | Content-driven pages |
| `/consultant` | AI Solution Consultant (UI shell — AI in Sprint 4) |
| `/api/health` | Env readiness check |
| `/api/seed` | Seed CMS from `lib/content` (dev) |

## Content / CMS

See `docs/CMS.md`. Seed with `pnpm seed` while `pnpm dev` is running. First visit to `/admin` creates the admin user.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm seed
pnpm lint
```

## Notes

- WhatsApp surfaces are deferred (TECH-STACK §10). Email only.
- Breakpoints: `docs/BREAKPOINTS.md`
- Env template: `.env.example`
