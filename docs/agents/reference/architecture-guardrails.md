# Architecture Guardrails

**Mandatory pre-edit read** for any session whose diff surface
intersects `apps/web/`, `apps/site/`, `shared/`, `supabase/`, or
styling — see the pre-edit-gate routing in
[`workflows/implementation.md`](../workflows/implementation.md).
Despite living under `reference/`, this file is **not** an optional
lookup; the rules below bind before the first edit, not at PR-open
time.

## Architecture Guardrails

Respect the current split of responsibilities:

- Put visual and interaction changes in `apps/web/src`
- Keep shared styling tokens, mixins, and page/component styles in `apps/web/src/styles.scss` and `apps/web/src/styles/`
- Put quiz definitions, catalog, validation, and scoring changes in `shared/game-config.ts` and `shared/game-config/`
- Put trust, session, persistence, and entitlement logic in `supabase/functions` and `supabase/migrations`

Do not casually duplicate business rules across frontend and backend.

If quiz correctness, scoring, or answer validation changes, make sure the shared source of truth still drives both the UI and the backend completion path.

Do not treat the local browser-only completion fallback as production backend behavior.
Do not default to the local browser-only completion fallback when a remote Supabase integration run is feasible.

### Styling Token Discipline

Every styling token belongs to one of two buckets: **per-event brand
themable** (CSS custom property; overridable by a per-event `Theme`)
or **platform-shared structural** (SCSS variable; constant across
events). [`docs/styling.md`](/docs/styling.md) is the binding
classification — use it before adding or moving a token.

- **Themable.** Brand bases, brand-tied gradient stops and admin
  surfaces, brand typography, themable radii, and the brand-tied
  derived shades that follow them. Defined as CSS custom properties
  in `apps/web/src/styles/_tokens.scss`'s `:root` block (apps/web
  defaults), in `shared/styles/themes/platform.ts` (Sage Civic
  defaults consumed by apps/site's root layout), and overridable
  per-event via `<ThemeScope theme={…}>`. Consumed in SCSS as
  `var(--…)`. Brand-tied derived shades (`--primary-surface`,
  `--secondary-focus`, etc.) are computed in `:root` via
  `color-mix()` from the brand bases — they are not Theme fields and
  per-event themes do not override them directly; see `docs/styling.md`.
  A themable field may be **optional** with a centrally derived
  default (today: `--header-bg`, `--header-fg`, `--surface-band`,
  `--font-accent`) so existing themes render byte-identically without
  edits when vocabulary grows; the default-derivation contract lives
  in `docs/styling.md` "Optional brand fields".
- **Structural.** Status palette (`$color-success`, `$color-status-*`),
  neutral drop-shadow color, modal scrim, spacing scale, font
  weights, control sizes, motion timing, focus-ring metrics, pill
  radius, and composite shadow / focus recipes that combine
  structural metrics with themable color slots via `var(--…)`.
  Defined as `$…` SCSS variables in `apps/web/src/styles/_tokens.scss`.
  Consumed in SCSS as `$…`.

When you add or move a token:

- decide its bucket against the binding classification in
  `docs/styling.md`; classifying a token wrong silently weakens the
  brand-only skin model (themable status) or pulls platform contracts
  into the per-event surface (structural brand bases)
- add a new semantic token when a value is repeated, represents a
  reusable surface, state, interaction, or layout role, or should
  change consistently across multiple components
- name tokens by UI role or intent, such as `--primary-surface` or
  `$space-7`, rather than by vague appearance names; themable
  tokens use the flat `--token-name` convention (no `--theme-`
  prefix), structural tokens use `$token-name`
- keep one-off layout values local when a token would add indirection
  without improving readability or future change cost
- do not introduce broad token rewrites inside unrelated feature
  work; add a bounded checklist item when token cleanup is useful
  but not required for the feature
- for behavior-preserving token refactors, compare compiled CSS
  before and after when practical, in addition to running
  `npm run build:web`

## Cross-app navigation

When a contract specifies a navigation API
(`useRouter().replace`/`push` from `next/navigation`,
`<Link href>`, `history.pushState` / `replaceState`, react-router
`navigate(path)`, `window.location.replace`/`assign`), classify
each destination as **in-app** (served by the same SPA) or
**cross-app** (served by a different app behind a same-origin
proxy rule). Cross-app destinations need hard navigation
(`window.location.replace` / `assign`) so the upstream routing
layer (Vercel rewrites, CDN, ingress proxy) re-evaluates;
client-side navigation keeps the user inside the SPA and the proxy
never fires.

The full rule body — including the recurring traps from M2 phase
2.3 and the reverse case when a route migrates *out* of an SPA —
lives in [`planning/plan.md`](../planning/plan.md)
"Cross-app destinations need hard navigation, not client-side
navigation," because it binds at plan-drafting time when contracts
get specified. This pointer makes the constraint discoverable from
implementation time as well.
