# M3 Phase 3.3 — Cross-App Navigation Verification + M3 Closure

## Status

Landed.

3.3 is the milestone-terminal phase of M3 ("Site Rendering
Infrastructure With Test Events"). It carries no code changes; the
work is (a) updating [`docs/architecture.md`](/docs/architecture.md)
and [`README.md`](/README.md) to record the rendering pipeline that
3.1.1 + 3.1.2 + 3.2 shipped, (b) verifying the cross-app
navigation contract from apps/site CTAs into apps/web
`/event/:slug/game` continues to behave as designed, (c) flipping
this plan, the M3 milestone doc, and the epic's M3 milestone-status
row to `Landed`, and (d) deleting the four M3 scoping docs in
batch.

The plan ships under the two-phase Plan-to-Landed pattern
([`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation"): the implementing PR
merges with this plan's Status set to the verbatim string
`In progress pending prod smoke` (per AGENTS.md "Quote labels whose
enforcement depends on exact-match matching" — this exact string,
not `Landed` and not a paraphrase, cited at
[AGENTS.md line 677](/AGENTS.md)); after the post-deploy
production walk-through is captured against the apps/web canonical
origin, the Status flips to `Landed` in a follow-up commit on the
same branch (or a fast-follow PR if the branch already merged). The
M3 milestone doc's top Status block and the epic's Milestone Status
table M3 row travel in lockstep with this plan's Status — all
three move `Proposed` → `In progress pending prod smoke` →
`Landed` together.

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M3, Phase 3.3.
**Milestone doc:** [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md).
**Sibling phases:** 3.1.1 + 3.1.2 (rendering pipeline + first test
event + per-event OG image / twitter-image / `metadataBase`) —
Landed; 3.2 (second test event with `riverside-jam` Theme) —
Landed.

**Hard dependencies on `main`.** 3.3 closes M3, so every prior M3
phase is required-merged on `main` before this phase opens. Each
inherited surface is consumed unchanged:

- 3.1.1's rendering pipeline at
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  and the section components in
  [`apps/site/components/event/`](/apps/site/components/event)
  including [`EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx)
  and [`EventHeader.tsx`](/apps/site/components/event/EventHeader.tsx)
  whose plain-`<a>` CTAs are the cross-app navigation contract this
  phase verifies.
- 3.1.2's per-event OG image, twitter-image, and `metadataBase`
  configuration at
  [`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx),
  [`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx),
  [`apps/site/lib/eventOgImage.tsx`](/apps/site/lib/eventOgImage.tsx),
  and [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx).
- 3.2's `riverside-jam` test event at
  [`apps/site/events/riverside-jam.ts`](/apps/site/events/riverside-jam.ts)
  and [`shared/styles/themes/riverside-jam.ts`](/shared/styles/themes/riverside-jam.ts).
- M1 phase 1.3.2's frontend-origin auth cookie established by
  `@supabase/ssr`'s `createBrowserClient`; the cookie-boundary
  verification record at
  [`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md)
  "Verification Evidence" is the existing falsifier 3.3's
  walk-through re-confirms.
- M0 phase 0.3 + M2 phase 2.5's Vercel rewrite topology at
  [`apps/web/vercel.json`](/apps/web/vercel.json), specifically
  the `/event/:slug` and `/event/:slug/:path*` rewrites at
  lines 19-26 that proxy apps/site through apps/web.

**Scoping inputs.** This plan compresses from
[`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md),
which records the docs-and-verification-only phase shape, the
two-phase Status pattern decision, and the open-questions / backlog
non-edits with their rationale. The scoping doc deletes in this
PR alongside its three siblings.

## Context

M3 set out to give `apps/site` the capacity to render any
`/event/:slug` from data, prove the platform shape with two test
events on distinct themes, and verify SSR meta unfurled correctly.
Three phases have shipped:

- **3.1.1** built the rendering pipeline, the `EventContent` type,
  the `apps/site/events/` directory of record, and the first test
  event (`harvest-block-party`) with its registered Theme.
- **3.1.2** added per-event `opengraph-image.tsx` + `twitter-image.tsx`
  file-convention routes, the `metadataBase`-via-`NEXT_PUBLIC_SITE_ORIGIN`
  env var configuration, the relative `openGraph.url`, and a Slack
  unfurl capture against the deploy preview.
- **3.2** registered the second test event (`riverside-jam`) on a
  cool maritime Theme visibly distinct from both Sage Civic and
  Harvest, exercising every `EventContent` field at depth comparable
  to the first event.

3.3 is the doc-and-verification close. The rendering platform is
shipped; what remains is recording the new shape in the durable
docs (architecture.md, README.md), confirming on the production
domain that an attendee clicking the hero CTA on
`/event/harvest-block-party` reaches `/event/harvest-block-party/game`
without auth disruption and that the browser back button returns
to the apps/site landing without flash, and flipping the milestone
status rows in lockstep so future readers can navigate from the
milestone-doc Status block to the epic table to this plan and find
all three say the same thing. The scoping doc's batch deletion
also lands here — keeping the four scoping docs (3.1, 3.1.2, 3.2,
3.3 itself) any longer would leave a singleton in
`docs/plans/scoping/` that future M4 / next-milestone scoping
cycles would have to sweep separately.

This is being done now because M3's whole point was to make the
platform shape provable, and "provable" means the shape is
described in the docs that someone reading the repo cold finds
first (architecture.md, README.md), not just inside the M3
milestone doc that only people deep in the epic find. The
cross-app navigation walk-through is the one M3 gate that needs
the deployed origin to falsify against — local emulation hides the
production-only proxy gaps named in AGENTS.md "Bans on surface
require rendering the consequence" — so the two-phase Plan-to-
Landed pattern applies and the implementing PR merges
`In progress pending prod smoke` before flipping `Landed` post-deploy.

The surfaces this phase touches at the conceptual level: the
durable platform docs (architecture.md, README.md), the M3
milestone doc's Status block + 3.3 row, the epic's Milestone Status
table M3 row, this plan's Status block, and the four scoping docs
(deleted). **No DB changes, no auth changes, no apps/web changes,
no apps/site code changes, no test changes, no new validation
commands, no new dependencies.**

## Goal

Close M3 honestly. Three deliverables:

1. **Documentation currency.** Update
   [`docs/architecture.md`](/docs/architecture.md) and
   [`README.md`](/README.md) to describe the rendering pipeline,
   apps/site responsibilities, the `EventContent` shape, the test
   event posture (noindex + disclaimer banner), and the cross-app
   ThemeScope asymmetry through M4 — all surfaces the M3 milestone
   doc named as 3.3-owned. Drop placeholder caveats that say "event
   landing remains a placeholder until M3" because M3 has now
   shipped.
2. **Cross-app navigation verification.** Walk a manual production
   sign-in + cross-app navigation against the apps/web canonical
   origin and confirm:
   - `/event/harvest-block-party` and `/event/riverside-jam` render
     on apps/site behind apps/web's Vercel rewrite without 404 or
     flash.
   - The hero / footer CTA lands on `/event/<slug>/game` in
     apps/web's SPA without auth disruption.
   - The browser back button returns to the apps/site landing with
     content intact.
   - Auth state visible in apps/site's `/admin` after the trip
     (cookie boundary still preserved per M1 phase 1.3.2's
     Verification Evidence).

   Capture the walk-through outcome in the implementing PR's body
   per AGENTS.md "Bans on surface require rendering the
   consequence."

3. **Milestone closure paperwork.** Flip the M3 row in
   [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)'s
   Milestone Status table, the top Status block in
   [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md), the
   3.3 row in the same milestone doc's Phase Status table, and this
   plan's Status — all three move from `Proposed` to
   `In progress pending prod smoke` at PR open and to `Landed` once
   the production walk-through is captured. Delete the four M3
   scoping docs in the same PR.

The phase is doc-only + verification-only. No source code, no
tests, no migrations. If the cross-app walk-through surfaces a
real navigation bug (CTA returns 404, auth state lost, back button
breaks), that is a **rule deviation** under the
"docs + verification + status flips, no code changes" cross-cutting
invariant below — the plan is updated in the same PR before the
deviation lands per AGENTS.md "Plan-to-PR Completion Gate."

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **3.3 ships docs + verification + status flips; no code, no
  tests, no migrations.** No edits under
  [`apps/site/`](/apps/site), [`apps/web/`](/apps/web),
  [`shared/`](/shared), [`tests/`](/tests),
  [`supabase/`](/supabase), or [`scripts/`](/scripts). If
  implementation surfaces a need to touch any of those trees,
  that is a **rule deviation** triggering an in-PR plan-doc
  update per AGENTS.md "Plan-to-PR Completion Gate" — not an
  estimate deviation handled via the PR body. The Risk Register
  names the most likely rule-deviation case (cross-app
  walk-through surfaces an actual navigation bug) and its
  handling path.
- **Two-phase Plan-to-Landed Status pattern, applied in lockstep
  to plan + milestone-doc + epic.** Plan Status, milestone-doc
  top Status, milestone-doc Phase 3.3 row, and epic Milestone
  Status M3 row all move `Proposed` → `In progress pending prod
  smoke` → `Landed` together. Splitting them (e.g., plan flips
  `Landed` while milestone says `In progress pending prod smoke`)
  silently desynchronizes the milestone-closure narrative;
  walkers landing on either Status block see contradictory
  state. The exact verbatim string `In progress pending prod
  smoke` is required by
  [`docs/testing-tiers.md` "Plan-to-Landed Gate"](/docs/testing-tiers.md)
  cited at [AGENTS.md line 677](/AGENTS.md); paraphrase or
  abbreviation breaks the rule's queryability invariant.
- **Cross-app navigation verification runs against the production
  origin, not local dev.** Local two-server setups
  (`npm run dev:web` + `npm run dev:site`) hide the
  production-only proxy gaps named in
  [AGENTS.md "Bans on surface require rendering the
  consequence"](/AGENTS.md): dev servers self-serve their own
  asset paths (`/_next/*`, `/@vite/*`) which masks cross-project
  gaps the production rewrite layer exposes. The walk-through
  hits the apps/web canonical alias post-deploy.
- **Verbatim Status string at every site.** The string
  `In progress pending prod smoke` (8 words, lowercase except
  initial `In`, no trailing punctuation, no abbreviation) appears
  in this plan's Status block, in the milestone doc's top Status
  block, in the milestone doc's Phase Status row's `Status`
  column, and in the epic's Milestone Status row's `Status`
  column during the in-progress phase. A typo or paraphrase at
  any one site silently downgrades the rule's enforcement
  surface. Self-review walks the string at every site.
- **Scoping-doc batch deletion is atomic with the milestone-status
  flips.** The four files at
  [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md),
  [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md),
  [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md),
  and
  [`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md)
  delete in the same PR that flips Status. Splitting deletion
  across PRs would either leave M3 closure incomplete (some
  scoping docs survive after the milestone shows `Landed`) or
  force a follow-up PR purely for cleanup. Self-deletion of
  3.3's own scoping doc is intentional and named in the M3
  milestone doc at lines 86-95.
- **Cross-app theme continuity is not an M3 gate.** The
  walk-through verifies navigation works (URL resolves, auth
  preserved, back button returns); it does **not** verify visual
  theme continuity across the apps/site → apps/web boundary. The
  test events render their registered Themes on apps/site; the
  apps/web `/event/:slug/game` shell renders apps/web's
  warm-cream `:root` defaults until M4 phase 4.1 wires the
  apps/web event-route ThemeScope. The visual jump on test events
  is acceptable per the M3 milestone doc's
  ["Cross-Phase Risks" section](/docs/plans/m3-site-rendering.md)
  because test events are noindex'd and carry the disclaimer
  banner. Continuity verification is M4's surface.

## Naming

- **Plan filename**: `docs/plans/m3-phase-3-3-plan.md` (this file).
- **Branch**: `plan/m3-phase-3-3` (matches the predecessor
  plan-and-scoping branch [`plan/m3-phase-3-2`](https://github.com/kcrobinson-1/neighborly-events/pull/143)
  / [#143] convention).
- **PR title** (under 70 chars): `docs(plans): close M3 (phase 3.3 — cross-app nav + M3 closure)`.
  Final wording is implementer choice within the 70-char cap.
- **Verbatim Status string for the in-progress phase**:
  `In progress pending prod smoke`. Cited at
  [AGENTS.md line 677](/AGENTS.md) and
  [`docs/testing-tiers.md` line 141](/docs/testing-tiers.md).
- **Verbatim Status string for the terminal phase**: `Landed`.

## Contracts

### `docs/architecture.md` edit

Module: [`docs/architecture.md`](/docs/architecture.md) (modified).
Five edit sites:

- **Lines 30-33.** The "two frontend apps" description currently
  reads "SSR/SSG public event landing pages — event landing
  remains a placeholder until M3 of the Event Platform Epic." The
  placeholder caveat drops; the parenthetical reads as the shipped
  capability ("SSR/SSG public event landing pages rendered from
  per-event TypeScript content modules" or equivalent). Verified
  by:
  [`docs/architecture.md` lines 30-33](/docs/architecture.md).
- **Lines 61-67.** The `apps/site` Top-Level Layout description
  currently ends with "Event landing remains a placeholder until
  M3 of [the Event Platform Epic]." The placeholder sentence
  drops; the apps/site description names the multi-event landing
  pipeline as a current responsibility. Verified by:
  [`docs/architecture.md` lines 61-67](/docs/architecture.md).
- **Lines 208-225 (apps/site Frontend Structure section).** The
  inventory currently ends at `apps/site/lib/setupAuth.ts` with no
  bullets for the rendering layer. New bullets land for the
  apps/site rendering surfaces:
  - `apps/site/app/event/[slug]/page.tsx` — event landing route;
    `generateStaticParams` enumerates registered slugs; metadata
    resolves per-event from `EventContent`; the page wraps in
    `<ThemeScope>`.
  - `apps/site/app/event/[slug]/opengraph-image.tsx` and
    `apps/site/app/event/[slug]/twitter-image.tsx` —
    file-convention metadata routes that prerender one image per
    registered slug at build time via `next/og`'s `ImageResponse`.
  - `apps/site/lib/eventContent.ts` — the `EventContent`
    TypeScript type, `eventContentBySlug` registry, and
    `registeredEventSlugs` derivation.
  - `apps/site/events/<slug>.ts` — directory of record for
    per-event TypeScript content modules.
  - `apps/site/components/event/` — section components composed
    by `EventLandingPage` (header, schedule, lineup, sponsors,
    FAQ, CTA, footer, plus `TestEventDisclaimer` for noindex'd
    test events).
  - `apps/site/lib/eventOgImage.tsx` — shared OG / twitter image
    helper consumed by both file-convention routes.

  Bullets land alphabetically-by-path within the apps/site section
  after the existing apps/site bullets. Verified by:
  [`docs/architecture.md` lines 208-225](/docs/architecture.md)
  + the actual files at the named paths.
- **Lines 354-358.** The per-event Theme registry note currently
  reads "empty in M1 phase 1.5.2; M3 phase 3.1 adds the first
  test event theme alongside the rendering pipeline, M3 phase 3.2
  adds the second test event theme — see [m3-site-rendering.md];
  M4 phase 4.1 adds Madrona". The note rewrites in present tense:
  "the registry holds the `harvest-block-party` and `riverside-jam`
  test event Themes; M4 phase 4.1 adds Madrona." The cross-app
  ThemeScope asymmetry callout from the M3 milestone doc lands
  inline as an extension of this note: "apps/site event routes
  resolve per-event Themes through `<ThemeScope>` from M3 phase
  3.1; apps/web event-route shells (`/event/:slug/game/*`) render
  against apps/web's warm-cream `:root` defaults until M4 phase
  4.1 wires their ThemeScope per the epic's 'Deferred ThemeScope
  wiring' invariant." Verified by:
  [`docs/architecture.md` lines 354-358](/docs/architecture.md).
- **Line 898.** The Vercel routing topology table row 5
  (`/event/:slug` → `apps/site` Vercel project) Lifetime cell
  currently reads "Permanent (placeholder in 0.3; real landing
  page in M3)". The parenthetical drops or shortens to
  "Permanent (event-scoped landing)". Verified by:
  [`docs/architecture.md` line 898](/docs/architecture.md).

The five edit sites are the only architecture.md changes in this
phase. The "Vercel routing topology" table headers, the cross-app
proxy-rewrite description, and the trust-boundary text are
unchanged — those describe state already accurate at landing.

### `README.md` edit

Module: [`README.md`](/README.md) (modified). Two edit sites:

- **Lines 67-73.** The `apps/site` repo-shape bullet currently
  reads "Platform landing, platform admin, auth callback, and
  public event landing pages built with Next.js 16 (App Router,
  server rendered). Owns `/`, `/auth/callback`, `/admin*`,
  `/event/:slug`, and any other event-scoped path not carved out
  for `apps/web`. Event landing is still a placeholder; the real
  landing page lands in M3 of [the Event Platform Epic]." The
  placeholder sentence drops; the bullet reads as the shipped
  capability without repointing at the in-progress milestone.
- **Lines 22-58 (What Works Today / capabilities section)** — a
  new bullet (or extension of an existing apps/site-related
  bullet) names the multi-event rendering capability:
  "public event landing pages at `/event/:slug` rendered
  server-side by apps/site from per-event TypeScript content
  modules under `apps/site/events/`, proven against two test
  events on distinct Themes." Exact wording is implementer choice
  within the bullet's surface; the constraint is "name the
  capability without restating internal architecture" (which
  belongs in architecture.md).

The two edit sites are the only README.md changes in this phase.
README.md sections describing M0-M2 work (repo rename, monorepo
structure, Vercel proxy rewrites) are unchanged.

### M3 milestone doc Status flips

Module: [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
(modified). Two flips:

- **Top Status block (lines 4-8).** Currently reads "Proposed.
  Status mirrors the [epic milestone row]. Flipped to `Landed` in
  M3 phase 3.3's PR alongside the epic M3-row flip." During the
  in-progress phase the first word changes to
  `In progress pending prod smoke.` (the verbatim string with a
  trailing period); after post-deploy walk-through, it flips to
  `Landed.`. The mirror-and-flip-mechanic prose stays.
- **Phase Status table row 3.3 (line 74).** Currently
  `| 3.3 | Cross-app navigation verification + M3 closure | — |
  Proposed | — |`. The `Plan` column gets the link to this plan
  on the plan-drafting commit; the `Status` column flips
  `Proposed` → `In progress pending prod smoke` → `Landed` per
  the two-phase pattern; the `PR` column gets this PR's number.

No other milestone-doc edits. The Sequencing diagram, Cross-Phase
Invariants, Cross-Phase Decisions, Cross-Phase Risks, Documentation
Currency, Backlog Impact, and Related Docs sections describe
durable cross-phase coordination unchanged by 3.3 shipping.

### Epic Milestone Status table flip

Module: [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
(modified). One flip:

- **M3 row in the Milestone Status table (line 20).** Currently
  `| M3 — Site rendering infrastructure with test events |
  Proposed |`. The `Status` column flips `Proposed` →
  `In progress pending prod smoke` → `Landed` in lockstep with
  this plan's and the milestone doc's Status. After the M3 row
  flips `Landed`, only the M4 row remains `Proposed`; the epic's
  top Status (line 5) stays `Proposed` per
  [the epic's lines 23-24](/docs/plans/event-platform-epic.md)
  ("When all five rows show `Landed`, the top-level Status above
  flips from `Proposed` to `Landed` in the same PR that lands M4").

The epic's M3 phase paragraphs at lines 711-779 are
pre-milestone-planning estimates per AGENTS.md "Epic Drafting" —
already marked as such by the milestone-doc PR — and stay as
historical record. No retroactive rewrite to match the merged
3-phase shape; git history preserves the original numbering and
the milestone doc is canonical.

### Cross-app navigation walk-through

The walk-through is a Tier 5 production smoke per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). It runs after
the implementing PR merges and the apps/web + apps/site Vercel
projects deploy. The walk-through script:

1. Sign in to apps/web's primary alias (the production hostname
   that owns the custom domain per the routing topology in
   [`docs/architecture.md` lines 884-911](/docs/architecture.md))
   via the apps/site `/admin` magic-link flow. Confirm the
   apps/site `/admin` event-list surface renders post-callback.
2. Navigate to `/event/harvest-block-party`. Confirm the apps/site
   landing renders (hero + sections + sponsor logos + disclaimer
   banner) under apps/web's rewrite without console errors,
   without 404, and without "Site not configured" or fallback
   text.
3. Click the hero CTA. Confirm the browser navigates to
   `/event/harvest-block-party/game` and that apps/web's SPA
   shell renders (warm-cream `:root` defaults — the cross-app
   theme jump expected per the "Deferred ThemeScope wiring"
   invariant; the disclaimer banner does not carry across to
   apps/web). The page must return 200, not 404.
4. Click the browser back button. Confirm the browser returns to
   the apps/site `/event/harvest-block-party` landing without
   flash beyond a single document load and that the page renders
   identically to the step-2 capture.
5. Repeat steps 2-4 for `/event/riverside-jam`. The two test
   events must both land their respective registered Themes; the
   game route must render on both slugs.
6. Confirm signed-in state visible in the apps/site header /
   `/admin` route after the cross-app trip — the auth cookie
   survives the round trip per the M1 phase 1.3.2 contract.

The walk-through is captured in the Status-flip follow-up commit's
PR-body update (or the fast-follow PR body if the branch already
merged) as a short text walk-through. Optional extras: screenshots
of the two apps/site landings + their respective game routes for
the cross-app theme jump record. Falsifier observations the
implementer asserts against:

- Each step's URL returns 200 (not 404).
- Auth state survives every navigation (signed-in marker visible
  in apps/site after every back-trip).
- No full-page reload beyond a single document load on each hard
  navigation.
- No console errors traced to the cross-app boundary
  (fetch/redirect/auth) on any step.

If any falsifier observation fails, the rule-deviation path
applies: the underlying bug is fixed in the same PR (or a
fast-follow), the plan's Cross-Cutting Invariants update if the
"no code changes" claim turns out to be wrong, and the Status
flip waits.

### Scoping-doc batch deletion

Modules deleted:

- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
  (3.1.1 scoping doc)
- [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)
  (3.1.2 scoping doc)
- [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
  (3.2 scoping doc)
- [`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md)
  (this plan's scoping doc — self-deletion is intentional per
  the M3 milestone doc at
  [lines 86-95](/docs/plans/m3-site-rendering.md))

The four files delete in a single commit. Git history preserves
the content for any future reader; the scoping content has no
audience after its plan lands per AGENTS.md "Phase Planning
Sessions → Scoping owns / plan owns."

After deletion, `docs/plans/scoping/` is empty. Future M4 / next-
milestone scoping cycles re-populate it.

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants above, the following epic-level
invariants apply:

- **URL contract.** No URL change. All cross-app navigation
  contracts named in the walk-through were established in M0
  phase 0.3 (`/event/:slug`) and inherited unchanged through M2
  and M3. Verified by:
  [`apps/web/vercel.json`](/apps/web/vercel.json).
- **In-place auth.** No auth surface change. The walk-through
  re-confirms M1 phase 1.3.2's frontend-origin cookie behavior
  against the production domain; if a regression surfaces, the
  rule-deviation path triggers in the same PR.
- **Theme route scoping.** No code change. The walk-through
  re-confirms apps/site renders per-event Themes on
  `/event/:slug` (3.1.1 contract) and apps/web event routes
  render against warm-cream `:root` defaults (the deferred-
  Madrona-launch invariant). The architecture.md edit lands the
  asymmetry callout the M3 milestone doc named.
- **Per-event customization.** No data change. The architecture.md
  edit names `EventContent` as the data model and
  `apps/site/events/` as the directory of record per the M3
  milestone doc's "directory of record" cross-phase invariant.
- **Trust boundary.** No backend write, no DB read, no client
  input handling. 3.3 is doc + verification only.

## Files to touch — new

> Estimate-shaped per AGENTS.md "Plan content is a mix of rules
> and estimates — label which is which." Implementation may revise
> the file inventory when a structural call requires it; deviations
> are handled via the PR body's `## Estimate Deviations` section
> per AGENTS.md "Plan-to-PR Completion Gate."

- [`docs/plans/m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md)
  — this plan, drafted in this PR's first commit. Status
  block carries the verbatim `In progress pending prod smoke`
  string at PR-open and flips to `Landed` post-deploy per the
  two-phase pattern.

## Files to touch — modify

> Estimate-shaped; same caveat as the "new" list above.

- [`docs/architecture.md`](/docs/architecture.md) — five edit
  sites per the Contracts above (placeholder removal at lines
  30-33 + 61-67, file-inventory additions in the apps/site
  Frontend Structure section, present-tense rewrite of the
  per-event Theme registry note + cross-app ThemeScope asymmetry
  callout, routing-topology table row 5 cleanup).
- [`README.md`](/README.md) — two edit sites per the Contracts
  above (placeholder removal in the apps/site repo-shape bullet,
  capability bullet for multi-event rendering).
- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  — top Status block flip + Phase Status table row 3.3 update
  (Plan link on plan-drafting commit, Status column flip on the
  two-phase pattern, PR column on the implementing PR).
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — Milestone Status table M3 row's Status column flip on the
  two-phase pattern.
- This plan ([`docs/plans/m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md))
  — Status block flip on the two-phase pattern.

## Files to touch — delete

> Estimate-shaped, but the deletion list reflects the M3 milestone
> doc's binding batch-deletion contract at
> [lines 86-95](/docs/plans/m3-site-rendering.md). Adding to or
> removing from this list is a rule deviation requiring an in-PR
> milestone-doc update before the deviation lands.

- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
- [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)
- [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
- [`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md)
  (self — intentional per the milestone doc)

## Files intentionally not touched

> Estimate-shaped; reconciled against what shipped per the
> Plan-to-PR Completion Gate. The list reflects the
> "docs + verification + status flips, no code changes"
> cross-cutting invariant — touching any of these signals a rule
> deviation (the cross-cutting invariant is wrong) requiring an
> in-PR plan-doc update before the deviation lands.

- All of [`apps/site/`](/apps/site) — no source change. The hard-
  navigation contract is provable by reading
  [`apps/site/components/event/EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx)
  and
  [`apps/site/components/event/EventHeader.tsx`](/apps/site/components/event/EventHeader.tsx),
  which already use plain `<a>` and carry inline comments naming
  the rationale. No new component, no new test, no new helper.
- All of [`apps/web/`](/apps/web) — no source change. The
  Vercel rewrites at [`apps/web/vercel.json`](/apps/web/vercel.json)
  cover both event slugs unchanged.
- All of [`shared/`](/shared) — no shared-layer change. The
  rendering pipeline + Theme registry consumes shared modules
  unchanged.
- All of [`tests/`](/tests) — no test change. 3.3's
  cross-app verification is a manual production walk-through, not
  a unit/integration/Playwright test. Codifying the walk-through
  as a Playwright fixture would require either staging-domain
  test wiring (out of epic scope per the epic's "remote staging
  Supabase project" Out Of Scope bullet) or local production-
  build emulation (heavier setup the M3 milestone doc deliberately
  did not gate on).
- All of [`supabase/`](/supabase) — no SQL or function change.
- [`docs/dev.md`](/docs/dev.md) — no change. No new validation
  commands; `npm run build:site` already covers SSR validation,
  and the cross-app walk-through is a one-off post-deploy
  procedure documented inline in this plan rather than as a
  standing dev.md command.
- [`docs/styling.md`](/docs/styling.md) — no change. M3 followed
  the "Procedure For Adding A New Theme" verbatim across 3.1.1
  + 3.2; the procedure itself is unchanged.
- [`docs/open-questions.md`](/docs/open-questions.md) — no
  change. The M3 milestone doc named open-questions.md as
  3.3-owned for an "Event landing route model" in-progress note,
  but that question is currently tracked as a backlog item, not
  an open-questions entry. The current tracking rule
  ([`docs/open-questions.md` lines 23-27](/docs/open-questions.md))
  consolidates Product/live-event follow-up direction into
  backlog items; re-creating an open-questions entry to mark
  in-progress would weaken the rule. The milestone-doc claim was
  inaccurate; the scoping doc records the discrepancy with
  rationale.
- [`docs/backlog.md`](/docs/backlog.md) — no change. The "Event
  landing page for `/event/:slug`" item closes with M4 phase 4.2
  (Madrona content), not M3, per the M3 milestone doc at
  [lines 433-438](/docs/plans/m3-site-rendering.md). No other
  backlog items become unblocked by M3.
- [`docs/product.md`](/docs/product.md) — no change. M3 ships
  platform infrastructure; product capability narrative updates
  belong with M4 (Madrona launch).
- [`docs/operations.md`](/docs/operations.md) — no change. No
  routing topology change, no admin URL contract change.
- [`docs/testing.md`](/docs/testing.md) and
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) — no change.
  3.3 follows the existing Plan-to-Landed Gate; no new tier or
  procedure introduced.
- [`AGENTS.md`](/AGENTS.md) — no change. 3.3 follows existing
  rules; no new rule introduced or revised.
- [`.github/pull_request_template.md`](/.github/pull_request_template.md)
  — no change. The template's existing sections (including
  Estimate Deviations and Validation) cover the 3.3 PR shape.
- [`docs/plans/m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md),
  [`docs/plans/m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md),
  and
  [`docs/plans/m3-phase-3-2-plan.md`](/docs/plans/m3-phase-3-2-plan.md)
  — no edit. All already `Landed`; 3.3 does not retroactively
  edit sibling plans.
- The epic's M3 phase paragraphs at
  [`docs/plans/event-platform-epic.md` lines 711-779](/docs/plans/event-platform-epic.md)
  — no edit. Already marked as pre-milestone-planning estimates
  by the milestone-doc PR; the milestone doc is canonical for M3
  phase shape per AGENTS.md "Epic Drafting." Per the M3 milestone
  doc, "Landed plan docs that reference M3's phase numbering for
  behavior whose ownership did not move … are not retroactively
  rewritten" (cited at
  [`m3-site-rendering.md` lines 463-468](/docs/plans/m3-site-rendering.md)).

## Execution steps

> Estimate-shaped per AGENTS.md "Plan content is a mix of rules and
> estimates"; implementer may revise step ordering when a different
> sequence clarifies history. The Cross-Cutting Invariants are the
> binding contract; step shape is convenience.

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Confirm 3.1.1, 3.1.2, and 3.2 are all fully
   landed (`git log --oneline main` shows
   [PR #144](https://github.com/kcrobinson-1/neighborly-events/pull/144)
   as ancestor of this branch's base — already verified by the
   M3 milestone doc's Phase Status table). Read this plan, then
   the M3 milestone doc
   ([`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)),
   the scoping doc
   ([`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md)),
   and the current state of architecture.md and README.md edit
   targets named in Contracts above.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:site`, and `npm test` to confirm clean baseline
   on the branch's main-ancestor commit. (No source code changes
   land in this PR, so `build:web`, `test:functions`, and
   `test:db` are not load-bearing here; running them is fine but
   not required.)
3. **Plan + scoping doc Status flip to in-progress (one commit
   boundary — see "Commit boundaries").** This commit lands the
   plan doc with Status `Proposed` (or moves directly to
   `In progress pending prod smoke` once the PR opens — see
   step 9), updates the milestone-doc Phase Status row's Plan
   link to point at this plan, and links to the scoping doc.
   The scoping doc itself stays in place at this commit
   (deletion happens in step 7's commit).
4. **architecture.md update (one commit boundary).** Apply the
   five edit sites per Contracts above. Run `npm run lint`
   (markdown linting); the command must pass.
5. **README.md update (one commit boundary).** Apply the two
   edit sites per Contracts above. Run `npm run lint`; the
   command must pass.
6. **Status flips on plan + milestone doc + epic to
   `In progress pending prod smoke` (one commit boundary).**
   Update this plan's Status block, the milestone doc's top
   Status block, the milestone doc's Phase Status row 3.3, and
   the epic's Milestone Status table M3 row in lockstep. The
   verbatim string at every site is `In progress pending prod
   smoke`. Run `npm run lint`; the command must pass.
7. **Scoping-doc batch deletion (one commit boundary).** Delete
   the four scoping docs per Files to touch — delete. Run
   `npm run lint` and confirm no broken cross-references in
   architecture.md, README.md, the epic, the milestone doc, or
   this plan against the deleted scoping docs (this plan's
   Related Docs section continues to reference the scoping doc
   for git-history navigation, which is acceptable since git
   preserves the content). The deletion is a single commit so
   reviewers see the four-file batch as one logical operation.
8. **PR open with `In progress pending prod smoke` Status.** Open
   the PR per
   [`.github/pull_request_template.md`](/.github/pull_request_template.md).
   Title under 70 chars (e.g.,
   `docs(plans): close M3 (phase 3.3 — cross-app nav + M3 closure)`).
   Validation section lists every command actually run; UX Review
   `N/A` (no UX change in this PR — the cross-app walk-through
   captures land in the post-deploy follow-up). Estimate
   Deviations names any divergence from the file inventory above.
9. **Merge with `In progress pending prod smoke`.** After review,
   merge the PR. The M3 milestone is now visible-pending-smoke.
10. **Post-deploy production walk-through.** After both apps/web
    and apps/site Vercel projects deploy the merged commit,
    execute the cross-app navigation walk-through per the
    Contracts above (steps 1-6 of the walk-through script). If
    every falsifier observation passes, proceed to step 11. If
    any falsifier observation fails, open a fast-follow PR that
    fixes the underlying bug, updates this plan's Cross-Cutting
    Invariants if the "no code changes" claim turned out to be
    wrong, and re-runs the walk-through.
11. **Status flip to `Landed` (fast-follow commit or PR).** After
    the walk-through is captured, push a follow-up commit (or a
    fast-follow PR if the branch already merged and was deleted)
    flipping every Status site from
    `In progress pending prod smoke` to `Landed`: this plan, the
    milestone doc top Status block, the milestone doc Phase
    Status row 3.3, and the epic Milestone Status M3 row. The
    follow-up commit / PR body includes the walk-through capture
    text and (optionally) screenshots.

## Commit boundaries

Commit slices named upfront. Each commit must independently lint
(markdown linting via `npm run lint`). The "scoping-doc deletion
is atomic" rule is the binding shape.

> Estimate-shaped per AGENTS.md "Plan content is a mix of rules
> and estimates"; implementer may refine if a different split
> clarifies history.

1. **Plan + scoping doc cross-references.** Files: this plan
   (new), the M3 milestone doc's Phase Status row 3.3 Plan link
   (modified). Single commit; markdown lint passes.
2. **architecture.md update.** File:
   [`docs/architecture.md`](/docs/architecture.md) (modified
   per Contracts). Single commit; markdown lint passes.
3. **README.md update.** File: [`README.md`](/README.md)
   (modified per Contracts). Single commit; markdown lint passes.
4. **Status flips to `In progress pending prod smoke`.** Files:
   this plan (Status block), milestone doc (top Status + Phase
   Status row 3.3 Status column), epic doc (Milestone Status M3
   row Status column). Single commit; markdown lint passes;
   verbatim string is identical at all four sites.
5. **Scoping-doc batch deletion.** Files: the four scoping docs
   per Files to touch — delete. Single commit; markdown lint
   passes; no broken cross-references.
6. **Review-fix commits.** As needed during PR review, kept
   distinct from the substantive content commits per
   [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
7. **Post-deploy Status flip to `Landed`.** Files: this plan
   (Status block), milestone doc (top Status + Phase Status row
   3.3 Status column + PR column), epic doc (Milestone Status
   M3 row Status column). Single commit (or single fast-follow
   PR with one commit); markdown lint passes.

## Validation Gate

The 3.3 PR is doc-only + verification-only; the validation surface
is correspondingly compact.

- `npm run lint` — pass on baseline; pass on final. Markdown
  linting covers every doc edit in this PR. Verified by:
  [`package.json` line 17](/package.json) (workspace `lint`
  script).
- `npm run build:site` — pass on baseline; pass on final. The
  build is unchanged in shape (no source change), but the
  command runs as a sanity check that the doc edits don't
  inadvertently break a referenced file path. Verified by:
  [`package.json` line 16](/package.json).
- `npm test` — pass on baseline; pass on final. No test files
  change, but the suite runs to confirm 3.2's tripwire updates
  still pass post-merge (the registry contents `["harvest-block-party",
  "riverside-jam"]` are stable through 3.3).
- **Cross-app navigation walk-through (Tier 5 production smoke,
  post-deploy).** Steps 1-6 of the walk-through script under
  Contracts above. Capture in the post-deploy follow-up commit's
  PR body or the fast-follow PR body. Falsifier observations the
  capture asserts against:
  - Every URL returns 200 (not 404).
  - Auth state survives every navigation.
  - No full-page reload beyond a single document load on each
    hard navigation.
  - No console errors traced to the cross-app boundary.

The walk-through cannot run pre-merge (it requires the deployed
apps/site + apps/web origins under apps/web's canonical alias),
which is why the two-phase Plan-to-Landed pattern applies.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
matched to this phase's diff surfaces.

### Documentation

- **Doc-currency completeness audit.** Walk every doc the M3
  milestone doc named as 3.3-owned (architecture.md, README.md,
  open-questions.md, backlog.md, dev.md, the milestone doc
  itself, the epic) and confirm the PR's diff either lands the
  named edit or records the no-edit decision with rationale. The
  open-questions.md and backlog.md non-edits are the trap: the
  milestone doc *named* 3.3 as the owner; the rule-deviation
  path is to record the no-edit decision in this plan's Files
  intentionally not touched section with the underlying
  reasoning (current tracking rule consolidates into backlog;
  backlog item closes at M4 phase 4.2). The audit confirms the
  plan's Files intentionally not touched names both no-edits
  with their rationale, not just one or zero.
- **Verbatim Status string audit.** Walk the string `In progress
  pending prod smoke` at every site that carries it during the
  in-progress phase — this plan's Status block, the milestone
  doc's top Status block, the milestone doc's Phase Status row
  3.3 Status column, and the epic's Milestone Status M3 row
  Status column. All four sites must spell the string
  identically: 8 words, lowercase except initial `In`, no
  trailing punctuation in the table cell, no abbreviation. Same
  trap as 3.2's slug-identity audit: a typo at any site silently
  weakens the rule's enforcement.
- **Architecture.md edit-site completeness audit.** Walk all
  five edit sites named in Contracts (lines 30-33, 61-67, 208-225,
  354-358, 898) and confirm each lands an edit. The trap: the
  file-inventory addition at lines 208-225 is the largest edit
  and the easiest to skip; the routing-topology table cleanup at
  line 898 is a one-line edit and the easiest to forget. The
  audit walks each named line range against the diff.
- **README.md placeholder-removal audit.** Confirm the line 71-73
  placeholder sentence ("Event landing is still a placeholder…")
  is removed entirely, not paraphrased. Paraphrase ("Event
  landing was placeholder until M3 of [the Event Platform Epic]"
  in past tense) leaves the milestone reference live, which dates
  the README the moment M4 lands. Removal is the correct shape.
- **Cross-app ThemeScope asymmetry callout audit.** The M3
  milestone doc named architecture.md as 3.3-owned for the
  cross-app ThemeScope asymmetry callout. Confirm the
  architecture.md edit lands the asymmetry note (apps/site
  resolves per-event Themes through `<ThemeScope>`; apps/web
  event-route shells render warm-cream defaults until M4 phase
  4.1). The trap: the asymmetry is technical and easy to skip
  thinking "this is in the milestone doc, that's enough" — but
  the milestone doc lives behind the epic and the epic lives in
  /docs/plans, while architecture.md is the doc someone reading
  the repo cold lands on first.

### Plan integrity

- **Two-phase Status pattern lockstep audit.** Confirm the
  in-progress commit moves all four Status sites (this plan,
  milestone-doc top, milestone-doc Phase Status row, epic
  Milestone Status row) together, and the post-deploy follow-up
  moves the same four sites together. Splitting them silently
  desynchronizes the milestone-closure narrative.
- **Plan-walk audit (Plan-to-PR Completion Gate).** Walk every
  Goal, Cross-Cutting Invariant, Validation Gate command, and
  Self-Review Audit named in this plan against what the PR's
  diff actually lands. Confirm each is satisfied or explicitly
  deferred with rationale.
- **Estimate Deviations completeness audit.** For any divergence
  from the Files-to-touch new/modify/delete/intentionally-not-
  touched lists or from the Execution-steps / Commit-boundaries
  sequence, confirm the PR body's Estimate Deviations section
  names the deviation with the actual outcome and the rationale.
  Rule deviations require an in-PR plan update; estimate
  deviations require the PR-body callout.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Vacuously satisfied. 3.3
  introduces zero new dependencies, zero new validation
  commands, zero new scripts. The contract relies on
  already-shipped tooling (`npm run lint`, `npm run build:site`,
  `npm test`).
- **Rename-aware diff classification.** All new files (this
  plan) are net-new — `git diff --name-status` should show one
  `A` entry. Modifications (architecture.md, README.md, the
  milestone doc, the epic) should show `M` entries. Deletions
  (the four scoping docs) should show `D` entries. No `R`
  (rename) entries; nothing moves.
- **Readiness-gate truthfulness audit.** The Validation Gate
  names `npm run lint`, `npm run build:site`, `npm test`, and
  the post-deploy walk-through. The PR body's Validation section
  captures the actual results (each command's pass/fail
  reported); the post-deploy follow-up captures the walk-through
  outcome as text and (optionally) screenshots. Without captured
  output, a reviewer cannot distinguish "the walk-through
  rendered" from "no one actually ran it." This is exactly the
  AGENTS.md "Bans on surface require rendering the consequence"
  discipline applied to the milestone-closure surface.

## Documentation Currency PR Gate

Per [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](/docs/architecture.md) — five edit
  sites per Contracts. Owned by 3.3 per
  [`m3-site-rendering.md` lines 405-416](/docs/plans/m3-site-rendering.md).
- [`README.md`](/README.md) — two edit sites per Contracts.
  Owned by 3.3 per
  [`m3-site-rendering.md` lines 416-418](/docs/plans/m3-site-rendering.md).
- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  — top Status block flip + Phase Status table row 3.3 update
  per Contracts. The two-phase pattern: `Proposed` →
  `In progress pending prod smoke` (PR-merge commit) →
  `Landed` (post-deploy follow-up).
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — Milestone Status table M3 row Status column flip per
  Contracts. Same two-phase pattern as the milestone doc.
- This plan ([`docs/plans/m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md))
  — Status flip per the two-phase pattern.
- [`docs/dev.md`](/docs/dev.md) — no change. No new validation
  commands or workflow changes.
- [`docs/styling.md`](/docs/styling.md) — no change. M3 followed
  the procedure verbatim; no procedure edit.
- [`docs/open-questions.md`](/docs/open-questions.md) — no
  change. Per Files intentionally not touched: the milestone-doc
  ownership claim was inaccurate, the question is tracked in
  backlog under the current tracking rule, and re-creating an
  open-questions entry would weaken that rule.
- [`docs/backlog.md`](/docs/backlog.md) — no change. The "Event
  landing page" item closes at M4 phase 4.2, not M3.
- [`docs/product.md`](/docs/product.md),
  [`docs/operations.md`](/docs/operations.md),
  [`docs/testing.md`](/docs/testing.md),
  [`docs/testing-tiers.md`](/docs/testing-tiers.md),
  [`AGENTS.md`](/AGENTS.md) — no change. No surface-of-ownership
  change here.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md),
  [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md),
  [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md),
  [`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md)
  — all four delete in this PR per the milestone doc's
  batch-deletion contract.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **New code, new tests, new dependencies, new validation
  commands.** Resolution: out of 3.3 per the
  "docs + verification + status flips, no code changes"
  cross-cutting invariant. The hard-navigation contract was
  shipped in 3.1.1 and verified in production by M1 phase 1.3.2;
  3.3 re-confirms by walk-through, not by adding tests or code.
- **Cross-app theme continuity verification.** Resolution: out
  of 3.3 per the M3 milestone doc's "Cross-Phase Risks" section
  ([`m3-site-rendering.md` lines 357-370](/docs/plans/m3-site-rendering.md)).
  Test events render their registered Themes on apps/site;
  apps/web event-route shells render warm-cream defaults until
  M4 phase 4.1. The asymmetry is acceptable because test events
  are noindex'd and carry the disclaimer banner. M4 phase 4.1
  collapses the asymmetry for Madrona.
- **Codifying the cross-app walk-through as a Playwright
  fixture.** Resolution: out of 3.3 per the scoping doc's
  rejected-alternatives walk. Playwright across two Vercel
  projects requires either staging-domain test wiring (out of
  epic scope per the epic's "remote staging Supabase project"
  Out Of Scope bullet) or local production-build emulation
  (heavier setup the M3 milestone doc deliberately did not gate
  on). Manual production walk-through plus PR-body capture is
  the milestone-bounded scope.
- **docs/open-questions.md edit for "Event landing route
  model".** Resolution: out of 3.3 per the scoping doc's
  decision rationale. The current tracking rule consolidates
  Product/live-event follow-up direction into backlog items
  ([`docs/open-questions.md` lines 23-27](/docs/open-questions.md));
  re-creating an open-questions entry purely for an in-progress
  marker would weaken the rule. The milestone-doc ownership
  claim was inaccurate; the scoping doc records the discrepancy.
- **docs/backlog.md edit closing the "Event landing page" item.**
  Resolution: out of 3.3 per the M3 milestone doc at
  [lines 433-438](/docs/plans/m3-site-rendering.md). The item
  closes at M4 phase 4.2 (Madrona content), not M3
  (infrastructure-only). Closing it now would land a misleading
  status — the entry contemplates an attendee-visible Madrona
  landing, which doesn't exist until M4.
- **Architecture.md narrative reorganization.** Resolution: out
  of 3.3. The five edit sites under Contracts are surgical (drop
  placeholder caveats, add file-inventory bullets, present-tense
  rewrite of one note, table-cell cleanup, asymmetry callout).
  Restructuring sections, reordering bullets, or rewriting
  unrelated paragraphs is post-epic.
- **README.md What Works Today section restructuring.**
  Resolution: out of 3.3. The new bullet (or extension) is
  surgical; restructuring the section is post-epic.
- **Updating M3 phase paragraphs in the epic to match the
  3-phase shape.** Resolution: out of 3.3 per the M3 milestone
  doc at
  [lines 463-468](/docs/plans/m3-site-rendering.md). The epic's
  M3 paragraphs are pre-milestone-planning estimates per AGENTS.md
  "Epic Drafting"; the milestone doc is canonical.
- **Cross-app navigation against staging or local origins.**
  Resolution: out of 3.3 per the
  "verification runs against the production origin" cross-
  cutting invariant. Local two-server setups hide cross-project
  proxy gaps.
- **Adding a recurring production smoke for cross-app
  navigation.** Resolution: out of 3.3. A recurring smoke
  belongs in a separate plan — likely a post-epic operational-
  health follow-up — not a milestone-closure phase.
- **Updating M3 phase paragraphs in
  [`docs/plans/framework-decision.md`](/docs/plans/framework-decision.md)
  or
  [`docs/plans/site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md)
  if either retains stale `M3 phase 3.4` references.**
  Resolution: out of 3.3. The milestone-doc PR already updated
  cross-doc references that named the old shape per
  [`m3-site-rendering.md` lines 451-462](/docs/plans/m3-site-rendering.md);
  any references that survived that PR are either intentional
  historical-numbering anchors or pending the next sweep.

## Risk Register

- **Cross-app walk-through surfaces a real navigation bug.** If
  the production walk-through fails any falsifier observation
  (404, auth lost, broken back button, console errors), the rule-
  deviation path triggers: the underlying bug is fixed in the
  same PR (or a fast-follow), this plan's
  "no code changes" cross-cutting invariant updates, and the
  Status flip waits. Mitigation: the walk-through script is
  surgical (six steps, four falsifier observations); each step
  has an unambiguous pass/fail signal. The fix path is well-
  trodden because the M0 phase 0.3 rewrite topology was already
  verified end-to-end and M1 phase 1.3.2 verified the cookie
  boundary against production.
- **Status flip stranded in `In progress pending prod smoke`.**
  The two-phase pattern requires a follow-through commit /
  fast-follow PR after deploy. If the implementer merges the
  in-progress PR and forgets the follow-up, M3 stays
  visible-pending-smoke indefinitely — the milestone doc, the
  epic, and this plan all carry stale Status. Mitigation: this
  plan's Execution steps name the post-deploy walk-through and
  flip-to-`Landed` as bound steps 10 and 11; the PR-merge
  reviewer holds the implementer to the follow-through; the
  milestone-doc Status block carries the same `In progress
  pending prod smoke` string so a future drift watcher catches
  the staleness.
- **Verbatim Status string typo at one of the four sites.** A
  typo in the verbatim string at any site silently weakens the
  rule's queryability invariant per AGENTS.md "Quote labels whose
  enforcement depends on exact-match matching." Mitigation: the
  Verbatim-Status-string audit walks all four sites; the
  Cross-Cutting Invariants name the binding string and the
  citation; the in-progress commit lands the four sites in one
  diff so the implementer eyeballs them together.
- **Architecture.md edit drops a sentence the doc actually
  needed.** The edit-site list under Contracts targets
  placeholder caveats, but rewriting prose can accidentally
  remove load-bearing context that was bundled with the
  caveat. Mitigation: the architecture.md edit-site completeness
  audit walks each named line range; reviewer attention catches
  any unintended drop in the diff (line ranges are ≤30 lines
  each, well within review-coherence bounds).
- **Scoping-doc deletion breaks a cross-reference.** The four
  scoping docs are referenced from each other (sibling cites)
  and from this plan's Related Docs. Deleting them all at once
  could leave broken cross-doc links elsewhere. Mitigation:
  Execution step 7's lint pass catches markdown-link issues; the
  four files are isolated in a single subdirectory (`docs/plans/
  scoping/`) that no production-doc tree references; this plan's
  Related Docs section continues to reference the scoping doc
  via path with the convention "git history preserves the
  content," which is acceptable per AGENTS.md.
- **architecture.md or README.md edit lands but doesn't render
  correctly.** Markdown-rendering subtleties (mismatched code
  fences, broken table syntax, malformed link references) can
  break the rendered doc without `npm run lint` catching it.
  Mitigation: visual review of the rendered architecture.md and
  README.md against GitHub's renderer before merge (the PR's
  Files Changed view shows the rendered preview); reviewer
  attention.
- **The `In progress pending prod smoke` string is wrong by
  the time this plan implements.** AGENTS.md and
  testing-tiers.md cite this string verbatim today; if a future
  AGENTS.md edit changes the string, this plan's lockstep would
  silently fail the new rule. Mitigation: the Execution step 1
  pre-edit gate reads AGENTS.md and testing-tiers.md fresh; if
  the verbatim string has changed at implementation time, this
  plan's Cross-Cutting Invariants and Status string update in
  the same PR per the Plan-to-PR Completion Gate.

## Backlog Impact

None. The "Event landing page for `/event/:slug`" backlog item at
[`docs/backlog.md` lines 143-147](/docs/backlog.md) closes with
M4 phase 4.2 (Madrona content), not with M3 infrastructure phases.
M3's "platform shape exists" goal needed all three M3 phases to
land — 3.1 (rendering pipeline + first test event + SSR meta),
3.2 (multi-theme proof), and 3.3 (closure + cross-app nav
verification, this phase) — before the milestone closes.

No other backlog items become unblocked by M3. M4 phases 4.1
(Madrona theme + apps/web event-route ThemeScope wiring) and 4.2
(Madrona event content) are epic milestones, not separately-
tracked backlog items, so they don't imply backlog edits.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate per AGENTS.md "Epic Drafting." 3.3's PR flips the
  Milestone Status table M3 row to `Landed` per the two-phase
  pattern.
- [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md) —
  M3 milestone doc; cross-phase invariants, decisions, risks,
  documentation-ownership map. 3.3's PR flips the top Status
  block and the Phase Status table row 3.3 to `Landed` per the
  two-phase pattern.
- [`m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 plan (rendering pipeline + first test event + basic SSR
  meta). 3.3 inherits the rendering surface unchanged.
- [`m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md) —
  3.1.2 plan (per-event OG image, twitter-image, `metadataBase`,
  `openGraph.url`, unfurl verification). 3.3 inherits the meta
  pipeline unchanged. Pattern reference for the two-phase
  Plan-to-Landed Status pattern, which 3.1.2 used for its
  unfurl validation gate.
- [`m3-phase-3-2-plan.md`](/docs/plans/m3-phase-3-2-plan.md) —
  3.2 plan (second test event with `riverside-jam` Theme). 3.3
  inherits the second-event surface unchanged. Pattern reference
  for the plan structure 3.3 follows.
- [`docs/plans/scoping/m3-phase-3-3.md`](/docs/plans/scoping/m3-phase-3-3.md) —
  scoping doc this plan compresses from. Records the docs-and-
  verification-only phase shape, the two-phase Status pattern
  decision, the architecture.md / README.md edit sites with
  rationale, and the open-questions / backlog non-edits with
  their rationale. Deletes in this PR alongside its three
  siblings; git history preserves the content.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md),
  [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md),
  [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md) —
  M3 sibling scoping docs; record the slug, theme, and image-
  pipeline conventions M3 inherited across phases. All three
  delete in this PR per the milestone doc's batch-deletion
  contract.
- [`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md) —
  M1 phase 1.3 plan. "Verification Evidence" subsection records
  the production cookie-boundary verification 3.3's walk-through
  re-confirms.
- [`docs/architecture.md`](/docs/architecture.md) — primary
  doc-currency edit target; 3.3 lands five surgical edit sites
  per Contracts.
- [`README.md`](/README.md) — secondary doc-currency edit
  target; 3.3 drops the placeholder caveat and adds a multi-
  event rendering capability bullet per Contracts.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) —
  Plan-to-Landed Gate For Plans With Post-Release Validation;
  binds the two-phase Status pattern this plan applies. Records
  the verbatim string `In progress pending prod smoke` at
  [line 141](/docs/testing-tiers.md).
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. 3.3 introduces no new framework API
  surface; no framework-doc reading required.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "Verified
  by:" annotation rule, "Quote labels whose enforcement depends
  on exact-match matching" rule (binds the verbatim
  `In progress pending prod smoke` string at
  [line 677](/AGENTS.md)), "Plan content is a mix of rules and
  estimates" rule (the plan's estimate-shaped sections carry
  the one-line preface), "Bans on surface require rendering the
  consequence" rule (which makes the production walk-through
  load-bearing for 3.3).
