# M3 Phase 3.1.2 — Scoping

## Status

Transient scoping artifact for M3 phase 3.1.2 ("og:image generation,
twitter-image, `metadataBase`, `openGraph.url`, unfurl-cache
verification") per the M3 milestone doc
([m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) and
[AGENTS.md](/AGENTS.md) "Phase Planning Sessions." This doc plus its
sibling scoping docs delete in batch in M3 phase 3.3's PR per the
milestone doc's "Phase Status" subsection. The durable contract for
3.1.2 lives in
[`m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md);
this scoping doc is the input that plan compresses from.

Per AGENTS.md "Phase Planning Sessions → Scoping owns / plan owns,"
this doc carries deliberation prose with rejected alternatives,
open-decisions handoff, plan-structure handoff, and reality-check
inputs the plan must verify — content with no audience after the
plan lands. File inventory, contracts, cross-cutting invariants,
validation gate, self-review audits, and risks live in the plan and
are not restated here.

## Phase summary in one paragraph

3.1.1 shipped the `/event/[slug]` rendering pipeline with text-only
SSR metadata (title, description, Open Graph text fields,
`twitter:card`, `robots: noindex` for test events), explicitly
deferring og:image, twitter-image, `metadataBase` configuration, and
`openGraph.url` to 3.1.2. Those four items co-defer because Next.js
16 hard-errors at build on a relative URL-valued metadata field when
`metadataBase` is unset (verified at
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 428](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)),
and the canonical-origin source `metadataBase` needs is the same
source absolute og:image URLs need. 3.1.2 ships the four items
together and captures an unfurl preview from at least one consumer
client (Slack) plus a curl falsifier asserting absolute-URL meta
values pre-hydration. 3.1.2's PR is also the terminal child of 3.1,
so it flips the M3 milestone doc's Phase Status row for 3.1 from
`Proposed` to `Landed`.

## Decisions made at scoping time

These resolve the open decisions named in the M3 milestone doc and
the 3.1.1 plan's Out Of Scope list. Each decision lists rejected
alternatives with rationale and a `Verified by:` cite to the code
that grounded the call. Implementation specifics (file paths,
contract shapes, validation procedures) live in the plan; this
section explains *why* those choices are correct, not *what* they
are.

### og:image strategy → Next.js 16 file-convention `opengraph-image.tsx` with `next/og` `ImageResponse`

Three options the milestone doc named, evaluated against actual
code:

- **Static asset under `apps/site/public/test-events/<slug>/og.png`.**
  Each event would need a hand-authored 1200×630 PNG committed to
  the repo. Image content (event name, dates, theme color) becomes
  decoupled from `EventContent`: a content-author updating
  `content.hero.dates` updates the page text but not the unfurl
  image. The 3.1.1 plan's "EventContent is the single source of
  truth for per-event visible data" cross-cutting invariant
  silently breaks because the OG image becomes a per-event side
  channel that must be re-authored every time content changes.
  The Madrona-fit walk also defeats: M4's Madrona OG image would
  need hand-authoring against final content rather than inherit
  the pipeline.
- **Dynamic API route at `apps/site/app/api/og/route.tsx`.** A
  Route Handler taking `?slug=<slug>` and returning an
  `ImageResponse`. Two costs: the route runs at request time on
  every crawl rather than statically optimizing, and the URL
  composes at metadata-emit time (still requires `metadataBase`).
  The "Static generation friendliness" cross-cutting invariant
  from 3.1.1 doesn't directly apply to a separate route, but the
  spirit does: paying runtime cost on every crawl for content
  fixed at build time is the wrong shape for a finite known
  registry of slugs.
- **Next.js 16 file convention
  `apps/site/app/event/[slug]/opengraph-image.tsx`.** A segment-
  colocated specialized Route Handler that the framework treats as
  a metadata source. Per
  [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` lines 89-94](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md):
  "Generated images are statically optimized (generated at build
  time and cached) unless they use Request-time APIs or uncached
  data." The default export receives `params` (a Promise in v16
  per the version-history table on line 528 of the same doc), and
  Next.js auto-emits `og:image*` meta tags from the route's
  exports plus the generated image's URL — so the page's
  `generateMetadata` does not set `openGraph.images` directly.

**Decision.** File convention. Static optimization gives free
build-time prerender per registered slug; auto-emission means the
page route's `generateMetadata` carries no image-meta wiring; image
content reads from `EventContent` so the
single-source-of-truth invariant survives; M3 phase 3.2 and M4
phase 4.2 inherit the pattern by adding new slugs, no per-event
plan changes. Bundle-size limit of 500 KB per `ImageResponse`
(per
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` line 51](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md))
is an honest constraint the plan's risk register names.

### twitter-image strategy → parallel file convention sharing one generator

The milestone doc names "twitter-image: parallel decision to
og:image; likely shares the same generator." Per
[`opengraph-image.md` lines 84-87](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md),
`twitter-image` is the same file-convention class as
`opengraph-image` with the same default function shape and config
exports; output meta tags differ only in property names
(`twitter:image*` vs. `og:image*`).

**Decision.** Two thin file-convention files, both importing one
shared `EventOgImage` helper module. Locks visual identity to a
single source — a content or theme change cannot drift one card
from the other.

A "single file re-exporting from another" alternative was rejected:
Next.js needs each file to export its own default at the right
segment path; the convention does not support pointing both meta
tags at one file. Two thin files plus a shared helper is the right
shape.

### `metadataBase` source → `NEXT_PUBLIC_SITE_ORIGIN` env var via `next.config.ts` `env` block

Three options from the milestone doc, evaluated:

- **Hardcoded production hostname.** Set
  `metadataBase: new URL('https://<apps/web-domain>')` directly in
  the root layout. Two costs: any apps/web custom-domain rename
  forces a code change (the
  [docs/plans/repo-rename.md](/docs/plans/repo-rename.md) record
  confirms one rename has been considered), and local dev emits
  production URLs in meta tags (cosmetically wrong even if
  functionally harmless because dev is never crawled). Hardcoded
  values conflate "what is production" with "what does the build
  run against" — exactly the fragility env vars exist to solve.
- **`process.env.VERCEL_URL`.** Vercel injects this at build time
  for both Vercel projects independently. Reading
  [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26:
  apps/site sits behind a Vercel rewrite from apps/web; users see
  apps/web's hostname in their address bar, not apps/site's. So
  `VERCEL_URL` evaluated inside apps/site resolves to apps/site's
  deployment URL (e.g., `neighborly-events-site.vercel.app`),
  which is the *wrong* hostname for unfurls — a Slack/iMessage
  user clicking the card would land on apps/site directly instead
  of going through apps/web's Vercel rewrite layer. The 3.1.1
  plan's
  [Cross-Cutting Invariants Touched section](/docs/plans/m3-phase-3-1-1-plan.md)
  explicitly names this: "the canonical user-facing origin is
  apps/web's hostname." Using `VERCEL_URL` from apps/site silently
  breaks that.
- **`NEXT_PUBLIC_SITE_ORIGIN` env var.** Set per environment. In
  the Vercel apps/site project's Production env, the value is
  apps/web's canonical custom-domain origin (operator-set at
  deploy time, picked from
  [apps/web/vercel.json](/apps/web/vercel.json) and the
  [docs/plans/site-scaffold-and-routing.md](/docs/plans/site-scaffold-and-routing.md)
  routing topology — the implementer reads the live alias from
  the Vercel dashboard at PR time). In `apps/site/.env.local` the
  value is whatever local origin the developer is testing
  against.

**Decision.** Env var, named `NEXT_PUBLIC_SITE_ORIGIN`, registered
in `apps/site/next.config.ts`'s `env` block per the existing
Turbopack workaround at
[apps/site/next.config.ts](/apps/site/next.config.ts) lines 1-25
(Turbopack rewrites `process.env.NEXT_PUBLIC_*` lookups before
Next.js' substitution pass; any new `NEXT_PUBLIC_*` var has to go
through the `env` block or it ends up empty at runtime). The plan
codifies the wiring as a Cross-Cutting Invariant.

The env var is **public** (`NEXT_PUBLIC_`) because it embeds in
client-bundled metadata, but the value (apps/web's hostname) is
already public information. No secret leakage.

`metadataBase` is set **once** in
[apps/site/app/layout.tsx](/apps/site/app/layout.tsx) per the
documented best practice at
[`generate-metadata.md` line 424](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
"`metadataBase` is typically set in root `app/layout.js` to apply
to URL-based `metadata` fields across all routes."

The empty-string substitution from the `env` block needs a
**logical-OR** fallback, not nullish-coalescing — `??` does not
short-circuit on `""` because the empty string is not nullish, so
`new URL("")` would throw at build time. The plan names this trap
as a Cross-Cutting Invariant; the curl falsifier in the plan's
Validation Gate catches the regression class if a future edit
swaps `||` for `??`.

### `openGraph.url` → relative path resolved against `metadataBase`

`openGraph.url` is a URL-based field; with `metadataBase` set, the
relative form `/event/${slug}` resolves to
`<NEXT_PUBLIC_SITE_ORIGIN>/event/${slug}` per
[`generate-metadata.md` line 396](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
"`metadataBase` allows URL-based `metadata` fields defined in the
**current route segment and below** to use a **relative path**
instead of an otherwise required absolute URL."

Without it, consumer clients fall back to the request URL — also
correct, but inconsistent across clients (some normalize trailing
slashes, some don't, some strip query strings). Setting it
explicitly removes per-client variation.

### Unfurl-cache verification → one-time PR-body capture from Slack debugger + curl-based gate

Three options the user prompt named:

- **One-time check captured in the PR body.** The implementer pastes
  the test event URL into a Slack DM-to-self in a workspace they
  control, screenshots the preview, and includes it in the PR
  body. The X "Card Validator" is an equivalent flow but
  optional; the M3 milestone doc bounds unfurl scope at "one
  consumer client" to avoid platform-by-platform compatibility
  scope creep.
- **Reusable script under `scripts/unfurl-check.cjs`.** A
  curl-plus-OG-meta-tag-extractor that the validation gate could
  re-run automatically. Slack's actual unfurl behavior is
  cached server-side and not directly scriptable without an OAuth-
  scoped Slack app, so the script could only validate "the meta
  tags exist with absolute URLs" — which a curl one-liner already
  covers. The script duplicates the curl gate without unfurl-
  cache awareness; rejected.
- **Curl-based assertion in the validation gate.** The pattern
  3.1.1 already uses for the noindex falsifier (3.1.1 plan
  Validation Gate "Server-rendered noindex check"). Extending it
  for 3.1.2 covers the "no `metadataBase` regression" falsifier:
  if the env var goes empty in production and the localhost
  fallback ships, every meta URL becomes `http://localhost:3000/...`
  and the curl catches it pre-merge.

**Decision.** Both the one-time PR-body Slack capture (consumer-end
proof) **and** the curl-based absolute-URL gate (meta-tag-
correctness gate). The two checks falsify different regression
classes — the curl proves the meta tags carry absolute URLs, the
Slack capture proves a real consumer renders them correctly.
Reusable script rejected per the rationale above.

The cache-bust pattern from the M3 milestone doc's Cross-Phase
Risks ("Unfurl validation depends on third-party crawler caches")
— append `?v=<timestamp>` during validation iterations — is
documented in the plan's validation procedure for reproducibility.

## Open decisions to make at plan-drafting

These are open questions left for the plan to resolve.

- **`EventOgImage` layout details.** Exact font sizes, paddings,
  positioning of event name vs. dates vs. location vs.
  attribution. The plan picks values against the actual rendered
  PNG; UI-review captures the load-bearing verification.
- **Whether to load a custom font for the OG image.** Default path
  is "no font load — Satori built-in fallback is fine for test
  events." The plan re-confirms after the implementer eyeballs
  the first build's output; if a custom font is added, the plan
  names the bundle-size budget and which weights ship.
- **Whether `EventOgImage` accepts the resolved Theme as a prop
  or resolves it internally.** Helper-coupling vs. caller-
  responsibility trade-off. The plan picks one based on the
  file-convention call site shape.
- **Exact value of `NEXT_PUBLIC_SITE_ORIGIN` for production.**
  Read from the live Vercel apps/web project alias at PR time
  (operator-set, not authored). The plan's PR body validation
  step names "set Vercel apps/site Production env to the value
  copied from apps/web's primary alias" so reviewer attention
  does not relitigate the canonical-origin decision.
- **Whether the curl falsifier asserts strict pattern (e.g.,
  exact-match `https://<expected-origin>/event/...`) or just
  absoluteness.** Strict pattern catches more regression
  classes; absoluteness-only is loose but stable. The plan
  picks absoluteness-only with a comment documenting the
  strict-pattern alternative as a future tightening.

## Plan structure handoff

The plan at
[`docs/plans/m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md)
matches the structure of recent landed plans (the just-renamed
[`m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md) is
the pattern reference) with sections in this order:

1. Status (with terminal-PR note: 3.1.2 flips both this plan's
   Status and the M3 milestone doc's Phase 3.1 row to `Landed`)
2. Plain-language Context preamble (per AGENTS.md "Plan opens
   with a plain-language context preamble")
3. Goal
4. Cross-Cutting Invariants
5. Naming
6. Contracts
7. Cross-Cutting Invariants Touched (epic-level)
8. Files to touch — new
9. Files to touch — modify
10. Files intentionally not touched
11. Execution steps
12. Commit boundaries
13. Validation Gate
14. Self-Review Audits
15. Documentation Currency PR Gate
16. Out Of Scope
17. Risk Register
18. Backlog Impact
19. Related Docs

## Reality-check inputs the plan must verify

The plan's load-bearing technical claims need "Verified by:" cites
to actual code or generated output, per AGENTS.md "'Verified by:'
annotations on technical claims." The candidates the plan should
hit:

- The Next.js 16 file-convention pattern for `opengraph-image.tsx`
  (exports, default function shape, auto-meta-emission) — verify
  by reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md)
  lines 78-94 (generation pattern) and 217-264 (props + config
  exports + return type).
- The `ImageResponse` constructor shape and Satori CSS subset —
  verify by reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md)
  lines 7-37 (constructor signature) and lines 47-52 (behavior +
  bundle limit + supported features).
- The `metadataBase` field type, set-once-at-root rule, and
  build-error behavior on relative URLs without it — verify by
  reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  lines 392-429 (metadataBase reference) and line 428 (the
  build-error rule).
- The Turbopack `process.env.NEXT_PUBLIC_*` substitution trap —
  verify by reading
  [apps/site/next.config.ts lines 1-25](/apps/site/next.config.ts)
  (the existing comment block + Supabase entries are the binding
  precedent).
- The `??` vs. `||` empty-string trap — verify by tracing the
  `env`-block default (`process.env.NEXT_PUBLIC_X ?? ""` returns
  empty string on unset) against the consumer-side fallback
  expression. `""` is not nullish, so `?? "fallback"` does not
  trigger; only `||` does. The build-time `new URL("")` failure
  is the falsifier.
- The Vercel rewrite topology (apps/web hostname is canonical,
  apps/site sits behind it) — verify by reading
  [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26 and
  the `/_next/:path*` rewrite on lines 32-33.
- The page route's existing `generateMetadata` shape (the new
  `openGraph.url` field plugs into the existing `openGraph`
  block) — verify by reading
  [apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/%5Bslug%5D/page.tsx)
  lines 49-67.
- The root layout's existing `metadata` export (the new
  `metadataBase` field plugs into the existing object) — verify
  by reading
  [apps/site/app/layout.tsx lines 28-30](/apps/site/app/layout.tsx).
- The 3.1.1 plan's "Cross-Cutting Invariants Touched" subsection
  naming canonical-origin as apps/web's hostname — verify by
  reading
  [docs/plans/m3-phase-3-1-1-plan.md lines 351-357](/docs/plans/m3-phase-3-1-1-plan.md).

## Related Docs

- [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) — M3
  milestone doc; cross-phase invariants, decisions, risks.
- [event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate.
- [m3-phase-3-1-1-plan.md](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 plan; records the og:image / metadataBase / openGraph.url /
  unfurl-validation co-deferral that 3.1.2 picks up.
- [m3-phase-3-1-2-plan.md](/docs/plans/m3-phase-3-1-2-plan.md) —
  3.1.2 plan; durable contract this scoping doc compresses to.
- [docs/plans/scoping/m3-phase-3-1.md](/docs/plans/scoping/m3-phase-3-1.md) —
  3.1.1's scoping doc; records the original PR-split decision.
  Deletes in batch with this doc in 3.3's PR.
- [shared-styles-foundation.md](/docs/plans/shared-styles-foundation.md) —
  M1 phase 1.5 plan; ThemeScope contract and `getThemeForSlug`
  resolver.
- [docs/styling.md](/docs/styling.md) — themable / structural
  classification.
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) —
  audit name source (consumed by the plan's Self-Review Audits
  section).
- [apps/site/AGENTS.md](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder.
- [AGENTS.md](/AGENTS.md) — Phase Planning Sessions rules
  (including the "Scoping owns / plan owns" split this doc
  follows), Plan-to-PR Completion Gate, "Verified by:"
  annotation rule, "Bans on surface require rendering the
  consequence" rule.
