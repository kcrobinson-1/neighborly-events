# Scoping — M3 phase 3.1 (demo-mode data-access semantics decision)

## Status

Scoping in progress. Open questions surfaced for collaborative
resolution; no decisions resolved at scoping-doc-open time. This is
a transient artifact that absorbs into
[m3-phase-3-1-plan.md](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(durable plan, not yet drafted) and deletes in batch with sibling
scoping docs at the milestone-terminal PR.

## Phase summary

Phase 3.1 is **doc-only**. Its deliverable is a written
data-access-semantics decision — covering both reads and writes —
for the three apps/web event-route surfaces M3 makes reachable
without sign-in on the two test-event slugs (`harvest-block-party`,
`riverside-jam`):

- `/event/:slug/admin` — fetches drafts via `loadDraftEventSummary`
  / `loadDraftEvent` against `game_event_drafts` and the
  `game_event_admin_status` view; writes via the `save-draft`,
  `publish-draft`, `unpublish-event` Edge Functions.
- `/event/:slug/game/redeem` — calls the
  `redeem_entitlement_by_code` SECURITY DEFINER RPC; the keypad
  reads no entitlement rows directly.
- `/event/:slug/game/redemptions` — fetches a two-slice list from
  `game_entitlements` directly; writes via
  `reverse_entitlement_redemption` SECURITY DEFINER RPC.

The milestone doc names three options for the headline decision
([m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)):
**read-only browse**, **functional with persistence and reset**,
or **sandbox-ephemeral**. 3.1 picks one (or articulates a fourth)
and records rationale + rejected alternatives in the plan doc.
3.1 also re-derives the 3.2+ phase split against the chosen
semantics; the milestone doc's row-count estimate does not bind.

3.1 ships **no code**. Allowlist constant location, demo-mode UI
signaling pattern, noindex-emit shape on apps/web, and the
test-event-allowlist enforcement assertion are all named in the
milestone doc as 3.2+'s to own and stay out of 3.1's scope.

## Why this scoping doc surfaces questions instead of resolving them

Scoping convention is to record decisions made at scoping time
with rejected alternatives. Phase 3.1 is unusual: the *whole
phase* is a decision-making exercise, so its scoping doc is the
place to frame the questions before working through them. This
doc therefore opens with **Open questions for 3.1 to resolve**
rather than a "Decisions made at scoping time" list. Each
question carries the constraints from current code that bound
the answer space, the candidate options surfaced by the
milestone doc (or this scoping pass), and the evidence the
decision should weigh — but the resolution column stays empty
until we work through them together. Resolved questions move
into the plan doc as the decision lands, with rejected
alternatives preserved in this scoping doc until milestone
close.

## Open questions for 3.1 to resolve

The questions below decompose the headline data-access-semantics
decision into the dimensions that compose it. The headline
question (Q1) is the framing; Q2–Q9 are the sub-questions whose
answers, taken together, *are* the answer to Q1. A self-
consistent set of answers may not align with any of the three
named options exactly — articulating that misalignment is part
of 3.1's work.

Each question carries a **Why it matters** line (what breaks
silently if 3.1 doesn't resolve it), an **Options surfaced**
list (candidates from the milestone doc + reality-check), and
a **Constraints** list (current-code facts the answer must
respect, with file citations). Where the milestone doc already
locked something, the question records that as a constraint
rather than reopening it.

### Q1. Headline semantics: read-only / functional-with-reset / sandbox-ephemeral / fourth option

**The decision.** Which of the milestone doc's three named
options governs M3, or whether 3.1 articulates a fourth that
better fits the constraint set Q2–Q9 surface.

**Why it matters.** The shape of the implementation phase(s)
3.2+ scope, the read-mediation pattern, the write-side
contract, the seam with M4 (seeded codes / monitoring /
reset), and the M3-closing copy revision on M2's role doors
all cascade from this answer.

**Product-owner framing.** This is the question that decides
what walking up to the demo *feels like*. The three options
correspond to three partner pitches:

- **Read-only browse** — "Here's what the product looks
  like; click through to see the surfaces." A partner can
  navigate the admin workspace, see the schedule and
  question list, browse a redemptions monitoring view, but
  every Save / Publish / Redeem / Reverse button shows an
  inline "demo mode is read-only" notice. Closest to a
  product gallery: low risk of confusion, low engagement,
  no muscle-memory for what using the product *feels* like.
- **Functional with persistence and reset** — "Here's the
  product; try it for real, but heads-up that other people
  are doing the same demo and state shares with them until
  someone resets it." A partner can author a question, see
  it land, mark a redemption, see it appear in the
  monitoring list. Highest fidelity to the live-event
  experience; also highest "why is there a question called
  'lol test 47' here" surprise.
- **Sandbox-ephemeral** — "Here's your own private demo;
  use it as if it were real, and your edits clear when you
  leave." A partner authors a question and sees it land in
  *their* schedule; another partner in another tab sees a
  pristine baseline. Closest to a guided trial: high
  fidelity, no shared-state surprise, but the multi-
  operator dimension of a real event (concurrent agents
  redeeming codes) doesn't exercise unless 3.1 explicitly
  models it (see Q7).

The partner-facing pitch the product owner finds most
compelling is the answer to Q1; engineering can implement
any of the three, but only the product owner can decide
which experience the demo is selling.

**Options surfaced.**

1. **Read-only browse.** Bypassed surfaces render with real
   read access to the two test events' data; all writes
   uniformly reject with "demo mode is read-only." Partner
   experience is "look but don't touch."
2. **Functional with persistence and reset.** Bypassed
   surfaces render with read + write access against the same
   tables real authoring uses. State accumulates across
   visitors until a reset cron / on-demand reset endpoint /
   manual operator step clears it. Partner experience is
   "use the surfaces but state is shared and not durable."
3. **Sandbox-ephemeral.** Bypassed surfaces render with read
   + write access against a parallel-state schema (`demo_*`
   mirror tables, session-scoped storage, or similar)
   isolated from real authoring. Partner experience is "use
   the surfaces with isolated state per session/visit."
4. **Fourth option (articulated by 3.1 if a self-consistent
   Q2–Q9 set lands outside the three above).** For example,
   "read-only on admin + functional-with-shared-state on
   redeem/redemptions" hybrid, or "client-side-only
   functional state with no persistence at all." 3.1 records
   the option and rationale if this is where the answers
   cluster.

**Constraints.**

- The bypass branch is allowlist-membership-gated only — no
  environment flag, URL parameter, or header substitutes for
  slug membership (milestone doc cross-phase invariant 2).
- Real events never receive bypass under any code path
  (milestone doc cross-phase invariant 2).
- Demo-mode UI signaling on bypass-rendered surfaces is
  required (milestone doc cross-phase invariant 3); 3.2+
  picks the exact pattern.

### Q2. Read-side mediation pattern for `game_event_drafts` and the `game_event_admin_status` view

**The decision.** How an unauthenticated visitor's admin page
load reaches draft content. The read query lives at
[shared/events/admin.ts:155-234](/shared/events/admin.ts) —
PostgREST reads against `game_event_drafts` and
`game_event_admin_status`.

**Why it matters.** The current SELECT policy on
`game_event_drafts` is `is_organizer_for_event(id) or
is_root_admin()` per
[supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:75-81](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql).
An unauthenticated visitor (`anon` role, `auth.uid()` null)
matches neither branch; the read returns zero rows even when
the slug is allowlisted. Mounting the page without solving
the read is "necessary but not sufficient" per the milestone
doc.

**Product-owner framing.** **No product-visible difference
across the options — defer to engineering.** The five
candidate mechanisms (anon-RLS broadening, Edge Function
shim, public views, static fixtures, hybrid) all produce
the same partner experience: the admin page mounts and
shows the test event's draft content. The differences are
in trust-boundary surface, build-time vs. runtime data
freshness, and review surface — engineering's call.
Caveat: if engineering picks **static fixtures** the demo
content stops tracking real edits to the test events
(content freezes at the build that shipped the fixture);
that is a product question worth flagging if the test
events evolve frequently, but if the test events are
fixed-content showcase artifacts the freeze is fine.

**Options surfaced.**

1. **Anon-RLS broadening scoped by allowlist.** Add a new
   `for select to anon` policy on `game_event_drafts` (and
   the view's underlying tables) whose `using` predicate
   restricts to allowlisted slugs only. SQL helper function
   like `is_test_event_id(text)` materializes the allowlist
   on the SQL side.
2. **Edge Function read shim.** New unauthenticated Edge
   Function (`get-test-event-draft` or similar) reads with
   `service_role` and returns DTOs the apps/web admin page
   consumes. Allowlist enforced inside the function. RLS
   stays unchanged. Pattern (verify_jwt = false +
   service-role read of an event-scoped table) is
   established by `get-redemption-status`; the trust-
   boundary gate would be slug-allowlist membership rather
   than session-cookie ownership of a row.
3. **Pre-published public views.** Materialized views
   (refreshed by trigger or on publish) expose the
   allowlisted draft content as anon-readable data. Apps/web
   reads the view, not the base table.
4. **Static fixtures shipped with the build.** The
   allowlisted slugs' draft content lives as a TypeScript /
   JSON module under `apps/site/events/` or `shared/events/`
   that the apps/web admin page reads from a build-time
   import. No DB read at all for bypassed surfaces.
5. **Hybrid.** e.g. Static fixtures for stable demo content
   + Edge Function for any state that varies (rare today).

**Constraints.**

- `game_event_drafts.id` (text PK, equals `game_events.id`
  and `event_role_assignments.event_id`) is the join key —
  any SQL allowlist helper needs the id, not the slug, so
  resolution requires a join. (See
  [supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:67-81](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)
  comment block on the id-as-event-identifier pattern.)
- `game_event_admin_status` is a `security_invoker = true`
  view per the existing migration's own comments
  ([supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:25-29](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)).
  Broadening anon read access to the view requires **two
  changes, not one**:
  (a) broaden the underlying tables' SELECT so the
  invoker-scoped runtime check passes for anon, AND
  (b) `grant select on public.game_event_admin_status to
  anon` — the view's privilege grants currently revoke from
  `anon` and grant only to `authenticated` /
  `service_role` per
  [supabase/migrations/20260423020000_add_game_event_admin_status_view.sql:53-58](/supabase/migrations/20260423020000_add_game_event_admin_status_view.sql).
  Patching only (a) leaves the view object's privilege check
  rejecting anon callers before the underlying-table policies
  even evaluate.
- **Anon-readable RLS on event-scoped tables exists as
  precedent.** Anon SELECT is already admitted on
  `game_events`, `game_questions`, and `game_question_options`
  with the predicate `published_at IS NOT NULL` per
  [supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:158-209](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql).
  The policy-shape mechanism (anon SELECT with a `using`
  predicate scoped on a row-level attribute) is established;
  Q2's anon-RLS option would add a *new* anon predicate
  (slug-allowlist membership via a helper like
  `is_test_event_id(text)`) on tables that don't currently
  admit anon reads at all — `game_event_drafts`,
  `game_event_versions`, `game_entitlements`. The mechanism
  transfers; the predicate logic is novel.
- **Edge Function trust-boundary inventory.** Every Edge
  Function in this repo is configured `verify_jwt = false`
  per
  [supabase/config.toml](/supabase/config.toml) — none use
  Supabase platform JWT verification. Each function
  implements its own auth boundary, splitting into three
  shapes:

  1. **Custom bearer-token auth + service-role write/RPC**
     — the four authoring functions (`save-draft`,
     `generate-event-code`, `publish-draft`,
     `unpublish-event`) gate on
     `authenticateEventOrganizerOrAdmin`
     ([supabase/functions/_shared/event-organizer-auth.ts](/supabase/functions/_shared/event-organizer-auth.ts));
     the two redemption mutations (`redeem-entitlement`,
     `reverse-entitlement-redemption`) gate on
     `authenticateRedemptionOperator`
     ([supabase/functions/_shared/redemption-operator-auth.ts](/supabase/functions/_shared/redemption-operator-auth.ts)).
     Both helpers require a real Supabase Auth bearer
     token; the function then mints a service-role client
     to call the RPC.
  2. **Custom session-cookie auth + service-role read**
     — `get-redemption-status` reads `game_entitlements`
     scoped to `(event_id, client_session_id)` after
     `readVerifiedSession`
     ([supabase/functions/_shared/session-cookie.ts](/supabase/functions/_shared/session-cookie.ts))
     verifies a signed cookie. This is the closest existing
     precedent for Q2's "Edge Function read shim" option
     in shape: `verify_jwt = false` + custom auth +
     service-role read of an event-scoped table.
  3. **No-caller-auth public actions** —
     `complete-game` and `issue-session` accept
     unauthenticated requests and don't authenticate the
     caller at all (the security model is in the action
     itself: `complete-game` writes only what the request
     payload asserts; `issue-session` mints a fresh
     identifier).

  For Q2's Edge Function shim option specifically: shape (1)
  shows the custom-auth + service-role architecture is well-
  established across six functions; shape (2) is the
  closest read-shim template but its per-row gating
  (session-cookie ownership) doesn't transfer to event-wide
  admin draft reads — a Q2 shim would gate on slug
  allowlist membership instead. The pattern is precedent-
  but-not-template; the architecture is well-precedented;
  the trust-boundary predicate is novel.

### Q3. Write-side contract for the admin authoring functions

**The decision.** What happens when an unauthenticated visitor
on a bypassed admin surface clicks Save / Publish / Unpublish /
Generate Code. The four authoring Edge Functions
(`save-draft`, `publish-draft`, `unpublish-event`,
`generate-event-code`) today gate on
`authenticateEventOrganizerOrAdmin` per
[supabase/functions/_shared/event-organizer-auth.ts](/supabase/functions/_shared/event-organizer-auth.ts).

**Why it matters.** The write contract has to be uniform
across the four functions or the partner sees inconsistent
behavior (Save works but Publish 403s, etc.). It also feeds
into the M3/M4 seam: if writes persist, M4's reset story
becomes more urgent.

**Product-owner framing.** This is what happens when the
partner clicks Save / Publish / Unpublish / Generate Code
in the bypassed admin workspace. Each option is a
different demo-experience:

- **Reject** — Clicking Save shows "demo mode is read-only"
  inline. Partner sees the workspace but learns from the
  first click that nothing they do persists. Honest;
  slightly disappointing if they expected to "try
  authoring."
- **Accept against same tables (functional)** — Save
  actually writes to the real test event's draft. The next
  visitor sees the partner's edits. Partner experiences
  authoring "for real," with the surprise that their work
  is shared. Q5 governs whether the audit log credits them
  by name or as "(unknown)."
- **Accept against parallel-state schema (sandbox)** —
  Save writes to a private mirror keyed by the partner's
  session. Looks identical to real authoring within their
  session; clears when the session ends. Closest to a
  guided product trial.
- **Accept against client-only state** — Save updates the
  on-screen form but reload loses everything. **Risk: the
  partner doesn't realize their work didn't persist until
  they refresh** — false-impression failure mode.

The Q1 answer constrains this: read-only browse forces
Reject; functional / sandbox each have a matching write
option. Worth picking the experience the demo's authoring
walkthrough wants to *show*: "look at the workspace" vs
"try authoring a question."

**Options surfaced.**

1. **Reject (read-only).** All four functions short-circuit
   on test-event slug membership when the caller is
   unauthenticated, returning a 403 with a "demo mode is
   read-only" body. UI surfaces a disabled Save button (or
   leaves it enabled and renders the 403 inline).
2. **Accept against same tables (functional).** Functions
   skip the auth check on test-event slug membership and
   write through to `game_event_drafts` /
   `game_events` /etc. against the real tables. State
   accumulates across visitors. Audit fields
   (`last_saved_by`, audit log entries) need an answer for
   anonymous identity (Q5).
3. **Accept against parallel-state schema (sandbox).**
   Functions route test-event writes to mirror tables
   (`demo_game_event_drafts` / etc.) keyed by session token.
   Apps/web reads from the mirror when bypassed.
4. **Accept against client-only state.** Writes never reach
   the server; the apps/web page holds form state in memory
   / localStorage and shows it in the UI but never persists.
   The Edge Functions don't need to change at all.

**Constraints.**

- `save-draft` writes to `game_event_drafts` directly under
  service_role; the function's authorization is the
  load-bearing trust boundary (RLS write-broadening was
  rejected in
  [supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:7-23](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)).
  Any "accept" branch that touches the real tables must
  decide whether the bypassed write goes through the
  function's existing service-role write or a separate
  path.
- `publish-draft` and `unpublish-event` invoke the
  `publish_game_event_draft` / `unpublish_game_event` RPCs
  which insert audit-log rows under service_role. Audit log
  inserts assume an authenticated `user_id`.
- `generate-event-code` does **not** persist anything: it
  calls the pure `generate_random_event_code()` RPC
  ([supabase/migrations/20260418040000_backfill_event_code.sql:63-87](/supabase/migrations/20260418040000_backfill_event_code.sql))
  to do rejection-sampling over the 17,576-code space and
  returns a candidate 3-letter string to the caller. The
  chosen code persists later via the save-draft path
  (writes `game_event_drafts.event_code`); projection onto
  `game_events.event_code` happens at publish per
  [supabase/migrations/20260418060000_project_event_code_on_publish.sql](/supabase/migrations/20260418060000_project_event_code_on_publish.sql);
  immutability is enforced after publish per
  [supabase/migrations/20260418050000_lock_event_code_after_publish.sql](/supabase/migrations/20260418050000_lock_event_code_after_publish.sql).
  A "functional" answer to Q1 that *publishes* a test event
  (not merely Generate Code on its own) pins its code **in
  the environment where the publish RPC executes**. The
  lock is enforced by a runtime trigger on
  `game_event_drafts`, not by migration history; running
  migrations applies the trigger DDL but does not execute
  publishes. The blast radius is therefore environment-
  local: a demo publish in production pins production's
  row, leaves local / staging untouched. Still significant
  if 3.1 picks a functional path that publishes against the
  real `game_events` table in any environment users see —
  recoverable only by direct SQL operating below the
  trigger guard.

### Q4. Write-side contract for the redeem and reverse RPCs

**The decision.** What happens when an unauthenticated visitor
on `/redeem` enters a code, or on `/redemptions` clicks
Reverse. The two SECURITY DEFINER RPCs gate on **different**
roles today:

- `redeem_entitlement_by_code` gates on
  `is_agent_for_event(p_event_id) or is_root_admin()` per
  [supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:38-45](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).
- `reverse_entitlement_redemption` gates on
  `is_organizer_for_event(p_event_id) or is_root_admin()` per
  [supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql:35-42](/supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql).

The split mirrors the live-event role model: agents redeem
(volunteer-booth action), organizers reverse (admin-correction
action). 3.1's bypass branch has to decide whether demo mode
mimics agent-only (can redeem; can't reverse), organizer-only
(can do both; matches Q3's authoring posture), or a third
combination — and the answer can differ between the redeem
keypad and the reverse-from-detail-sheet path.

**Why it matters.** Bypass for redeem and reverse is
**two-layer**, not single-layer:

1. The Edge Functions
   ([redeem-entitlement/index.ts:178-191](/supabase/functions/redeem-entitlement/index.ts),
   [reverse-entitlement-redemption/index.ts:204-217](/supabase/functions/reverse-entitlement-redemption/index.ts))
   call `authenticateRedemptionOperator` and return 401
   *before* invoking the RPC. An unauthenticated visitor is
   rejected at this layer; the RPC is never called.
2. The RPCs themselves then run their own role check
   (`is_agent_for_event` for redeem,
   `is_organizer_for_event` for reverse), with `or
   is_root_admin()` as the override branch.

A bypass that only patches the RPC body leaves
`/game/redeem` and `/game/redemptions` blocked at the Edge
Function 401 — the RPC change has no caller. 3.1 has to
decide what each layer does on test-event slugs:

- The Edge Function: skip `authenticateRedemptionOperator`
  for allowlisted slugs, call the RPC without forwarding a
  bearer token (or forward a synthesized one), or call a
  different RPC variant.
- The RPC: short-circuit the `is_agent_for_event` /
  `is_organizer_for_event` check on allowlisted events
  when `current_request_user_id()` is null, or accept the
  synthesized identity the Edge Function forwards.

Same SECURITY DEFINER-ness still applies: the RPC stamps
`redeemed_by` / `redeemed_by_role` /
`redemption_reversed_by` / `redemption_reversed_by_role`
audit fields from `current_request_user_id()`, which Q5
governs.

**Product-owner framing.** This is what happens at the
volunteer keypad when the partner enters a code, and what
happens in the organizer monitoring view when they click
Reverse on a redeemed entitlement. Because the two RPCs
gate on different real roles (agent for redeem, organizer
for reverse), the demo can model either both paths as
open or treat them asymmetrically:

- **Reject (both paths)** — keypad submit and Reverse both
  show the role-gate message; partner can't experience
  either side of the booth flow. Inconsistent with most
  Q1 answers.
- **Accept (both paths)** — both RPCs admit unauth demo
  callers; partner can redeem *and* reverse, exercising
  the full agent-then-organizer correction flow.
- **Accept redeem only** — partner can redeem at the
  keypad (demo mimics an agent), but Reverse is gated.
  The volunteer-booth pitch lands; the organizer-
  correction pitch doesn't. Closest to a "be the
  volunteer" experience.
- **Accept reverse only** — partner can reverse but not
  redeem. Inverted; useful only if the demo is pitched
  to organizers reviewing existing redemptions rather
  than to volunteers running the booth. Unlikely fit.

For each accepted path, the storage-side options remain:
- **Real entitlements** — operates on the actual
  `game_entitlements` rows. Realistic, including the
  "code already redeemed by another agent" message if a
  second partner enters the same code. **Requires demo
  entitlement rows to exist** (Q8 governs whether M3
  ships the seed or M4 does).
- **Sandbox entitlements** — operates on a per-session
  mirror; partner sees the row appear in their own
  monitoring view, another partner sees baseline.
  Closest to a guided trial.
- **Client-only** — UI shows success without DB change.
  Looks right in the moment; partner navigating to the
  monitoring view sees no record. Likely confusing.

If Q1 is functional or sandbox, this is the question that
decides whether the volunteer-booth pitch ("scan a code,
prize hands out, organizer sees it land, organizer
reverses if a mistake was made") works end-to-end or
truncates at one of the role boundaries.

**Options surfaced.** Each option below applies *per RPC
path* (Edge Function + RPC body together) — 3.1 picks one
for redeem and one for reverse, which may match or differ.
Each option implies coordinated edits at *both* the Edge
Function (the 401-returning auth gate) and the RPC body
(the role check).

1. **Reject** — Edge Function still 401s allowlisted-slug
   unauth callers, OR the EF lets them through and the RPC
   short-circuits on (allowlisted slug AND
   `current_request_user_id() IS NULL`) returning
   `not_authorized`. Either way, UI behaves as today's
   role-gate.
2. **Accept against real entitlements.** Edge Function
   skips `authenticateRedemptionOperator` for allowlisted
   slugs and forwards the request to the RPC; the RPC
   widens its role check to admit the unauth caller when
   the event is allowlisted. Redemption state mutates on
   real entitlement rows. Audit fields stamp a sentinel
   (`redeemed_by_role = 'demo_visitor'` or null, with
   `redeemed_by` null). For the reverse path, the
   `redemption_reversed_by_role` and `redemption_reversed_by`
   columns face the same Q5 question.
3. **Accept against sandbox entitlements.** RPC routes
   demo writes to mirror tables.
4. **Client-only.** Apps/web fakes the redemption response
   and renders success without calling the RPC. No backend
   change.

**Constraints.**

- The redeem RPC stamps `redeemed_by_role` as `'agent'` or
  `'root_admin'` per
  [supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:85](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).
  The reverse RPC stamps `redemption_reversed_by_role`
  similarly. A new role value (e.g. `'demo_visitor'`) on
  either column would need DB-type discipline (check
  constraint or enum — 3.1 reality-checks).
- The redemptions list query reads `game_entitlements`
  directly per
  [apps/web/src/redemptions/redemptionsData.ts:38-52](/apps/web/src/redemptions/redemptionsData.ts);
  the SELECT policy on the table is "assigned operators or
  root" per
  [supabase/migrations/20260421000500_add_redemption_rls_policies.sql:14-24](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql).
  Same Q2-shaped read-mediation question applies for the
  monitoring list.
- For redeem to succeed against real entitlements, demo
  entitlement rows must exist for at least one
  `verification_code`. The full code shape is
  `<3-letter event prefix>-<4-digit suffix>` (e.g.
  `ABC-1234`): the event prefix matches `/^[A-Z]{3}$/` per
  [apps/web/src/redeem/authorizeRedeem.ts:19](/apps/web/src/redeem/authorizeRedeem.ts)
  and resolves the slug; the keypad submits a 4-digit
  numeric suffix per
  [apps/web/src/redeem/RedeemKeypad.tsx:1-17](/apps/web/src/redeem/RedeemKeypad.tsx)
  with the submit-eligibility regex `/^\d{4}$/` enforced in
  [apps/web/src/redeem/useRedeemKeypadState.ts:7,21](/apps/web/src/redeem/useRedeemKeypadState.ts);
  the redeem RPC concatenates them as
  `v_event_code || '-' || p_code_suffix` per
  [supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:62](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).
  At least one matching `game_entitlements` row needs to
  exist for the test event. Today no migration seeds these.

### Q5. Anonymous-visitor identity for audit + write fields

**The decision.** What value gets stamped on `last_saved_by`,
`redeemed_by`, `redeemed_by_role`, `redemption_reversed_by`,
audit-log `actor_user_id`, and similar columns when the write
originates from an unauthenticated bypass-branch call.

**Why it matters.** Today `current_request_user_id()` returns
null for anon callers. Any "accept" answer to Q3 / Q4 has to
decide whether null-stamping is acceptable, whether a
sentinel UUID is allocated, or whether a synthesized
session-scoped identity gets created.

**Product-owner framing.** **Mostly technical, with one
labeling decision the product owner should weigh in on.**
The technical part — whether identity is null / sentinel
UUID / session token / Supabase anon-auth — is engineering's
call. The product-visible part is what the partner sees in
the monitoring view's "redeemed by" / "saved by" columns:

- **"(unknown)"** — null-stamp option; columns render
  blank or as a placeholder. Looks like missing data.
- **"Demo visitor"** — sentinel option; one shared label
  identifies all bypass-branch writes. Honest about demo
  status, doesn't distinguish between visitors.
- **"Visitor #abc12"** — session-token option; per-visitor
  pseudonym. Distinguishes one demo visitor's actions from
  another's in the monitoring view; useful if Q1 is
  functional and the partner wants to see a multi-operator
  monitoring scenario.
- **"Demo Volunteer"** (or whatever the anon auth.users
  row is named) — anon-auth option; looks like a real
  volunteer, no demo signal in this column.

If Q1 is read-only or Q3/Q4 are reject, this question
becomes moot — there are no writes to attribute. Otherwise
the product owner picks the labeling story; engineering
implements.

**Options surfaced.**

1. **Null-stamp.** Audit fields go null for demo writes.
   Forensic value drops; the timestamp + the demo-event slug
   identify the row as bypass-branch.
2. **Sentinel UUID.** A reserved `00000000-...-demo` UUID
   gets stamped as the writer. Querying for it isolates demo
   rows; auth.users does not need a row.
3. **Synthesized session identity.** A short-lived
   server-issued session token maps to a generated UUID;
   demo writes stamp that UUID. Lets the redemptions list
   show "redeemed by" coherently across one visitor's
   actions but requires session-token plumbing the bypass
   branch doesn't have today.
4. **Anonymous auth.users row** (Supabase's anon-sign-in
   feature). Each visitor gets a real auth.users row with no
   email; existing audit fields work unchanged. Heaviest
   integration cost.

**Constraints.**

- `event_role_assignments.user_id` is the FK
  `current_request_user_id()` resolves against; an anon
  visitor doesn't have one. Any role-membership-style
  authorization can't include the demo visitor.
- Audit-log rows in `game_event_audit_log` insert under
  service_role from inside the RPCs; column nullability and
  FK shape decide which options above are physically
  possible. 3.1 reality-checks the audit-log schema.

### Q6. Reset story (only if Q1 chooses functional-with-reset or sandbox-ephemeral)

**The decision.** If 3.1 picks an option where state
accumulates, who/what resets it and on what cadence.

**Why it matters.** The milestone doc names M4 as the owner
of the partner-runnable experience including reset, but
3.1's choice constrains what M4 can build. A "functional"
answer with no reset story means a partner walks into demo
state shaped by the previous partner's actions.

**Product-owner framing.** This is the question of "what
state does a partner walk into when they open the demo
fresh?" Each option translates to a distinct partner
arrival experience:

- **No reset** — Day 1 of demo: clean. Day 30: 200
  fictional questions named "test 1" through "lol
  whatever," 47 reversed redemptions, schedule item titled
  "asdf." The demo becomes unusable for new partners
  unless we never advertise it functionally.
- **Manual operator reset** — An internal-team member runs
  a script before each scheduled partner meeting. Works
  for "we're walking Acme through the demo on Tuesday"
  scenarios; doesn't work for partner self-service ("hey
  here's the URL, take a look").
- **On-demand reset endpoint** — A "Reset demo" button
  visible to the partner. Clean state on click. Empowering;
  also: trivially easy for one partner to reset mid-
  walkthrough for another partner if Q7 is shared-state.
- **Cron** — Scheduled reset (nightly / hourly). Predictable
  baseline; awkward if a partner is mid-walkthrough at the
  reset boundary.
- **Per-session sandbox** — State vanishes when the
  partner leaves; "reset" is "open a new tab." Most
  natural feel for self-service trials; loses the
  multi-operator dimension of a real event entirely.

The product owner's choice here strongly affects whether
the demo URL is something we hand to a partner ("here, try
it") or something we drive ourselves in scheduled walk-
throughs.

**Options surfaced.**

1. **No reset (state accumulates).** Acceptable only if
   demo content stays inspectable rather than runnable.
2. **Manual operator reset script.** `supabase/role-management/`-
   style runbook PR + psql snippet. Reset on demand only.
3. **On-demand reset endpoint.** Edge Function reachable
   from a partner-visible "Reset demo" button. Bounded by
   rate limit.
4. **Cron-based reset.** Scheduled Edge Function or Postgres
   `pg_cron` clears demo state nightly / hourly. Operator
   sees a fresh state at the start of each demo session.
5. **Per-session sandbox** (sandbox-ephemeral path, not
   functional-with-reset). State scoped to a session token
   that expires; "reset" is "open a new tab."

**Constraints.**

- This is the M3/M4 seam. If 3.1 picks an option whose
  reset story is "M4 owns it," 3.1's plan doc records what
  shape M4 inherits. If 3.1 picks an option whose reset
  story has to ship inside M3 to validate the bypass, the
  3.2+ phase split absorbs the reset work.
- Per the milestone doc's
  [M4-pulls-forward risk](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md):
  a 3.2+ planner reaching for "we should also seed three
  demo redemption codes so the booth is testable" pulls M4
  work into M3. Q6's resolution names where the seam falls
  so that pull is a deliberate scope-exception, not a
  silent absorption.

### Q7. Concurrency model across simultaneous bypassed visitors

**The decision.** What two unauthenticated visitors hitting
the same bypassed surface at the same time see.

**Why it matters.** Functional persistence makes them share
state in real time. Sandbox-ephemeral isolates per-session.
Read-only browse is uniform across visitors. The partner's
demo experience changes materially across the three.

**Product-owner framing.** The "two partners on the demo
at once" scenario isn't hypothetical — it happens whenever
we send the URL to two stakeholders or run two parallel
walkthroughs. Each option produces a different surprise:

- **Shared real-time state** — Partner A authors a
  question; Partner B hits reload and sees it. Most
  realistic to a real event (where multiple agents *do*
  redeem codes concurrently). Partner B may wonder "did
  *I* add that?" — needs visible signaling that state is
  shared.
- **Per-session isolated state** — Each partner has their
  own copy. Friendly individual experience; loses the
  "watch redemptions land in real time as agents redeem"
  pitch entirely (because there's only ever one agent
  per session — the partner themselves).
- **Mixed (shared reads, isolated writes)** — Partner A
  sees their own writes plus the seeded baseline; Partner
  B sees the seeded baseline plus *their* writes. Each
  experiences "I'm authoring against a populated event"
  without colliding. Halfway position.
- **Stateless** — Read-only path: no concurrency surprise
  because nothing mutates.

If the demo's pitch includes the live-event multi-operator
moment (an organizer watching agents redeem in real time),
shared or mixed is required. If the pitch is "use the
admin workspace as if you were authoring," isolated or
mixed is friendlier.

**Options surfaced.**

1. **Shared real-time state.** Visitor A's edits appear on
   visitor B's reload. Most honest representation of the
   live-event multi-operator scenario; least friendly when
   one visitor is mid-walkthrough.
2. **Per-session isolated state.** Each visitor has their
   own copy of demo state; cookie or session token keys
   isolation. Friendlier for individual walkthroughs;
   doesn't exercise the multi-operator dimension of the
   real product.
3. **Mixed (reads shared, writes isolated).** A visitor's
   own writes are visible to themselves; other visitors see
   the pre-demo baseline. Halfway position.
4. **Stateless (no state mutation possible).** Read-only
   path; concurrency model is uniform.

**Constraints.**

- The redemptions list and the admin schedule both expect
  multi-operator state today (a real event has agents
  redeeming concurrently). A demo that hides this dimension
  misrepresents the product to the partner.

### Q8. M3-only vs. M3-and-M4 split for functional-with-reset

**The decision.** If 3.1 picks functional-with-reset, does
M3 ship the bypass + functional state alone (M4 adds seeded
content + reset later), or does M3 absorb seeding +
reset to make the partner experience runnable inside M3?

**Why it matters.** The milestone doc explicitly defers
seeding + monitoring + reset to M4 and names the M4-pulls-
forward risk. But if functional-with-reset's read mediation
returns zero rows because no test-event entitlements are
seeded, the bypassed surfaces mount but stay empty. 3.1's
3.2+ phase-split derivation has to pick where the seam
falls.

**Product-owner framing.** This is "what does the partner
actually see when M3 ships, before M4?" question — and
it's surprisingly load-bearing for whether M3 is
demo-able on its own:

- **Strict M3/M4 split** — Partner clicks Organizer door,
  page mounts and shows: "Harvest Block Party — 0
  questions, 0 prizes, 0 schedule items." Clicks Volunteer
  door: "Enter a code" keypad with no codes to enter and
  no entitlements. Clicks Redemptions: empty list.
  Reaches the surfaces (which is what M3 promises)
  but the partner experience is "this looks broken." Needs
  M4 to be presentable.
- **Minimum-seed-in-M3** — M3 absorbs the smallest seed
  set (a published test event with a handful of questions,
  prizes, entitlement rows). Partner sees a populated
  workspace and can experience the read-side surfaces
  meaningfully even before M4. M4 still owns reset +
  richer pre-population.
- **M3-absorbs-M4** — M3 ships everything together. Demo
  is fully runnable when M3 lands. Cancels M4 as a
  separate milestone (which has its own implications for
  scoping cadence).

This question matters because it decides whether shipping
M3 in isolation buys the project anything *demo-able* or
just an architectural foundation for M4. The product owner
is best positioned to say whether "an empty admin
workspace that signed-out partners can reach" is
sufficiently valuable to ship before M4, or whether M3
should wait or absorb seeds.

**Options surfaced.**

1. **Strict M3/M4 split.** M3 ships bypass + functional
   state; M4 ships seeds + reset. Partner inside M3 sees
   empty surfaces.
2. **Minimum-seed-in-M3 exception.** M3 absorbs the
   smallest seed set (one published `game_events` row +
   N entitlement rows per test slug) needed to make the
   bypassed surfaces non-empty. Reset still M4. Recorded
   as a scoped exception per the milestone doc.
3. **M3-absorbs-M4.** M3 ships bypass + seeds + reset
   together. Renames the milestone shape; cancels M4 as a
   separate milestone.

**Constraints.**

- The Q3 publish-locks-event-code constraint applies: any
  `game_events` seed run via migration permanently pins the
  test-event codes in every environment.
- The milestone doc lists M4's deliverables explicitly
  ([m3-demo-mode-auth-bypass.md goal section, lines 86-91](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md));
  a Q8 answer that absorbs them into M3 has to revise that
  list as a milestone-doc edit.

### Q9. Read-side mediation pattern uniformity across the three surfaces

**The decision.** Whether the read-side mediation 3.1
chooses applies uniformly to all three surfaces' read paths,
or whether different surfaces use different mediation
patterns.

**Why it matters.** A uniform pattern is easier to reason
about and review. A non-uniform pattern (e.g. "anon-RLS for
admin reads, Edge Function shim for redemptions reads")
fragments the trust-boundary surface. The cross-phase
invariant "Real events never receive bypass" binds every
mediation site individually; non-uniform patterns multiply
the assertion surface.

**Product-owner framing.** **No product-visible difference
— defer to engineering.** Whether one mechanism handles
all reads or three different mechanisms handle each
surface's read is invisible to the partner. The trade-off
is review surface, trust-boundary assertions, and
maintenance — engineering's call. (Marginal operational
note: an Edge Function shim adds a network round-trip vs.
direct PostgREST; if engineering picks a non-uniform
pattern that puts an Edge Function on a frequently-loaded
surface, perceived load time may differ slightly. Worth
asking engineering to flag if so.)

**Options surfaced.**

1. **Uniform mediation pattern across all three surfaces.**
   One mechanism (e.g. anon-RLS broadening with allowlist
   helper) covers admin's draft read, redemptions' list
   read, and any redeem-side read. Test surface = one
   mechanism; review surface = one shape.
2. **Per-surface mediation pattern.** Admin gets static
   fixtures (no DB read); redemptions gets anon-RLS; redeem
   gets Edge Function shim. Each surface picks the lightest
   mediation that satisfies its read need. Test surface
   grows; review surface fragments.

**Constraints.**

- Cross-phase invariant 1 (single source of truth for the
  allowlist) binds every mediation site to consume the
  shared allowlist constant. Q9 affects how many sites
  consume it, not whether they share it.

## Constraints that span all questions

These are facts from current code or from already-locked
milestone-level decisions that bound *every* answer in
Q1–Q9. Listed here once so individual question entries
don't repeat them.

- **Allowlist gate is the only bypass criterion.** No
  environment flag, URL parameter, header, or session-
  scoped flag substitutes for slug allowlist membership at
  any guard site (milestone-doc cross-phase invariant 2).
- **Real events stay on today's auth posture.** Existing
  `useAuthSession()` + per-event role hooks on apps/web,
  `authenticateEventOrganizerOrAdmin` /
  `authenticateRedemptionOperator` / `readVerifiedSession`
  on Edge Functions, RLS policies on event-scoped tables —
  all unchanged for non-test slugs. The bypass branch sits
  beside these checks.
- **Bypass-rendered surfaces are demo-signposted.** Some
  in-UI signal (banner, ribbon, prefix, etc.) makes the
  partner aware they reached the bypass branch
  (milestone-doc cross-phase invariant 3). 3.2+ picks the
  pattern.
- **Bypass-rendered surfaces are noindex.** Apps/web emit
  shape is 3.2+'s decision; the *outcome* is locked.
- **Allowlist is two slugs through this epic.** No new test
  events; no slug additions. M3 does not surface a "register
  a new test event" pattern.
- **Allowlist constant lives in code, not env config.**
  Shared TypeScript module. Location, symbol shape, and
  SQL ingest path (if any) are 3.2+'s.
- **Test-event noindex + disclaimer** from
  [m3-site-rendering.md](/docs/plans/m3-site-rendering.md)
  extends to apps/web bypass-rendered surfaces.

## What 3.1 explicitly does not own

These are 3.2+'s and named in the milestone doc — recorded
here so 3.1's deliberation doesn't drift into them.

- Allowlist constant location, symbol shape, and TypeScript
  consumption pattern.
- SQL ingest path for the allowlist (only relevant if Q1
  + Q2 / Q3 / Q4 introduces SQL helper functions).
- Demo-mode UI signaling pattern (banner / ribbon /
  prefix / etc.).
- noindex emit shape on apps/web bypass routes.
- Test-event-allowlist enforcement assertion (pgTAP /
  TypeScript test / e2e).
- M3-closing copy revision on M2's role-doors
  ("Sign in or wait for demo mode" → current state).
- Doc-currency updates owned by the M3-closing phase.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not
from the scoping snapshot. The list below names what the
3.1 plan's load-bearing claims will rest on; if any
reality-check finds drift, the scoping doc gets revised
before the plan absorbs the answer.

- **`game_event_drafts` SELECT policy current shape.**
  Scoping read on 2026-05-02 confirmed
  `is_organizer_for_event(id) or is_root_admin()`
  ([supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:75-81](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)).
  Plan-drafting re-verifies no later migration broadens or
  narrows it.
- **`game_entitlements` SELECT policy current shape.**
  `is_agent_for_event(event_id) or
  is_organizer_for_event(event_id) or is_root_admin()`
  ([supabase/migrations/20260421000500_add_redemption_rls_policies.sql:14-24](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)).
  Re-verify.
- **Redeem and reverse RPC bodies.** Q4's options against
  the actual SQL — do the RPC bodies admit a clean bypass
  branch, or do they need restructure?
  ([supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql),
  [supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql](/supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql)).
- **Audit-log schema.** `game_event_audit_log` columns,
  nullability, FKs to auth.users — Q5's options ride on
  this.
- **Edge Function authorization helpers.** The four
  authoring functions' shared
  [event-organizer-auth.ts](/supabase/functions/_shared/event-organizer-auth.ts)
  and the redemption ones'
  [redemption-operator-auth.ts](/supabase/functions/_shared/redemption-operator-auth.ts)
  — Q3's bypass branch lands inside (or alongside) these
  helpers.
- **`game_event_admin_status` view definition.** The view
  is `security_invoker = true` per migration comments;
  plan-drafting reads the actual view DDL to confirm.
- **Existing apps/site `TestEventDisclaimer` component.**
  Q1's "demo signaling extends to apps/web" cross-phase
  invariant rides on the apps/site precedent at
  [apps/site/components/event/TestEventDisclaimer.tsx](/apps/site/components/event/TestEventDisclaimer.tsx).
- **Edge Function trust-boundary inventory.** Scoping read
  every entry in [supabase/config.toml](/supabase/config.toml)
  and confirmed all 9 functions are `verify_jwt = false`,
  splitting into three auth shapes: custom bearer-token (6
  functions: the 4 authoring + 2 redemption mutations),
  custom session-cookie (`get-redemption-status` — the
  closest read-shim precedent, gated by session-cookie
  ownership of one row rather than slug allowlist), and
  no-caller-auth public actions (`complete-game`,
  `issue-session`). Plan-drafting re-verifies the inventory
  hasn't shifted; the breakdown is reality-check input for
  Q2's "Edge Function shim" option (architecture
  well-precedented; trust-boundary predicate novel).

## Spike candidates 3.1 may run

When phase planning surfaces an option whose runtime
semantics aren't certain from documentation alone, a 30-
minute throwaway spike against one of the three surfaces
end-to-end is the safer route than carrying the assumption
into the plan. Three candidates 3.1 may want to spike (the
list is not binding — phase planning picks against the
options that survive deliberation):

- **Anon-RLS broadening with an `is_test_event_id(text)`
  helper** — confirm a Postgres-side allowlist helper
  composes cleanly with existing event-scoped policies and
  doesn't break pgTAP coverage or `game_event_admin_status`.
- **Edge Function read shim** — adapt `get-redemption-status`'s
  shape to the admin draft path: confirm a `verify_jwt =
  false` Function gated on slug-allowlist membership (rather
  than session-cookie ownership) can mint a service-role
  client, query the allowlisted draft, and return DTOs
  apps/web's existing admin loader can consume without
  reshape. Confirm CORS posture on apps/web → Edge Function
  cross-origin. The base pattern is established; the
  allowlist-gating layer is what the spike exercises.
- **Static fixture import** — confirm apps/web can build-
  time-import a `harvest-block-party` draft module from
  `apps/site/events/` (or a new `shared/events/demo/` path)
  and feed it through the existing `loadDraftEvent` shape
  without DB hits. Confirm bundle-size impact and whether
  the fixture path collapses real-event auth coupling.

Spikes land on `spike/m3-phase-3-1-<mechanism>` branches off
the planning branch and are never promoted into the plan
PR per the established spike convention.

## Plan structure handoff

The 3.1 plan owns these sections once the open questions
resolve. Most are stub-shaped at plan-open time and fill in
as Q1–Q9's resolutions land:

- Status (Proposed → Landed lifecycle in the 3.1 PR).
- Context preamble (1–3 paragraphs of plain-English what /
  why-now / what-surfaces-touched).
- Goal (the chosen semantics, stated in one sentence).
- Decision record — Q1–Q9's answers, structured per
  question with rejected alternatives. **Owns the durable
  decision content; this scoping doc keeps the deliberation
  prose until milestone close.**
- Cross-Cutting Invariants (references milestone-doc
  invariants by name; per-phase additions only).
- Documentation Currency PR Gate — phase 3.1 owns the
  [`docs/open-questions.md`](/docs/open-questions.md)
  closure of the "Demo-mode data-access semantics for
  test-event slugs" entry per the milestone doc. Other
  doc-currency entries (README, architecture, product,
  styling, backlog) are M3-closing-phase's, not 3.1's.
- Backlog Impact (references milestone-doc Backlog Impact;
  per-phase additions if Q1's resolution surfaces any).
- Out Of Scope (final).

3.1 ships no code, so the plan doc has no Files to touch
inventory beyond the open-questions entry, no Execution
Steps for code edits, no Validation Gate beyond `npm run
lint` (markdown lint and link checking). The Risk Register
inherits from the milestone doc; per-phase risks from Q6
and Q8 ("M4 pulls forward into M3") get named here if 3.1's
choice surfaces them.

## Related Docs

- [m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  — parent milestone doc; the Cross-Phase Decisions →
  Deferred-to-phase-time section names 3.1 as decision
  owner. Phase Status table 3.1 row is `_pending phase
  planning_` at scoping-doc-open time and updates as the
  plan drafts.
- [docs/open-questions.md](/docs/open-questions.md) — the
  "Demo-mode data-access semantics for test-event slugs"
  entry under "Demo Expansion Epic — M3 Demo-Mode Data
  Access" is the question 3.1 closes.
- [demo-expansion/epic.md](/docs/plans/epics/demo-expansion/epic.md)
  — parent epic; the M3 paragraph + the "Open Questions
  Newly Opened" entry that this scoping doc decomposes.
- [supabase/migrations/20260427010000_broaden_event_scoped_rls.sql](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)
  — current draft / version SELECT policy shape; load-
  bearing for Q2.
- [supabase/migrations/20260421000500_add_redemption_rls_policies.sql](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
  — current entitlement SELECT policy shape; load-bearing
  for Q4 and Q9.
- [supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  — redeem RPC body; load-bearing for Q4 and Q5.
- [supabase/functions/_shared/event-organizer-auth.ts](/supabase/functions/_shared/event-organizer-auth.ts)
  — authoring-function auth helper; load-bearing for Q3.
- [shared/events/admin.ts](/shared/events/admin.ts) —
  apps/web admin's read path; load-bearing for Q2.
- [apps/web/src/redemptions/redemptionsData.ts](/apps/web/src/redemptions/redemptionsData.ts)
  — apps/web redemptions list read path; load-bearing for
  Q9 and Q4.
