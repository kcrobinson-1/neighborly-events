# shared/masthead

Shared sticky event header bar rendered on every page of an event
that registers masthead content — the cross-app "global chrome" of
the Madrona redesign, usable by any future event.

- [`EventMasthead.tsx`](./EventMasthead.tsx) — the bar component.
  App-agnostic (no `'use client'`, no framework imports); navigation
  mechanism is injected per link via `linkComponents` because
  same-app vs cross-app differs by consumer. Renders inside a
  `<ThemeScope>` — colors and faces come from the per-event Theme
  tokens (`--header-bg`, `--header-fg`, `--accent`, `--font-heading`).
- [`mastheadContent.ts`](./mastheadContent.ts) — per-event registry
  (the `shared/events/completionCta.ts` pattern): slug →
  `EventMastheadContent`. Absent slugs render no bar, byte-identically
  to the pre-masthead output. Every link's `href` is config-owned;
  components never derive destinations from the slug.

Styling lives per app (`apps/site/app/styles/_masthead.scss`; apps/web
adds its own partial when the quiz app adopts the bar) under the
stable `event-masthead*` class names.

Consumers: apps/site madrona routes (landing, signup, feedback) via
`apps/site/components/event/SiteEventMasthead.tsx`; apps/web adoption
is tracked as its own slice.
