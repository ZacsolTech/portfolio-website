# Breakpoint strategy (Sprint 1)

Locked layout breakpoints for the ZACSOL site. Values live in `src/app/tokens.css` media queries.

| Token | Width | Role |
|-------|-------|------|
| `sm`  | 640px  | Single → 2-column grids; full-bleed console ends |
| `md`  | 768px  | 3-up card grids; 4-up stat strips |
| `lg`  | 1024px | Nav links visible; asymmetric section grids |
| `xl`  | 1280px | Sticky TOC; container max (`--container`) |

Gutter steps with viewport: `1rem` → `1.5rem` at `sm` → `2rem` at `lg`.

Prefer mobile-first `@media (min-width: …)` and compose from these four steps only.
