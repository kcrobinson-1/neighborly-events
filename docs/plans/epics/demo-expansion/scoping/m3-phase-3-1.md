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
   stays unchanged.
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
  ([supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:25-29](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql))
  — broadening the view's SELECT requires broadening the
  underlying tables' SELECT, not the view itself.
- No precedent for anon-readable RLS policies on event-scoped
  tables exists today: anon SELECT today is gated to
  `published_at IS NOT NULL` for `game_events` /
  `game_questions` / `game_question_options` only
  ([supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:158-209](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)).
- No precedent for unauthenticated Edge Function read shims
  exists today: every existing function in
  [supabase/functions/](/supabase/functions/) either takes a
  bearer token or is a public-action endpoint
  (`complete-game`, `issue-session`, `redeem-entitlement` —
  the redeem RPC is the auth surface, not the function).

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
- `generate-event-code` projects an event code on the row
  per
  [supabase/migrations/20260418060000_project_event_code_on_publish.sql](/supabase/migrations/20260418060000_project_event_code_on_publish.sql)
  — locked after publish per
  [supabase/migrations/20260418050000_lock_event_code_after_publish.sql](/supabase/migrations/20260418050000_lock_event_code_after_publish.sql).
  A "functional" answer to Q1 that publishes a test event
  permanently pins its code in every environment that runs
  the migration history.

### Q4. Write-side contract for the redeem and reverse RPCs

**The decision.** What happens when an unauthenticated visitor
on `/redeem` enters a code, or on `/redemptions` clicks
Reverse. The two SECURITY DEFINER RPCs
(`redeem_entitlement_by_code`,
`reverse_entitlement_redemption`) gate on
`is_agent_for_event(event_id) or is_root_admin()` per
[supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:38-45](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).

**Why it matters.** Same uniformity concern as Q3 but
narrower: the RPCs are SECURITY DEFINER so the bypass branch
lives inside the RPC body, not in an Edge Function gate. The
RPC also stamps `redeemed_by` / `redeemed_by_role` /
`redemption_reversed_by` audit fields from
`current_request_user_id()`.

**Options surfaced.**

1. **Reject** — short-circuit inside the RPC on (test-event
   slug membership AND `current_request_user_id() IS NULL`)
   and return `not_authorized`. UI behaves as today's
   role-gate.
2. **Accept against real entitlements.** RPC widens its
   guard to admit unauthenticated callers when the event is
   allowlisted. Redemption state mutates on the real
   entitlement rows. Audit fields stamp a sentinel
   (`redeemed_by_role = 'demo_visitor'` or null, with
   `redeemed_by` null).
3. **Accept against sandbox entitlements.** RPC routes
   demo writes to mirror tables.
4. **Client-only.** Apps/web fakes the redemption response
   and renders success without calling the RPC. No backend
   change.

**Constraints.**

- The redeem RPC stamps `redeemed_by_role` as `'agent'` or
  `'root_admin'` per
  [supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:85](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).
  A new role value would need DB-type discipline (the
  column may be a `check` constraint or enum — 3.1
  reality-checks).
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
  `verification_code`. The keypad accepts a 3-letter
  suffix; the row needs to exist in `game_entitlements` for
  the test event. Today no migration seeds these.

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
- **No precedent for unauthenticated Edge Function read
  shims.** Scoping read all functions in
  [supabase/functions/](/supabase/functions/) and confirmed
  none take anon callers for *read* purposes (the public-
  action exceptions — `complete-game`, `issue-session`,
  `redeem-entitlement` — are write/auth surfaces).
  Plan-drafting re-verifies; the absence is itself a
  reality-check input for Q2.

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
- **Edge Function read shim** — confirm an unauthenticated
  Function with `verify_jwt = false` can mint a service-role
  client, query the allowlisted draft, and return DTOs
  apps/web's existing admin loader can consume without
  reshape. Confirm CORS posture on apps/web → Edge Function
  cross-origin.
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
