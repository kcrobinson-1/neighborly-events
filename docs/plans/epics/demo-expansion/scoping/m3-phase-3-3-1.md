# Scoping — M3 phase 3.3.1 (demo-mode bypass: write-side server rejection)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the M3-terminal PR (which is phase 3.3.2's PR — the
M3-closer). Durable cross-phase content absorbs into
[m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
durable per-phase content absorbs into
[`m3-phase-3-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md).

## Phase summary

Phase 3.3.1 ships the **server-side write rejection** half of
M3's demo-mode auth bypass: a new shared
`evaluateDemoModeRejection` helper at
`supabase/functions/_shared/demo-mode-rejection.ts`, the helper
wired into all five mutation Edge Functions
(`save-draft`, `publish-draft`, `unpublish-event`,
`redeem-entitlement`, `reverse-entitlement-redemption`),
demo-mode 403 test cases extending each existing per-function
Deno test file, and the auth-vs-parse ordering normalization
on the two redemption functions that today authenticate before
parsing payload (decision 4 below).

The settled write-side server contract — HTTP 403 with
structured error body keyed by `demo_mode_read_only` against
the AND of "slug resolves to allowlist member" and "no auth
context is present" — comes from
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 5. This phase ships exactly that contract; the
client-side disabled-state UI, the apps/web noindex emit, the
M2 role-door copy revision, the M3 doc-currency map, and the
milestone-doc + epic Status flips are phase 3.3.2's scope.

The 2-PR split (3.3.1 server / 3.3.2 client + closer) was
re-derived at this scoping session against actual scope tension
per AGENTS.md "PR-count predictions need a branch test" —
decision 1 below records the analysis. The original combined
3.3 plan briefly drafted on this branch (commit b666078) is
superseded by this split; the user's argument that isolating
the trust-boundary work (specifically the auth-ordering
normalization in decision 4) improves review quality is the
load-bearing reason.

After 3.3.1 merges, 3.3.2's plan-drafting runs against the
merged server-rejection surface per AGENTS.md "Phase Planning
Sessions" cadence and ships the client + closer.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. Decisions
absorb into the plan's contract sections during plan-drafting;
deliberation prose (rejected alternatives) lives here through
scoping's transient lifetime.

### 1. PR shape for phase 3.3 — split into 3.3.1 (server) + 3.3.2 (client + closer) [Resolved → Option B]

**What was decided.** Whether phase 3.3 ships as one PR (the
3.1-pre-authorized shape), as two PRs along a server / client
seam, or some other split.

**Why it mattered.**
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
pre-authorized 3.3 as a single M3-closing PR; AGENTS.md
"PR-count predictions are not contracts" + "PR-count
predictions need a branch test" require the phase planning
session to re-derive against actual scope. The original 3.3
scoping (commit b666078, superseded) picked single-PR shape
citing "server without client is dead-on-arrival" as the
load-bearing argument. The user challenged: that's a wrong-seam
frame error — most splits along a server / client seam can be
designed so each PR ships an internally-coherent state.

**Options considered.**

1. **Single PR for 3.3 (Option A — the superseded shape).** 3.3
   absorbs the helper + 5 Edge Function wirings + 5 Deno test
   extensions + apps/web disabled-state UI + apps/web noindex
   emit + M2 role-door copy + M3 doc-currency + Status flips.
2. **2-PR split: 3.3.1 server + 3.3.2 client + closer (Option
   B — the user-named seam).**
   - **3.3.1:** `evaluateDemoModeRejection` helper; helper
     wiring into the five mutation Edge Functions; auth-vs-
     parse ordering normalization on the two redemption
     functions (per decision 4); five Deno test extensions.
   - **3.3.2:** apps/web disabled-state UI on the three
     bypass-rendered surfaces; `useNoindex()` hook + emit on
     the bypass branches + Playwright e2e fixture extension;
     M2 role-door copy revision in apps/site; M3 doc-currency
     map (README, architecture, product, backlog); milestone-
     doc top Status flip + Phase Status table 3.3.2 row flip;
     epic Milestone Status table M3 row flip.
3. **2-PR split: 3.3.1 server + UI + 3.3.2 noindex + closer
   (Option C).** Server and disabled-state UI together, then
   noindex + copy + closer.
4. **3-PR split (Option D).** Server / client+noindex /
   closer.

**Pros / cons.**

- *Option A.* Pro: cohesive end-to-end review surface; M3
  closes in one merge. Con: subsystems-touched count exceeds
  the >5 split threshold; the trust-boundary work (helper
  shape + per-function auth-ordering normalization) is buried
  under client UI and doc-currency noise; the original
  rejection of split ("server without client is dead-on-
  arrival") was a wrong-seam frame error — the server
  rejection IS independently valuable as a defense-in-depth
  fix.
- *Option B.* Pro: 3.3.1 isolates the trust-boundary work
  (helper + auth-ordering normalization on the two
  redemption functions); reviewer attention on the auth-shape
  edits is undiluted by frontend / noindex / doc-closure
  noise. Pro: 3.3.1's intermediate state is internally
  coherent — the server returns the structured 403 to anon
  callers on test-event slugs; an attacker (or the apps/web
  client today, via direct mutation attempt) gets a more
  honest rejection than today's generic 401, which is a
  defense-in-depth win even before 3.3.2 lands. Pro: 3.3.2
  has a coherent browser-review story — "the demo routes now
  look complete, are inert, and emit noindex" — independent
  of the server work. Con: two review rounds for one
  capability; M3 closes only when 3.3.2 merges.
- *Option C.* Pro: server + UI together is a "now mutations
  are blocked end-to-end" review unit. Con: the disabled-
  state UI is browser-shape work that benefits from being
  reviewed alongside the noindex + copy edits (one browser-
  review pass per PR). Splitting noindex away from disabled-
  state forces a second browser-review without amortization.
- *Option D.* Pro: maximum review focus per PR. Con: the
  closer PR (M2 copy + 4 doc edits + 2 Status flips) is too
  small to justify a third review round; collapses naturally
  into 3.3.2 with the disabled-state + noindex work.

**Branch-test analysis (per AGENTS.md "PR-count predictions
need a branch test").**

Subsystems touched if 3.3.1 ships server rejection only:

1. New shared helper at
   `supabase/functions/_shared/demo-mode-rejection.ts`
2. Five mutation Edge Function bodies — each gains a helper
   invocation; the two redemption functions also gain
   auth-vs-parse ordering normalization
3. Five existing per-function Deno tests — each gains
   demo-mode 403 test cases
4. Milestone-doc Phase Status table edits (grow row to
   3.3.1 + 3.3.2; flip 3.3.1 row Status to Landed in this
   PR)

4 subsystems — at the threshold; cohesive around "server-side
demo-mode rejection across the five mutation functions."
Substantive logic LOC: helper ~80–120 + per-function helper
invocation ~10 × 5 = 50 + auth-ordering-normalization edits in
two redemption functions ~30 × 2 = 60 + per-function Deno
test extensions ~50 × 5 = 250. Estimated total ~440–490 LOC.
Above the >300 numeric threshold but cohesive in concern (all
server-side, all trust-boundary).

Subsystems if 3.3.2 ships client + noindex + closer:

1. apps/web mutation-control disabled-state UI on three
   bypass-rendered surfaces
2. apps/web `useNoindex()` hook + integration into three
   bypass branches (novel mechanism — spike required per
   AGENTS.md "Spike before plan for novel mechanisms")
3. apps/web Playwright e2e fixture extension
4. apps/site `RoleDoors.tsx` copy revision
5. M3 doc-currency map (README, architecture, product,
   backlog)
6. Milestone-doc + epic Status flips; this plan's Status flip;
   the 3.3.2 plan's Status flip

6 subsystems — above the threshold but cohesive around "the
demo routes now look complete, are inert, and emit noindex"
+ M3 close. Substantive logic LOC: disabled-state UI ~80–120
+ noindex hook ~50 + Playwright fixture extension ~80 + M2
copy ~10 + doc-currency edits ~150–200. Estimated total
~370–460 LOC.

**Came down to.** Whether the trust-boundary work warrants
isolation. The two redemption functions' auth-vs-parse
reordering (decision 4 below) is the kind of subtle edit that
gets reviewed shallowly when buried among UI changes; a
server-only PR concentrates reviewer attention on the
auth-shape edits. The user-named split also produces a 3.3.2
PR with a coherent browser-review story, so neither PR is
artificially small.

**Resolution.** **Option B — split into 3.3.1 (server) +
3.3.2 (client + closer).** Phase numbering and file shape
follow AGENTS.md's sub-phase convention
(`m<N>-phase-<X>-<Y>-<Z>-plan.md`):

- `docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md`
  (this phase)
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`
  (this scoping doc)
- `docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`
  (drafts after 3.3.1 merges per AGENTS.md "Phase Planning
  Sessions" cadence; row in milestone doc points at
  `_pending 3.3.2 phase planning_` until then)
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md`
  (drafts at 3.3.2 plan-drafting time)

Milestone-doc Phase Status table 3.3 row grows to two rows
(3.3.1 + 3.3.2) at this scoping session's milestone-doc edit
(decision 8 below).

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the 1-PR pre-authorization for 3.3 — superseded here per
AGENTS.md "PR-count predictions are not contracts");
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the row this scoping session grows);
AGENTS.md "PR-count predictions need a branch test" rule;
the auth-ordering observation in decision 4 below
(`Verified by:`
[`save-draft/index.ts:332-349`](/supabase/functions/save-draft/index.ts),
[`redeem-entitlement/index.ts:178-191`](/supabase/functions/redeem-entitlement/index.ts)) —
the trust-boundary work that justifies isolation.

### 2. Slug resolution in mutation Edge Functions — server-side resolution from event_id, no client slug carriage [Resolved → Option B]

**What was decided.** How each of the five mutation Edge
Functions learns the slug it needs to check against the
allowlist for the 403 short-circuit. The current request bodies
carry only `eventId` (or its equivalent — see Verified by
below), not slug.

**Why it mattered.** The
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
binds "single source of truth, exposed to every guard site by
an enforced path." A client-asserted slug in the request body
is the closest analog to the banned client-asserted ingredients
(env / URL / header); the question is whether the principle
extends to ban client slug carriage.

**Options considered.**

1. **Carry slug in mutation request bodies (Option A).** Each
   of the five mutation Edge Functions accepts a `slug: string`
   field; the helper checks `isTestEventSlug(body.slug) &&
   noAuthContext(req)`. apps/web's existing mutation call sites
   are extended to carry slug.
2. **Server-side resolve slug from `eventId` against
   `game_events` (Option B).** The helper performs an
   `event_id → slug` lookup with service-role privileges and
   checks `isTestEventSlug(resolvedSlug) &&
   noAuthContext(req)`. Client mutation request bodies are
   unchanged.
3. **Pre-mutation handshake / session-bound flag (Option C).**
   Stateful "demo session" concept; the mutation function reads
   the flag. Rejected: introduces a session-scoped flag that
   Cross-Phase Invariant 2 explicitly bans.

**Pros / cons.**

- *Option A.* Pro: zero new server-side reads; pure-function
  predicate. Con: the predicate becomes "client-claimed slug
  is in allowlist," not "this request is for an allowlisted
  event"; for a malicious unauthenticated caller passing
  `slug: "harvest-block-party"` against a real event's
  eventId, the result is a structured `demo_mode_read_only`
  403 instead of the existing 401 — a small information leak
  (a real event surfaces "this would be demo-mode if you
  were on a test slug"). Violates the spirit of Cross-Phase
  Invariant 1's "enforced path" framing.
- *Option B.* Pro: predicate is "the request's `eventId`
  resolves to an allowlisted slug AND no auth context" —
  slug membership is *derived* from the event identity the
  request carries, not asserted by the client. Symmetry with
  the read-side: 3.2's read shim resolves slug from server-
  side state, not from a body claim. Pro: no change to
  request shapes for the five mutation Edge Functions, so
  apps/web's mutation call sites are unchanged. Con: one
  extra DB read per mutation; the cost is amortizable into
  the existing auth-gate query if the auth gate already
  SELECTs from `game_events` (`Verified by:` plan-drafting
  reads the auth-gate helpers).
- *Option C.* Rejected per Cross-Phase Invariant 2 ban.

**Came down to.** Whether the request-body slug claim is
trustworthy enough to gate a server-side decision on. The
milestone doc's "single source of truth, exposed to every
guard site by an *enforced* path" language treats client-
asserted slugs as not enforced; event_id-derived slugs are.

**Resolution.** **Option B — server-side slug resolution
from `eventId`.** The helper introduced by decision 3 below
performs the resolution before evaluating the rejection
predicate.

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 2](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
[`get-redemption-status/index.ts:44-49`](/supabase/functions/get-redemption-status/index.ts)
(service-role-client construction precedent the helper mirrors);
existing mutation request body schemas confirm slug is not
present today —
[`save-draft/index.ts:14-17`](/supabase/functions/save-draft/index.ts)
(`DraftSaveRequestBody` carries `eventCode` + `content` with
nested `id`),
[`publish-draft/index.ts:14-16`](/supabase/functions/publish-draft/index.ts)
(`PublishDraftRequestBody` carries `eventId`),
[`unpublish-event/index.ts:10-12`](/supabase/functions/unpublish-event/index.ts)
(`UnpublishEventRequestBody` carries `eventId`),
[`redeem-entitlement/index.ts:95-97`](/supabase/functions/redeem-entitlement/index.ts)
(redemption payload carries `eventId` + `codeSuffix`),
[`reverse-entitlement-redemption/index.ts:104-134`](/supabase/functions/reverse-entitlement-redemption/index.ts)
(reverse payload carries `eventId` + `codeSuffix` + `reason`).

### 3. Edge Function rejection helper shape — shared `_shared/demo-mode-rejection.ts` returning `Response | null` [Resolved → Option B]

**What was decided.** Where the resolve + check + format logic
lives, and how each function invokes it.

**Why it mattered.** Five functions × duplicate logic = high
drift risk per
[`m3-demo-mode-auth-bypass.md` Cross-Phase Risks → "Allowlist
drift between guard sites"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).

**Options considered.**

1. **Inline branches per function — no shared helper (Option
   A).** ~25 LOC × 5 = ~125 LOC duplicated. Reject on drift
   grounds.
2. **New shared helper at
   `supabase/functions/_shared/demo-mode-rejection.ts`
   (Option B).** Exports an async function (working name
   `evaluateDemoModeRejection`) returning `Response | null`.
3. **Augment the existing auth-gate helpers
   (`_shared/event-organizer-auth.ts`,
   `_shared/redemption-operator-auth.ts`) (Option C).** The
   demo-mode logic lands inside each existing auth helper.
   Reject: couples demo-mode rejection with authentication;
   reviewer attention on the auth-gate helpers gets diffused
   across two concerns.

**Resolution.** **Option B.** New helper at
`supabase/functions/_shared/demo-mode-rejection.ts` with
working signature
`evaluateDemoModeRejection(args: { request, eventId,
supabaseAdmin }): Promise<Response | null>`. Returns `null`
if the request is not in demo mode (continue to the existing
auth gate); returns a `Response` (HTTP 403, JSON body
`{ "error": "demo_mode_read_only", "message": "..." }`,
appropriate CORS headers) otherwise. Each mutation function
calls it after request-body validation and before the
existing auth-gate call (decision 4 normalizes the 2
auth-first redemption functions to fit this shape).

The helper:

1. Resolves slug via `supabaseAdmin.from("game_events")
   .select("slug").eq("id", eventId).maybeSingle()`. On
   missing row or query error, returns `null` (defer to the
   existing auth gate's missing-event handling).
2. Checks `isTestEventSlug(resolvedSlug)`. If false, returns
   `null`.
3. Checks no-auth-context: no `Authorization` JWT AND no
   signed session cookie verifiable via
   `_shared/session-cookie.ts:136`'s `readVerifiedSession`.
   If either present, returns `null`.
4. Else, returns the structured 403 `Response`.

The helper's exact signature, parameter ordering, and message
text are final-resolved at plan-drafting time against on-disk
`_shared/` conventions.

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(server contract: 403 + structured body, error code
`demo_mode_read_only`);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(no per-site duplication);
[`supabase/functions/_shared/`](/supabase/functions/_shared/)
existing per-concern helper conventions;
[`supabase/functions/_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts)
(the `readVerifiedSession` helper for the auth-context check);
[`get-redemption-status/index.ts:44-49`](/supabase/functions/get-redemption-status/index.ts)
(service-role-client construction precedent).

### 4. Auth-vs-parse ordering normalization — reorder the two redemption functions to parse → demo-rejection → auth, matching the three authoring functions [Resolved → Option B]

**What was decided.** Where the helper invocation sits in
each of the five mutation Edge Functions relative to the
existing auth gate, given that the five functions today have
two different orderings.

**Why it mattered.** This is the load-bearing trust-boundary
edit that motivates the 3.3.1 / 3.3.2 split. The five
mutation Edge Functions split into two camps today:

- **Parse-first (3 of 5).** `save-draft`, `publish-draft`,
  `unpublish-event` parse the payload first, then invoke the
  auth gate using the parsed `eventId` (or for `save-draft`,
  `rawContentId` extracted from `content.id`).
  - `save-draft` carries an explicit comment at
    [`save-draft/index.ts:332-339`](/supabase/functions/save-draft/index.ts)
    framing the lightweight pre-auth `rawContentId` extraction
    as the **CPU-amplification boundary** — a deliberate
    pre-auth extraction so unauthenticated callers can't
    trigger the expensive `parseAuthoringGameDraftContent`
    work.
  - `publish-draft` parses the payload at
    [`publish-draft/index.ts:162-171`](/supabase/functions/publish-draft/index.ts)
    and invokes auth at line 173 with `payload.eventId`.
  - `unpublish-event` parses the payload at
    [`unpublish-event/index.ts:113-122`](/supabase/functions/unpublish-event/index.ts)
    and invokes auth at line 124 with `payload.eventId`.
- **Auth-first (2 of 5).** `redeem-entitlement` and
  `reverse-entitlement-redemption` invoke the auth gate
  first, then parse the payload.
  - `redeem-entitlement` invokes auth at
    [`redeem-entitlement/index.ts:178-191`](/supabase/functions/redeem-entitlement/index.ts)
    and parses payload at lines 193-204.
  - `reverse-entitlement-redemption` invokes auth at
    [`reverse-entitlement-redemption/index.ts:204-217`](/supabase/functions/reverse-entitlement-redemption/index.ts)
    and parses payload at lines 219-230.

The new `evaluateDemoModeRejection` helper needs the
validated `eventId` from the body. If the helper invocation
order is uniform (parse → demo-rejection → auth) across all
five functions, the helper signature is one shape; if the
order varies (parse → demo-rejection → auth on the parse-
first three; auth → parse → demo-rejection on the auth-first
two), the helper either takes two shapes or is invoked in a
position that produces inconsistent error responses across
functions.

**Options considered.**

1. **Keep each function's existing ordering; helper invoked
   wherever `eventId` is in scope (Option A).** On the three
   parse-first functions, the helper fires after parse and
   before auth → unauthenticated demo-mode caller gets the
   structured 403. On the two auth-first functions, the helper
   fires after auth (and after parse) → unauthenticated demo-
   mode caller gets the **existing 401 from the auth gate**,
   never reaching the helper. The 403 short-circuit
   contract (per
   [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md))
   is honored only on three of the five functions. Reject:
   the per-function 403 contract is binding across all five.
2. **Reorder the two redemption functions to parse → demo-
   rejection → auth (Option B — uniform shape).** The two
   redemption functions move their payload parse blocks above
   their auth-gate invocations; the helper fires between
   parse and auth on every function uniformly. Both
   redemption functions return the structured 403 for
   unauthenticated demo-mode callers; both still return 401
   for unauthenticated real-event callers (the helper returns
   `null` and the existing auth gate fires).
3. **Helper takes two shapes — pre-auth and post-auth
   variants (Option C).** Two helper functions:
   `evaluateDemoModeRejectionPreAuth` for the parse-first
   three; a different shape for the auth-first two that runs
   inside the auth gate's failure path and only fires when
   auth would have failed. Reject: doubles the helper surface;
   couples demo-mode logic with auth-failure handling on the
   redemption functions; defeats the consolidation Cross-Phase
   Invariant 1 binds.

**Pros / cons.**

- *Option A.* Pro: minimal-edit; no reordering. Con: the per-
  function 403 contract is broken on the two redemption
  functions — unauthenticated demo-mode callers there get a
  generic 401, not the structured 403 the contract names. The
  client (3.3.2) cannot rely on the structured error code
  uniformly across functions; the partner-honesty signal
  ("you're in demo mode; sign in to do this") collapses on
  the redemption surfaces.
- *Option B.* Pro: uniform helper invocation across all five
  functions; one helper shape; partner-honesty signal is
  consistent. Pro: the reorder is itself a worthwhile
  trust-boundary edit — `redeem-entitlement` and
  `reverse-entitlement-redemption` today parse their payloads
  *after* the auth gate, which means an authenticated caller
  can probe the auth-gate response without sending a valid
  payload (the 401 fires before payload validation). Moving
  parse before auth surfaces the payload-validation 400 to
  authenticated callers who pass invalid payloads, which is
  the more honest response. Con: the reorder is a
  trust-boundary edit on two functions that have shipped in
  the auth-first shape — review attention has to confirm the
  reorder doesn't open any new attack surface (specifically
  that no payload-parse path is itself expensive enough to
  warrant pre-auth gating, the way `save-draft` explicitly
  gates `parseAuthoringGameDraftContent` per the
  CPU-amplification-boundary comment).
- *Option C.* Rejected on consolidation grounds.

**Came down to.** Whether the per-function 403 contract is
load-bearing across all five functions (yes — per
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
the contract names "All five mutation Edge Functions") and
whether the reorder is safe on the two redemption functions
(yes — the redemption payload parse paths are cheap shape
checks via
[`validateRedeemPayload`](/supabase/functions/redeem-entitlement/index.ts)
and
[`validateReversePayload`](/supabase/functions/reverse-entitlement-redemption/index.ts);
neither performs CPU-amplification-class work pre-auth like
`save-draft`'s `parseAuthoringGameDraftContent` does — plan-
drafting confirms by reading the validation helpers).

**Resolution.** **Option B — uniform parse → demo-rejection
→ auth ordering across all five functions.** The two
redemption functions are reordered:

- `redeem-entitlement`: payload parse at current lines 193-
  204 moves above the auth-gate invocation at current line
  178; helper invocation lands between the new parse position
  and the auth invocation.
- `reverse-entitlement-redemption`: payload parse at current
  lines 219-230 moves above the auth-gate invocation at
  current line 204; helper invocation lands between.

The three authoring functions need no reorder; helper
invocation lands at the existing parse → auth boundary
(after parse / `rawContentId` extraction, before the
`authenticateEventOrganizerOrAdmin` call).

The Self-Review Audit set in the plan includes a specific
audit for this reorder: confirm no new attack surface is
opened on the two redemption functions by moving payload
parsing pre-auth. Plan-drafting also adds a sentence in the
plan's Risk Register naming the reorder explicitly.

**Verified by:**
[`save-draft/index.ts:332-349`](/supabase/functions/save-draft/index.ts)
(the explicit CPU-amplification-boundary comment that
documents the parse-first pattern's load-bearing reasoning;
the analog of this check on the two redemption functions
does not exist because their payload validators are cheap);
[`publish-draft/index.ts:162-179`](/supabase/functions/publish-draft/index.ts)
(parse-first pattern, no CPU-amplification comment because
`validatePublishDraftPayload` is cheap);
[`unpublish-event/index.ts:113-130`](/supabase/functions/unpublish-event/index.ts)
(parse-first pattern, same reasoning);
[`redeem-entitlement/index.ts:178-204`](/supabase/functions/redeem-entitlement/index.ts)
(auth-first pattern; the reorder target);
[`reverse-entitlement-redemption/index.ts:204-230`](/supabase/functions/reverse-entitlement-redemption/index.ts)
(auth-first pattern; the reorder target);
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the binding 5-function 403 contract).

### 5. Per-function 403 message text — uniform across functions [Resolved → Option A]

**What was decided.** Whether each function's structured
403 body has the same `message` text or different per-context
text.

**Options considered.**

1. **Uniform text across all five (Option A).** `message:
   "Demo mode — sign in to make changes."` Same on every
   function.
2. **Per-context text (Option B).** E.g., "Demo mode — sign
   in to save changes." (save-draft), "Demo mode — sign in
   to publish events." (publish-draft), "Demo mode — sign
   in to redeem codes." (redeem-entitlement), etc.

**Pros / cons.**

- *Option A.* Pro: minimal cognitive load on partners (one
  consistent message vocabulary across all rejection
  responses); minimal review surface (one text to confirm).
  Con: the message is generic — "make changes" doesn't
  describe what the caller was trying to do.
- *Option B.* Pro: per-context message names the specific
  action; honest about what was rejected. Con: five message
  strings to maintain; minor drift risk on copy revisions;
  the apps/web client error handler in 3.3.2 doesn't switch
  on `message` (it switches on the `error: "demo_mode_read_only"`
  code), so the message is for human eyes only — and humans
  reading the response (e.g., a partner inspecting Network
  panel during demo) don't need per-context phrasing because
  the URL of the failed call already tells them which
  function they hit.

**Came down to.** Whether the per-context honesty win is
worth the maintenance cost. The client-side error handler
doesn't read the message; the message is debugging-surface
copy. Uniform is cheaper.

**Resolution.** **Option A — uniform.** The exact text is
`"Demo mode — sign in to make changes."` (same as the
disabled-state tooltip 3.3.2 will introduce per the original
3.3 scoping decision 3, draft text). If 3.3.2 plan-drafting
revises the tooltip, this server-side message tracks (one
edit, two locations).

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the structured-body shape; the message text is plan-time per
3.1's framing).

### 6. Test surface for 3.3.1 — five Deno test extensions covering the 403 branch and the auth-vs-parse reorder [Resolved → Option A]

**What was decided.** What test surfaces 3.3.1's PR adds.

**Options considered.**

1. **Per-function Deno test extension (Option A).** Each of
   the five existing per-function Deno tests under
   `tests/supabase/functions/` (`save-draft.test.ts`,
   `publish-draft.test.ts`, `unpublish-event.test.ts`,
   `redeem-entitlement.test.ts`,
   `reverse-entitlement-redemption.test.ts` — `Verified by:`
   directory listing during scoping) gains demo-mode 403
   test cases.
2. **One new combined Deno test file (Option B).** A new
   file `tests/supabase/functions/demo-mode-rejection.test.ts`
   exercises the helper directly across all five functions.

**Resolution.** **Option A — per-function extensions.** Each
existing per-function test file gains assertions:

- **Demo-mode anon caller** (eventId resolves to allowlist
  slug, no auth context) → HTTP 403, body
  `{ error: "demo_mode_read_only", message: ... }`.
- **Real-event anon caller** (eventId resolves to non-
  allowlist slug, no auth context) → existing 401 unchanged.
- **Demo-mode signed-in caller** (auth context present even
  if slug is allowlist) → continues to existing auth gate; 403
  NOT returned.
- **For the two reordered functions only** (`redeem-
  entitlement`, `reverse-entitlement-redemption`): also
  asserts the new payload-validation 400 fires for an
  authenticated caller passing an invalid payload (the case
  the reorder newly exposes — previously the 401 fired
  first; now the 400 fires after parse before auth).

The helper's unit-level coverage is implicit through the
five integration paths; a separate unit test file is unnecessary.

**Verified by:**
[`tests/supabase/functions/`](/tests/supabase/functions/)
directory listing — all five per-function test files exist
today and follow the per-function-test-file convention 3.2's
`read-demo-event.test.ts` extends.

### 7. 3.3.1 doc-currency obligations — milestone-doc Phase Status table edit only [Resolved]

**What was decided.** What doc-currency edits 3.3.1 owns
(distinct from the M3-closing doc-currency map that 3.3.2
owns).

**Resolution.** 3.3.1's PR edits only:

- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
  Phase Status table: the 3.3.1 row Status flips
  `Proposed` → `Landed` with PR column populated. The 3.3.2
  row stays `Proposed` with `_pending_` in the PR column;
  Plan column moves from `_pending 3.3.2 phase planning_`
  to a real link only when 3.3.2's plan drafts (after
  3.3.1 merges).
- `docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md`
  Status: `Proposed` → `Landed`.

3.3.1's PR does NOT touch:

- README, architecture, product, backlog, styling, operations
  (all M3-closing edits — owned by 3.3.2).
- `m3-demo-mode-auth-bypass.md` top Status (M3 still in
  progress at 3.3.1 merge — flips at 3.3.2's merge).
- `epic.md` Milestone Status table M3 row (M3 still in
  progress — flips at 3.3.2's merge).
- `docs/open-questions.md` (closed by 3.1).
- `m2-phase-2-3-plan.md` (confirmation pass owned by 3.3.2).

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(every "M3-closing phase" entry routes to 3.3.2; 3.3.1
owns only its own Phase Status row + plan Status).

### 8. Milestone-doc Phase Status table edit — grow row from 3.3 to 3.3.1 + 3.3.2 in this scoping session's milestone-doc edit [Resolved]

**What was decided.** When the table grows from one 3.3 row
to two rows.

**Resolution.** **This scoping session's milestone-doc edit
grows the table.** The current single 3.3 row becomes:

- 3.3.1 row: Title "Demo-mode bypass — write side server
  rejection," Plan column links to
  `m3-phase-3-3-1-plan.md`, Status `Proposed`, PR `_pending_`.
- 3.3.2 row: Title "Demo-mode bypass — client UI + noindex +
  M3 closer," Plan column `_pending 3.3.2 phase planning_`,
  Status `Proposed`, PR `_pending_`. 3.3.2's plan-drafting
  fills the Plan column when it runs (after 3.3.1 merges).

The Sequencing paragraph below the table receives a minor
addition naming the 3.3 → 3.3.1 + 3.3.2 split; the
existing "3.2's plan-drafting ran AGENTS.md 'PR-count
predictions need a branch test' against actually-merged code
and picked the 2-shape" paragraph stays and a parallel
sentence is added for 3.3's same-shape decision (with a
pointer to this scoping doc for the analysis).

**Verified by:**
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the table this scoping session edits);
the 3.2 precedent that the same row-growth pattern was
applied at 3.2's plan-drafting time.

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading on-disk content against actually-merged code at plan-
time, not against the scoping snapshot:

- **`evaluateDemoModeRejection` helper exact signature** — the
  scoping decision 3 names a working signature; plan-drafting
  re-reads `_shared/` conventions and adjusts (parameter
  ordering, argument-object vs. positional, return-type
  documentation comments) to match prevailing patterns.
- **Helper file naming** — `_shared/demo-mode-rejection.ts` is
  the working location; plan-drafting confirms against
  `_shared/`'s actual file-naming convention.
- **Per-function helper-invocation block shape** — whether each
  function's helper invocation is inlined (~5 lines per
  function) or wrapped in a small per-function dispatch helper
  (e.g., `requireWriteAuth` that composes demo-rejection +
  auth-gate). Plan-drafting decides against the readability
  trade.
- **Self-Review Audit set** against
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
  Plan-drafting walks the catalog. Likely-relevant audits:
  composed-predicate auth-shape audit (yes — five Edge
  Functions receive a new shared rejection helper composed
  before existing auth gates); auth-vs-parse-ordering audit
  (yes — the two redemption functions are reordered);
  rename-aware diff classification (no — no renames). Plan-
  drafting confirms.
- **Validation Gate command list.** Beyond `npm run lint` and
  `npm run build:web`, the plan names the test runners:
  `npm run test:functions` (Deno — per existing wrapper at
  [`scripts/testing/run-supabase-tests.cjs`](/scripts/testing)).
  Plan-drafting reads `package.json` `scripts` for the
  canonical wrapper invocation.
- **Commit boundaries.** Likely shape: (1) shared
  `evaluateDemoModeRejection` helper; (2) helper wired into
  the three parse-first authoring functions + their Deno
  test extensions; (3) two redemption functions reordered
  parse → helper → auth + their Deno test extensions.
  Plan-drafting finalizes against the actual edit shape.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — references the milestone doc's
  Cross-Phase Invariants; per-phase additions for 3.3.1:
  "demo-mode rejection helper is the single canonical site for
  the resolve-slug + check-allowlist + check-no-auth-context
  sequence" (decision 3); "all five mutation Edge Functions
  invoke the helper between payload parse and existing auth
  gate, in that order" (decision 4); "the structured 403
  body's `error` field is exactly `demo_mode_read_only` on
  every function" (decision 5).
- Naming — `evaluateDemoModeRejection`, `demo_mode_read_only`
- Contracts — server-side 403 short-circuit contract per-
  function (per decision 4); slug-resolution contract (per
  decision 2); helper shape contract (per decision 3); test
  surface contract (per decision 6); 3.3.1 doc-currency
  contract (per decision 7); milestone-doc Phase Status edit
  contract (per decision 8); 3.3.1 Status flip contract.
- Files To Touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits — including a dedicated audit for the
  auth-vs-parse reorder per decision 4
- Documentation Currency PR Gate — references the milestone
  doc's Documentation Currency map but names this PR as
  satisfying only the milestone-doc Phase Status row updates
  (decisions 7 + 8) and this plan's Status flip
- Out Of Scope (final, including all 3.3.2 scope)
- Risk Register — references the milestone doc's Cross-Phase
  Risks; names the auth-vs-parse-reorder risk per decision 4
- Backlog Impact — 3.3.1-specific

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **Five mutation Edge Function paths and auth/parse line
  numbers.** Scoping read these on 2026-05-03:
  [`save-draft/index.ts:320-357`](/supabase/functions/save-draft/index.ts)
  (parse + rawContentId extract + auth);
  [`publish-draft/index.ts:162-179`](/supabase/functions/publish-draft/index.ts);
  [`unpublish-event/index.ts:113-130`](/supabase/functions/unpublish-event/index.ts);
  [`redeem-entitlement/index.ts:178-204`](/supabase/functions/redeem-entitlement/index.ts);
  [`reverse-entitlement-redemption/index.ts:204-230`](/supabase/functions/reverse-entitlement-redemption/index.ts).
  Plan-drafting re-greps; line numbers drift.
- **Existing `_shared/` helper conventions.** Scoping read
  `_shared/admin-auth.ts`, `_shared/authoring-http.ts`,
  `_shared/cors.ts`, `_shared/event-organizer-auth.ts`,
  `_shared/published-game-loader.ts`,
  `_shared/redemption-operator-auth.ts`,
  `_shared/session-cookie.ts`, `_shared/doctor-check-anchor.ts`
  on 2026-05-03. Plan-drafting confirms the new helper file
  is consistent and that `readVerifiedSession` at
  [`_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts)
  is the canonical no-auth-context check.
- **Payload validators on the two redemption functions.**
  `validateRedeemPayload` and `validateReversePayload` are
  cheap shape checks per scoping inference; plan-drafting
  reads each to confirm no CPU-amplification-class work
  exists pre-auth that the reorder would expose.
- **`game_events` SELECT semantics for service-role callers.**
  The helper SELECTs slug from `game_events` with service-
  role privileges. Plan-drafting confirms this works for
  both published and draft test events (RLS shouldn't apply
  to service-role).
- **Per-function Deno test file shape.** Scoping verified
  five files exist
  ([`tests/supabase/functions/save-draft.test.ts`](/tests/supabase/functions/save-draft.test.ts)
  etc.); plan-drafting reads one to confirm the test
  conventions (request-shape mocks, response assertions).
- **`docs/self-review-catalog.md`** existence and current
  audit list. Plan-drafting reads to pick the relevant
  audits.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.3.1 row at the Phase Status
  table (decision 8 grows row + flips 3.3.1 to Landed at
  this PR's Status edit).
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 5 + 7 are the
  data-access-semantics contract this phase implements.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. The read-side surface (allowlist
  module) is the immediate input this phase consumes via
  `isTestEventSlug` import.
- [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md) —
  predecessor phase scoping doc; deletes in batch with this
  scoping doc at 3.3.2's PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Risk Register entry "Demo-mode
  security boundary" the per-function 403 + the five Deno
  test extensions mitigate.
- [`apps/web/src/demo/DemoModeBanner.tsx`](/apps/web/src/demo/DemoModeBanner.tsx),
  [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts) —
  3.2-shipped surfaces consumed by the helper (allowlist
  predicate import only; banner not involved on the server).
- [`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts) —
  service-role-client construction precedent.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's
  diff surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test" (and "PR-count predictions
  are not contracts"), "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan,"
  "Plan-to-PR Completion Gate," "Plan content is a mix of
  rules and estimates."
