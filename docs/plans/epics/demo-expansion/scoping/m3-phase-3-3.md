# Scoping — M3 phase 3.3 (demo-mode bypass: write side + M3 closure)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR (which is this phase's PR).
Durable cross-phase content absorbs into
[m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
durable per-phase content absorbs into
[`m3-phase-3-3-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-plan.md).

## Phase summary

Phase 3.3 ships the **write side** of M3's demo-mode auth bypass
plus the M3 closer. The write side comprises five mutation Edge
Functions' `demo_mode_read_only` 403 short-circuit branches, the
apps/web mutation-control disabled-state UI re-introduced into
the bypass-rendered surfaces 3.2 stripped them from, and the
apps/web noindex emit on bypass-rendered routes. The M3 closer
comprises the M2 role-door copy revision in apps/site, the full
M3 documentation-currency map (README, architecture, product,
styling conditional, backlog), the milestone-doc Status flip,
and the epic Milestone Status table M3 row flip.

The settled write-side server contract — HTTP 403 with structured
error body keyed by `demo_mode_read_only` against the AND of
"slug resolves to allowlist member" and "no auth context is
present" — comes from
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 5; the client-side disabled-state shape was
deferred to this phase by
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 6 and reaffirmed in
[`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md)
decision 5; the noindex emit mechanism is deferred to this phase
by [`m3-demo-mode-auth-bypass.md` Cross-Phase Decisions →
Deferred to phase-time → "noindex emit shape on apps/web
bypass-rendered routes"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
the M2 role-door copy revision binds via
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 4](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
to land in the M3-closing PR. This phase translates each into the
write-side surface and ships the closer in one PR (decision 1
below runs the AGENTS.md "PR-count predictions need a branch
test" pass and confirms 1-PR shape).

After 3.3 merges, M3 is closed and the demo-expansion epic's
first-iteration scope (M1–M3) is `Landed` per the epic's
Milestone Status table convention.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These
decisions absorb into the plan's contract sections and out-of-
scope list during plan-drafting; the deliberation prose
(rejected alternatives) lives here through scoping's transient
lifetime.

### 1. PR shape — single PR for 3.3 (write side + closer) [Resolved → Option A]

**What was decided.** Whether 3.3 ships as one PR (write side +
client UI + noindex + M2 copy revision + M3 closer doc currency
+ Status flips), as two PRs along a server / client seam, as two
PRs along a write-side / closer seam, or as three PRs.

**Why it mattered.**
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 7 pre-authorized 3.3 as the M3-closing phase
that absorbs "Edge Function write-rejection branches + UI
demo-mode signaling per surface + noindex emit + M2 role-door
copy revision + full M3 documentation currency + milestone-doc
Status flip + epic Milestone Status table flip." AGENTS.md
"PR-count predictions need a branch test" requires the phase
planning session to re-derive the count against actual scope.

**Options considered.**

1. **Single PR (Option A — the 3.1 pre-authorized shape).** 3.3
   absorbs all five mutation Edge Functions' 403 short-circuits,
   the apps/web mutation-control disabled-state UI on the three
   bypass-rendered surfaces, the apps/web noindex emit, the M2
   role-door copy revision in apps/site, the M3 doc-currency
   map, the milestone-doc Status flip, and the epic Milestone
   Status table flip.
2. **2-PR split along server / client seam (Option B).** 3.3
   ships the five mutation Edge Functions' 403 short-circuits +
   Deno tests; 3.4 ships the apps/web disabled-state UI +
   noindex emit + M2 copy revision + M3 closer.
3. **2-PR split along write-side / closer seam (Option C).** 3.3
   ships server 403s + client disabled-state UI + noindex emit;
   3.4 ships M2 copy revision + M3 doc-currency map + Status
   flips.
4. **3-PR split (server / client / closer).** 3.3 server; 3.4
   client + noindex; 3.5 M2 copy + doc currency + Status flips.

**Pros / cons.**

- *Option A.* Pro: cohesive review surface — server rejection
  and client disabled-state are best reviewed against each
  other (the rejection branch's structured error code shapes
  what the client error handler can switch on; reviewing them
  together confirms the contract is honored end-to-end);
  closer doc currency lands alongside the bypass surface it
  documents (the README capability paragraph and architecture
  trust-boundary entry are most accurate when written against
  the just-shipped write-side surface, not against an
  intermediate state). Con: subsystems-touched count exceeds
  AGENTS.md's >5 split threshold (see Branch-test analysis
  below); review attention spans the server, client, and doc
  surfaces.
- *Option B.* Pro: server-side review focuses on the auth-gate
  shape and structured-error-body shape across five functions;
  client-side review focuses on the disabled-state UX. Con:
  3.3 ships server-side rejection with no client to consume
  the new error code, leaving the new error code dead-on-
  arrival until 3.4 ships; AGENTS.md "Bans on surface require
  rendering the consequence" applies — rendering the
  consequence of "demo-mode mutation rejected with structured
  error" requires the client to have a UI for it; without it,
  the server change is unreviewable for end-to-end correctness.
- *Option C.* Pro: write-side as one coherent unit (server +
  client + noindex), closer as another (M2 copy + doc
  currency + Status flips). Con: same dead-on-arrival concern
  as Option B for the noindex emit (the noindex meta tag is
  observable end-to-end on the bypass-rendered routes 3.3
  ships, so 3.3 IS the natural place to ship it; 3.4 closer
  has no surface that exercises the new emit); the closer PR
  reduces to "M2 copy + 9 doc edits + 2 Status flips" which
  is too small to justify a separate PR (the M2 copy edit is
  one line in `RoleDoors.tsx` per decision 6 below; the doc
  currency map collapses to short paragraph edits per
  decision 7).
- *Option D.* Pro: maximum review focus per PR. Con: same
  dead-on-arrival concerns; the closer PR is even smaller than
  Option C's; review-overhead total exceeds the value of the
  attention split.

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched if Option A absorbs all of 3.3:

1. Five mutation Edge Functions' 403 short-circuit branches
   (`save-draft`, `publish-draft`, `unpublish-event`,
   `redeem-entitlement`, `reverse-entitlement-redemption`)
2. New shared Edge Function helper for the demo-mode rejection
   (under `supabase/functions/_shared/`; encapsulates the
   "resolve event_id → slug, AND with allowlist + no-auth-
   context predicate, return structured 403 if matched"
   sequence to avoid 5-function duplication)
3. Five Deno tests covering the new 403 branch per function
4. apps/web mutation-control disabled-state UI on three
   bypass-rendered surfaces:
   - admin: disabled `Save`, `Publish`, `Unpublish`,
     `Confirm`, `Cancel` controls re-introduced via the
     bypass-branch render path (today's bypass branch renders
     `<DemoModeAdminView />` which shows no mutation controls;
     3.3 either replaces it with a "demo signed-in flow" view
     that includes disabled controls, or extends `DemoModeAdminView`
     to render disabled controls beside the data — decision 3
     below picks)
   - redeem: disabled keypad submit affordance reintroduced
     into the demo-mode redeem variant
   - redemptions: disabled reverse / confirm / retry affordances
     reintroduced into the demo-mode redemptions variant
5. apps/web noindex emit on bypass-rendered routes (novel
   mechanism per
   [`m3-demo-mode-auth-bypass.md` Cross-Phase Decisions →
   Deferred to phase-time → "noindex emit shape"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
   AGENTS.md "Spike before plan for novel mechanisms" applies
   at plan-drafting per decision 5 below)
6. apps/site M2 role-door copy revision
   ([`RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx))
7. New e2e fixture(s) — at minimum one asserting the noindex
   meta tag is present on a bypass-rendered route and absent on
   a non-test route; optionally one asserting mutation-control
   disabled-state is present (or hide-shaped per decision 3) on
   bypass-rendered surfaces
8. Doc currency: README capability paragraph; architecture
   trust-boundary section; product current-capability description;
   styling (conditional per decision 7); backlog (post-epic
   items confirmation); milestone-doc top Status flip + Phase
   Status row 3.3 Status flip + Sequencing paragraph minor edit;
   epic Milestone Status table M3 row flip

8 distinct subsystems is above AGENTS.md's >5 split threshold.
Substantive logic LOC: 5 × ~25 (per-function 403 branch with
shared helper call) = ~125 + shared helper ~50–80 + UI disabled-
state wiring ~60–100 (varies sharply by decision 3) + noindex
emit mechanism ~40 + 5 Deno tests ~30 each = ~150 + e2e
fixture(s) ~100–150. Estimated total ~525–650 LOC plus doc
currency edits (~150–200 LOC of prose). The numeric-LOC
threshold (>300) is exceeded.

**However**, the branch test's "split" recommendation is not
mechanical — AGENTS.md authorizes "justify the size with concrete
review-coherence reasoning." The review-coherence argument for
keeping 3.3 as one PR:

- **Server rejection and client disabled-state are mutually
  load-bearing.** The structured error code `demo_mode_read_only`
  is what the client error handler switches on to decide whether
  to surface a "demo-mode" error message or a generic failure;
  shipping the server change without the client consumer leaves
  the contract dead-on-arrival and unreviewable for end-to-end
  correctness, violating AGENTS.md "Bans on surface require
  rendering the consequence."
- **The noindex emit and the bypass-rendered routes are mutually
  load-bearing.** The noindex meta tag's whole purpose is to
  prevent search-engine indexing of the bypass-rendered routes;
  testing the emit requires loading those routes (which 3.2
  already shipped — but 3.3's mutation-control disabled-state
  re-introduction is also evaluated against those same routes,
  so reviewer attention is already on them).
- **The M2 copy revision and the bypass landing are mutually
  load-bearing.** The current M2 copy says "Sign in to manage
  this event (or wait for demo-mode access in M3)"; the revised
  copy reflects that demo-mode access has *now* landed on the
  test slugs. Shipping the copy revision before the bypass write
  side lands would lie ("demo-mode access" means the surface is
  reachable AND the read-only intent is honored end-to-end —
  partial reachability without the rejection contract is
  a misleading promise); shipping it after the bypass write side
  leaves a stale promise on the home page during the gap.
- **The doc-currency map describes the post-3.3 state.** Writing
  the README capability paragraph against 3.3's just-shipped
  surface is more accurate than writing it against an
  intermediate "server rejects but client doesn't react" state.
- **Status flips are atomically the moment M3 closes.** The
  milestone-doc Status flip and the epic Milestone Status table
  M3 row flip describe "M3 is complete." Splitting the Status
  flip into a separate PR would require the M3-closing PR to
  carry no implementation, which is the case the branch-test
  rule's split recommendation doesn't apply to (small closer
  PRs are explicitly out-of-scope for the rule's >5 / >300
  threshold).

The 3.1 pre-authorized shape (Option A) is the natural one. The
branch-test threshold is exceeded numerically but the
review-coherence argument supports the single-PR shape; this is
the kind of judgment-call deviation AGENTS.md "PR-count
predictions need a branch test" explicitly authorizes ("justify
the size with concrete review-coherence reasoning").

**Came down to.** Whether the dead-on-arrival concern (server
without client, or write-side without closer) is worth the
review-overhead cost of one larger PR vs. two smaller PRs that
each have to be reviewed twice for the contract to be confirmed
end-to-end. The single-PR shape lands the whole capability
intact and the closer with it; M3 closes in one merge.

**Resolution.** **Option A — single PR for 3.3.** 3.3 absorbs
the write side + closer per the 3.1-authorized shape. The PR
body's `## Estimate Deviations` section may surface mid-
implementation if a sub-surface needs to peel off; default
shape is one PR.

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the 1-PR pre-authorization for the write side + closer);
[`scoping/m3-phase-3-2.md` decision 1 → "Branch-test analysis"](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md)
(the 3.2 branch-test that named 3.3's expected scope as the
write side + closer set);
AGENTS.md "PR-count predictions need a branch test" rule;
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the 3.3 row this scoping session updates with the plan link).

### 2. Slug resolution in mutation Edge Functions — server-side resolution from event_id, no client slug carriage [Resolved → Option B]

**What was decided.** How each of the five mutation Edge
Functions learns the slug it needs to check against the
allowlist for the 403 short-circuit. The current request bodies
carry only `eventId` (or its equivalent — see Verified by
below), not slug.

**Why it mattered.** The
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
binds "single source of truth, exposed to every guard site by
an enforced path"; an env / URL / header / client-asserted flag
is explicitly forbidden from substituting for or AND-with
allowlist membership. A client-asserted slug in the request
body is the closest analog to a client-asserted flag — the
question is whether "client-asserted slug + server allowlist
check + server `no auth context` AND" is meaningfully different
from the banned shapes, or whether the principle extends to ban
client slug carriage as well.

**Options considered.**

1. **Carry slug in mutation request bodies (Option A).** Each
   of the five mutation Edge Functions accepts a `slug: string`
   field in the request body; the 403 short-circuit checks
   `isTestEventSlug(body.slug) && noAuthContext(req)` and
   returns the structured 403 if both. apps/web's existing
   mutation call sites are extended to carry slug.
2. **Server-side resolve slug from `eventId` against
   `game_events` (Option B).** Each of the five mutation Edge
   Functions performs an `event_id → slug` lookup against
   `game_events` (which is anon-readable for published events
   per
   [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md))
   and checks `isTestEventSlug(resolvedSlug) &&
   noAuthContext(req)`. Client mutation request bodies are
   unchanged.
3. **Encode slug into a server-side cache the bypass branch
   hydrates (Option C).** Some pre-mutation handshake (a token
   or session-bound flag) records "this caller is in demo mode
   for slug X"; the mutation function reads that and decides.

**Pros / cons.**

- *Option A.* Pro: zero new server-side reads — the function
  already has slug in hand and checks a pure-function
  predicate. Pro: matches the apps/web side's conceptual model
  (the bypass branch fires *because* slug is in the allowlist
  client-side; the server's 403 fires for the same reason).
  Con: opens a request shape where a malicious caller could
  pass `slug: "harvest-block-party"` for a real event's
  eventId — for an *unauthenticated* caller, the result is a
  403 `demo_mode_read_only` (instead of the existing 401
  `unauthorized`), which is a small information leak (a real
  event silently surfaces "this would be demo-mode if you
  were on a test slug") but not a security failure. Con: violates
  the spirit of the milestone-doc Cross-Phase Invariant 1's
  "no environment flag, URL parameter, request header asserted
  by the client" — slug-in-body is an asserted-by-the-client
  ingredient even if the server validates allowlist membership;
  the server's predicate becomes "client-claimed slug is in
  allowlist," not "this request is for an allowlisted event."
- *Option B.* Pro: the predicate becomes "the request's
  `eventId` resolves to an allowlisted slug AND no auth
  context is present" — slug membership is *derived* from the
  event identity the request already carries, not asserted by
  the client. Symmetry with the read-side: the read shim's
  3.2 implementation also resolves slug from server-side
  state, not from a body claim. Pro: no change to request
  shapes for the five mutation Edge Functions, so apps/web's
  mutation call sites are unchanged (no slug-carriage wiring
  to add to five paths). Con: one extra DB read per mutation
  (the `event_id → slug` resolution against `game_events`);
  may be amortizable into the existing auth-gate query path if
  the auth gate already SELECTs from `game_events` (`Verified
  by:` plan-drafting reads the auth-gate helpers to confirm).
- *Option C.* Pro: per-caller demo-mode state. Con: introduces
  a stateful "demo session" concept that the milestone doc
  has not authorized; explicitly the kind of mechanism
  Cross-Phase Invariant 2 forbids (a session-scoped flag); the
  per-caller state would itself need to be allowlist-gated,
  which collapses back to either A or B for the actual gate.
  Rejected as out of scope.

**Came down to.** Whether the request shape's slug claim is
trustworthy enough to gate a server-side decision on. The
milestone doc Cross-Phase Invariant 1 names "single source of
truth, exposed to every guard site by an *enforced* path" — a
client-asserted slug is not enforced; an event_id-derived slug
is. Option B keeps the predicate's truthfulness anchored to
server-resolved state.

**Resolution.** **Option B — server-side slug resolution from
`eventId`.** Each of the five mutation Edge Functions performs
the resolution before the 403 short-circuit decision. The
shared Edge Function helper introduced by 3.3 (working name
`evaluateDemoModeRejection`; final naming owned by plan-
drafting) encapsulates:

1. Read `eventId` from the validated request body (each
   function's existing body schema already validates this
   field).
2. Issue a service-role SELECT against `game_events` to
   resolve `eventId → slug`. (This SELECT mirrors the
   service-role pattern the 3.2 read shim established; the
   helper composes the same `createClient(supabaseUrl,
   serviceRoleKey)` shape per
   [`get-redemption-status/index.ts:44-49`](/supabase/functions/get-redemption-status/index.ts).)
3. Evaluate `isTestEventSlug(resolvedSlug) && noAuthContext(req)`.
   If true, return structured 403 with `demo_mode_read_only`.
   Else, return `null` so the calling function continues to
   its existing auth-gate path.

The helper is invoked at the same call site as today's auth
gate, before the auth gate. Plan-drafting confirms the exact
helper-shape against the on-disk `_shared/` conventions and
considers whether the existing auth-gate helpers
(`event-organizer-auth.ts`, `redemption-operator-auth.ts`)
already SELECT from `game_events` such that the lookup can be
threaded through them.

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
("single source of truth, exposed to every guard site by an
enforced path" — server-side resolution is the enforced path);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 2](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(client-asserted ingredients banned from substituting for
allowlist membership — slug-in-body is the closest analog the
ban must extend to);
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(server contract: 403 short-circuit "when the calling slug is
in the allowlist and no auth context is present" — Option B
makes "calling slug" mean server-resolved slug, not body-
claimed slug);
[`get-redemption-status/index.ts:44-49`](/supabase/functions/get-redemption-status/index.ts)
(the service-role-client construction pattern the new helper
mirrors);
existing mutation request body schemas confirm slug is not
present today (`Verified by:`
[`save-draft/index.ts:14-17`](/supabase/functions/save-draft/index.ts),
[`publish-draft/index.ts:14-16`](/supabase/functions/publish-draft/index.ts),
[`unpublish-event/index.ts:10-12`](/supabase/functions/unpublish-event/index.ts),
[`redeem-entitlement/index.ts:95-97`](/supabase/functions/redeem-entitlement/index.ts),
[`reverse-entitlement-redemption/index.ts:104-134`](/supabase/functions/reverse-entitlement-redemption/index.ts) —
all five carry `eventId` only, no `slug`).

### 3. Mutation-control disabled-state shape — disabled-with-tooltip per surface, controls live inside the read-only variants [Resolved → Option A]

**What was decided.** What the read-only state on mutation
controls looks like on bypass-rendered surfaces:
disabled-with-tooltip / hidden / click-and-error / per-surface
combination. Owned by phase 3.3 per
[`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
and reaffirmed in
[`scoping/m3-phase-3-2.md` decision 5](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md)
(which deferred the shape and the controls themselves to 3.3).

**Why it mattered.** AGENTS.md "Bans on surface require
rendering the consequence" requires the chosen shape to be
verified by rendering it. 3.2 stripped mutation controls from
the bypass branch entirely (read-only data view, no buttons);
3.3 must decide what to render *back in* the bypass branch and
in what disabled state.

**Options considered.**

1. **Disabled-with-tooltip uniformly across all five mutation
   controls (Option A).** Each mutation control renders in the
   bypass branch with `disabled` attribute set; `aria-disabled`
   set; a hover/focus tooltip explains "Demo mode — sign in to
   make changes." On submit attempt (e.g., click on a disabled
   button), no action fires (browser-native disabled-button
   semantics). Click-and-error is not the path; the disabled
   attribute prevents action.
2. **Hidden uniformly (Option B).** Each mutation control is
   absent from the bypass branch's render path. The DemoModeBanner
   already says "this is read-only," so the absence is
   self-explanatory. (This is essentially what 3.2 already
   ships for some surfaces; Option B is the "stay with 3.2's
   shape" choice.)
3. **Click-and-error uniformly (Option C).** Mutation controls
   render as enabled-looking buttons; on click, the mutation
   fires, the server returns 403 `demo_mode_read_only`, and the
   client surfaces a banner/toast explaining "Demo mode."
4. **Per-surface mix (Option D).** E.g., admin: disabled-with-
   tooltip on Save / Publish / Unpublish; redeem: hidden submit
   button (the keypad's input-collection UI is preserved as a
   data-display affordance but the submit affordance is absent);
   redemptions: disabled-with-tooltip on the reverse buttons in
   the detail sheet.

**Pros / cons.**

- *Option A.* Pro: matches the existing button shapes — each
  of the five mutation controls already accepts a `disabled`
  prop (`Verified by:`
  [`AdminEventDetailsForm.tsx:286-292`](/apps/web/src/admin/AdminEventDetailsForm.tsx),
  [`AdminPublishPanel.tsx:76-83`](/apps/web/src/admin/AdminPublishPanel.tsx),
  [`RedeemKeypad.tsx:71-78`](/apps/web/src/redeem/RedeemKeypad.tsx),
  [`RedemptionDetailSheet.tsx:350-356`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx))
  so passing a new "demo-mode" condition into the existing
  `disabled` expression is a localized diff. Pro: the partner
  walking the demo sees the *full* signed-in workspace shape
  with controls in place, just inert — they understand "this
  is what an organizer would see and do" without having to
  imagine it. Pro: the disabled state is recoverable for a
  partner who proceeds to sign in (the controls are already
  in the DOM with the right ARIA semantics; switching to
  signed-in mode just removes the `disabled` attribute).
  Con: requires re-introducing the mutation-control-rendering
  components into the bypass branch — 3.2's bypass branch
  renders `<DemoModeAdminView />` which doesn't include any
  controls today; 3.3 has to either extend `DemoModeAdminView`
  to render disabled controls, or replace it with the
  signed-in flow shape parameterized by a `mode: "demo" |
  "live"` prop.
- *Option B.* Pro: cleanest seam — bypass branch renders
  data-only, no controls, the banner says "read-only," done.
  No re-introduction work; what 3.2 ships stays. Con: the
  partner doesn't see the workspace's full shape; the demo
  experience is "you can look at data" rather than "you can
  see the workspace exactly as an organizer would, just
  inert." For an *internal-partner audience* (per epic Goal),
  the latter is better — the demo's purpose is to let
  partners evaluate the platform's capabilities, and seeing
  the controls in place (even disabled) communicates more
  capability than empty data views.
- *Option C.* Pro: end-to-end exercise of the
  `demo_mode_read_only` rejection path — partners trigger the
  mutation and see the structured error response surface. Con:
  the partner clicks a button that *should* work and gets an
  error — surprising and frustrating UX; trains partners to
  expect mutations to fail on test slugs, which is an
  unhelpful interaction model; AGENTS.md "Bans on surface
  require rendering the consequence" applied here would surface
  that the consequence of a click-and-error pattern is partner
  confusion. Reject.
- *Option D.* Pro: per-surface tuning. Con: inconsistency for
  the partner walking multiple surfaces — disabled-with-tooltip
  on admin and disabled-with-tooltip on redemptions, but
  hidden on redeem, would surface "why is this surface
  different?" with no semantic answer. The redeem surface's
  submit button is already inside a keypad UI that 3.2's
  `DemoModeRedeemView` removed entirely (per the
  read-mediation surface contract,
  [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
  notes redeem needs 0 read paths so 3.2's `DemoModeRedeemView`
  is "static hint" — see the Reality-check inputs section
  below); 3.3 either re-introduces the keypad shell with
  disabled controls (Option A on redeem too) or keeps it
  absent (Option B on redeem). The redeem surface's UI shape
  forces the per-surface differentiation choice into Option A
  or Option B uniformly.

**Came down to.** Whether the demo's purpose is "show the data"
(Option B, what 3.2 ships) or "show the workspace shape with
inert controls" (Option A). The epic's Goal language ("internal
partners need to walk through the platform end-to-end to
evaluate it") supports Option A — partners evaluate the
*workspace*, not just the data; controls in place communicate
capability that controls absent does not.

The keypad surface forces the choice: the redeem booth's
purpose is the keypad input + submit affordance. A demo of the
booth without the keypad doesn't demo the booth. Option A on
redeem (re-introduce the keypad shell with disabled submit) is
the only honest demo of the redemption-booth experience; Option
B on redeem (keep 3.2's static hint) doesn't demo the booth at
all.

**Resolution.** **Option A — disabled-with-tooltip uniformly.**
3.3 re-introduces the mutation controls into the bypass branch
via either:

- **Path 1: extend the existing `DemoModeAdminView` /
  `DemoModeRedeemView` / `DemoModeRedemptionsView` to render
  the signed-in workspace shape with mutation controls present
  in disabled state.** The read-only view becomes a "demo of
  the workspace" view rather than a "data-only" view.
- **Path 2: replace the demo-mode views with the signed-in
  flow components parameterized by a `mode: "demo" | "live"`
  prop.** Each signed-in component (`SignedInEventAdminFlow`,
  `SignedInRedeemFlow`, `SignedInRedemptionsFlow`) accepts
  the prop and threads `disabled` state through its mutation
  controls accordingly.

Plan-drafting picks the path against the actually-rendered 3.2
components per AGENTS.md "Bans on surface require rendering
the consequence" — both paths are tractable; the choice
depends on the existing component complexity and prop-
threading cost. The contract this scoping decision binds is
the **disabled-with-tooltip shape**, not the path that
achieves it.

Tooltip copy (working draft; final spelling owned by plan-
drafting against rendered components): "Demo mode — sign in
to make changes." Same tooltip across all five controls; the
banner's "Demo mode" terminology is reused so the partner
sees one consistent vocabulary.

**Verified by:**
[`AdminEventDetailsForm.tsx:286-292`](/apps/web/src/admin/AdminEventDetailsForm.tsx)
(the Save button — accepts a `disabled` prop today, used for
the "no changes pending" condition; demo-mode adds another
condition);
[`AdminPublishPanel.tsx:76-83`](/apps/web/src/admin/AdminPublishPanel.tsx),
[`AdminPublishPanel.tsx:105-112`](/apps/web/src/admin/AdminPublishPanel.tsx),
[`AdminPublishPanel.tsx:118-127`](/apps/web/src/admin/AdminPublishPanel.tsx),
[`AdminPublishPanel.tsx:128-136`](/apps/web/src/admin/AdminPublishPanel.tsx)
(Publish, Unpublish, Confirm, Cancel — same pattern);
[`RedeemKeypad.tsx:71-78`](/apps/web/src/redeem/RedeemKeypad.tsx)
(keypad submit — already accepts `disabled` for the
`isSubmitting` and `isSubmitEnabled` conditions; demo-mode
adds another);
[`RedemptionDetailSheet.tsx:350-356`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx),
[`RedemptionDetailSheet.tsx:442-450`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx),
[`RedemptionDetailSheet.tsx:423-429`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx)
(Reverse, Confirm reversal, Retry — same pattern);
[`apps/web/src/demo/DemoModeBanner.tsx`](/apps/web/src/demo/DemoModeBanner.tsx)
(the banner already declares "this is read-only" — the
disabled-with-tooltip controls are visually consistent with
that declaration);
[`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
[`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
[`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)
(3.2's read-only views — the components 3.3 either extends or
replaces).

### 4. Edge Function 403 short-circuit branch shape — shared `_shared/demo-mode-rejection.ts` helper called before existing auth gate [Resolved → Option B]

**What was decided.** Where the 403 short-circuit branch sits
in each of the five mutation Edge Functions, and how its logic
is encapsulated to avoid 5-function duplication.

**Why it mattered.** Five functions × duplicate "resolve
event_id → slug, check allowlist, check no-auth-context,
return 403 with structured body" logic = high drift risk per
[`m3-demo-mode-auth-bypass.md` Cross-Phase Risks → "Allowlist
drift between guard sites"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).
The shared-helper pattern is what the milestone-doc Cross-Phase
Invariant 1 explicitly authorizes ("imports directly from that
constant"); the question is the helper's shape.

**Options considered.**

1. **Inline branches per function — no shared helper (Option
   A).** Each of the five functions adds the resolve-slug +
   check-allowlist + check-no-auth-context + return-403 sequence
   in its own body before its existing auth gate. ~25 lines × 5 = ~125 LOC duplicated.
2. **New shared helper at
   `supabase/functions/_shared/demo-mode-rejection.ts` (Option
   B).** Exports an async function (working name
   `evaluateDemoModeRejection(req, eventId, supabaseAdmin)`)
   that returns either `null` (continue to auth gate) or a
   `Response` (the structured 403). Each of the five
   functions calls it before the existing auth gate; the shared
   helper owns the resolve + check + format logic.
3. **Augment the existing auth-gate helpers
   (`_shared/event-organizer-auth.ts`,
   `_shared/redemption-operator-auth.ts`) to handle the demo-
   mode branch internally (Option C).** Each auth-gate helper
   first runs the demo-mode-rejection check; if the request
   is in demo mode, returns the 403; else continues to the
   existing organizer/operator auth check.

**Pros / cons.**

- *Option A.* Pro: no new shared file. Con: 125 LOC of
  duplication is exactly the drift surface the Risk Register
  names; the cross-phase invariant binds against this shape.
- *Option B.* Pro: single canonical implementation; one place
  to test the resolve + check logic; one place to update if the
  structured-error-body shape evolves; AGENTS.md
  "Composed-predicate error-treatment audit" applies once at
  the helper, not five times. Pro: composes cleanly with each
  function's existing structure (call helper → if 403 returned,
  return it; else continue to auth gate). Con: introduces a
  new helper file; the helper's responsibility-set straddles
  "resolve slug from DB" + "check allowlist" + "format
  structured 403" — but each piece is small and the
  composition is the natural unit of reuse.
- *Option C.* Pro: zero changes to function bodies — the
  existing auth-gate call site already exists in each function;
  augmenting the helper internally moves the demo-mode logic
  into the existing call. Con: changes the contract of the
  auth-gate helpers (they now return either "auth result" or
  "demo-mode 403"), which couples two concepts that should
  stay separate; the auth-gate helpers are about
  authentication, not about demo-mode rejection. Reviewer
  attention on the auth-gate helpers gets diffused. Reject on
  separation-of-concerns grounds.

**Came down to.** Helper vs. inline. The
duplication-and-drift risk is the binding consideration; a
shared helper resolves it cleanly without coupling demo-mode
to authentication.

**Resolution.** **Option B.** New helper at
`supabase/functions/_shared/demo-mode-rejection.ts` with the
working signature:

```
async function evaluateDemoModeRejection(args: {
  request: Request;
  eventId: string;
  supabaseAdmin: SupabaseClient;
}): Promise<Response | null>
```

Returns `null` if the request is not in demo mode (continue to
existing auth gate); returns a `Response` (HTTP 403, JSON body
`{ "error": "demo_mode_read_only", "message": "..." }`,
appropriate CORS headers) if it is. Each mutation function
calls it immediately after request-body validation and before
the existing auth-gate call; if the helper returns non-null,
the function returns that response; else continues unchanged.

The helper:

1. Resolves `eventId → slug` via `supabaseAdmin.from("game_events").select("slug").eq("id", eventId).maybeSingle()`.
   If the row is missing or the query errors, the helper
   returns `null` (defer to the existing auth gate which has
   its own missing-event handling).
2. Checks `isTestEventSlug(resolvedSlug)`. If false, returns
   `null`.
3. Checks `noAuthContext(request)` — defined as: no
   `Authorization` header bearing a JWT AND no signed session
   cookie verifiable via the existing
   `_shared/session-cookie.ts` `readVerifiedSession` helper.
   If either auth context is present, returns `null`.
4. Else, returns the structured 403 `Response`.

The helper's signature and the message-text contract are
final-resolved by plan-drafting against the on-disk patterns
in `_shared/`.

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(server contract: 403 with structured body, error code
`demo_mode_read_only`);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(no per-site duplication — helper shape is the canonical
satisfaction);
[`supabase/functions/_shared/`](/supabase/functions/_shared/)
directory shape (existing helpers `cors.ts`,
`event-organizer-auth.ts`, `redemption-operator-auth.ts`,
`session-cookie.ts`, `published-game-loader.ts`, etc. — the
new helper is consistent with the existing per-concern shape);
[`supabase/functions/_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts)
(the `readVerifiedSession` helper for the auth-context check);
[`supabase/functions/save-draft/index.ts:351`](/supabase/functions/save-draft/index.ts),
[`supabase/functions/publish-draft/index.ts:173`](/supabase/functions/publish-draft/index.ts),
[`supabase/functions/unpublish-event/index.ts:124`](/supabase/functions/unpublish-event/index.ts),
[`supabase/functions/redeem-entitlement/index.ts:178`](/supabase/functions/redeem-entitlement/index.ts),
[`supabase/functions/reverse-entitlement-redemption/index.ts:204`](/supabase/functions/reverse-entitlement-redemption/index.ts)
(the five existing auth-gate call sites the new helper is
invoked before).

### 5. apps/web noindex emit — useEffect-based document.head injection in a shared `useNoindex()` hook, called by each bypass branch [Resolved → Option B, subject to plan-drafting spike confirmation]

**What was decided.** What mechanism injects `<meta name="robots"
content="noindex, nofollow">` into the document head when a
bypass branch renders, and removes it when the branch unmounts.
Owned by phase 3.3 per
[`m3-demo-mode-auth-bypass.md` Cross-Phase Decisions →
Deferred to phase-time → "noindex emit shape on apps/web
bypass-rendered routes"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).
This is a novel mechanism per AGENTS.md "Spike before plan for
novel mechanisms" — apps/web has no existing head-tag injection
pattern (`Verified by:`
[`apps/web/index.html`](/apps/web/index.html) is purely
static — meta charset, viewport, description, and title only;
no `react-helmet` or `react-helmet-async` dependency in
`package.json`; no `useEffect` head-mutation pattern in any
apps/web component grepped during scoping).

**Why it mattered.** The cross-phase invariant 3 (cross-app
demo signaling stays honest) and the test-event noindex
inheritance from event-platform-epic M3 phase 3.1 require the
bypass-rendered apps/web routes to carry the same noindex
posture as the apps/site `/event/<test-slug>` page. apps/site
emits noindex via Next.js's metadata API
([`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx) —
`Verified by:` plan-drafting reads the on-disk `generateMetadata`);
apps/web has no parallel infrastructure.

**Options considered.**

1. **Static `<meta name="robots" content="noindex">` in
   `apps/web/index.html` (Option A).** Always-on noindex for
   apps/web. Simple — no React mechanism needed.
2. **Per-bypass-branch `useEffect` that mutates
   `document.head` directly, encapsulated in a shared hook
   (Option B).** Working name `useNoindex()` — on mount,
   appends `<meta name="robots" content="noindex, nofollow">`
   to `document.head`; on unmount, removes it. Each of the
   three bypass branches calls the hook.
3. **react-helmet-async (Option C).** Adds the
   `react-helmet-async` dependency; each bypass branch
   renders `<Helmet><meta name="robots" content="noindex,
   nofollow" /></Helmet>`.
4. **Server-side response header `X-Robots-Tag: noindex,
   nofollow` set by Vercel rewrites or middleware on
   bypass-rendered route paths (Option D).** No client-side
   change; the response header replaces the meta tag.

**Pros / cons.**

- *Option A.* Pro: simplest possible implementation.
  Con: regresses SEO posture for the *real* events apps/web
  also serves (`/event/<real-slug>/admin`, etc., are
  legitimate organizer-facing routes that should be
  indexable for the organizer-search use case if any future
  product surface needs them) — apps/web today carries no
  noindex, and global noindex is a roadmap-incompatible
  default. Also: the bypass-rendered routes are exactly three
  paths-shapes (the three bypass-target shells × two test
  slugs = 6 URLs); a global solution is overscoped. Reject.
- *Option B.* Pro: minimal — no new dependency; native React
  + DOM API; localized to the bypass branches that need it;
  unmount cleanup keeps the document head consistent if the
  user transitions out of the bypass branch (e.g., signs in
  during the visit and the bypass branch unmounts). Pro:
  composes cleanly with apps/web's existing React Router +
  Vite stack. Con: novel mechanism for apps/web — no
  precedent — so AGENTS.md "Spike before plan for novel
  mechanisms" applies; the spike must confirm the
  useEffect-based meta injection works under React's
  render-then-effect lifecycle (the meta tag is present before
  any crawler renders the page) and that React StrictMode's
  double-effect-invocation pattern doesn't leave duplicate or
  mismatched cleanup.
- *Option C.* Pro: idiomatic library for this exact problem.
  Con: adds a runtime dependency for one meta tag on three
  routes — overweight; the project's dependency-conservation
  posture (per
  [`docs/architecture.md`](/docs/architecture.md)
  framework choices) prefers minimal additions.
- *Option D.* Pro: server-side; works even if JavaScript is
  disabled. Con: apps/web is a Vite SPA; the routes are
  client-rendered after the SPA shell loads; a Vercel rewrite
  or middleware that inspects path-shape and sets a header
  per-bypass-route would be a novel deploy-side mechanism (no
  existing apps/web Vercel rewrite routes per
  `Verified by:` plan-drafting reads
  [`apps/web/vercel.json`](/apps/web/vercel.json) if it
  exists, or the project root `vercel.json`). Cross-phase
  with Option B's spike effort, the deploy-side mechanism
  has more moving parts.

**Came down to.** Whether the noindex emit is best done
client-side (B/C) or server-side (D), and within client-side,
whether to add a dependency (C) or write the helper from
scratch (B). The minimal, no-new-dependency, scope-contained
choice is B; Option D is a heavier mechanism for the same
end result; C carries an unnecessary dependency.

**Resolution (subject to plan-drafting spike).** **Option B —
useEffect-based document.head injection in a shared
`useNoindex()` hook.** The hook lives at
`apps/web/src/lib/useNoindex.ts` (or `apps/web/src/demo/`
co-located with `DemoModeBanner.tsx`; plan-drafting picks
against the apps/web shared-utility convention). Each of the
three bypass branches calls the hook unconditionally (the hook
is invoked from the bypass-branch render path only, so the
"unconditional within the bypass branch" pattern doesn't
violate the React rules-of-hooks).

**Plan-drafting spike requirement (per AGENTS.md "Spike before
plan for novel mechanisms").** Before flipping the plan from
`In draft` to `Proposed`, plan-drafting runs a 30-minute
throwaway spike that:

1. Implements the `useNoindex()` hook end-to-end in a
   `spike/m3-phase-3-3-noindex` worktree branch.
2. Exercises it from a bypass-branch render against
   `vercel dev` (or the project's apps/web dev runner per
   `package.json` `scripts`).
3. Confirms via DOM inspection that the meta tag is present
   when the bypass branch is rendered and absent (or was never
   added) when a non-bypass route is rendered.
4. Confirms the unmount cleanup removes the tag (transition
   from bypass to non-bypass route).
5. Confirms React StrictMode (apps/web's dev-time mounting
   semantics — `Verified by:` plan-drafting reads
   `apps/web/src/main.tsx` for the `<StrictMode>` wrapper)
   doesn't leave duplicate meta tags or fail cleanup.

If the spike surfaces a dealbreaker, plan-drafting revises this
decision in the same doc — Option C (react-helmet-async) is
the fallback, with the explicit dependency-addition tradeoff
recorded.

**Verified by:**
[`apps/web/index.html`](/apps/web/index.html) (the static
shell — confirms no existing head-tag mechanism);
absence of `react-helmet` / `react-helmet-async` in
`package.json` (`Verified by:` plan-drafting greps);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Decisions →
Deferred to phase-time → "noindex emit shape on apps/web
bypass-rendered routes"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the deferral Owner is phase 3.2+; phase 3.3 owns it because
3.2 deferred);
AGENTS.md "Spike before plan for novel mechanisms" rule;
[`docs/architecture.md`](/docs/architecture.md) (dependency-
conservation framing for the new-dependency tradeoff).

### 6. M2 role-door copy revision wording — strip the "or wait for demo mode in M3" parenthetical, leave the sign-in framing, add a one-sentence demo entry point on Organizer + Volunteer cards [Resolved → Option B]

**What was decided.** What the revised copy on the apps/site
home page's Organizer + Volunteer role-door cards looks like
now that demo-mode access has landed. Owned by phase 3.3 per
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 4](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
("M2's role-door copy on Organizer + Volunteer cards is revised
in the M3-closing PR to reflect the now-landed bypass").

**Why it mattered.** The current M2 copy
([`RoleDoors.tsx:47-60`](/apps/site/components/home/RoleDoors.tsx))
on Organizer says "Sign in to manage this event (or wait for
demo-mode access in M3)" and Volunteer says "Sign in to redeem
codes (or wait for demo-mode access in M3)." The "M3"
reference becomes stale the moment 3.3 ships — the wait is
over.

**Options considered.**

1. **Strip the parenthetical, leave just the sign-in framing
   (Option A).** Organizer: "Sign in to manage this event."
   Volunteer: "Sign in to redeem codes." Demo-mode entry is
   not surfaced from these cards; partners arriving from the
   home page navigate to the test-event landing pages and
   from there to `/event/<test-slug>/admin` etc. by other
   means.
2. **Strip the parenthetical, add a one-sentence demo entry
   surface on each card (Option B).** Organizer: "Sign in to
   manage this event. Or browse the [Harvest demo
   workspace](/event/harvest-block-party/admin) without
   signing in." Volunteer: "Sign in to redeem codes. Or try
   the [Harvest demo redemption booth](/event/harvest-block-party/game/redeem)
   without signing in." (Slug + path final-final-spelled at
   plan-drafting against rendered components and against the
   home page's existing link-style conventions.)
3. **Replace the role-door cards' descriptions entirely with
   demo-mode-first framing (Option C).** Organizer: "Browse
   the demo workspace, or sign in for the live one."
   Volunteer: "Try the demo redemption booth, or sign in for
   live."

**Pros / cons.**

- *Option A.* Pro: minimal-edit diff; no new affordance to
  position; the role-door's pre-M3 framing (auth-gated
  surface, sign-in is the path) stays intact. Con: the demo
  surface is reachable but undiscoverable from the role-door
  cards — a partner reading the home page after M3 ships
  has no signal that demo access exists from these
  surfaces; they have to know to navigate by hand. The
  demo-expansion epic's Goal language ("internal partners
  need to walk through the platform end-to-end to evaluate
  it") implies the home page surfaces the demo entry, not
  hides it. Reject — Option A regresses the discoverability
  the home page is supposed to provide.
- *Option B.* Pro: demo entry is discoverable from the
  role-door cards; the sign-in framing is preserved (real
  events / production use is sign-in); the demo entry is
  the "or" clause, positioning it as the alternative
  partner flow. Pro: matches the epic's
  "marketing/demo experience that surfaces the test events"
  intent. Con: longer card copy; the home-page card
  density-and-readability balance shifts slightly.
- *Option C.* Pro: demo-mode-first framing for an
  internal-partner audience. Con: misrepresents the
  platform's primary mode — real events use the sign-in
  flow; demo mode is the secondary affordance for partner
  evaluation. Inverting the framing on the home page
  misleads about what the platform's primary use case is.
  Reject.

**Came down to.** Discoverability of the demo entry vs.
copy-edit minimalism. Discoverability is load-bearing for
the epic's Goal; minimalism without discoverability is
regressive.

**Resolution.** **Option B — strip the parenthetical, add
a one-sentence demo entry on each affected card.**

Working copy contract (final wording owned by plan-drafting
against rendered components per AGENTS.md "Bans on surface
require rendering the consequence"):

- Organizer card current: "Sign in to manage this event (or
  wait for demo-mode access in M3)."
- Organizer card revised: "Sign in to manage this event. Or
  browse the [Harvest demo workspace](/event/harvest-block-party/admin)
  without signing in."
- Volunteer card current: "Sign in to redeem codes (or wait
  for demo-mode access in M3)."
- Volunteer card revised: "Sign in to redeem codes. Or try
  the [Harvest demo redemption booth](/event/harvest-block-party/game/redeem)
  without signing in."
- Attendee card: unchanged (no auth caveat today; gameplay
  route was always public).

Note the slug used in the demo links is `harvest-block-party`
specifically — the home page already frames the Harvest
event as the primary demo narrative
(`Verified by:` plan-drafting re-reads the home-page
introduction); pointing both demo links at the same event
keeps the narrative coherent. The `riverside-jam` test event
remains accessible via the home page's existing event
preview surface; the role-door cards do not multi-link.

**Verified by:**
[`RoleDoors.tsx:47-60`](/apps/site/components/home/RoleDoors.tsx)
(current copy on Organizer + Volunteer cards;
[`RoleDoors.tsx:41-46`](/apps/site/components/home/RoleDoors.tsx)
on Attendee for the unchanged comparison);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 4](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the M3-closing-PR binding for the copy revision);
[`docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md)
(the M2 plan that introduced the current copy and named
the M3-closer revision as its handoff —
plan-drafting reads to confirm the revision satisfies what
M2 declared M3 would inherit, per the milestone-doc
Documentation Currency entry "M2 phase 2.3 plan role-door
copy contract").

### 7. M3 doc-currency map — README + architecture + product as paragraph edits, styling and operations skipped, backlog as confirmation pass [Resolved]

**What was decided.** What each doc entry in the
[`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
section becomes when 3.3 lands. The milestone doc names six
doc files plus the milestone-doc itself plus the epic doc;
3.3 owns each owner-tagged "M3-closing phase."

**Why it mattered.** The doc-currency map is rule-shaped at
milestone level (doc edits MUST land); the per-doc edit
shape is plan-time content. Decisions to skip an entry must
be justified per AGENTS.md "Plan-to-PR Completion Gate"
("a requirement is either in-scope or deferred — there is
no third option"); skipping a doc-currency entry without
written rationale is the failure mode.

**Resolution.** Per-doc 3.3 edit shape:

- **`README.md`** — paragraph edit to the capability
  description. Working contract: extend the section that
  describes apps/web event-route surfaces with a paragraph
  on demo-mode access on test slugs (read-only; allowlist-
  gated; the two test slugs `harvest-block-party` and
  `riverside-jam`; the noindex / disclaimer-banner posture).
  Plan-drafting reads the on-disk README to find the natural
  insertion point. **In scope for 3.3.**
- **`docs/architecture.md`** — paragraph edit to the
  trust-boundary section. Working contract: the test-event
  allowlist constant
  (`shared/events/testEventAllowlist.ts`) is the load-bearing
  security mechanism for the bypass; the apps/web bypass
  branch + Edge Function read shim + Edge Function 403
  short-circuit form the surface; the `noAuthContext`
  predicate in `_shared/demo-mode-rejection.ts` is the
  server-side enforcement. Plan-drafting reads the on-disk
  architecture trust-boundary section to find the insertion
  point and binds the prose against the actually-merged
  helper file paths. **In scope for 3.3.**
- **`docs/product.md`** — paragraph edit to the current
  capability description. Working contract: post-M3, the
  three role surfaces (admin, redeem, redemptions) are
  partner-reachable on test slugs without sign-in; the data
  shown is read-only; the disabled mutation controls
  communicate "what an organizer would do" without
  performing it; what is real (the data fetched from real
  tables via the read shim) vs. stubbed (none — partners see
  the actual platform's data, just gated). **In scope for
  3.3.**
- **`docs/operations.md`** — **skipped.**
  The milestone-doc entry is conditional ("only updated if
  3.1 chooses functional-with-reset … or sandbox-ephemeral
  with operator-visible state management"); 3.1 chose
  read-only browse, which leaves operations unchanged. No
  reset story, no sandbox state, no operator-visible
  demo-mode runbook. **Justified deferral per AGENTS.md
  "Plan-to-PR Completion Gate."**
- **`docs/styling.md`** — **skipped.** The milestone-doc
  entry is conditional on the demo-mode signaling
  introducing new themable / structural token classification;
  3.2's `DemoModeBanner` and 3.3's disabled-with-tooltip
  treatment both compose existing tokens (the banner uses
  the apps/site `TestEventDisclaimer`-equivalent fixed
  supplementary-information color recipe per
  [`apps/web/src/styles/_demo-mode.scss`](/apps/web/src/styles/_demo-mode.scss);
  the disabled-with-tooltip uses standard button `disabled`
  semantics already covered by existing styling). **Justified
  deferral.** Plan-drafting confirms by re-reading
  `_demo-mode.scss` for any token additions.
- **`docs/backlog.md`** — confirmation pass. Working
  contract: the post-epic items the epic Backlog Impact
  named ("demo-mode generalization beyond the test-event
  allowlist," "production-friendly demo-mode for
  partner-onboarding scenarios") are confirmed present in
  the backlog; if not present, added at this PR. The
  partner-feedback capture mechanism backlog item the 3.1
  plan named is also confirmed and may transition to
  in-progress / closed depending on whether 3.3 ships any
  capture surface (none anticipated; remains as a
  post-epic item). **In scope for 3.3.**
- **`docs/open-questions.md`** — **out of scope for 3.3.**
  Closed by phase 3.1 per the milestone-doc Documentation
  Currency assignment ("Owned by phase 3.1"); 3.3 does not
  re-touch.
- **`docs/dev.md`** — **out of scope for 3.3.** Milestone-
  doc explicitly excludes it ("[`docs/dev.md`] is **not**
  expected to need").
- **`m3-demo-mode-auth-bypass.md`** (the milestone doc) —
  top Status block flips `Proposed` → `Landed`; Phase
  Status table 3.3 row Status flips `Proposed` → `Landed`
  with PR column populated; Sequencing paragraph
  ("Plan-drafting cadence") may receive minor rephrasing
  reflecting the now-merged state but is not required to
  change. **In scope for 3.3.**
- **`epic.md`** (the demo-expansion epic) — Milestone Status
  table M3 row flips `Proposed` → `Landed`. The epic's top
  Status does NOT flip (per the epic's own framing,
  "first-iteration close alone does not flip top-level
  Status"); the M1–M3 first-iteration scope is complete but
  the epic's full scope (M4–M6) remains deferred. **In scope
  for 3.3.**
- **`m2-phase-2-3-plan.md`** — confirmation pass per the
  milestone-doc Documentation Currency entry (not a doc
  edit; plan-drafting walks the M2 plan's role-door copy
  contract to confirm decision 6's revised copy satisfies
  what M2 declared M3 would inherit). No edit to the M2
  plan. **In scope for 3.3 as a verification step.**

The skipped entries (operations.md, styling.md,
open-questions.md, dev.md) are explicit deferrals or
out-of-scope per the milestone-doc framing they each cite;
they satisfy AGENTS.md "Plan-to-PR Completion Gate"'s
"requirement is either in-scope or deferred" rule.

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(every entry above maps to a milestone-doc bullet);
[`apps/web/src/styles/_demo-mode.scss`](/apps/web/src/styles/_demo-mode.scss)
(the styling entry's "no new tokens" claim);
[`docs/open-questions.md`](/docs/open-questions.md) (3.1 closed
the entry; verified by reading the doc's current state during
scoping);
AGENTS.md "Plan-to-PR Completion Gate" (the deferral-with-
rationale rule applied to the skipped entries).

### 8. Test surface for 3.3 — five Deno tests for the 403 branch + e2e fixture extension for noindex + manual-verify for disabled-state UX [Resolved → Option B]

**What was decided.** What test surfaces 3.3's PR adds to
prove the write-side and noindex contracts.

**Why it mattered.** Each new surface (server 403, client
disabled-state, noindex emit) is a candidate for automated
coverage. The branch-test risk surfaces are: (a) the 403
branch firing on the wrong condition (allowlist drift); (b)
the noindex meta tag missing from a bypass route or present
on a non-bypass route; (c) a disabled mutation control that
isn't actually disabled (i.e., still fires the mutation).

**Options considered.**

1. **Maximal coverage (Option A).** Five Deno tests + five
   e2e fixtures (one per disabled mutation control across
   surfaces) + e2e fixtures for noindex on each of the six
   bypass URLs.
2. **Targeted coverage (Option B).** Five Deno tests (one per
   mutation function — each asserts a 403 with structured
   body for the demo-mode case AND that signed-in callers
   are unaffected); extend the existing 3.2 e2e fixture
   `tests/e2e/demo-mode-bypass.spec.ts` to assert (a) the
   noindex meta tag presence on a bypass route AND (b) the
   disabled-state on at least one mutation control per
   surface. Manual-verify the disabled-state UX completeness
   during implementation per AGENTS.md "Bans on surface
   require rendering the consequence."
3. **Minimal coverage (Option C).** Five Deno tests only; no
   e2e additions; rely on manual-verify for noindex and
   disabled-state.

**Pros / cons.**

- *Option A.* Pro: maximum coverage. Con: 5 + 5 + 6 = 16 new
  tests is a heavy authoring cost for marginal coverage; many
  of the e2e additions exercise the same DOM patterns
  redundantly.
- *Option B.* Pro: server-side coverage where it's load-
  bearing (the 403 branch is the canonical security surface);
  e2e extension where it's load-bearing (the noindex meta
  tag is the SEO posture; the disabled-state representative
  per surface confirms the pattern). Pro: composes with the
  existing 3.2 e2e fixture rather than creating a new file
  per assertion. Pro: the manual-verify step is on the UX
  shape — exactly where AGENTS.md "Bans on surface require
  rendering the consequence" places the verification.
- *Option C.* Pro: lowest authoring cost. Con: misses the
  noindex regression class (a future change to the `useNoindex`
  hook could silently stop emitting); misses the
  disabled-state regression class (a refactor of the bypass
  branch could re-introduce enabled controls).

**Came down to.** Where automation pays for itself vs. where
manual-verify is the right path. Server tests (5 functions)
catch drift at the cheapest layer; the noindex fixture
catches the global-mechanism regression class; the
disabled-state representative confirms the pattern is in
place; the manual-verify on per-control completeness
(disabled-with-tooltip on every mutation control across all
three surfaces) is exactly the surface AGENTS.md authorizes
for render-time verification.

**Resolution.** **Option B.** Test surface:

1. **Five Deno tests under
   `tests/supabase/functions/`** (one per mutation function,
   following the existing per-function-test-file convention
   3.2 verified). Each test asserts:
   - Demo-mode anon caller (eventId resolving to an
     allowlist slug, no auth context) → HTTP 403, body
     `{ error: "demo_mode_read_only", message: ... }`.
   - Real-event anon caller (eventId resolving to a
     non-allowlist slug, no auth context) → existing 401
     unchanged.
   - Demo-mode signed-in caller (auth context present even
     if slug is allowlist) → continues to existing auth
     gate; 403 NOT returned.
2. **Extend
   `tests/e2e/demo-mode-bypass.spec.ts`** (the 3.2 fixture)
   with two new assertions per surface:
   - `<meta name="robots" content="noindex, nofollow">` is
     present in the document head when the bypass branch
     renders; absent when a non-bypass route renders.
   - At least one mutation control per surface (e.g., admin
     Save button) renders with `disabled` attribute when the
     bypass branch is active. The per-surface representative
     control is plan-time.
3. **Manual-verify checklist** in the plan's Validation Gate
   that walks every disabled mutation control across the
   three bypass-rendered surfaces. Each control on each
   surface is rendered against `vercel dev` (or the apps/web
   dev runner per `package.json` `scripts`); reviewer
   confirms `disabled` attribute, tooltip text, and ARIA
   semantics.

**Verified by:**
[`tests/supabase/functions/`](/tests/supabase/functions/)
(existing per-function Deno test convention — 3.2's
`read-demo-event.test.ts` is the most recent example);
[`tests/e2e/demo-mode-bypass.spec.ts`](/tests/e2e/demo-mode-bypass.spec.ts)
(the 3.2 fixture this phase extends);
AGENTS.md "Bans on surface require rendering the consequence"
(manual-verify is the authorized surface for UX completeness).

### 9. Status flips and milestone-doc/epic edits — landed atomically with 3.3's implementing PR [Resolved]

**What was decided.** When and how the milestone doc's top
Status, the milestone doc's Phase Status table 3.3 row, the
3.3 plan doc's Status, and the epic Milestone Status table
M3 row all flip from `Proposed` to `Landed`.

**Why it mattered.** Plan-to-PR Completion Gate requires the
plan's Status to flip in the same PR that implements it. The
milestone doc and epic Status flips are part of the
M3-closing doc-currency map (decision 7). If they flip
out-of-band — e.g., in a separate doc-only follow-up PR — the
"M3 is closed" claim becomes ambiguous between merge and
follow-up.

**Resolution.** All four flips land in 3.3's implementing PR:

1. **`m3-phase-3-3-plan.md`** Status: `Proposed` → `Landed`.
2. **`m3-demo-mode-auth-bypass.md`** top Status: `Proposed`
   → `Landed`.
3. **`m3-demo-mode-auth-bypass.md`** Phase Status table 3.3
   row Status: `Proposed` → `Landed`; PR column populated
   with the merging PR number.
4. **`epic.md`** Milestone Status table M3 row Status:
   `Proposed` → `Landed`.

The epic's top Status does NOT flip — per the epic's own
framing, the first-iteration close (M1–M3) does not flip
top-level Status; reopening M4–M6 is a separate scoping
decision against partner feedback.

The 3.2 row Status (already `Landed` per 3.2's PR #165
merge — `Verified by:` `git log` shows commit
`b7ec666 docs(plans): flip M3 phase 3.2 plan + milestone-doc
3.2 row to Landed`) is unchanged.

The Validation Gate of 3.3's plan covers the same-PR Status
flip per AGENTS.md "Plan-to-PR Completion Gate" — fully
satisfied pre-merge (no Tier 5 production-smoke split; the
post-merge production walk-through is part of 3.3's
Validation Gate but does not gate the Status flip because the
write-side rejection is observable on `vercel dev` and the
M2 copy revision is observable on the apps/site preview).

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the table this phase updates);
[`epic.md` Milestone Status](/docs/plans/epics/demo-expansion/epic.md)
(the table M3 row);
AGENTS.md "Plan-to-PR Completion Gate" (same-PR Status flip
default; Tier 5 split exception does not apply here).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading on-disk content against actually-merged code at plan-
time, not against the scoping snapshot:

- **noindex `useNoindex()` hook implementation spike output.**
  Per decision 5, plan-drafting runs the spike and confirms
  Option B (or revises to Option C if a dealbreaker surfaces).
  The plan's Contracts section binds the chosen mechanism's
  exact shape; the scoping decision binds the mechanism choice
  and the fallback path.
- **Path 1 vs Path 2 for the disabled-with-tooltip
  re-introduction.** Per decision 3, the disabled-with-tooltip
  *shape* is bound; the *path* (extend `DemoModeAdminView` /
  `DemoModeRedeemView` / `DemoModeRedemptionsView` vs.
  parameterize the existing signed-in flows with `mode: "demo"
  | "live"`) is plan-drafting's call against the existing
  component complexity. Plan-drafting reads each signed-in flow
  and each demo-mode view, picks the path that minimizes diff
  surface and prop-threading cost, and binds the chosen path
  in the plan's Contracts section.
- **Exact tooltip copy** across the disabled mutation controls.
  Working draft: "Demo mode — sign in to make changes." Plan-
  drafting refines against rendered components per AGENTS.md
  "Bans on surface require rendering the consequence."
- **Exact M2 role-door copy revision wording and link styling.**
  Per decision 6, the contract is bound; the exact wording
  ("browse the [Harvest demo workspace](...)" vs. another
  phrasing) and the link element (a plain anchor vs. a
  styled "secondary CTA" element if one exists in
  `RoleDoors.tsx`'s sibling components) are plan-drafting
  calls against the home page's existing link conventions.
- **`evaluateDemoModeRejection` helper exact signature** — the
  scoping decision 4 names a working signature; plan-drafting
  re-reads `_shared/` conventions and adjusts (parameter
  ordering, argument-object vs. positional, return-type
  documentation comments) to match prevailing patterns.
- **Per-mutation-function 403 message text.** Per decision 4,
  the structured body is `{ error: "demo_mode_read_only",
  message: "..." }`. The exact `message` text per function may
  benefit from per-context tuning ("Demo mode — sign in to
  save changes" for `save-draft`, "Demo mode — sign in to
  redeem codes" for `redeem-entitlement`, etc.) or may be a
  uniform string ("Demo mode — sign in to make changes."). Plan-
  drafting picks against partner-honesty concerns.
- **Per-doc-edit prose for README, architecture, product
  paragraphs.** Per decision 7, the contract for what each doc
  edit covers is bound; the exact prose is plan-drafting's
  call against the on-disk insertion point.
- **Self-Review Audit set** against
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
  Plan-drafting walks the catalog. Likely-relevant audits:
  composed-predicate auth-shape audit (yes — five Edge
  Functions receive a new shared rejection helper composed
  before existing auth gates); error-surfacing for user-
  initiated mutations (yes — the disabled-state-with-tooltip
  is the surface for the rejection); rename-aware diff
  classification (likely yes — `DemoModeAdminView` /
  `DemoModeRedeemView` / `DemoModeRedemptionsView` may
  rename or restructure depending on Path 1 vs Path 2);
  doc-currency audit (yes — the doc-currency map is a
  spread-out edit set). Plan-drafting confirms.
- **Validation Gate command list.** Beyond `npm run lint` and
  `npm run build:web`, the plan names the test runners:
  `npm run test` (Vitest), `npm run test:functions` (Deno —
  per-existing wrapper at
  [`scripts/testing/run-supabase-tests.cjs`](/scripts/testing)),
  the Playwright e2e wrapper for the extended fixture, and
  the manual-verify checklist procedure. Plan-drafting reads
  `package.json` `scripts` and `scripts/testing/` per AGENTS.md
  "Prefer existing wrapper scripts."
- **Commit boundaries.** Likely shape: (1) shared
  `evaluateDemoModeRejection` helper + Deno tests; (2)
  per-function 403 short-circuit branches across the five
  mutation functions; (3) apps/web disabled-state UI on each
  surface (one commit per surface or one commit total — depends
  on Path 1 vs Path 2); (4) `useNoindex()` hook + integration
  + e2e fixture extension; (5) M2 role-door copy revision in
  apps/site; (6) doc-currency edits (README, architecture,
  product, backlog); (7) milestone-doc + epic Status flips +
  3.3 plan Status flip. Plan-drafting finalizes against the
  actual edit shape.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants**; names per-phase additions if any.
  Candidate per-phase additions: "Demo-mode rejection helper
  is the single canonical site for the resolve-slug + check-
  allowlist + check-no-auth-context sequence" (decision 4); "no
  mutation control on a bypass-rendered surface is rendered
  in an enabled state under any code path" (decision 3); "the
  noindex meta tag is present on every bypass-rendered route
  for the duration of the bypass branch's mount" (decision 5).
  Plan-drafting confirms whether these belong as per-phase
  invariants or as plan-level contracts.
- Naming — `evaluateDemoModeRejection`, `useNoindex`,
  `demo_mode_read_only` (final), the per-surface disabled-
  state component / prop names per Path 1 vs Path 2
- Contracts — server-side 403 short-circuit contract (per-
  function call site + helper invocation order); slug-
  resolution contract (server-side from event_id, never from
  client body); mutation-control disabled-state contract per
  surface (per decision 3 + Path 1/2 outcome); `useNoindex`
  hook contract (mount adds, unmount removes, StrictMode
  safe); M2 role-door copy revision contract (per decision 6);
  M3 doc-currency edits contract (per decision 7); Status
  flips contract (per decision 9)
- Files To Touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — **references the milestone
  doc's Documentation Currency map**; names this PR as
  satisfying every entry per decision 7
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks**; names plan-implementation-level risks here
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; names per-phase additions if any

The duplication-reduction discipline is intentional: the plan
binds milestone-level content by reference, not by restatement.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **Five mutation Edge Function paths and auth-gate call sites.**
  Scoping read these on 2026-05-03:
  [`save-draft/index.ts:351`](/supabase/functions/save-draft/index.ts),
  [`publish-draft/index.ts:173`](/supabase/functions/publish-draft/index.ts),
  [`unpublish-event/index.ts:124`](/supabase/functions/unpublish-event/index.ts),
  [`redeem-entitlement/index.ts:178`](/supabase/functions/redeem-entitlement/index.ts),
  [`reverse-entitlement-redemption/index.ts:204`](/supabase/functions/reverse-entitlement-redemption/index.ts).
  Plan-drafting re-greps because line numbers drift.
- **Existing `_shared/` helper conventions.** Scoping read
  `_shared/admin-auth.ts`, `_shared/authoring-http.ts`,
  `_shared/cors.ts`, `_shared/event-organizer-auth.ts`,
  `_shared/published-game-loader.ts`,
  `_shared/redemption-operator-auth.ts`,
  `_shared/session-cookie.ts`, `_shared/doctor-check-anchor.ts`
  on 2026-05-03. Plan-drafting confirms the new helper file is
  consistent with the per-concern shape and that
  `readVerifiedSession` at
  [`_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts)
  is the canonical no-auth-context check.
- **`game_events` SELECT semantics for unauthenticated callers.**
  The 3.1 contract item 4 noted `game_events` is anon-readable
  for published events. Plan-drafting re-reads
  [`useEventAdminWorkspace`](/apps/web/src/admin/useEventAdminWorkspace.ts)
  or the relevant admin/redeem/redemptions data-fetcher path
  to confirm that the service-role SELECT in the new helper
  works for both published and draft test events (the new
  helper uses service-role privileges per the Edge Function
  shim precedent, so RLS shouldn't matter — but plan-drafting
  confirms).
- **Mutation-control file:line locations.** Scoping read these
  on 2026-05-03:
  [`AdminEventDetailsForm.tsx:286-292`](/apps/web/src/admin/AdminEventDetailsForm.tsx),
  [`AdminPublishPanel.tsx:76-83`, `105-112`, `118-127`, `128-136`](/apps/web/src/admin/AdminPublishPanel.tsx),
  [`RedeemKeypad.tsx:71-78`](/apps/web/src/redeem/RedeemKeypad.tsx),
  [`RedemptionDetailSheet.tsx:350-356`, `442-450`, `423-429`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx).
  Plan-drafting re-greps; if any control was added or removed
  between scoping and plan-drafting, the disabled-state
  contract grows or shrinks accordingly.
- **3.2 read-only variant components.** Scoping read these on
  2026-05-03:
  [`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx).
  Plan-drafting reads each end-to-end to inform the Path 1 vs
  Path 2 choice for decision 3.
- **3.2 page-component bypass branches.** Scoping read these on
  2026-05-03:
  [`EventAdminPage.tsx:393-407`](/apps/web/src/pages/EventAdminPage.tsx),
  [`EventRedeemPage.tsx:435-445`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`EventRedemptionsPage.tsx:696-706`](/apps/web/src/pages/EventRedemptionsPage.tsx).
  Plan-drafting re-greps because line numbers drift; the
  bypass-branch shape is the natural call site for `useNoindex()`
  per decision 5.
- **`apps/web/index.html` static-shape posture.** Scoping
  confirmed on 2026-05-03 it has no robots tag and no
  dynamic-head injection. Plan-drafting re-confirms; if any
  intervening PR added head-tag handling, decision 5's spike
  may revisit the mechanism choice.
- **`apps/web/src/main.tsx` `<StrictMode>` wrapping.** Plan-
  drafting reads to confirm `<StrictMode>` is the dev-time
  mounting wrapper; the `useNoindex()` spike asserts
  StrictMode's double-invocation pattern is handled.
- **`apps/web/src/styles/_demo-mode.scss` token additions.**
  Scoping inferred from decision 7 that this file composes
  existing tokens; plan-drafting confirms by reading the file
  and confirming `docs/styling.md` does not need an update.
- **`apps/site/components/home/RoleDoors.tsx` current copy
  shape.** Scoping read the file on 2026-05-03 (lines 25–64).
  Plan-drafting re-reads to confirm the M2 copy is unchanged
  since scoping; if any edit landed in the interim, decision 6
  may need refinement.
- **Existing test infrastructure paths.** Scoping verified
  `tests/supabase/functions/` (per-function Deno tests);
  `tests/e2e/demo-mode-bypass.spec.ts` (3.2's fixture);
  `package.json` `scripts` for the canonical test wrappers.
  Plan-drafting re-confirms paths and reads `package.json`
  `scripts` for the test runner invocations.
- **`docs/self-review-catalog.md`** existence and current
  audit list. Plan-drafting reads to pick the relevant
  audits per AGENTS.md "Self-Review Audits."

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.3 row at the Phase Status
  table (decision 9 flips to `Landed`); Cross-Phase Invariants
  the plan binds by reference; Cross-Phase Decisions
  ("Settled at phase-time" subsection 3.1 added; "Deferred to
  phase-time" entries this scoping session resolves —
  specifically "Demo-mode signaling pattern in UI" → 3.2's
  decision 4 already settled on banner pattern; 3.3 here
  layers the disabled-with-tooltip mutation-control
  treatment; "noindex emit shape on apps/web bypass-rendered
  routes" → decision 5 here).
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–7 are the
  data-access-semantics contract; item 5 binds the server-side
  403 + structured body that this phase implements; item 6
  binds the client-side disabled-state contract whose shape
  this phase resolves; item 7 pre-authorized 3.3 as the
  M3-closing phase.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. The read-side surface (allowlist
  module, page-component bypass branches, Edge Function read
  shim, `DemoModeBanner`, read-only variants) is the
  immediate input this phase reads against.
- [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md) —
  predecessor phase scoping doc. Decision 5 explicitly
  deferred the mutation-control disabled-state shape to 3.3;
  decision 1's branch-test analysis named the 3.3 expected
  scope this phase ships; deletes in batch with this scoping
  doc at this phase's PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Milestone Status table M3 row
  (decision 9 flips to `Landed`); Risk Register entry
  "Demo-mode security boundary" the per-function 403 + the
  five Deno tests mitigate.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) +
  [`scoping/m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) +
  [`m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md) +
  [`m2-phase-2-2-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md) +
  [`m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md) —
  precedent scoping/plan structure shape; m2-phase-2-3-plan
  specifically binds the role-door copy contract decision 6
  here revises.
- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — apps/web
  routing dispatcher; the entry points to the three bypass-
  target page components (unchanged by 3.3).
- [`shared/auth/useAuthSession.ts`](/shared/auth/useAuthSession.ts) —
  the auth state machine the bypass branch composes alongside;
  unchanged by 3.3.
- [`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts) —
  the unauthenticated-Edge-Function precedent the new shared
  helper's service-role pattern mirrors.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's diff
  surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan," "Bans on
  surface require rendering the consequence," "Defer rather
  than over-resolve," "Spike before plan for novel
  mechanisms," "`In draft` → `Proposed` promotion gate,"
  "Plan-to-PR Completion Gate," "Plan content is a mix of
  rules and estimates."
