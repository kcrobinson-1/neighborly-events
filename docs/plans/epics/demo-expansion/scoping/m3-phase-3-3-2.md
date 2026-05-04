# Scoping — M3 phase 3.3.2 (demo-mode bypass: client UI + noindex + M3 closer)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the M3-terminal PR (which is **this phase's PR** — 3.3.2
is the M3-closer per
[`scoping/m3-phase-3-3-1.md` decision 1](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md)).
Durable cross-phase content absorbs into
[m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
durable per-phase content absorbs into
[`m3-phase-3-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md).

## Phase summary

Phase 3.3.2 ships the **client UI half + M3-closer** of M3's
demo-mode auth bypass: the apps/web bypass-rendered surfaces
each render a concrete read-only signal at the affordance
position where production-side mutation controls would mount,
the apps/web bypass-rendered routes emit `noindex` via a
mechanism whose strength matches apps/site's server-rendered
emit (the milestone doc's deferred decision settles here per
the strength-of-guarantee question), the demo-mode-bypass
Playwright fixture extends with noindex + read-only-signal
assertions, the apps/site M2 role-door card copy and the
apps/site `HomeHero` "what's still stubbed" honesty paragraph
are revised to reflect that demo-mode access has shipped, the
M3-closing doc-currency map (README, architecture, product,
backlog) is landed, the milestone-doc top Status flips from
`Proposed` to `Landed`, the epic Milestone Status table's M3
row flips from `Proposed` to `Landed`, this plan's Status flips
from `In draft` → `Proposed` → `Landed` across the
implementation lifecycle, and the four M3 scoping docs delete
in batch.

3.3.2 is the **M3-closing PR**: every "Owned by the M3-closing
phase" entry in the milestone doc's Documentation Currency
section travels with this phase, and the M2 → M3 forward-
pointing copy contract from
[`m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
"Per-role auth-honesty copy contract" is satisfied here.

After 3.3.2 merges, M3 closes and the demo-expansion epic's
first-iteration completion (M1 + M2 + M3 all `Landed`) is
observed by a reader of the epic's Milestone Status table. Per
the epic's note ("first-iteration close alone does not flip
top-level Status"), the epic's top-level Status remains
`Proposed`; that flip is reserved for the second-iteration
scoping pass against partner feedback.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. Decisions
absorb into the plan's contract sections during plan-drafting;
deliberation prose (rejected alternatives) lives here through
scoping's transient lifetime.

### 1. Mutation-control disabled-state shape — codify the 3.2-shipped "hidden + inline read-only callout" pattern; refine the inline copy at the affordance position [Resolved → Option A]

**What was decided.** What shape the bypass-rendered surfaces
take at the position where production-side mutation controls
would mount. The milestone-doc deferred decision named three
candidates: disabled, hidden, click-and-error.

**Why it mattered.**
[`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
declared "exact shape (disabled / hidden / click-and-error) is
deferred to phase 3.2+ plan-drafting against rendered
components per AGENTS.md 'Bans on surface require rendering the
consequence.'" Phase 3.2 shipped the hidden shape with code
comments naming "phase 3.3 introduces the disabled-state shape"
([`DemoModeAdminView.tsx:36-44`](/apps/web/src/admin/DemoModeAdminView.tsx),
[`DemoModeRedemptionsView.tsx:46-54`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)).
3.3.2 is when this decision actually resolves; the 3.3.1 plan's
Out Of Scope explicitly hands it to 3.3.2.

The load-bearing AGENTS.md rule is "Bans on surface require
rendering the consequence." A surface that bans mutation
controls must render *what would be there*, not just omit it.
The 3.2-shipped surfaces partially satisfy this — DemoModeRedeemView
renders a heading "Redemption codes are read-only in demo mode."
plus an explanatory paragraph
([`DemoModeRedeemView.tsx:14-23`](/apps/web/src/redeem/DemoModeRedeemView.tsx));
DemoModeAdminView renders metadata only with no inline
explanation of what's absent
([`DemoModeAdminView.tsx:120-152`](/apps/web/src/admin/DemoModeAdminView.tsx));
DemoModeRedemptionsView renders rows with no inline explanation
at the row-detail position
([`DemoModeRedemptionsView.tsx:129-149`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)).

**Options considered.**

1. **Hidden + inline read-only callout (Option A — codify the
   3.2-shipped shape).** The bypass-rendered surfaces continue
   to render NO mutation controls. At the position where the
   production view's controls would mount, the surface renders
   a concrete read-only callout — a small inline message naming
   what affordances would appear and saying "Sign in to make
   changes." DemoModeAdminView gains an inline callout below the
   metadata `<dl>` naming Save / Publish / Unpublish; DemoModeRedeemView
   keeps its existing static-keypad-shell paragraph; DemoModeRedemptionsView
   gains an inline callout above (or below) the redemptions list
   naming the absent reverse affordance. The "intentionally
   absent — phase 3.3 introduces the disabled-state shape" code
   comments are revised to "demo-mode shape: hidden controls +
   inline read-only callout" with the AGENTS.md "Bans on
   surface require rendering the consequence" rationale named
   in-line.
2. **Disabled controls (Option B).** Each bypass-rendered
   surface mirrors the production view's mutation-control
   inventory but renders each control with `disabled={true}` +
   an aria-hint or tooltip naming demo mode. Admin view grows
   to render `Save changes`, `Publish draft`, `Unpublish` as
   disabled buttons; redeem view grows to render the keypad
   with disabled digit buttons + a disabled `Submit code`
   button; redemptions view grows to render a `Reverse this
   redemption` affordance per row, all disabled.
3. **Click-and-error (Option C).** Same as Option B but the
   controls are not disabled — clicking fires the mutation,
   and the 403 `demo_mode_read_only` response is caught by an
   error handler that renders a toast / banner naming demo
   mode. The 3.3.1 server-rejection contract is exercised on
   every click; partner experience is "click feels normal,
   error explains why."

**Pros / cons.**

- *Option A.* Pro: minimal-edit (DemoModeRedeemView already
  ships this shape; DemoModeAdminView and DemoModeRedemptionsView
  add one short callout each). Pro: review surface stays small
  — three views, three short copy edits; no growth in
  mutation-call-site coupling, no new disabled-state styling
  surface, no new a11y considerations beyond existing copy. Pro:
  "hidden + named consequence" satisfies the AGENTS.md ban-
  rendering rule honestly — partners see "Sign in to make
  changes" copy at the affordance position, which is a more
  direct rendering of the consequence than a dimmed button. Pro:
  the 3.3.1 server rejection becomes pure defense-in-depth
  against curl-style direct-API attackers, not a load-bearing
  client-error-handler dependency. Con: the partner who reads
  "what's a Save button look like in this surface?" gets only
  the copy, not the visual; partners using the demo to evaluate
  the production UI have to imagine the controls.
- *Option B.* Pro: partners see the actual control inventory
  (visually) and understand the production layout from the
  demo. Con: DemoModeAdminView grows from ~155 lines to mirror
  the full production EventAdminWorkspace control inventory
  (Save, Publish, Unpublish, plus question-edit affordances)
  with disabled-state styling at every site; review surface
  expands materially, and disabled-state-component drift
  becomes a maintenance vector — every production-side control
  addition requires a parallel demo-side disabled mirror. Con:
  the disabled state visually communicates "these controls
  exist" without communicating "you wouldn't be allowed to use
  them" — a magic-link-required hint is needed alongside
  anyway, which is the same copy as Option A. Con: AGENTS.md
  "Don't add features beyond what the task requires" — the
  partner-evaluation use case named above is hypothetical and
  already addressed by the M2 RoleDoors + the production-side
  demo of these surfaces *while signed in*.
- *Option C.* Pro: client-side handler exercises the 3.3.1
  server contract end-to-end; partners get an honest
  "rejected" experience matching the production-rejection
  shape for unauthenticated callers. Con: clicking fires a
  network call that always fails — exposes the demo to
  inadvertent latency / error-toast spam; the demo views are
  served to anon visitors who would not normally fire mutation
  calls in production (in production, anon visitors hit the
  `SignInForm` first). Con: Cross-Phase Invariant 3 ("cross-
  app demo signaling stays honest") is satisfied either way,
  but Option C's "click-then-toast" is a *less* honest signal
  than Option A's "the affordance is absent and named as
  absent." Con: the hooks the controls would call
  (`useRedeemSubmit`, `useReverseRedemption`,
  `useSelectedDraft` → `shared/events/admin.ts`) are
  authenticated paths — none of them mount in the bypass
  branch today (the bypass branch is gated on
  `sessionState.status === "signed_out"` per
  [`EventRedeemPage.tsx:435-446`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`EventAdminPage.tsx:394`](/apps/web/src/pages/EventAdminPage.tsx),
  [`EventRedemptionsPage.tsx:697`](/apps/web/src/pages/EventRedemptionsPage.tsx)),
  so wiring them up just to fire and fail is contrived.

**Came down to.** Whether the partner-evaluation use case for
seeing the actual control inventory in disabled state is worth
the review-surface and maintenance-vector cost. The user-named
seam in
[`scoping/m3-phase-3-3-1.md` decision 1](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md)
is "isolate the trust-boundary work from the browser-shape
work" — the trust-boundary work is now landed (3.3.1), and the
browser-shape work in 3.3.2 should ship the smallest
internally-coherent shape that renders the consequence. Option
A is that shape: it exists today, it just needs the
DemoModeAdminView and DemoModeRedemptionsView callouts
strengthened to fully render the consequence at every
affordance position.

**Resolution.** **Option A — codify hidden + inline read-only
callout.** Specifically:

- **DemoModeAdminView**: below the existing metadata `<dl>`,
  add a small inline section (working class
  `demo-mode-readonly-callout`) with copy naming the absent
  affordances ("Save changes", "Publish draft", "Unpublish")
  and the resolution ("Sign in to manage this event."). The
  draft text is plan-time per AGENTS.md "Bans on surface
  require rendering the consequence" — copy is finalized
  after rendering it in the dev server.
- **DemoModeRedeemView**: keep the existing
  [`DemoModeRedeemView.tsx:14-23`](/apps/web/src/redeem/DemoModeRedeemView.tsx)
  copy unchanged — it already renders the consequence
  ("Redemption codes are read-only in demo mode.", "Redemption
  submission is disabled..."). No edit needed.
- **DemoModeRedemptionsView**: above (or adjacent to) the
  redemptions list, add an inline callout naming the absent
  row-detail / reverse affordance and the resolution ("Sign in
  to manage redemptions."). The existing rows-empty branch at
  [`DemoModeRedemptionsView.tsx:114-127`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)
  already names a partial consequence — the full consequence
  (the reverse affordance is absent on populated rows) needs
  the new callout.
- The "phase 3.3 introduces the disabled-state shape" comments
  in DemoModeAdminView and DemoModeRedemptionsView are revised
  to record the chosen shape ("Demo-mode shape: hidden
  controls + inline read-only callout. AGENTS.md 'Bans on
  surface require rendering the consequence' is satisfied by
  the rendered callout, not by the disabled-state pattern.").

**Verified by:**
[`DemoModeAdminView.tsx:36-44`](/apps/web/src/admin/DemoModeAdminView.tsx)
(the 3.2-shipped "phase 3.3 introduces" comment that 3.3.2
revises);
[`DemoModeRedemptionsView.tsx:46-54`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)
(same shape on the redemptions surface);
[`DemoModeRedeemView.tsx:14-23`](/apps/web/src/redeem/DemoModeRedeemView.tsx)
(the inline-consequence-rendering pattern Option A
generalizes);
AGENTS.md "Bans on surface require rendering the consequence"
rule;
[`EventRedeemPage.tsx:435-446`](/apps/web/src/pages/EventRedeemPage.tsx)
(the `signed_out` + `isTestEventSlug(slug)` gate that proves
mutation hooks never mount in the bypass branch);
[`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the original deferral framing).

### 2. Client-side handling of the 403 `demo_mode_read_only` response — defer with rationale (no client error-handler) [Resolved → Option A]

**What was decided.** Whether apps/web's mutation-call hooks
(`useRedeemSubmit`, `useReverseRedemption`,
`shared/events/admin.ts`'s `callAuthoringFunction`) gain a 403
`demo_mode_read_only` branch in 3.3.2.

**Why it mattered.** The 3.3.1-shipped helper returns a
structured 403 body
`{ error: "demo_mode_read_only", message: "..." }`
([`demo-mode-rejection.ts:22-25`](/supabase/functions/_shared/demo-mode-rejection.ts)).
The existing apps/web error-discriminator pattern reads
`parsedError.details === "not_authorized"` (see
[`useRedeemSubmit.ts:135`](/apps/web/src/redeem/useRedeemSubmit.ts),
[`useReverseRedemption.ts:182`](/apps/web/src/redemptions/useReverseRedemption.ts))
— a different field name from the helper's `error`
discriminator. If 3.3.2 wires client handlers, it must
reconcile the two field-name conventions.

**Options considered.**

1. **Defer with rationale — no client handler in 3.3.2 (Option
   A).** No mutation hook gains a 403 `demo_mode_read_only`
   branch. The 403 server response is pure defense-in-depth
   against curl-style direct-API attackers; in normal apps/web
   flow the 403 never reaches a hook because the bypass branch
   gates on `signed_out`, mutation hooks mount only in the
   authenticated branch, and authenticated callers carry a
   Bearer token that the helper's
   [`demo-mode-rejection.ts:70-72`](/supabase/functions/_shared/demo-mode-rejection.ts)
   short-circuits to `null` before the slug check fires.
2. **Wire a client handler with the helper's existing wire
   shape (Option B).** Each mutation hook gains a 403 branch
   that switches on `parsedError.error === "demo_mode_read_only"`.
   The two redemption hooks gain a new `result:
   "demo_mode_read_only"` outcome alongside `not_authorized`
   and `not_found`; `callAuthoringFunction` learns to
   recognize the demo-mode error code and surface a friendly
   message.
3. **Standardize the helper's wire shape to use `details` and
   wire the client handler (Option C).** The 3.3.1 helper is
   amended to return
   `{ details: "demo_mode_read_only", error: "Demo mode — sign in to make changes." }`
   matching the existing
   [`redeem-entitlement/index.ts:131-134`](/supabase/functions/redeem-entitlement/index.ts)
   `createFailureBody` shape; the client handlers gain the new
   `details` value alongside `not_authorized` / `not_found`.

**Pros / cons.**

- *Option A.* Pro: zero apps/web client-side surface in 3.3.2
  for the 403 branch. Pro: matches the load-bearing reality —
  the 403 never reaches a normal apps/web mutation call site
  because the bypass and authenticated paths are mutually
  exclusive (`Verified by:`
  [`EventAdminPage.tsx:394`](/apps/web/src/pages/EventAdminPage.tsx)
  pattern). Pro: the 3.3.1 helper's contract stays binding;
  Decision 1 (hidden controls) means there's no rendered
  surface that fires a mutation call for the 403 to handle.
  Con: a future code path that DOES fire a mutation call from
  the bypass branch (e.g., if a follow-up phase moves to
  Option B / C from Decision 1) inherits a generic-error
  fallback, not a friendly demo-mode message. Recorded as a
  forward-pointing risk.
- *Option B.* Pro: client/server contract closes end-to-end;
  defense-in-depth is observable through apps/web. Con: the
  client handler is dead code today (no rendered surface
  fires the mutation in the bypass branch); shipping dead code
  burns review attention without partner-visible benefit. Con:
  introduces a field-name asymmetry inside apps/web — the
  same hook switches on `details` for one error code and
  `error` for another; the code reviewer's mental model has
  to track both.
- *Option C.* Pro: field-name uniformity across all 403
  branches. Con: amends a 3.3.1 contract that was settled and
  merged; the 3.3.1 self-review walked the helper shape and
  the implementing PR resolved the body-not-Response trade
  during the promotion-gate self-review per
  [`m3-phase-3-3-1-plan.md` Contracts → Helper shape](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md).
  Re-shaping the helper response to match the redemption
  failure-body convention is plausible but not load-bearing
  for 3.3.2 — the helper's `error` field is the contract per
  Cross-Phase Invariant 4 in the 3.3.1 plan. Reopening this
  for client-side ergonomics is the wrong seam.

**Came down to.** Whether the 403 client handler is load-
bearing for 3.3.2 given the chosen Decision 1 shape. With
hidden controls, no apps/web surface ever fires a mutation
call from the bypass branch; the 403 client handler is dead
code on the apps/web side. The 3.3.1 server-rejection contract
is independently valuable as defense-in-depth against direct-
API attackers (curl, automated scrapers, future dev tools that
issue mutation calls without going through the React app), and
the 3.3.1 Deno tests assert the structured 403 body shape on
every mutation function — that coverage stands without an
apps/web mirror.

**Resolution.** **Option A — defer with rationale.** No
mutation hook gains a 403 `demo_mode_read_only` branch in
3.3.2. The plan's Out Of Scope names this defer with the
forward-pointing risk recorded in the Risk Register. If a
future phase introduces a bypass-branch mutation-call surface
(Option B / C from Decision 1), the client handler ships then
against an actually-rendered surface.

**Verified by:**
[`EventRedeemPage.tsx:435-446`](/apps/web/src/pages/EventRedeemPage.tsx),
[`EventAdminPage.tsx:394`](/apps/web/src/pages/EventAdminPage.tsx),
[`EventRedemptionsPage.tsx:697`](/apps/web/src/pages/EventRedemptionsPage.tsx)
(the `signed_out` + `isTestEventSlug(slug)` gate proves the
mutation hooks never mount in the bypass branch);
[`useRedeemSubmit.ts:135-149`](/apps/web/src/redeem/useRedeemSubmit.ts),
[`useReverseRedemption.ts:182-196`](/apps/web/src/redemptions/useReverseRedemption.ts)
(the `parsedError.details` discriminator pattern that would
need extension under Options B / C);
[`demo-mode-rejection.ts:65-92`](/supabase/functions/_shared/demo-mode-rejection.ts)
(the helper's Bearer-skip path that proves authenticated
callers never reach the slug check);
[`m3-phase-3-3-1-plan.md` Cross-Cutting Invariants](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md)
(invariant 4: the 403 body's `error` field is binding —
re-shaping is out of scope for 3.3.2);
AGENTS.md "Don't add features, refactor, or introduce
abstractions beyond what the task requires" rule.

### 3. apps/web noindex emit — server-side `X-Robots-Tag` via Vercel `headers` config in `apps/web/vercel.json` [Resolved → Option B]

**What was decided.** The mechanism by which apps/web bypass-
rendered routes emit `noindex`. The milestone-doc deferred
decision named "strength of guarantee, not implementation
feasibility" as the load-bearing question; the load-bearing
sub-question is **how strong does the guarantee need to be?**
Two cases:

- *Soft demo-hygiene signal* — cost of a missed tag is partner
  confusion or one stray search result; a client-side
  `useEffect` meta-tag injection suffices.
- *Hard invariant equivalent to apps/site server-rendered
  metadata* — cost of a missed tag is a search engine indexing
  the test-event surfaces, which violates the trust boundary
  the milestone protects.

**Why it mattered.** apps/web is a Vite + React SPA; its
`<head>` is static `index.html` (built once, served as-is).
There is no `generateMetadata` analog. The two viable
mechanisms are **(a)** a client-side meta-tag-injection
`useEffect` hook on the bypass-rendered surfaces (soft) or
**(b)** an edge-emitted `X-Robots-Tag` HTTP response header
applied via Vercel's `headers` config to path patterns
matching `/event/<test-slug>/{admin,game/redeem,game/redemptions}`
(hard).

**Options considered.**

1. **Client-side `useNoindex()` hook (Option A — soft).** A
   shared hook (working name) calls `useEffect` to append
   `<meta name="robots" content="noindex, nofollow">` to
   `document.head` when the bypass branch mounts and removes
   it on unmount. Three call sites (DemoModeAdminView,
   DemoModeRedeemView, DemoModeRedemptionsView, or higher up
   in the page-component bypass branches before they dispatch
   to the demo views).
2. **Server-side `X-Robots-Tag` via `apps/web/vercel.json`
   `headers` array (Option B — hard).** Vercel `headers` is
   appended to apps/web's deploy config to emit
   `X-Robots-Tag: noindex, nofollow` on response paths
   matching the regex
   `^/event/(harvest-block-party|riverside-jam)/(admin|game/redeem|game/redemptions)/?$`
   (final regex shape plan-time). The header fires before any
   client-side JavaScript runs, applies to every client
   including non-JS crawlers, and matches apps/site's
   `generateMetadata` server-emit behavior at parity strength.
   The slug literals in the regex are **hand-mirrored** from
   `shared/events/testEventAllowlist.ts` and protected by a
   small Vitest assertion that reads `vercel.json`, parses the
   regex, and asserts byte-for-byte agreement with
   `TEST_EVENT_SLUGS` per the milestone-doc Cross-Phase
   Invariant 1 enforced-path rule.
3. **Move the bypass-rendered shells to apps/site (Option C).**
   The bypass shells mount at apps/site under `generateMetadata`,
   inheriting the apps/site server-emit pattern. Reject:
   reshapes the apps/web vs. apps/site app boundary mid-
   epic; the ThemeScope wiring shipped by M1 phase 1.1 is
   apps/web-side; the bypass surfaces are deep apps/web
   shells with hooks that are not portable to apps/site
   without significant rewriting.

**Pros / cons.**

- *Option A.* Pro: zero deploy-config edit; ships in a single
  apps/web TS edit. Pro: the test surface is apps/web-local
  (Playwright meta-tag assertion). Con: client-side meta-tag
  injection fires *after* React mounts; crawlers that skip JS
  or fetch only the initial HTML response will not see the
  tag (the SPA's `index.html` is unchanged regardless of
  route). Con: an attacker / partner / crawler can fetch the
  response with `curl -sI` and see no `X-Robots-Tag` header;
  apps/site emits `<meta name="robots">` server-side and is
  visible in the initial HTML response — apps/web client-side
  injection is *strictly weaker* than apps/site's mechanism.
  Con: the milestone doc invariant inherited from
  [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  binds noindex on test events; if apps/web's mechanism is
  weaker than apps/site's, the invariant says "test events
  are noindex" but the surfaces *aren't*, which is the
  inverse-of-honest signal Cross-Phase Invariant 3 protects
  against.
- *Option B.* Pro: server-emitted via Vercel edge; fires for
  every client including non-JS crawlers; visible in `curl -sI`
  output (the falsifier the validation gate exercises). Pro:
  matches apps/site's parity strength — both apps/site
  test-event landings and apps/web test-event bypass shells
  emit noindex from the response head, just via different
  mechanisms (Next.js `generateMetadata` server-rendered HTML
  vs. Vercel edge response header). Pro: `vercel.json`
  `headers` is a documented Vercel mechanism (not a novel
  pattern) — `Verified by:` the upstream Vercel docs at
  https://vercel.com/docs/projects/project-configuration#headers.
  Con: hand-mirrored slug list in the regex needs the CI-
  asserted byte-equivalence test the milestone doc Cross-Phase
  Invariant 1 binds; this is one extra Vitest assertion. Con:
  Playwright assertion needs the Vercel deploy to fire, but
  the existing
  [`playwright.demo-mode-bypass.config.ts`](/playwright.demo-mode-bypass.config.ts)
  uses `npm run dev:web:test` (Vite dev server), which does
  NOT emit `vercel.json` `headers` — the dev server self-
  serves its own asset paths and bypasses the Vercel layer.
  The noindex assertion needs either a `vercel dev`-shaped
  test target or a unit-test layer asserting `vercel.json` is
  shaped correctly.
- *Option C.* Rejected on app-boundary-reshape grounds.

**Came down to.** Whether the noindex strength on apps/web
test-event bypass surfaces matters as a hard invariant or only
a soft signal. The honest framing per the milestone doc:

- The apps/web admin / redeem / redemptions URLs ARE publicly
  reachable (the M2 RoleDoors at
  [`apps/site/components/home/RoleDoors.tsx:51,58`](/apps/site/components/home/RoleDoors.tsx)
  link directly into them, which a search engine crawling the
  apps/site home page can follow).
- The apps/site test-event landing already noindexes
  server-side at parity strength — the apps/web demo shells
  are a *parallel* test-event surface that should match. A
  weaker mechanism on apps/web breaks the cross-app symmetry
  the epic-level "Internal-partner audience" invariant binds.
- The cost of a missed tag for apps/web specifically is
  modest (the demo views render published-event metadata, not
  sensitive data), but the cost is the same shape as apps/site
  (search engines indexing test-event surfaces during the
  internal-demo window), and the apps/site precedent treats it
  as a hard invariant.

The strength-of-guarantee answer is **hard**. Option A is the
wrong class of mechanism; Option B is the right class and is a
documented standard Vercel feature.

**Resolution.** **Option B — server-side `X-Robots-Tag` via
`apps/web/vercel.json` headers.** Specifically:

- `apps/web/vercel.json` gains a top-level `"headers"` array
  with one entry whose `source` regex matches the six bypass-
  eligible URL paths (admin / game/redeem / game/redemptions
  for each of the two test-event slugs) and whose `headers`
  array contains `{"key": "X-Robots-Tag", "value": "noindex, nofollow"}`.
  Final regex shape and source-vs.-pattern syntax are plan-
  time per Vercel `headers` documentation.
- The slug literals in the regex are hand-mirrored from
  `TEST_EVENT_SLUGS`. A new Vitest assertion (working location
  `tests/web/demo-mode-bypass-noindex.test.ts`) reads
  `apps/web/vercel.json`, extracts the regex source, and
  asserts each slug in `TEST_EVENT_SLUGS` appears verbatim in
  the regex and no extra slugs do. Per milestone-doc
  Cross-Phase Invariant 1 enforced-path rule.
- The noindex falsifier is **single-layered**, picked here
  rather than deferred to plan-drafting (the previous draft
  left this two-tiered with a plan-time pick; reviewer
  feedback on 2026-05-03 flagged the dual acceptance standard
  and required a concrete validator before `Proposed` flip):
  - **Load-bearing falsifier — Vitest config-shape
    assertion** (the `tests/web/demo-mode-bypass-noindex.test.ts`
    file from decision 8, extended). The test asserts
    `apps/web/vercel.json` contains the `headers` entry with
    the right `X-Robots-Tag` key/value, the right `source`
    pattern shape, and a slug list byte-equivalent to
    `TEST_EVENT_SLUGS`. Once vercel.json is shape-correct,
    the platform-emit behavior is a Vercel vendor guarantee
    per
    https://vercel.com/docs/projects/project-configuration#headers
    — not a runtime behavior 3.3.2 authors. This matches
    AGENTS.md "Reality-check gate" → "external-service-
    behavior claims" reads vendor docs as the verification
    pattern.
  - **Platform-behavior confirmation — manual `curl -sI`
    against a Vercel preview deploy** (named in the
    Validation Gate manual-verify checklist). One curl per
    bypass route + one negative curl against a non-bypass
    route. This is the human-side sanity check that the
    Vercel platform honors the config; it is NOT a CI gate.
  - **Playwright fixture does NOT assert noindex.** The
    existing
    [`playwright.demo-mode-bypass.config.ts`](/playwright.demo-mode-bypass.config.ts)
    `webServer` runs `npm run dev:web:test` which is Vite;
    Vite does not emit `vercel.json` headers. Adding a
    `vercel dev`-orchestrated Playwright project for header
    coverage would be a novel test mechanism per AGENTS.md
    "Spike before plan for novel mechanisms" with low
    marginal coverage gain over the Vitest config-shape
    assertion (Vercel `headers` is a stable, documented
    feature; the failure mode the assertion needs to catch
    is "config wrong," which Vitest catches; the failure
    mode "Vercel platform does not honor a correct config"
    is not a 3.3.2-authored failure mode and would require a
    deploy-side runtime check anyway). Playwright stays
    scoped to read-only-callout copy assertions per
    decision 4.

**Verified by:**
[`apps/web/vercel.json`](/apps/web/vercel.json)
(the file 3.3.2 amends; today rewrites-only, no headers
array);
[`apps/site/app/event/[slug]/page.tsx:42-73`](/apps/site/app/event/%5Bslug%5D/page.tsx)
(the apps/site `generateMetadata` server-emit precedent —
specifically the `robots: content.testEvent ? { index: false, follow: false } : undefined`
pattern at parity strength);
[`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
(the inherited test-event noindex invariant);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Decisions → "noindex emit shape on apps/web bypass-rendered routes"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the strength-of-guarantee framing this decision resolves);
[`playwright.demo-mode-bypass.config.ts:14-31`](/playwright.demo-mode-bypass.config.ts)
(the existing `npm run dev:web:test` Vite-based webServer
that proves the dev-tier limitation);
upstream Vercel `headers` documentation at
https://vercel.com/docs/projects/project-configuration#headers
(per AGENTS.md "Reality-check gate" → "external-service-
behavior claims" reads vendor docs).

### 4. e2e fixture extension shape — extend the existing demo-mode-bypass.spec.ts with read-only-callout copy assertions only (no noindex assertion) [Resolved → Option A]

**What was decided.** Whether to extend the existing
demo-mode-bypass Playwright fixture in place, or split into a
sibling fixture for the 3.3.2-introduced surfaces. Per
decision 3, the Playwright fixture does NOT assert noindex —
the load-bearing noindex falsifier is the Vitest config-shape
assertion, and `npm run dev:web:test` (Vite) cannot emit
`vercel.json` headers anyway. The fixture extension is scoped
to read-only-callout copy assertions only.

**Options considered.**

1. **Extend in place (Option A).** The existing
   [`tests/e2e/demo-mode-bypass.spec.ts`](/tests/e2e/demo-mode-bypass.spec.ts)
   gains a read-only-callout copy assertion on each existing
   test where the callout is rendered: admin ("Sign in to
   manage this event"), redemptions ("Sign in to manage
   redemptions"); redeem stays as-is per decision 1 (its
   existing copy already renders the consequence).
2. **Split — keep 3.2 read-side fixture, add new 3.3.2
   write-rendering fixture (Option B).** A new
   `tests/e2e/demo-mode-readonly-callout.spec.ts` covers the
   3.3.2-added assertions; the existing fixture covers only
   the read-side mounts.

**Pros / cons.**

- *Option A.* Pro: one fixture, one Playwright config, one
  CI run; the fixture's `test.describe("demo-mode bypass —
  read side")` block is the natural home for "the bypass-
  rendered surface renders X" assertions, and the new
  callout copy is part of the same surface. Pro: callout
  copy IS a read-side rendering property, so the existing
  describe-block name continues to fit (no rename needed).
- *Option B.* Pro: maintains a clean per-deliverable split.
  Con: artificial — the callout copy is a property of the
  read-side mounts, not a separate write-rendering surface
  (per Decision 1, no write rendering exists in 3.3.2). Con:
  two configs and two CI runs for one cohesive surface.

**Resolution.** **Option A — extend in place.** The
[`test.describe`](/tests/e2e/demo-mode-bypass.spec.ts) block
name stays as "demo-mode bypass — read side" (no rename
needed; callout copy is a read-side property).

**Verified by:**
[`tests/e2e/demo-mode-bypass.spec.ts:93`](/tests/e2e/demo-mode-bypass.spec.ts)
(the existing `test.describe` block 3.3.2 extends);
[`playwright.demo-mode-bypass.config.ts:5-7`](/playwright.demo-mode-bypass.config.ts)
(the config's `testMatch` pattern that already targets the
file 3.3.2 extends, no new config needed for Option A);
the Decision 1 callout-copy decision (the only Playwright
property under test).

### 5. M2 role-door + HomeHero copy revision — revise the two `authCaveat` parentheticals + the HomeHero "still stubbed" paragraph; Attendee card unchanged [Resolved → Option A]

**What was decided.** The exact copy revisions that satisfy
the M2 → M3 forward-pointing copy contract from
[`m2-phase-2-3-plan.md` Per-role auth-honesty copy contract](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md).

The current M2-shipped copy carries the "M3-bypass-pending"
parenthetical at three apps/site call sites:

- [`RoleDoors.tsx:52`](/apps/site/components/home/RoleDoors.tsx)
  Organizer card `authCaveat`: `"Sign in to manage this event (or wait for demo-mode access in M3)."`
- [`RoleDoors.tsx:59`](/apps/site/components/home/RoleDoors.tsx)
  Volunteer card `authCaveat`: `"Sign in to redeem codes (or wait for demo-mode access in M3)."`
- [`RoleDoors.tsx:34-39`](/apps/site/components/home/RoleDoors.tsx)
  Section `home-roles-copy` paragraph: `"...auth-gated targets name the sign-in requirement until demo-mode access ships."`
- [`HomeHero.tsx:22-30`](/apps/site/components/home/HomeHero.tsx)
  "What's still stubbed" paragraph: `"...demo-mode access on the auth-gated surfaces (sign-in required until that bypass ships)."`

**Options considered.**

1. **Drop the parentheticals + revise the framing to "demo
   mode now available" (Option A).** Each card's `authCaveat`
   names the sign-in requirement plainly + names the new
   bypass option. Section `home-roles-copy` paragraph drops
   the "until demo-mode access ships" clause. HomeHero "still
   stubbed" paragraph removes the `demo-mode access on the
   auth-gated surfaces` item from the stubbed list and
   relocates the inverse claim ("demo-mode access on auth-
   gated surfaces is now live for the two test events") to a
   different position or simply drops the item from the
   stubbed list (since it's no longer stubbed).
2. **Drop only the parentheticals; leave Hero "stubbed"
   framing alone (Option B).** Conservative — only the
   contract-binding sites get edits. The HomeHero claim is
   a reasonable-honesty statement that becomes incorrect on
   M3 close but is not bound by the M2 contract.
3. **Keep parentheticals; rephrase "in M3" to "now"
   (Option C).** Minimal-edit. Each `authCaveat` reads "Sign
   in to manage this event (demo mode now available)."

**Came down to.** Whether HomeHero's framing is bound by the
M2 contract or whether 3.3.2 should opportunistically expand
its scope to include it. The M2 contract per
[`m2-phase-2-3-plan.md` Per-role auth-honesty copy contract](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
explicitly names "the M3-bypass-pending parenthetical M3's PR
will revise" — this binds the role-door cards. The HomeHero
"still stubbed" paragraph is not part of that contract per the
M2 plan's contract scope.

That said, leaving HomeHero with "demo-mode access on the
auth-gated surfaces (sign-in required until that bypass ships)"
when M3 is closing is honest-state-violating per Cross-Phase
Invariant 3 ("Cross-app demo signaling stays honest at every
render"); 3.3.2 is the M3 closer; rolling the HomeHero edit
into 3.3.2 satisfies the milestone-level honesty invariant
even though the M2 plan didn't explicitly bind it. AGENTS.md
"Files intentionally not touched" rule says touching a
not-explicitly-bound file is a structural call the implementer
is authorized to make if the right shape requires it; the
right shape here is "M3 close means every honest-signaling
surface reflects M3-closed state."

**Resolution.** **Option A — full revision.** The exact
strings are plan-time per AGENTS.md "Bans on surface require
rendering the consequence" copy-deferral authorization (the
copy is rendered in the dev server before the final words are
finalized). Substantive contract:

- Both `authCaveat` props drop the "(or wait for demo-mode
  access in M3)" parenthetical and gain framing that names the
  new option ("Sign in to manage this event, or browse the
  demo without signing in." or equivalent — exact wording at
  copy-time).
- The Section `home-roles-copy` paragraph drops the "until
  demo-mode access ships" clause and replaces it with framing
  consistent with the now-shipped state.
- The HomeHero "What's still stubbed" paragraph removes the
  `demo-mode access on the auth-gated surfaces (sign-in
  required until that bypass ships)` item from the stubbed
  list. If the same paragraph's "What's real at this iteration"
  list does NOT already name the demo-mode bypass as real, an
  item naming it is added. Plan-drafting confirms the exact
  shape after reading the rendered home page.
- Attendee card and routes are unchanged (per the M2 contract;
  attendee target was always public, never auth-gated).

**Verified by:**
[`RoleDoors.tsx:52,59`](/apps/site/components/home/RoleDoors.tsx)
(the two `authCaveat` strings the M2 contract binds);
[`RoleDoors.tsx:34-39`](/apps/site/components/home/RoleDoors.tsx)
(the section-copy paragraph);
[`HomeHero.tsx:22-30`](/apps/site/components/home/HomeHero.tsx)
(the "still stubbed" paragraph 3.3.2 expands scope to);
[`m2-phase-2-3-plan.md` Per-role auth-honesty copy contract](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
(the M2 contract that binds the `authCaveat` revision);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 3](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the cross-app honesty invariant that pulls HomeHero into
3.3.2's scope).

### 6. Documentation Currency map — concrete paragraph targets in each closer-doc [Resolved]

**What was decided.** Which exact paragraphs / sections in each
M3-closer-owned doc the 3.3.2 PR edits.

The milestone doc's Documentation Currency section names six
docs the M3-closer owns:
[`README.md`](/README.md),
[`docs/architecture.md`](/docs/architecture.md),
[`docs/operations.md`](/docs/operations.md),
[`docs/product.md`](/docs/product.md),
[`docs/styling.md`](/docs/styling.md), and
[`docs/backlog.md`](/docs/backlog.md).
Plus the milestone doc itself (top Status flip), the epic doc
(Milestone Status table M3 row flip), and the M2 phase 2.3
plan (confirmation pass — no edit, audit-only).

**Concrete paragraph targets** (re-derived per AGENTS.md
"Reality-check gate" — these are the *current* shapes of each
doc; plan-drafting re-greps at implementation time):

- **`README.md`** — the "current implemented slice" bullet list
  starting at
  [`README.md:22`](/README.md). Add or revise a bullet naming
  the demo-mode bypass capability ("test-event admin / redeem
  / redemptions surfaces are reachable on the two test-event
  slugs without sign-in; non-test-event slugs continue to
  require auth"). Plan-drafting picks bullet location (extend
  existing bullet vs. new line).
- **`docs/architecture.md`** — two paragraph touches:
  - The apps/web app-section paragraph at
    [`architecture.md:60-61`](/docs/architecture.md) currently
    enumerates the apps/web event namespaces; adds a sentence
    naming the demo-mode bypass branch on the three event-route
    surfaces and the test-event slug allowlist.
  - The trust-boundary section starting around
    [`architecture.md:200-260`](/docs/architecture.md) (the
    `apps/site/app/page.tsx` and surrounding entries describe
    server-rendered noindex on the home page and on
    test-event landings); adds a paragraph naming the apps/web
    `X-Robots-Tag: noindex` mechanism for the bypass-rendered
    surfaces and a paragraph naming the
    `evaluateDemoModeRejection` helper at the
    `_shared/demo-mode-rejection.ts` location with its
    structured 403 contract.
- **`docs/product.md`** — the "Current Implemented Slice"
  bullet list at
  [`product.md:34-49`](/docs/product.md). Add a bullet naming
  the demo-mode-reachable test-event admin / redeem /
  redemptions surfaces.
- **`docs/backlog.md`** — close any incidentally-resolved
  entries (plan-drafting greps for "demo-mode" / "test-event"
  / "M3" entries). Per the milestone doc Backlog Impact, the
  post-epic items "demo-mode generalization beyond test-event
  allowlist" and "production-friendly demo-mode for partner-
  onboarding scenarios" are added if not already present.
- **`docs/operations.md`** — per the milestone doc
  Documentation Currency entry, only updated if the chosen
  3.1 semantics changed operations. 3.1 chose read-only
  browse with no reset story; **operations.md is NOT updated**
  per the milestone doc's "leaves operations unchanged"
  framing. Plan-drafting confirms via grep that no operations
  doc paragraph references a demo-mode operational surface.
- **`docs/styling.md`** — per the milestone doc, only updated
  if M3's UI signaling introduces a new themable / structural
  classification. The 3.2-shipped DemoModeBanner + the 3.3.2
  inline read-only callout from Decision 1 compose existing
  tokens; **styling.md is NOT updated**. Plan-drafting
  confirms via grep at implementation time.
- **`docs/open-questions.md`** — the "Demo-mode data-access
  semantics" entry was closed by 3.1 per
  [`m3-phase-3-1-plan.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
  3.3.2 confirms no re-opened entries reference demo-mode
  semantics.
- **`m2-phase-2-3-plan.md`** — confirmation pass, no edit.
  The M2 plan's "Per-role auth-honesty copy contract" named
  M3 as the artifact-currency owner that revises the role-door
  copy at M3 close; 3.3.2 walks the M2 contract during
  self-review and notes in the PR body's Documentation
  Currency PR Gate section that the contract is satisfied.
- **`m3-demo-mode-auth-bypass.md`** — top Status flips
  `Proposed` → `Landed`; Phase Status table 3.3.2 row Status
  flips `Proposed` → `Landed` with PR column populated; the
  3.3.1 row stays `Landed` (already populated by the 3.3.1 PR).
- **`epic.md`** — Milestone Status table M3 row Status flips
  `Proposed` → `Landed` with the M3-closing PR populated. The
  epic's top-level Status remains `Proposed` per the epic's
  "first-iteration close alone does not flip top-level Status"
  rule.
- **This plan** (`m3-phase-3-3-2-plan.md`) — Status flips
  through `In draft` → `Proposed` → `Landed` across the
  drafting / promotion-gate / implementing-PR lifecycle.
- **Scoping docs** — all four M3 scoping docs delete in batch
  at this PR per AGENTS.md "Phase Planning Sessions → Output
  set" and per
  [`m3-phase-3-3-1-plan.md` Documentation Currency PR Gate](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md):
  - `docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md`
  - `docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md`
  - `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`
  - `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md` (this file)
  The M1 scoping doc at
  `docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md`
  is **not** part of M3's batch — it should have deleted at
  M1's terminal PR. 3.3.2 does NOT delete it (out of M3's
  scope per AGENTS.md "Scope Guardrails").

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the milestone-level map);
the on-disk paragraph reads cited above;
[`m3-phase-3-3-1-plan.md` Documentation Currency PR Gate](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md)
(the scoping-doc batch-delete inheritance from 3.3.1);
[`docs/plans/epics/demo-expansion/scoping/`](/docs/plans/epics/demo-expansion/scoping/)
directory listing (the four M3 scoping docs that batch-
delete + the M1 doc out of M3's scope).

### 7. Confirmation pass on `m2-phase-2-3-plan.md` — audit-only, no plan edit [Resolved]

**What was decided.** What "confirmation pass" means as a
3.3.2 deliverable per the milestone doc's Documentation
Currency entry on the M2 plan.

**Resolution.** Confirmation pass = self-review walks the M2
plan's "Per-role auth-honesty copy contract" against the
3.3.2 diff and confirms (a) the Organizer + Volunteer
`authCaveat` strings on
[`RoleDoors.tsx:52,59`](/apps/site/components/home/RoleDoors.tsx)
were revised per Decision 5; (b) the Attendee card was NOT
revised (the M2 contract bound only Organizer + Volunteer);
(c) no other apps/site copy site that the M2 plan named is
left in pre-revision state. PR body's Documentation Currency
PR Gate section names the M2 plan and records the
confirmation outcome ("contract satisfied"). No edit to the
M2 plan file.

**Verified by:**
[`m2-phase-2-3-plan.md` Per-role auth-honesty copy contract](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
(the contract being walked).

### 8. Hand-mirror enforcement test for noindex slug list — Vitest assertion under `tests/web/` [Resolved → Option A]

**What was decided.** Where the byte-equivalence test for
the Decision 3 hand-mirrored slug list lives, given that
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
binds "build-time codegen OR hand-mirror with CI-asserted
byte-for-byte agreement" as the enforcement path.

**Options considered.**

1. **Vitest under `tests/web/` (Option A — co-located with
   apps/web tests).** A new test file (working name
   `tests/web/demo-mode-bypass-noindex.test.ts`) reads
   `apps/web/vercel.json`, parses the `headers[].source`
   regex with a regex-pattern parser or string-extractor,
   asserts each slug in `TEST_EVENT_SLUGS` appears verbatim
   in the regex source, and asserts no extra slug literals
   appear. Runs as part of `npm run test` (Vitest default).
2. **Bash / Node script (Option B).** A script under
   `scripts/testing/` that the lint workflow invokes;
   asserts the same property.
3. **No enforcement test (Option C).** Reject — milestone-
   doc Cross-Phase Invariant 1 binds the enforcement; an
   un-enforced hand-mirror is the "drift between guard
   sites" failure mode the invariant exists to catch.

**Resolution.** **Option A — Vitest under `tests/web/`.**
Plan-drafting picks the exact test file location and the
regex-extraction approach (likely a string-includes check
since the regex source contains the literal slugs as
substrings; if the regex is more complex, plan-drafting
either simplifies the regex or uses a small parser).

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the enforcement-path binding);
[`shared/events/testEventAllowlist.ts:18-21`](/shared/events/testEventAllowlist.ts)
(the canonical TypeScript source of truth);
[`apps/web/vercel.json`](/apps/web/vercel.json)
(the file the assertion reads);
existing Vitest patterns under `tests/` (plan-drafting reads
to confirm conventions).

### 9. Status flips and merge order — `In draft` initial; `Proposed` after promotion-gate walk; `Landed` in implementing PR [Resolved]

**What was decided.** The plan's Status block lifecycle
through 3.3.2's drafting + implementation.

**Resolution.** Per AGENTS.md "`In draft` → `Proposed`
promotion gate":

- **Plan opens at Status `In draft`** when this scoping doc
  closes (i.e., the next step is to draft the plan doc with
  this scoping's content as input). The `In draft` status
  signals the plan is structurally complete (Goal,
  Cross-Cutting Invariants, Naming, Contracts, Files To
  Touch, Execution Steps, Commit Boundaries, Validation
  Gate, Self-Review Audits, Documentation Currency PR Gate,
  Out Of Scope, Risk Register, Backlog Impact all
  populated) but the plan-drafting deferrals (named below
  in "Open decisions to make at plan-drafting") have not
  been re-walked end-to-end against current code.
- **Plan flips `In draft` → `Proposed`** when the
  promotion-gate self-review walks the plan + this scoping
  doc end-to-end and resolves each plan-drafting deferral.
  This is the moment the plan claims "ready for code
  review."
- **Plan flips `Proposed` → `Landed`** in the implementing
  PR's Status edit per AGENTS.md "Plan-to-PR Completion
  Gate," in the same PR that lands the implementation.

The milestone-doc top Status flip and the epic Milestone
Status table flip are atomic with the implementing PR
landing — they ride the same PR per Decision 6.

**Verified by:**
AGENTS.md "Phase Planning Sessions → `In draft` → `Proposed`
promotion gate";
AGENTS.md "Plan-to-PR Completion Gate";
[`m3-phase-3-3-1-plan.md` Status block](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md)
(the precedent — 3.3.1's Status block went through the same
lifecycle).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they
require reading on-disk content against actually-merged code at
plan-time, not against the scoping snapshot:

- **Exact inline-read-only-callout copy** for DemoModeAdminView
  and DemoModeRedemptionsView. Decision 1 binds the rendering
  shape and the affordance enumeration; the exact words are
  drafted in the dev server with the consequence rendered per
  AGENTS.md "Bans on surface require rendering the
  consequence."
- **Vercel `headers` regex source shape.** Decision 3 binds
  Vercel `headers` as the mechanism and binds hand-mirrored
  slugs in the regex with a CI-asserted byte-equivalence
  test. The exact regex shape — pattern syntax (Vercel
  `source` accepts a path-to-regexp-style pattern), the
  trailing-slash policy, the bypass route enumeration — is
  plan-time per AGENTS.md "Reality-check gate" → "external-
  service-behavior claims" reads upstream Vercel docs.
- **Self-Review Audit set** against
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
  Plan-drafting walks the catalog. Likely-relevant audits:
  cross-app copy contract revision audit (yes — M2 → M3
  copy contract); noindex emit audit (yes — apps/web edge-
  emit + apps/site precedent parity); rename-aware diff
  classification (no — no renames). Plan-drafting confirms.
- **Validation Gate command list.** Beyond `npm run lint`,
  `npm run build:web`, `npm run test`, the plan names
  `npm run test:e2e:demo-mode-bypass` (the existing
  Playwright wrapper) and any noindex-specific validator. The
  plan also names the new Vitest test file the Decision 8
  enforcement assertion lives in.
- **Commit boundaries.** Likely shape: (1) DemoModeAdminView
  + DemoModeRedemptionsView read-only callout edits (no
  DemoModeRedeemView edit per decision 1); (2)
  apps/web/vercel.json headers config + the Vitest enforcement
  test (load-bearing noindex CI gate per decision 3); (3)
  apps/site RoleDoors + HomeHero copy revision + e2e fixture
  extension for callout copy; (4) M3 doc-currency map (README,
  architecture, product, backlog) + scoping-doc batch deletion
  + milestone-doc + epic + this plan Status flips. Plan-
  drafting finalizes against the actual edit shape.
- **Vercel.json regex literal vs. a small build-time codegen.**
  Decision 8 picks hand-mirror + Vitest assertion as the
  enforcement path. If plan-drafting surfaces a strong reason
  to instead generate the regex from the TS source at build
  time (e.g., the regex shape becomes complex enough that the
  Vitest assertion needs to parse it), the plan reopens
  Decision 8 in-place and notes the reopening. Default stays
  hand-mirror unless reopened.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — references the milestone doc's
  Cross-Phase Invariants; per-phase additions for 3.3.2:
  "the bypass-rendered surface renders a concrete read-only
  signal at every position where production-side mutation
  controls would mount" (Decision 1); "apps/web bypass-
  rendered routes emit `noindex` server-side at parity
  strength with apps/site's `generateMetadata` emit"
  (Decision 3); "the test-event slug list in the noindex
  Vercel `headers` regex is hand-mirrored from
  `TEST_EVENT_SLUGS` and protected by a CI-asserted byte-
  equivalence test" (Decision 8); "M3-closing copy revisions
  on the apps/site role-door cards and HomeHero land with M3
  bypass; Attendee card unchanged" (Decision 5).
- Naming — `demo-mode-readonly-callout` (working CSS class),
  `tests/web/demo-mode-bypass-noindex.test.ts` (working
  Vitest path), `X-Robots-Tag: noindex, nofollow` (the exact
  header value per Decision 3).
- Contracts — read-only-callout-rendering contract per
  Decision 1; client-side 403 handler defer-with-rationale
  per Decision 2; noindex emit contract per Decision 3;
  e2e fixture extension contract per Decision 4; M2 + Hero
  copy revision contract per Decision 5; doc-currency
  contract per Decision 6; M2 plan confirmation-pass
  contract per Decision 7; hand-mirror enforcement contract
  per Decision 8; Status flips contract per Decision 9.
- Files To Touch (estimate-labeled per AGENTS.md "Plan
  content is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits — including a dedicated audit for the
  cross-app copy contract revision (per Decision 5) and the
  noindex-emit parity-with-apps/site audit (per Decision 3)
- Documentation Currency PR Gate — every M3-closer-owned doc
  per the milestone doc's map, plus this plan's Status flip,
  the milestone-doc top Status flip, the epic Milestone
  Status table flip, the M2 plan confirmation pass, and the
  scoping-doc batch deletion
- Out Of Scope (final, including the deferred-with-rationale
  client 403 handler from Decision 2)
- Risk Register — references the milestone doc's Cross-Phase
  Risks; names the dev/edge gap risk for noindex per
  Decision 3; names the future-phase-mutation-call-from-
  bypass-branch risk per Decision 2
- Backlog Impact — 3.3.2-specific (M3 closes; second-
  iteration scoping pass becomes runnable)

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not
from the scoping snapshot, per AGENTS.md "Reality-check gate
between scoping and plan":

- **DemoMode*View component shapes.** Scoping read these on
  2026-05-03:
  [`DemoModeAdminView.tsx:1-154`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`DemoModeRedeemView.tsx:1-25`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`DemoModeRedemptionsView.tsx:1-150`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx).
  Plan-drafting re-reads to confirm the inline-callout
  insertion points and pre-existing class names that the new
  callout shares or adopts.
- **`apps/web/vercel.json` rewrites order.** Scoping read
  [`apps/web/vercel.json:1-52`](/apps/web/vercel.json). The
  new `headers` array sits beside the existing `rewrites`
  array; plan-drafting confirms Vercel's documented behavior
  for `headers` + `rewrites` interaction (Vercel docs
  reality-check) and confirms the `headers` source pattern
  applies to the apps/web SPA route, not the rewritten
  apps/site target.
- **apps/site M2 copy paragraphs.** Scoping read
  [`RoleDoors.tsx:1-64`](/apps/site/components/home/RoleDoors.tsx),
  [`HomeHero.tsx:1-33`](/apps/site/components/home/HomeHero.tsx).
  Plan-drafting re-reads to confirm no other "M3-bypass-
  pending" parentheticals exist (`grep -rn "wait for demo-mode"
  apps/site/` returned the two RoleDoors hits; HomeHero's
  paragraph at 22-30 is a wider rephrase). The grep at
  scoping time also returned `RoleDoors.tsx:38` ("until
  demo-mode access ships") in the section copy; the plan-
  drafting grep re-confirms.
- **Existing Playwright fixture shape.** Scoping read
  [`tests/e2e/demo-mode-bypass.spec.ts:1-195`](/tests/e2e/demo-mode-bypass.spec.ts)
  and
  [`playwright.demo-mode-bypass.config.ts:1-41`](/playwright.demo-mode-bypass.config.ts).
  Plan-drafting confirms the `webServer` command (`npm run
  dev:web:test`) is Vite-based; the noindex assertion
  mechanism in Decision 3 picks against this constraint.
- **README + product + architecture + backlog paragraphs.**
  Scoping read the relevant paragraphs cited in Decision 6.
  Plan-drafting re-greps for "demo-mode" / "test-event" /
  "bypass" / "M3" mentions across these docs and confirms
  the edit set is complete.
- **`docs/self-review-catalog.md`** existence and current
  audit list. Plan-drafting reads to pick the relevant
  audits (cross-app copy contract revision audit; noindex
  emit audit; possibly others).
- **Existing `tests/web/` Vitest patterns.** Plan-drafting
  reads (or confirms absence and creates) the conventions
  for the new `demo-mode-bypass-noindex.test.ts` file.
- **`shared/events/testEventAllowlist.ts` import path from
  Vitest.** Plan-drafting confirms Vitest can import the
  shared module (it's a TS module, no path-alias needed; the
  helper Edge Function imports it as a relative path so a
  Vitest import should be similarly straightforward).

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.3.2 row at the Phase Status
  table (this scoping session's PR will fill the Plan column;
  the implementing PR flips Status to `Landed` and flips the
  milestone-doc top Status to `Landed`).
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–6 are the
  data-access-semantics contract this phase ships the client-
  rendering and M3-closer halves of; item 6 is the UI
  consequence-rendering contract Decision 1 settles.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. The bypass-rendered surfaces
  (DemoModeBanner + DemoMode*View) and the allowlist module
  shipped here are the immediate inputs this phase consumes
  and extends.
- [`m3-phase-3-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md) —
  predecessor phase plan. The structured 403 wire shape and
  the helper at `_shared/demo-mode-rejection.ts` are the
  server contract Decision 2 defers client-side handling
  for; the plan's Out Of Scope explicitly hands every 3.3.2-
  scope item this scoping doc resolves to this phase.
- [`scoping/m3-phase-3-1.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md),
  [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md),
  [`scoping/m3-phase-3-3-1.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md) —
  sibling scoping docs; delete in batch with this scoping doc
  at the implementing PR per Decision 6.
- [`m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md) —
  predecessor M2 phase plan. The "Per-role auth-honesty copy
  contract" is the M2 → M3 forward-pointing contract Decision
  5 satisfies and Decision 7 confirmation-passes.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Milestone Status table M3 row
  flips at the implementing PR.
- [`apps/web/src/demo/DemoModeBanner.tsx`](/apps/web/src/demo/DemoModeBanner.tsx),
  [`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx) —
  3.2-shipped surfaces; Decision 1 modifies two of three.
- [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx),
  [`apps/site/components/home/HomeHero.tsx`](/apps/site/components/home/HomeHero.tsx) —
  M2-shipped copy sites Decision 5 revises.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — Decision 3
  amends with a `headers` array.
- [`tests/e2e/demo-mode-bypass.spec.ts`](/tests/e2e/demo-mode-bypass.spec.ts),
  [`playwright.demo-mode-bypass.config.ts`](/playwright.demo-mode-bypass.config.ts) —
  Decision 4 extends.
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts) —
  the source of truth Decision 8's enforcement test reads.
- [`supabase/functions/_shared/demo-mode-rejection.ts`](/supabase/functions/_shared/demo-mode-rejection.ts) —
  the 3.3.1-shipped helper whose wire-shape contract Decision
  2 defers client-side handling for.
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
  consequence."
