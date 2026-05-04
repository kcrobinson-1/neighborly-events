# M3 Phase 3.3.2 — Demo-Mode Bypass: Client UI + Noindex + M3 Closer

## Status

In draft.

This plan opens at `In draft` per AGENTS.md "`In draft` →
`Proposed` promotion gate." The plan-drafting deferrals named in
[`scoping/m3-phase-3-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md)
"Open decisions to make at plan-drafting" must be resolved end-
to-end against current code before the `In draft` → `Proposed`
flip; the implementing PR's Status edit flips `Proposed` →
`Landed`.

## Context

Phase 3.3.2 ships the **client UI half + M3 closer** of M3's
demo-mode auth bypass. M3 itself makes three apps/web event-
route surfaces (admin, redeem, redemptions) reachable on the two
test-event slugs (`harvest-block-party`, `riverside-jam`) without
sign-in, scoped to internal-partner demos. Phase 3.2 shipped the
read-side route bypass + Edge-Function-mediated reads + read-
rendering surfaces (`DemoModeBanner` + three `DemoMode*View`
variants); phase 3.3.1 shipped the server-side write rejection
across all five mutation Edge Functions; phase 3.3.2 closes M3
by rendering the read-only consequence at every affordance
position on the bypass-rendered surfaces, emitting `noindex` on
the apps/web bypass-rendered routes at parity strength with the
apps/site server-rendered emit, satisfying the M2 → M3 forward-
pointing copy contract on the apps/site role-door cards, landing
the M3 doc-currency map across README + architecture + product +
backlog, and flipping every M3 Status block to `Landed`.

3.3.2 is the **M3-closing PR**. After it merges, M3's three
apps/web auth-gated event surfaces are reachable on the two
test-event slugs without sign-in, the bypass-rendered surfaces
honestly signal their demo-mode shape (banner from 3.2 + read-
only callout from 3.3.2 at every position where production-side
mutation controls would mount), search engines are excluded from
the bypass-rendered URLs at parity strength with apps/site's
test-event landings, and the apps/site home-page role-door cards
honestly name the new bypass option. M4 (partner-runnable demo
state — seeded codes, pre-populated monitoring, reset story)
becomes implementable on top of M3's settled bypass + allowlist
infrastructure.

What this phase touches at the conceptual level: apps/web bypass
view components (concrete read-only callout copy at the
affordance position), apps/web edge config (new `vercel.json`
`headers` array for `X-Robots-Tag`), apps/site home-page copy
(role-door cards + hero "still stubbed" paragraph), e2e fixture
(extended assertions for callout + noindex), unit-test enforcement
of the noindex slug list, and the M3-closing doc-currency map +
Status flips. The diff surface is two `DemoMode*View.tsx` edits
(admin + redemptions; the redeem variant's existing copy
already renders the consequence per Contracts and is not
touched), one `vercel.json` edit, two apps/site copy edits, one
`tests/e2e/` extension, one new Vitest file, and the closer doc
edits across README +
architecture + product + backlog + milestone-doc + epic + this
plan.

## Goal

Land the client UI consequence-rendering, the apps/web bypass-
rendered noindex emit, the M2 → M3 copy revision, and the M3
doc-currency map. Specifically:

- Each of the three bypass-rendered apps/web surfaces (admin,
  redeem, redemptions) renders a concrete read-only signal at
  the position where production-side mutation controls would
  mount. Decision 1 in the scoping doc fixes the rendered shape
  as **hidden controls + inline read-only callout naming the
  absent affordances and the resolution ("Sign in to ...")**.
  DemoModeRedeemView's existing copy already satisfies this;
  DemoModeAdminView and DemoModeRedemptionsView gain a small
  inline callout at the affordance position.
- The three apps/web bypass-rendered URL paths
  (`/event/harvest-block-party/admin`,
  `/event/harvest-block-party/game/redeem`,
  `/event/harvest-block-party/game/redemptions` and the same
  three under `riverside-jam`) emit
  `X-Robots-Tag: noindex, nofollow` from Vercel via a new
  `headers` array in `apps/web/vercel.json`. The slug list in
  the regex is hand-mirrored from `TEST_EVENT_SLUGS` and
  protected by a CI-asserted byte-equivalence test under
  `tests/web/`.
- The demo-mode-bypass Playwright fixture extends with
  read-only-callout copy assertions on the admin and
  redemptions tests (the redeem test stays as-is per scoping
  decision 1 — its existing copy already renders the
  consequence). The Playwright fixture does NOT assert
  noindex per scoping decision 3 — the load-bearing noindex
  falsifier is the Vitest config-shape assertion below, and
  the existing `playwright.demo-mode-bypass.config.ts`
  webServer (`npm run dev:web:test`) is Vite, which does not
  emit `vercel.json` headers.
- The Vitest config-shape assertion at
  `tests/web/demo-mode-bypass-noindex.test.ts` is the
  load-bearing CI falsifier for noindex: it asserts the
  `apps/web/vercel.json` `headers` entry is shape-correct
  (right `X-Robots-Tag` key/value, right `source` pattern
  shape, slug list byte-equivalent to `TEST_EVENT_SLUGS`).
  Manual `curl -sI` against a Vercel preview deploy is the
  platform-behavior confirmation in the manual-verify
  checklist; once `vercel.json` is shape-correct, the
  platform emit is a Vercel vendor guarantee per
  https://vercel.com/docs/projects/project-configuration#headers.
- The apps/site `RoleDoors` Organizer + Volunteer card
  `authCaveat` strings drop the "(or wait for demo-mode access
  in M3)" parenthetical and reframe to honestly name the new
  bypass option; the `home-roles-copy` paragraph drops "until
  demo-mode access ships;" the apps/site `HomeHero` "What's
  still stubbed" paragraph removes the "demo-mode access on
  the auth-gated surfaces (sign-in required until that bypass
  ships)" item from the stubbed list. Attendee card copy is
  unchanged. Exact wording is rendered in the dev server
  before being finalized per AGENTS.md "Bans on surface
  require rendering the consequence."
- The M3-closing doc-currency map lands: README's "current
  implemented slice" gains the demo-mode bypass capability;
  `docs/architecture.md` apps/web app-section paragraph and
  trust-boundary section gain demo-mode bypass + helper +
  noindex framing; `docs/product.md` "Current Implemented
  Slice" gains the demo-mode-reachable bullet; `docs/backlog.md`
  closes incidentally-resolved entries and adds the post-epic
  items the milestone doc names; `docs/operations.md` and
  `docs/styling.md` are NOT touched per scoping decision 6's
  read-only-browse + composes-existing-tokens framing.
  `docs/open-questions.md` was closed by 3.1 and stays closed.
- The `m2-phase-2-3-plan.md` confirmation pass is recorded in
  the PR body's Documentation Currency PR Gate section per
  scoping decision 7.
- The four M3 scoping docs delete in batch (3.1, 3.2, 3.3.1,
  3.3.2) per scoping decision 6 + AGENTS.md "Phase Planning
  Sessions → Output set."
- The milestone-doc top Status flips `Proposed` → `Landed`;
  the milestone-doc Phase Status table 3.3.2 row Status flips
  `Proposed` → `Landed` with the implementing PR populated;
  the epic Milestone Status table M3 row Status flips
  `Proposed` → `Landed` with the implementing PR populated;
  this plan's Status flips `Proposed` → `Landed` (after the
  promotion-gate walk has flipped `In draft` → `Proposed`).

After 3.3.2 merges, M3 closes. The epic's first-iteration
completion (M1 + M2 + M3 all `Landed`) is observed by a reader
of the epic's Milestone Status table; the epic's top-level
Status remains `Proposed` per the epic's "first-iteration close
alone does not flip top-level Status" rule.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
verbatim — single-source-of-truth allowlist, real events never
receive bypass, cross-app demo signaling stays honest, cross-
milestone copy contract revision lands with bypass. The fourth
invariant binds Decision 5's role-door + HomeHero copy revision
as a 3.3.2 deliverable; 3.3.2 IS the M3-closing PR. The plan
also inherits the URL contract, theme route scoping, theme
token discipline, in-place auth, auth integration, and trust-
boundary invariants from the parent epic, plus the test-event
noindex invariant from
[`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md).

**Per-phase additions** (specific to this phase's diff
surface):

- **Bypass-rendered surfaces render a concrete read-only signal
  at every position where production-side mutation controls
  would mount.** The signal is rendered, not implied — copy at
  the affordance position naming the absent affordance and the
  resolution. Per AGENTS.md "Bans on surface require rendering
  the consequence" applied to the 3.3.2 diff: the 3.2-shipped
  shape (no controls at all) extends to "no controls + inline
  callout naming what would be there." Per scoping decision 1.
- **apps/web bypass-rendered routes emit `noindex` server-side
  at parity strength with apps/site's `generateMetadata` emit.**
  The mechanism is a Vercel `headers` array entry emitting
  `X-Robots-Tag: noindex, nofollow` on the six bypass-eligible
  URL paths. Client-side meta-tag injection is explicitly NOT
  the chosen mechanism — the strength-of-guarantee answer per
  scoping decision 3 is hard, not soft. Per scoping decision 3.
- **The test-event slug list in the noindex Vercel `headers`
  regex is hand-mirrored from `TEST_EVENT_SLUGS` and protected
  by a CI-asserted byte-equivalence test.** The hand-mirror is
  the milestone-doc Cross-Phase Invariant 1 enforced-path's
  "hand-mirrored SQL constant whose value-by-value agreement
  with the TypeScript source is asserted by an exact-match test
  that fails CI on drift" rule applied to a Vercel-config
  context (regex source instead of SQL). Per scoping
  decision 8.
- **M3-closing copy revisions land with M3 bypass on the same
  PR.** Specifically: the apps/site `RoleDoors` Organizer +
  Volunteer `authCaveat` strings, the `RoleDoors`
  `home-roles-copy` paragraph, and the apps/site `HomeHero`
  "What's still stubbed" paragraph. Attendee card unchanged
  per the M2 contract. Per scoping decision 5 + milestone-doc
  Cross-Phase Invariant 4.

## Naming

- **`demo-mode-readonly-callout`** (working CSS class) — the
  inline read-only callout rendered at the affordance position
  on DemoModeAdminView and DemoModeRedemptionsView. Final class
  name and SCSS partial location are plan-drafting-time;
  consumes existing tokens per scoping decision 6 (no
  `docs/styling.md` revision).
- **`tests/web/demo-mode-bypass-noindex.test.ts`** (working
  Vitest path) — the new file that asserts the byte-equivalence
  between `TEST_EVENT_SLUGS` and the hand-mirrored slug list in
  `apps/web/vercel.json`'s `headers[].source` regex. Final path
  and exact assertion shape are plan-drafting-time per scoping
  decision 8.
- **`X-Robots-Tag: noindex, nofollow`** — the exact response-
  header value emitted on the six bypass-eligible URL paths.
  Final spelling matches the standard Google search-indexing
  control header per the
  [Google Search Central docs](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag);
  the `nofollow` directive matches the apps/site
  `robots: { index: false, follow: false }` precedent at
  [`apps/site/app/event/[slug]/page.tsx:69-71`](/apps/site/app/event/%5Bslug%5D/page.tsx).

## Contracts

### Read-only-callout rendering (per scoping decision 1)

The three bypass-rendered apps/web surfaces render a concrete
read-only signal at the position where production-side mutation
controls would mount. Specifically:

- **DemoModeAdminView**
  ([apps/web/src/admin/DemoModeAdminView.tsx](/apps/web/src/admin/DemoModeAdminView.tsx))
  — below the existing metadata `<dl>` at line 126-151, an
  inline section (working class `demo-mode-readonly-callout`)
  is added. The callout names the absent affordances (Save
  changes, Publish draft, Unpublish, draft editing) and the
  resolution ("Sign in to manage this event."). Exact copy is
  plan-drafting-time per AGENTS.md "Bans on surface require
  rendering the consequence" — copy is finalized after
  rendering it in the dev server. The "phase 3.3 introduces
  the disabled-state shape per the milestone doc's read-side
  / write-side seam" comment at lines 36-44 is revised to
  record the chosen shape ("Demo-mode shape: hidden controls
  + inline read-only callout. AGENTS.md 'Bans on surface
  require rendering the consequence' is satisfied by the
  rendered callout, not by the disabled-state pattern.").
- **DemoModeRedeemView**
  ([apps/web/src/redeem/DemoModeRedeemView.tsx](/apps/web/src/redeem/DemoModeRedeemView.tsx))
  — the existing copy at lines 14-23 already renders the
  consequence ("Redemption codes are read-only in demo mode."
  + "Redemption submission is disabled while you're browsing
  without signing in. A signed-in volunteer or organizer using
  this booth would enter a verification code on a numeric
  keypad and submit it to mark the entitlement redeemed."). No
  edit needed; plan-drafting confirms by re-reading the
  rendered surface in the dev server.
- **DemoModeRedemptionsView**
  ([apps/web/src/redemptions/DemoModeRedemptionsView.tsx](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx))
  — at the position adjacent to the redemptions list (above
  the `<ul>` at line 135 or below it; plan-drafting picks),
  an inline section (same `demo-mode-readonly-callout` class)
  is added. The callout names the absent row-detail / reverse
  affordance and the resolution ("Sign in to manage
  redemptions."). The empty-rows branch at lines 114-127
  already partially names the consequence ("A signed-in
  organizer at this event would see redeemed and reversed
  entitlements appear here as volunteers run the booth.") —
  the new callout extends this honesty to the populated-rows
  branch, where the absent reverse affordance is the gap.
  The "Phase 3.3 reintroduces them in the chosen disabled-
  state shape" comment at lines 46-54 is revised to record
  the chosen shape, parallel to DemoModeAdminView's revision.

The callout copy is rendered in the dev server before
finalizing per AGENTS.md "Bans on surface require rendering
the consequence;" the implementing PR records the final
rendered copy in the PR body's Estimate Deviations section
if it deviates from the plan-drafting copy.

### apps/web noindex emit (per scoping decision 3)

`apps/web/vercel.json` gains a top-level `"headers"` array with
one entry whose `source` pattern matches the six bypass-eligible
URL paths and whose `headers` array contains
`{"key": "X-Robots-Tag", "value": "noindex, nofollow"}`. The
final pattern shape (Vercel `source` syntax — path-to-regexp
style) is plan-drafting-time per scoping decision's deferred
"Vercel `headers` regex source shape" item. Plan-drafting reads
upstream Vercel docs at
https://vercel.com/docs/projects/project-configuration#headers
to confirm:

- `source` pattern syntax (regex literal vs. path-to-regexp).
- `headers[].key` / `headers[].value` shape.
- Interaction between `headers` and `rewrites` (the existing
  `rewrites` array at
  [`apps/web/vercel.json:2-50`](/apps/web/vercel.json) must
  continue to function unchanged; `headers` apply to the
  source path the request hits at apps/web's edge, before any
  rewrite proxies to apps/site).

The slug literals in the pattern are **hand-mirrored** from
[`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts)
`TEST_EVENT_SLUGS` (`harvest-block-party`, `riverside-jam`).
The hand-mirror is protected by the CI-asserted byte-
equivalence test below.

### Hand-mirror enforcement test (per scoping decisions 3 + 8) — load-bearing noindex CI gate

A new Vitest file (working path
`tests/web/demo-mode-bypass-noindex.test.ts`) reads
`apps/web/vercel.json` and asserts the load-bearing config-
shape properties that the Playwright fixture deliberately
does NOT cover (per scoping decision 3). This test is the
**load-bearing noindex CI gate** — the failure mode it
catches is "the vercel.json headers entry is shape-wrong";
the failure mode "Vercel platform does not honor a correct
config" is a vendor guarantee per
https://vercel.com/docs/projects/project-configuration#headers
and is confirmed by the manual `curl -sI` step in the
Validation Gate's manual-verify checklist, not by automated
test.

Assertions:

- The `headers` array exists and contains an entry whose
  `headers[].key` equals `X-Robots-Tag` and `headers[].value`
  equals `noindex, nofollow` (exact string match).
- The entry's `source` pattern matches each of the six
  bypass-eligible URL paths (admin, game/redeem,
  game/redemptions for each of the two test-event slugs),
  exercised by sample-URL match assertions against the
  pattern.
- The pattern does NOT match the gameplay route
  (`/event/<test-slug>/game`), the apps/site root (`/`), or
  any non-test-event slug (e.g.,
  `/event/madrona-launch-day/admin`), exercised by sample-
  URL non-match assertions.
- Each slug in `TEST_EVENT_SLUGS` appears verbatim in the
  pattern source (the byte-equivalence hand-mirror check
  per milestone-doc Cross-Phase Invariant 1).
- No slug-shaped string literal that is not in
  `TEST_EVENT_SLUGS` appears in the pattern source.

Final assertion shape (string-includes-based vs. regex-
parser-based vs. path-to-regexp-library-based — Vercel uses
path-to-regexp under the hood) is plan-drafting-time. If
plan-drafting picks `path-to-regexp` (the library Vercel
documents using), the URL-match / non-match assertions are
exact; otherwise plan-drafting downgrades to string-
inclusion checks against the pattern source plus a
slug-membership pass.

The test runs under `npm run test` (Vitest default) and
fails CI on any drift — slug additions to `TEST_EVENT_SLUGS`
that aren't reflected in vercel.json, accidental
non-test-event-slug additions to the pattern, header
key/value typos, or extension of the pattern to the
gameplay route.

### e2e fixture extension (per scoping decision 4)

[`tests/e2e/demo-mode-bypass.spec.ts`](/tests/e2e/demo-mode-bypass.spec.ts)
extends in place with read-only-callout copy assertions only.
The fixture does NOT assert noindex — per scoping decision 3,
the load-bearing noindex falsifier is the Vitest config-shape
assertion at
`tests/web/demo-mode-bypass-noindex.test.ts`, and the existing
[`playwright.demo-mode-bypass.config.ts:14-31`](/playwright.demo-mode-bypass.config.ts)
`webServer` runs `npm run dev:web:test` (Vite), which cannot
emit `vercel.json` headers; layering a Vercel-CLI Playwright
project for header assertions would be a novel test mechanism
with low marginal coverage gain over the Vitest assertion
(per AGENTS.md "Spike before plan for novel mechanisms" +
"Reality-check gate" → "external-service-behavior claims" reads
vendor docs as the verification pattern).

Each existing test gains a read-only-callout copy assertion
where the callout is rendered:

- **Admin test** (lines 111-140): a `getByText` or `getByRole`
  assertion against the new callout copy on
  DemoModeAdminView per Contracts "Read-only-callout
  rendering."
- **Redeem test** (lines 142-166): NO new assertion. The
  existing
  [`DemoModeRedeemView.tsx:14-23`](/apps/web/src/redeem/DemoModeRedeemView.tsx)
  copy already renders the consequence and is asserted by the
  existing test at line 156-159 ("Redemption codes are
  read-only in demo mode."). No edit needed per scoping
  decision 1.
- **Redemptions test** (lines 168-194): same shape as admin —
  a `getByText` or `getByRole` assertion against the new
  callout copy on DemoModeRedemptionsView.

The `test.describe` block at
[`tests/e2e/demo-mode-bypass.spec.ts:93`](/tests/e2e/demo-mode-bypass.spec.ts)
("demo-mode bypass — read side") name stays — the callout
copy is a read-side property.

### M2 → M3 copy revision (per scoping decision 5)

Three apps/site files revise:

- **`apps/site/components/home/RoleDoors.tsx`**
  ([RoleDoors.tsx](/apps/site/components/home/RoleDoors.tsx))
  - Line 52 Organizer `authCaveat`: drop the `(or wait for
    demo-mode access in M3)` parenthetical; reframe to name
    the new bypass option ("Sign in to manage this event, or
    browse the demo without signing in." or equivalent —
    final wording rendered in the dev server). Plan-drafting
    picks the exact words after rendering the home page.
  - Line 59 Volunteer `authCaveat`: same shape as Organizer.
  - Lines 34-39 `home-roles-copy` paragraph: drop the "until
    demo-mode access ships" clause; reframe to consistent
    state.
  - Line 41-46 Attendee card: NO edit (the M2 contract
    bound only Organizer + Volunteer; Attendee target was
    always public).
  - The block-comment at lines 19-24 ("the M3-bypass-pending
    parenthetical M3's PR will revise") is revised to record
    that the M3 close happened and the parenthetical is now
    gone; the comment becomes a historical note pointing at
    M3's bypass for future readers.
- **`apps/site/components/home/HomeHero.tsx`**
  ([HomeHero.tsx](/apps/site/components/home/HomeHero.tsx))
  - Lines 22-30 paragraph: remove the "demo-mode access on
    the auth-gated surfaces (sign-in required until that
    bypass ships)" item from the "What's still stubbed" list
    (it's no longer stubbed). If the "What's real at this
    iteration" list does not already name the demo-mode
    bypass capability, add a clause; plan-drafting picks the
    exact framing after rendering.
- The `m2-phase-2-3-plan.md` confirmation pass per Decision 7
  records the M2 contract walk in the PR body, not in any
  file edit.

### M3-closing doc-currency map (per scoping decision 6)

The 3.3.2 PR edits each of the M3-closer-owned docs the
milestone doc enumerates. **Edited by 3.3.2:**

- **`README.md`** — extend the "current implemented slice"
  bullet list at lines 22-29 with a bullet (or bullet
  extension) naming the demo-mode bypass capability.
- **`docs/architecture.md`** — two paragraph edits:
  - apps/web app-section paragraph at lines 60-61: extend to
    name the demo-mode bypass branch on the three event-
    route surfaces and the test-event slug allowlist.
  - trust-boundary / metadata section around lines 200-260:
    extend the existing apps/site noindex paragraph to name
    the apps/web `X-Robots-Tag` mechanism for the bypass-
    rendered surfaces; add a paragraph (or extend an
    existing one) naming the `evaluateDemoModeRejection`
    helper at `_shared/demo-mode-rejection.ts` with its
    structured 403 contract and the
    `shared/events/testEventAllowlist.ts` allowlist as the
    load-bearing security mechanism for the bypass.
- **`docs/product.md`** — extend the "Current Implemented
  Slice" bullet list at lines 34-49 with a bullet naming the
  demo-mode-reachable test-event admin / redeem / redemptions
  surfaces.
- **`docs/backlog.md`** — close any incidentally-resolved
  entries that reference demo-mode / test-event / M3
  capabilities; add the post-epic items the milestone doc
  Backlog Impact names ("demo-mode generalization beyond
  test-event allowlist" and "production-friendly demo-mode
  for partner-onboarding scenarios") if not already present.
  Plan-drafting greps for the exact entries.
- **`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`**:
  - top Status flips `Proposed` → `Landed`.
  - Phase Status table: 3.3.2 row Status flips `Proposed` →
    `Landed` with PR column populated. The 3.3.1 row stays
    `Landed` (already shipped).
- **`docs/plans/epics/demo-expansion/epic.md`**: Milestone
  Status table M3 row Status flips `Proposed` → `Landed` with
  the implementing PR populated. Top-level Status remains
  `Proposed` per the epic's first-iteration-close rule.
- **`docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`**
  (this file): Status flips `Proposed` → `Landed` (after the
  promotion-gate walk has flipped `In draft` → `Proposed`).

**NOT edited by 3.3.2 (per scoping decision 6's grep results):**

- **`docs/operations.md`** — no demo-mode-operational surface
  added by M3 (read-only browse, no reset story).
- **`docs/styling.md`** — no new themable / structural
  classification (callout composes existing tokens).
- **`docs/dev.md`** — no new local-dev workflow.
- **`docs/open-questions.md`** — closed by 3.1.
- **`docs/self-review-catalog.md`** — only updated if the
  3.3.2 self-review introduces a novel review surface
  warranting a new audit name; plan-drafting decides at
  Self-Review Audits resolution time.
- **`docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md`** —
  confirmation pass only, no edit.

### Scoping-doc batch deletion (per scoping decision 6)

The implementing PR deletes the four M3 scoping docs in batch:

- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md`

The M1 scoping doc at
`docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md` is
NOT in 3.3.2's batch — it is a separate cleanup item for M1's
own milestone-terminal accounting (out of M3's scope per
AGENTS.md "Scope Guardrails").

### Status flips (per scoping decision 9)

Atomic with this phase's implementing PR:

- This plan: `Proposed` → `Landed` (after the in-PR promotion-
  gate walk has flipped `In draft` → `Proposed` in a prior
  commit, or in the same PR if the PR opens after the
  promotion gate walk).
- `m3-demo-mode-auth-bypass.md` Phase Status table 3.3.2 row
  Status: `Proposed` → `Landed` with PR column populated.
- `m3-demo-mode-auth-bypass.md` top Status: `Proposed` →
  `Landed`.
- `epic.md` Milestone Status table M3 row Status: `Proposed`
  → `Landed`.

Validation Gate fully satisfiable pre-merge (no Tier 5 split).

## Files To Touch

This list is an **estimate** of the expected file inventory per
AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may revise it when a structural call requires
deviation; deviations are reported via the PR body's
`## Estimate Deviations` callout. Estimate scope is what scoping
read on 2026-05-03; plan-drafting re-verifies at implementation
time.

### New

- `tests/web/demo-mode-bypass-noindex.test.ts` — the byte-
  equivalence Vitest assertion for the noindex slug-list hand-
  mirror per Contracts "Hand-mirror enforcement test." Working
  path; plan-drafting confirms the `tests/web/` location is
  consistent with existing Vitest layout.

### Modify

- `apps/web/src/admin/DemoModeAdminView.tsx` — add inline
  `demo-mode-readonly-callout` section per Contracts "Read-
  only-callout rendering;" revise the lines 36-44 comment.
- `apps/web/src/redemptions/DemoModeRedemptionsView.tsx` — add
  inline callout section; revise the lines 46-54 comment.
- `apps/web/src/styles/` (or wherever the existing
  `demo-mode-stack` / `demo-mode-summary-list` / `demo-mode-
  banner` styles live) — add `demo-mode-readonly-callout`
  styles. Plan-drafting picks the exact partial location after
  reading the existing demo-mode SCSS partial.
- `apps/web/vercel.json` — add `headers` array entry per
  Contracts "apps/web noindex emit."
- `tests/e2e/demo-mode-bypass.spec.ts` — extend with read-
  only-callout copy assertions on the admin + redemptions
  tests only (no noindex assertion per scoping decision 3).
- `apps/site/components/home/RoleDoors.tsx` — revise the two
  `authCaveat` strings + the `home-roles-copy` paragraph + the
  block-comment at lines 19-24. Attendee card unchanged.
- `apps/site/components/home/HomeHero.tsx` — revise the
  "What's still stubbed" paragraph at lines 22-30.
- `README.md` — extend the "current implemented slice" bullet
  list per Contracts "M3-closing doc-currency map."
- `docs/architecture.md` — two paragraph edits per Contracts.
- `docs/product.md` — extend the "Current Implemented Slice"
  bullet list per Contracts.
- `docs/backlog.md` — close incidentally-resolved entries +
  add post-epic items per Contracts.
- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
  — top Status flip + Phase Status table 3.3.2 row Status flip
  + PR column population.
- `docs/plans/epics/demo-expansion/epic.md` — Milestone Status
  table M3 row Status flip + PR column population.
- `docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`
  (this file) — Status flips through `In draft` → `Proposed`
  → `Landed` lifecycle.

### Delete

- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md`

### Intentionally not touched

This list is an **estimate** of files the planner expects
implementation does not need to touch. Per AGENTS.md "Plan
content is a mix of rules and estimates," touching one of these
is a structural call the implementer is authorized to make if
the right shape requires it; deviations land in the PR's
`## Estimate Deviations` section.

- `apps/web/src/redeem/DemoModeRedeemView.tsx` — existing copy
  already renders the consequence per Contracts; no edit.
- `apps/web/src/demo/DemoModeBanner.tsx` — 3.2-shipped surface;
  unchanged.
- `playwright.demo-mode-bypass.config.ts` — unchanged; the
  Playwright fixture extension stays in
  `tests/e2e/demo-mode-bypass.spec.ts` and does not require
  config edits per scoping decisions 3 + 4 (no Vercel-CLI
  webServer added).
- `apps/web/src/pages/EventAdminPage.tsx`,
  `apps/web/src/pages/EventRedeemPage.tsx`,
  `apps/web/src/pages/EventRedemptionsPage.tsx` — bypass-
  branch dispatch unchanged; the inline callout lives inside
  the demo views, not at the dispatch site.
- `apps/web/src/redeem/useRedeemSubmit.ts`,
  `apps/web/src/redemptions/useReverseRedemption.ts`,
  `shared/events/admin.ts` `callAuthoringFunction` — client-
  side 403 `demo_mode_read_only` handler deferred per scoping
  decision 2; no edit.
- `shared/events/testEventAllowlist.ts` — source of truth;
  read-only consumer (the new Vitest test reads it).
- `supabase/functions/_shared/demo-mode-rejection.ts` — 3.3.1-
  shipped helper; unchanged.
- `apps/site/app/event/[slug]/page.tsx` — apps/site
  `generateMetadata` for test-event landings is the precedent,
  not the surface 3.3.2 modifies.
- `apps/site/components/home/RoleDoorCard.tsx` — the card
  component itself is unchanged; the `authCaveat` prop is
  consumed unchanged.
- `docs/operations.md`, `docs/styling.md`, `docs/dev.md`,
  `docs/open-questions.md` — per Contracts "M3-closing doc-
  currency map."
- `docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md` —
  confirmation pass only, no edit.
- `docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md`,
  `docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md`,
  `docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md` —
  prior phase plans, already `Landed`; unchanged.
- `docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md` —
  out of M3's scope.

## Execution Steps

This list is an **estimate** of the expected step ordering per
AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may resequence; deviations land in the PR's
`## Estimate Deviations` section.

1. **Author the inline read-only callouts** on
   DemoModeAdminView and DemoModeRedemptionsView. Add SCSS
   partial entries for the `demo-mode-readonly-callout` class
   in the existing demo-mode SCSS surface. Run `npm run dev:web`
   on each bypass route, render the consequence, finalize copy.
   Update the lines 36-44 / 46-54 comments to record the
   chosen shape.
2. **Add `apps/web/vercel.json` headers entry.** Read upstream
   Vercel docs for `headers` syntax. Choose the `source`
   pattern shape. Add the entry.
3. **Author the Vitest enforcement test** at
   `tests/web/demo-mode-bypass-noindex.test.ts`. Run
   `npm run test` and confirm passing.
4. **Extend the demo-mode-bypass Playwright spec** with
   read-only-callout copy assertions on the admin and
   redemptions tests only (no noindex assertion per scoping
   decision 3; the Vitest test from step 3 is the load-bearing
   noindex CI gate). Run `npm run test:e2e:demo-mode-bypass`
   and confirm passing.
5. **Revise apps/site `RoleDoors.tsx` and `HomeHero.tsx` copy**
   per Contracts "M2 → M3 copy revision." Run `npm run dev:site`,
   render the home page, finalize copy.
6. **Land the M3-closing doc-currency map** per Contracts.
   Walk each entry; edit the on-disk paragraph; confirm via
   re-grep that no demo-mode-pending paragraphs remain
   unrevised.
7. **Run the Self-Review Audit set** per Self-Review Audits.
   Specifically: cross-app copy contract revision audit (M2
   contract → M3 revisions); noindex emit parity audit
   (apps/web edge vs. apps/site server-rendered);
   ban-rendering audit (the Decision 1 callout actually
   renders on each bypass route in the dev server).
8. **Walk the `In draft` → `Proposed` promotion gate** per
   AGENTS.md. Re-read the plan + scoping doc end-to-end;
   resolve every plan-drafting deferral; confirm Contracts is
   decision-complete; flip Status `In draft` → `Proposed` in
   a commit (either before opening the PR or as the first PR
   commit).
9. **Edit the milestone doc** Phase Status table 3.3.2 row
   Status flip + top Status flip; the **epic doc** Milestone
   Status table M3 row Status flip; this plan's Status flip
   to `Landed`.
10. **Delete the four M3 scoping docs** in batch.
11. **Run the Validation Gate** end-to-end: `npm run lint`,
    `npm run build:web`, `npm run test`,
    `npm run test:e2e:demo-mode-bypass`. All passing.
12. **Walk the Plan-to-PR Completion Gate** — every Goal,
    Test, Validation step, Self-Review audit named here is
    satisfied or explicitly deferred-with-rationale in this
    plan.
13. **Open the PR** with the canonical body template per
    AGENTS.md.

## Commit Boundaries

This list is an **estimate** of the expected commit shape per
AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may reshuffle; deviations land in the PR's
`## Estimate Deviations` section.

1. **`feat(web): render read-only callout at the affordance
   position on bypass-rendered demo views`** — DemoModeAdminView
   + DemoModeRedemptionsView TSX edits + SCSS partial entry +
   comment refresh.
2. **`feat(web): emit X-Robots-Tag noindex on apps/web bypass-
   rendered routes via Vercel headers`** — `apps/web/vercel.json`
   edit + `tests/web/demo-mode-bypass-noindex.test.ts` enforcement
   assertion.
3. **`test(e2e): assert read-only callout copy on
   demo-mode-bypass surfaces`** — Playwright spec extension
   only (admin + redemptions callout copy; no noindex
   assertion per scoping decision 3).
4. **`feat(site): revise role-door + hero copy for M3 demo-
   mode bypass`** — RoleDoors + HomeHero edits.
5. **`docs: close M3 demo-expansion milestone — flip Status
   blocks; land doc-currency map; delete M3 scoping docs`** —
   README + architecture + product + backlog edits +
   milestone-doc + epic + this plan Status flips + scoping-doc
   batch deletion.

## Validation Gate

Per AGENTS.md "Plan-to-PR Completion Gate," all checks below
must pass before merge.

**Automated checks:**

- `npm run lint` — passes.
- `npm run build:web` — passes (apps/web builds against the
  new TSX edits and SCSS additions).
- `npm run build:site` — passes (apps/site Next.js build
  exercises the `RoleDoors.tsx` + `HomeHero.tsx` copy edits;
  required because `npm run build:web` only builds the
  apps/web Vite SPA workspace and does not catch Next-side
  type / build regressions on the apps/site surface 3.3.2
  modifies). Per
  [`docs/dev.md` Validation Commands](/docs/dev.md) which
  binds both `build:web` and `build:site` as the canonical
  validation set.
- `npm run test` — passes (Vitest; includes the new
  `tests/web/demo-mode-bypass-noindex.test.ts` assertion).
- `npm run test:e2e:demo-mode-bypass` — passes (Playwright;
  the existing `playwright.demo-mode-bypass.config.ts` runs
  with the extended fixture; the fixture asserts read-only-
  callout copy only, not noindex, per scoping decision 3).

**Manual-verify checklist (per AGENTS.md "Bans on surface
require rendering the consequence"):**

- **Render the read-only callout** on each bypass route in
  the dev server. `npm run dev:web`, navigate to
  `/event/harvest-block-party/admin`,
  `/event/harvest-block-party/game/redeem`,
  `/event/harvest-block-party/game/redemptions` (and the same
  three under `riverside-jam`); confirm each surface renders
  the inline read-only callout at the affordance position
  with the finalized copy from Decision 1.
- **Render the apps/site home page** in the dev server.
  `npm run dev:site`, navigate to `/`; confirm the Organizer
  + Volunteer cards' `authCaveat` strings name the new
  bypass option without the M3-pending parenthetical;
  confirm the `home-roles-copy` paragraph and the HomeHero
  "What's still stubbed" paragraph reflect M3-closed state;
  confirm the Attendee card copy is unchanged.
- **Inspect the Vercel-emitted noindex header** for each
  bypass route via `curl -sI` against the **PR's Vercel
  preview deploy URL** (the platform-behavior confirmation
  layer that the Vitest config-shape assertion above does not
  cover). Open one curl per bypass-eligible route — six
  curls covering admin / game/redeem / game/redemptions on
  each of `harvest-block-party` and `riverside-jam` — plus
  one negative curl against a non-bypass route (e.g.,
  `/event/madrona-launch-day/admin`) and one against the
  gameplay route (e.g.,
  `/event/harvest-block-party/game`). Each bypass-route
  response must carry `X-Robots-Tag: noindex, nofollow`;
  each negative-route response must NOT carry
  `X-Robots-Tag`. Record the curl outputs in the PR body's
  Validation section. This step is the load-bearing
  platform-behavior check; the Vitest assertion is the
  load-bearing CI config-shape check; together they
  constitute the noindex acceptance gate. (`vercel dev` is
  acceptable as a substitute target if the implementer's
  local environment supports it; preview deploy is the
  default target because it is the closest pre-merge analog
  to production-emit semantics.)

**Plan-to-PR Completion Gate walk:**

- Every Goal bullet is satisfied or deferred-with-rationale.
- Every Contracts entry is satisfied or deferred-with-
  rationale.
- Every Cross-Cutting Invariant is honored against the diff.
- Every Self-Review Audit is run.
- Every Documentation Currency PR Gate entry is landed.
- This plan's Status flipped to `Landed` in the same PR.
- The milestone-doc Phase Status table 3.3.2 row Status
  flipped to `Landed`.
- The milestone-doc top Status flipped to `Landed`.
- The epic Milestone Status table M3 row Status flipped to
  `Landed`.
- All four M3 scoping docs are deleted.
- The PR body's `## Estimate Deviations` section names every
  deviation from the estimate-shaped sections (Files To Touch,
  Execution Steps, Commit Boundaries) or reads `N/A`.
- The PR body's Documentation Currency PR Gate section
  records the M2 plan confirmation-pass outcome ("contract
  satisfied") per scoping decision 7.

## Self-Review Audits

Plan-drafting walks
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
at implementation time and binds the relevant audits here.
Likely-relevant audits (estimate, per scoping decision "Open
decisions"):

- **Cross-app copy contract revision audit.** The M2 → M3
  forward-pointing copy contract is bound by the M2 plan's
  "Per-role auth-honesty copy contract" + the milestone-doc
  Cross-Phase Invariant 4. The audit walks: (a) every
  `authCaveat` string the M2 plan named is revised; (b) the
  Attendee card is NOT revised; (c) the HomeHero "still
  stubbed" paragraph is revised even though not strictly
  bound by M2's contract (per Decision 5's expand-scope
  rationale); (d) no other apps/site copy site references
  M3-pending state.
- **Noindex emit parity audit.** The audit walks: (a) the
  apps/web `X-Robots-Tag` header fires on each of the six
  bypass-eligible URL paths; (b) the header does NOT fire on
  any non-bypass route (`/event/madrona-launch-day/admin`,
  `/event/<test-slug>/game`, `/`, `/admin/*`, etc.); (c) the
  apps/site `generateMetadata` precedent at
  `apps/site/app/event/[slug]/page.tsx` continues to emit
  `<meta name="robots">` server-side for the same test events
  (parity check); (d) the hand-mirrored slug list in
  `apps/web/vercel.json` is byte-equivalent to
  `TEST_EVENT_SLUGS` (the Vitest assertion).
- **Ban-rendering audit (per AGENTS.md "Bans on surface
  require rendering the consequence").** The audit walks:
  (a) DemoModeAdminView renders the consequence at the
  affordance position; (b) DemoModeRedemptionsView same; (c)
  DemoModeRedeemView's existing copy still satisfies; (d)
  the dev server actually renders each callout (not just
  authored).
- **Allowlist-drift audit (inherited from milestone-level
  Cross-Phase Risk).** The audit walks: (a) no per-site slug
  literal is introduced anywhere in 3.3.2's diff; (b) the
  vercel.json regex consumes the slug literals via the hand-
  mirror + CI-asserted byte-equivalence pattern; (c) no new
  TS guard site is added that bypasses the
  `isTestEventSlug` predicate.

Plan-drafting confirms the audit set against the on-disk
catalog and replaces this estimate with the final list during
the promotion-gate walk.

## Documentation Currency PR Gate

3.3.2 owns every "M3-closing phase" entry in the milestone
doc's
[Documentation Currency map](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
plus the milestone-doc top Status flip, the epic Milestone
Status table M3 row flip, this plan's Status flip, the M2 plan
confirmation pass, and the M3 scoping-doc batch deletion. Per
Contracts "M3-closing doc-currency map," each entry below is
either satisfied in this PR or explicitly skipped-with-
rationale per the milestone doc's framing:

- **`README.md`** — satisfied (extend "current implemented
  slice").
- **`docs/architecture.md`** — satisfied (apps/web app-
  section + trust-boundary edits).
- **`docs/product.md`** — satisfied (extend "Current
  Implemented Slice" bullet list).
- **`docs/backlog.md`** — satisfied (close incidentally-
  resolved + add post-epic items).
- **`docs/operations.md`** — skipped per milestone-doc
  framing (read-only-browse leaves operations unchanged).
- **`docs/styling.md`** — skipped per milestone-doc framing
  (callout composes existing tokens).
- **`docs/dev.md`** — skipped (no new local-dev workflow).
- **`docs/open-questions.md`** — closed by 3.1; 3.3.2
  confirms no re-opened entries reference demo-mode
  semantics.
- **`docs/self-review-catalog.md`** — only edited if Self-
  Review Audits introduce a novel audit name worth
  catalogueing; plan-drafting decides.
- **`m2-phase-2-3-plan.md`** — confirmation pass only;
  outcome recorded in PR body Documentation Currency PR Gate
  section.
- **`m3-demo-mode-auth-bypass.md`** — top Status flip + Phase
  Status table 3.3.2 row Status flip + PR column population.
- **`epic.md`** — Milestone Status table M3 row Status flip
  + PR column population.
- **`m3-phase-3-3-2-plan.md`** (this file) — Status flips
  through `In draft` → `Proposed` → `Landed`.
- **Scoping-doc batch deletion** — four files deleted per
  Contracts "Scoping-doc batch deletion."

## Out Of Scope

This phase explicitly does NOT ship:

- **Disabled-state mutation controls on bypass-rendered
  surfaces.** Per scoping decision 1, the chosen shape is
  hidden + inline callout, not disabled controls.
- **Click-and-error mutation controls on bypass-rendered
  surfaces.** Same.
- **Client-side handling of the 403 `demo_mode_read_only`
  response.** Per scoping decision 2, deferred-with-
  rationale; no `useRedeemSubmit` / `useReverseRedemption` /
  `shared/events/admin.ts` edit. Forward-pointing risk: a
  future phase that introduces a bypass-branch mutation-call
  surface ships the client handler then.
- **Reshaping the 3.3.1 helper response wire shape.** The
  helper's `error: "demo_mode_read_only"` field is binding
  per the 3.3.1 plan's Cross-Cutting Invariant 4; 3.3.2 does
  not amend the wire shape to match the existing redemption
  failure-body convention.
- **Client-side meta-tag injection for noindex.** Per scoping
  decision 3, the chosen mechanism is server-emitted via
  Vercel `headers`; client-side injection is the rejected
  option (strictly weaker).
- **Moving bypass shells to apps/site.** Per scoping
  decision 3, app-boundary reshape is rejected.
- **Build-time codegen of the noindex slug list from
  TypeScript source.** Per scoping decision 8, hand-mirror +
  Vitest assertion is the chosen path; codegen reopens only
  if plan-drafting surfaces a strong reason.
- **`docs/operations.md`, `docs/styling.md`, `docs/dev.md`
  edits.** Per scoping decision 6's grep results.
- **M1 scoping doc deletion.** Out of M3's scope per AGENTS.md
  "Scope Guardrails;" handled at M1's terminal accounting.
- **Demo-mode framework generalization beyond test-event
  allowlist.** Two slugs only; recorded as a post-epic
  backlog item per the milestone doc.
- **Pre-populated demo state — seeded codes, monitoring,
  reset story.** M4's deliverables, deferred at epic
  drafting time.
- **Demo-mode write paths against real tables.** Per the
  3.1-bound read-only-for-M3 invariant; B-shaped and
  C-shaped semantics deferred to second-iteration M4–M6
  scoping.
- **Second-iteration scoping pass against partner feedback.**
  Unblocked by M3's close; out of M3's scope.

## Risk Register

References the milestone doc's
[Cross-Phase Risks](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
plan-implementation-level risks named here.

- **Vercel `headers` syntax mismatch.** The `source` pattern
  syntax for Vercel `headers` is path-to-regexp-style, not
  literal regex. Mistyped pattern syntax could either over-
  match (accidentally noindexing non-bypass routes) or
  under-match (missing one of the six bypass-eligible URL
  paths). Mitigation: plan-drafting reads upstream Vercel
  docs for the exact `source` syntax; the Vitest enforcement
  test asserts byte-equivalence with `TEST_EVENT_SLUGS` plus
  positive/negative URL-match assertions (admin, game/redeem,
  game/redemptions match; gameplay route + non-test slugs
  don't), which catches both missing-slug and missing-route
  regressions; the manual `curl -sI` step against the Vercel
  preview deploy catches pattern-syntax errors that escape
  the unit test by exercising the real platform emit per the
  Validation Gate's manual-verify checklist.
- **Vitest config-shape assertion drifts from actual Vercel
  emit semantics.** The Vitest assertion is the load-bearing
  noindex CI gate per Contracts "Hand-mirror enforcement
  test." The risk: Vitest checks the static config shape but
  cannot directly observe what the Vercel platform emits at
  request time, so a Vercel-side semantics change (e.g., a
  syntax-deprecation in `headers[].source` patterns, a
  precedence shift between `headers` and `rewrites`) could
  pass the Vitest assertion while breaking the actual emit.
  Mitigation: the manual-verify checklist names `curl -sI`
  against the PR's Vercel preview deploy as the explicit
  platform-behavior confirmation, exercised on every
  bypass-eligible route plus negative cases per Validation
  Gate; the curl outputs are recorded in the PR body, so a
  drift between config-shape and platform-emit is caught
  pre-merge by a human review of the recorded outputs. Per
  AGENTS.md "Falsifiability check" the manual-verify step's
  falsifier is "X-Robots-Tag header missing on a bypass
  route, OR present on a non-bypass route" — both are
  observable in the curl output. The Vitest assertion +
  manual-verify pair is the resolved acceptance gate;
  Playwright is intentionally NOT layered for noindex per
  scoping decision 3 (Vite cannot emit `vercel.json`
  headers; adding a `vercel dev`-orchestrated Playwright
  project would be a novel test mechanism per AGENTS.md
  "Spike before plan" with low marginal coverage gain).
- **Future bypass-branch mutation-call surface inherits a
  generic-error fallback.** Per scoping decision 2's defer,
  no client 403 handler ships in 3.3.2. If a future phase
  introduces a bypass-branch mutation-call surface (e.g.,
  shifts from Decision 1 Option A to Option B / C), the
  client-side error handling falls back to the existing
  `try/catch + readSupabaseErrorMessage` pattern, which would
  surface the `Demo mode — sign in to make changes.` server
  message but as a generic toast / inline error rather than a
  partner-honest dedicated demo-mode error path. Mitigation:
  the future phase's plan-drafting reads this Out Of Scope
  entry and ships the client handler against an actually-
  rendered surface; the 3.3.1 helper's `error:
  "demo_mode_read_only"` discriminator is stable for that
  phase to switch on.
- **Copy revision rendered without dev-server visual check.**
  AGENTS.md "Bans on surface require rendering the
  consequence" applies to the M2 → M3 copy revision (the
  "you can browse the demo without signing in" framing is a
  surface-banning + replacement edit). Mitigation: the
  manual-verify checklist explicitly names rendering both
  the apps/site home page and each apps/web bypass route in
  the dev server; the Self-Review "Cross-app copy contract
  revision audit" walks the M2 contract against the
  rendered surfaces.
- **Scoping-doc batch deletion accidentally drops in-flight
  content.** The four M3 scoping docs are deleted in this
  PR; if 3.1 / 3.2 / 3.3.1 had unresolved content that
  3.3.2 inherited and is supposed to absorb, deleting them
  before absorbing would lose the content. Mitigation:
  scoping decision 6's deletion list explicitly enumerates
  the four files; the implementing PR's Self-Review walks
  each scoping doc end-to-end one final time before
  deletion to confirm no unresolved deferred-to-3.3.2 item
  remains.

## Backlog Impact

References the milestone doc's
[Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
and the epic's
[Backlog Impact](/docs/plans/epics/demo-expansion/epic.md).

**Items closed by 3.3.2's PR:**

- M3 itself closes. The capability "demo-mode access to admin
  / redeem / redemptions surfaces for test-event slugs without
  sign-in; non-test-event slugs continue to require auth"
  becomes the post-M3 state.
- The M2 → M3 forward-pointing copy contract from
  [`m2-phase-2-3-plan.md` Per-role auth-honesty copy contract](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
  is satisfied per Decision 5's revisions.

**Items unblocked by 3.3.2's PR:**

- M4 (partner-runnable demo state — seeded codes, pre-
  populated organizer monitoring, reset story for booth
  runnability) becomes implementable on top of M3's settled
  bypass + allowlist infrastructure.
- The second-iteration scoping pass against partner feedback
  the epic Risk Register names becomes runnable; it reopens
  the data-access-semantics decision (Decisions B / C — both
  not-rejected per the 3.1 plan) with M3's actually-shipped
  state as the input.

**Items added by 3.3.2's PR for post-M3 work:**

- Per the milestone doc Backlog Impact, "demo-mode
  generalization beyond the test-event allowlist" is added
  as a post-epic item if not already present.
- Per the milestone doc Backlog Impact, "production-friendly
  demo-mode for partner-onboarding scenarios" likewise.
- The forward-pointing client-side 403 handler item from
  Decision 2's Out Of Scope ("if a future phase introduces a
  bypass-branch mutation-call surface, ship the client
  handler then") is recorded in the backlog as a phase-time
  trigger, not a standalone work item.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.3.2 row at the Phase Status
  table flips to `Landed` at this PR's Status edit; top
  Status flips to `Landed` at the same PR.
- [`scoping/m3-phase-3-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the nine scoping decisions absorbed
  above; deletes in batch with the three sibling M3 scoping
  docs at this PR.
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–6 are the
  data-access-semantics contract; item 6 is the UI consequence-
  rendering contract Decision 1 settles.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. The bypass-rendered surfaces
  (DemoModeBanner + DemoMode*View) and the allowlist module
  shipped here are the immediate inputs this phase consumes
  and extends.
- [`m3-phase-3-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md) —
  predecessor phase plan. The structured 403 wire shape and
  the helper at `_shared/demo-mode-rejection.ts` are the
  server contract Decision 2 defers client-side handling for.
- [`m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md) —
  predecessor M2 phase plan. The "Per-role auth-honesty copy
  contract" is the M2 → M3 forward-pointing contract
  Decision 5 satisfies and Decision 7 confirmation-passes.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Milestone Status table M3 row
  flips at the implementing PR.
- [`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx) —
  3.2-shipped surfaces; 3.3.2 modifies two of three.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — apps/web
  Vercel deploy config; gains a `headers` array entry per
  Decision 3.
- [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx),
  [`apps/site/components/home/HomeHero.tsx`](/apps/site/components/home/HomeHero.tsx) —
  M2-shipped copy sites Decision 5 revises.
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts) —
  source of truth for the allowlist; consumed by
  `isTestEventSlug` (3.2) + `evaluateDemoModeRejection` (3.3.1)
  + the new noindex-enforcement Vitest test (3.3.2).
- [`tests/e2e/demo-mode-bypass.spec.ts`](/tests/e2e/demo-mode-bypass.spec.ts),
  [`playwright.demo-mode-bypass.config.ts`](/playwright.demo-mode-bypass.config.ts) —
  Decision 4 extends.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx) —
  apps/site server-rendered noindex precedent the apps/web
  edge-emitted mechanism matches at parity strength.
- [`docs/architecture.md`](/docs/architecture.md),
  [`README.md`](/README.md),
  [`docs/product.md`](/docs/product.md),
  [`docs/backlog.md`](/docs/backlog.md) — M3-closer doc-
  currency targets per Decision 6.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's
  diff surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-
  count predictions need a branch test," "Scoping owns / plan
  owns," "Reality-check gate between scoping and plan,"
  "Plan-to-PR Completion Gate," "`In draft` → `Proposed`
  promotion gate," "Plan content is a mix of rules and
  estimates," "Bans on surface require rendering the
  consequence," "Scope Guardrails."
