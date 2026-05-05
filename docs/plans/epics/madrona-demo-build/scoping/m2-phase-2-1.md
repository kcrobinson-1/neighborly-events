# M2 phase 2.1 — Scoping

## Status

Active.

This scoping doc is the transient artifact for phase 2.1 of the
Madrona demo-build epic, M2. Per AGENTS.md "Phase Planning
Sessions" it owns the deliberation prose with rejected
alternatives, the open decisions handed to plan-drafting, the
plan-structure handoff, and the reality-check inputs the plan
must verify. The durable record of this phase lives in
[`m2-phase-2-1-plan.md`](/docs/plans/epics/madrona-demo-build/m2-phase-2-1-plan.md).
This scoping doc deletes in batch with sibling scoping docs at
the milestone-terminal PR per the milestone doc's
batch-deletion commitment.

## Phase Summary

Wire the full attendee journey on `/event/madrona` end-to-end
against placeholder game content so a stakeholder visiting the
demo URL can walk landing → gameplay → completion → redeem
booth handoff and an organizer can monitor the redemption from
the dashboard.

The phase ships a service-role script that authors a placeholder
Madrona game draft and publishes it through the canonical
`publish_game_event_draft` RPC, pairs it with a manual SQL
runbook entry for assigning the redemption agent role on
`event_role_assignments`, executes both against production
Supabase, and captures the end-to-end journey as PNG pairs
attached to the PR body. The diff is small (one script, one
runbook entry, milestone-doc closure); the bulk of value is
operational and validation-shaped.

If the milestone doc's authorized 2.2 split surfaces, this
phase's scope retracts to "content authoring + agent assignment"
and 2.2 picks up the journey verification + capture pairs +
closure burden. The current call is **single-PR collapse**; the
deliberation below records why.

## Decisions Made At Scoping Time

Per AGENTS.md "Verify before recording any cross-phase
decision," each decision below cites the actual code / migration
/ doc that grounds the call. Rejected alternatives stay
recorded so the plan doc inherits the option-set without
re-deriving.

### Decision 1: Authoring surface — service-role script

The milestone doc settled "publish through `publish_game_event_draft`"
and ruled out a seed migration that bypasses the RPC. Two options
remained:

**(a) Admin-UI flow.** Sign in to apps/web admin as a root admin;
author the draft; publish.

**(b) Service-role script.** A Node script that INSERTs the draft
row directly under service_role and invokes the publish RPC.

**Decision: (b) service-role script.**

The admin UI today only edits **existing** drafts. There is no
"Create New Event" affordance — `listDraftEventSummaries` reads
`game_event_admin_status` and the workspace renders an editor
keyed off an existing `game_event_drafts.id`; the codepath that
would create a new draft from scratch is the
[`createStarterDraftContent` factory at shared/events/draftCreation.ts:49-86](/shared/events/draftCreation.ts),
but the workspace has no entry point that calls it. Building a
"Create New Event" admin-UI feature is its own scope — it
involves a new admin route or modal, name/slug entry inputs,
slug-collision handling, draft-creation RPC wiring, RLS-policy
audit, and dedicated tests. Per AGENTS.md "Don't add features
beyond what the task requires," that work is out of phase 2.1's
scope; M2's goal is journey wiring on a real (non-test) slug,
not authoring-UX feature work.

The service-role script bypasses the missing UI entirely. The
draft row INSERTs under service_role (which bypasses the
admin-only RLS on `game_event_drafts` documented at
[migration 20260418000000:188-210](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql))
with the placeholder content as a JSON literal; the publish RPC
is invoked next with the same `event_id` and an actor `uuid` (a
root admin's `auth.users.id`); the RPC's identity-check
(`content.id == draft.id`, `content.slug == draft.slug`,
`content.name == draft.name`, see
[migration 20260423010000:63-67](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
is satisfied by construction.

The script lives at `scripts/release/seed-game-content.cjs`
as a generic event-agnostic seed harness; per-event data lives
in a sibling module that exports `seedConfig: GameSeedConfig`
(the plan doc records the exact paths and naming) following
the precedent set by the existing service-role-using scripts at
[scripts/testing/run-production-redemption-smoke.cjs:64-73](/scripts/testing/run-production-redemption-smoke.cjs)
which read `TEST_SUPABASE_URL` and
`TEST_SUPABASE_SERVICE_ROLE_KEY` env vars. The script is
idempotent: the draft INSERT uses `ON CONFLICT (id) DO UPDATE
SET content = EXCLUDED.content, ...`, and `publish_game_event_draft`
naturally increments `version_number` on each call (the
`game_events` upsert is `on conflict (id) do update set ...`,
so the live published row reflects whatever the latest call
projected). Replayability matters because Madrona's draft is a
real ongoing artifact through M3 and beyond; a non-replayable
authoring step would force ad-hoc SQL on every environment
refresh.

`Verified by:`
[shared/events/draftCreation.ts:49-86](/shared/events/draftCreation.ts)
for the absent-from-UI starter-draft factory;
[supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:188-210](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)
for the admin-only RLS that service_role bypasses;
[supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:31-230](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql)
for the publish RPC body and identity-check;
[scripts/testing/run-production-redemption-smoke.cjs:1-90](/scripts/testing/run-production-redemption-smoke.cjs)
for the service-role-script env-var precedent.

### Decision 2: Single-PR collapse (no 2.2 split)

The milestone doc authorized a conditional 2.2 split if
"adding the capture set would bury the operational details."

**Decision: collapse 2.2 into 2.1; ship single PR.**

Reasoning: the script alone cannot demonstrate that M2's
capability target lands — the milestone-level invariant
"end-to-end journey is the load-bearing falsifier" requires
the journey to actually run and be recorded. Splitting "land
the script" from "verify the journey" produces a PR pair where
the first PR's value is unverifiable until the second lands;
reviewers of the first PR cannot assess whether the placeholder
content shape supports a coherent journey, and reviewers of the
second PR are reviewing screenshots without the contributing
code in the same diff. The coupling is too tight for the
review-coherence benefit to outweigh the cross-PR coordination
cost.

The diff size is the safety check. If the script + runbook +
capture-pair attachment + closure-doc updates together exceed
the AGENTS.md "PR-count predictions need a branch test"
thresholds at implementation time, the plan doc records an
Estimate Deviation and ships the split. The default is
single-PR; the split is a fallback.

`Verified by:`
[docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md:111-144](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
for the milestone doc's collapse authorization and rationale.

### Decision 3: Agent identity is the active root-admin's account, with explicit `agent` role assignment for Madrona

Two options:

**(a) Use the active root-admin's account.** The same identity
already in `admin_users` for platform-level root-admin gets a
new row in `event_role_assignments` with `role = 'agent'` for
Madrona's `event_id`.

**(b) Create a dedicated demo-agent account.** A new email-
keyed identity (e.g., `madrona-demo-agent@…`) signs in via
magic link, creating an `auth.users` row, then gets the
agent assignment.

**Decision: (a) reuse the active root-admin account.**

The simpler shape. Magic-link sign-in auto-creates `auth.users`
rows on first click (per
[migration 20260407103000_add_quiz_authoring_auth.sql:14-69](/supabase/migrations/20260407103000_add_quiz_authoring_auth.sql)
and Supabase Auth defaults), so option (b) is operationally
free, but it adds an account to manage with no demo-phase
benefit — the demo journey's verification is "the agent role
authorizes for `slug=madrona`," not "a separately-named demo
agent identity exists." Reusing the root-admin account costs
nothing and lets the same operator walk every step of the
journey without juggling sessions.

The load-bearing nuance: the redeem surface authorizes via
`is_agent_for_event(event_id) OR is_root_admin()`
(see
[`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx)
and the `authorizeRedeem` lib path it calls). A root admin
without an explicit agent assignment would still pass
authorization via the root-admin branch — but that path does
not exercise the agent-role branch, which is what M2's
invariant 3 binds ("redeem authorizes the agent without
falling through to the demo-mode bypass" — and the load-bearing
implication is the agent-role path is exercised, not just the
fallthrough-to-root-admin path). Hence the explicit assignment:
the same user is both root admin (platform) and agent
(per-event), and the journey walkthrough exercises the
agent-role branch by signing in as that user and redeeming
for Madrona.

`Verified by:`
[supabase/migrations/20260421000100_add_event_role_assignments.sql](/supabase/migrations/20260421000100_add_event_role_assignments.sql)
for the role-assignments table the agent row lands in;
[supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:38](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)
for the `admin_users` table the root admin already lives in.

### Decision 4: Defer organizer assignment to a follow-up

The redemptions monitoring page at
`/event/madrona/game/redemptions` requires
`is_organizer_for_event(event_id) OR is_root_admin()`. The
milestone doc deferred the question of whether to also assign
an organizer for Madrona during M2.

**Decision: defer; rely on root-admin bypass for redemptions
monitoring during M2.**

The agent role gets explicitly assigned per Decision 3 because
the redeem journey leg specifically exercises the agent-role
branch (without it, the journey would silently lean on the
root-admin bypass and fail to demonstrate the agent path
works). The redemptions monitoring leg is different: M2's
capability target is "the demo journey works end-to-end,"
which the redemptions page demonstrates by showing the
just-redeemed entitlement is listed correctly. Whether that
demonstration runs through `is_organizer_for_event` or
`is_root_admin` is invisible to a stakeholder watching the
demo — both paths render the same UI. Adding an organizer
assignment for the same root-admin user is a no-op for the
demonstrated capability, and adds another role row to manage.

The launch-epic and the deferred-from-Tier-4 backlog item
"Organizer-managed agent assignment" both have organizer
identity in scope; M2 does not pre-empt them. If a future
phase or epic needs the organizer-role branch exercised
explicitly, the assignment is one SQL row.

`Verified by:`
[docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md:355-364](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
for the milestone-doc deferral and constraint set.

### Decision 5: Validation environment is production

The milestone doc deferred whether validation runs against
staging or production.

**Decision: production.**

There is no staging Supabase environment. The repo's deploy
shape is a single Vercel project pointed at a single production
Supabase project; preview deployments built from PR branches
read the production `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` at build time. There is
no separate `VITE_SUPABASE_URL_STAGING` or per-branch isolation
of the data plane.

Operational implication: the script and the agent-assignment
SQL run against production Supabase. The PR's preview
deployment renders against production data, which is exactly
the demo URL behavior the epic Goal names. The journey
walkthrough captures from the PR preview are valid evidence
for the merged-to-main demo URL because both deployments share
the same data plane.

The risk this carries — a content edit during M2 affects what
any future visitor sees on `/event/madrona*` — is mitigated by
`noindex` keeping the URL out of public search and the
demo-sharing model (URL is shared deliberately, not posted
publicly). The milestone doc binds both posture mechanisms
through M2.

`Verified by:`
[scripts/testing/run-production-redemption-smoke.cjs:64-90](/scripts/testing/run-production-redemption-smoke.cjs)
for the env-var shape that confirms a single production Supabase
target, with no staging-keyed alternative.

### Decision 6: 6 placeholder questions, music-neutral copy

The milestone doc bound placeholder content to be content-
neutral with respect to M3's real authoring (invariant 5 of the
milestone doc). Two open questions: how many questions, and
what flavor of placeholder.

**Decision: 6 questions, music-and-neighborhood-themed
placeholder copy with no real Madrona bands or sponsors named.**

The 5–7 question guidance comes from
[`docs/experience.md`](/docs/experience.md) "short beats rich"
and the `firstSampleGame` 6-question precedent in
[shared/game-config/sample-games.ts](/shared/game-config/sample-games.ts).
Phase 2.1 picks 6 to match the precedent.

The "music-and-neighborhood-themed" framing is deliberate:
the placeholder content carries the *flavor* of what Madrona's
real content will be (so a stakeholder reviewing the demo gets
the right end-to-end texture), but does not name any real
band, sponsor, or specific Madrona-historical fact (so M3's
real authoring does not have to navigate around names that
already shipped in placeholder copy). Sample question shape:
"Which decade is most associated with Pacific Northwest
indie-folk?" — neutral, music-flavored, not Madrona-specific.

The constraint is invariant 5 (content-neutral with respect
to M3). The plan-time check: each placeholder question's
prompt and sponsor-fact passes "would M3 have to delete or
rewrite this for narrative-fit reasons, beyond simple content
swap?" — if yes, rephrase before commit.

The `feedbackMode` is `"final_score_reveal"` (the simplest of
the three options:
`final_score_reveal | per_question_correctness | per_question_explanation`),
matching the `firstSampleGame` precedent. `allowBackNavigation:
true` and `allowRetake: true` keep the demo journey forgiving
for a stakeholder unfamiliar with the gameplay shape.

`Verified by:`
[shared/game-config/sample-games.ts](/shared/game-config/sample-games.ts)
for the 6-question precedent and field-shape;
[docs/experience.md](/docs/experience.md)
for the 5–7 guidance.

### Decision 7: Capture set covers the journey states, not warm-cream → Madrona transitions

M1 phase 1.1 captured 6 pairs (4 in-app warm-cream → Madrona
transitions on game/redeem/redemptions/admin + 2 cross-app).
M2's capture set has different falsifiers because the Theme
already applies — the journey states themselves are the new
evidence.

**Decision: 6–7 captures organized as journey states, with
match-assertion sentences naming the contributing journey leg.**

Working set at scoping time (plan owns final shape):

1. **`/event/madrona/game` intro** — game intro/start screen
   under Madrona Theme on apps/web.
2. **Mid-game question screen** — a question with selected
   answer, showing the Madrona palette on the question card,
   options, and CTA.
3. **`/event/madrona/game` completion** — completion screen
   showing the entitlement verification code under Madrona
   Theme.
4. **`/event/madrona/game/redeem` keypad** — agent's keypad
   surface (signed in as the root-admin-with-agent-role
   user) with the Madrona palette on the keypad chrome.
5. **Redeem confirmation** — post-submit screen showing the
   entitlement was redeemed, with the agent identity / role.
6. **`/event/madrona/game/redemptions` listing** — organizer
   monitoring page (signed in as the root admin) showing the
   just-redeemed entitlement on the list with correct
   `redeemed_by_role` and `redeemed_at`.
7. **(Optional) Cross-app continuity pair** — apps/site
   `/event/madrona` landing alongside apps/web
   `/event/madrona/game` intro, demonstrating Madrona Theme
   consistency across the app boundary under journey load.

The cross-app continuity pair is optional in this set because
M1 phase 1.1 already captured the apps/site landing → apps/web
game cross-app pair when the gameplay route was an empty shell;
M2's contribution is "the gameplay surface now has real content
and the Theme still holds." The plan doc decides whether to
include the cross-app pair as a 7th capture or fold it into one
of the in-app journey captures with a "cross-app continuity
preserved" annotation.

The capture mechanism is
[`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs)
(Playwright-based, produces timestamped PNGs in
`tmp/ui-review/`). Captures attach to the PR body's Validation
section as inline images with one-sentence match-assertion
prose per pair. Freshness check: build-id assertion inline in
the PR Validation section against the latest apps/site +
apps/web preview deploys.

`Verified by:`
[scripts/ui-review/capture-ui-review.cjs:1-80](/scripts/ui-review/capture-ui-review.cjs)
for the existing capture tool;
[docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md:156-169](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
for the M1 phase 1.1 capture-pair precedent and shape.

### Decision 8: Runbook entry lives inline in the plan doc, not in `docs/operations.md`

The milestone doc deferred whether the manual agent-assignment
SQL runbook entry lives in `docs/operations.md`,
inline in the phase plan, or in a focused follow-up doc.

**Decision: inline in the phase plan, with a `docs/operations.md`
follow-up backlog entry if the manual assignment recurs.**

`docs/operations.md` is the canonical operations runbook;
adding a one-time Madrona-specific SQL command there raises
the question "when does it leave?" — Madrona's agent
assignment is intended to persist, so the runbook entry's
re-applicability is conditional on environment refreshes (a
rare operational event). The phase plan, which lives in the
durable plan-doc set, is a more honest home for "this is what
we ran once" — and the doc itself ages alongside the broader
M2 record.

The fallback path (operations.md follow-up) is recorded in
phase 2.1's Backlog Impact: if a future environment refresh
or a second event surfaces the same manual-SQL pattern, the
reusable runbook moves to `docs/operations.md` and the phase
plan's entry collapses to "see operations.md."

`Verified by:`
[docs/operations.md](/docs/operations.md)
for the current operations.md scope and shape (per the
milestone doc's reality-check expectation, the plan-doc
re-derives at phase-time grep).

### Decision 9: testEvent assertion sites and grep regression-check

The milestone-level invariant "every test-event-only branch
asserted unfired for `slug=madrona`" names three known sites:
[EventAdminPage.tsx:393-396](/apps/web/src/pages/EventAdminPage.tsx),
[EventRedeemPage.tsx:435-446](/apps/web/src/pages/EventRedeemPage.tsx),
[EventRedemptionsPage.tsx:696-699](/apps/web/src/pages/EventRedemptionsPage.tsx).
Phase 2.1's plan must include a phase-time grep of
`isTestEventSlug` and `testEvent` against `apps/web/src` and
`shared/` to falsify the milestone-session hypothesis that
those three are the only sites.

**Decision: include the grep + assertion list in the plan's
Self-Review Audits section; surface any new sites as a
phase-time correction with rationale recorded in the plan.**

If the grep surfaces a fourth site that gates a non-trivial
gameplay or redemption code path on `testEvent`, phase 2.1 has
two options: assert the branch unfired for Madrona during the
journey walkthrough (path-passes-through evidence), or — if
the branch is more deeply embedded than the demo-mode UI gates
— file a follow-up that audits the assumption set and ship
M2.1 with the assertion as a load-bearing self-review pass.
The plan doc binds the grep + audit + decision sequence.

`Verified by:`
[docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md:265-273](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
for the milestone-level invariant binding.

## Open Decisions Handed To Plan-Drafting

These decisions defer to plan-drafting because they need the
phase-time reality check against the merged code state.

- **Exact script path and name.** `scripts/release/...` vs
  `scripts/testing/...` vs `scripts/seed/...`. Constraint:
  match the closest precedent given the script's role.
  Plan-drafting resolved to **`scripts/release/seed-game-content.cjs`**
  — the script is one-time-per-event release setup, closer to
  `scripts/release/post-merge-smoke-watch.cjs` than to the
  test-suite scripts, and is event-agnostic (takes
  `--content <path>`) so future event seeds re-use it.
- **Exact placeholder question content.** Plan-time authoring;
  6 prompts, 3-4 options each, with 1 correct option per
  question; explanations and sponsor-facts populated for
  feedback richness. Constraint: invariant 5 (content-neutral
  with respect to M3). The scoping doc names the flavor; the
  plan and PR carry the actual prose.
- **Whether the script reads the Madrona content from a
  committed JSON / TS file or inlines the literal.** A
  separate `madrona-demo-game.json` (or `.ts`) makes the
  content reviewable as a structured artifact; an inline
  literal in the script reduces file count. Plan-drafting
  resolved to **typed TS module + dynamic import**: per-event
  content lives in
  `shared/events/madrona-demo-game-content.ts` exporting
  `seedConfig: GameSeedConfig`, and the generic script loads
  it via dynamic `import()` under Node 24's native
  type-stripping. The TS path keeps content type-safe at lint
  time without a separate build step.
- **Exact capture set count and final selection.** Working set
  is 6 in-app + 1 optional cross-app per Decision 7. Plan-time
  decision based on which captures actually land coherent
  match-assertion sentences and which feel redundant.
- **Whether the agent-assignment SQL is committed as a
  re-runnable file under `supabase/seeds/` or
  `scripts/release/` (or kept inline in the plan only).**
  Constraint: replayability matters for environment refresh,
  but the agent assignment is per-environment-per-user and
  hand-coded against a `auth.users.id`, so a generic
  file might not be helpful. Plan owns the call.
- **Phase Status seeding shape on the milestone doc.** Phase
  2.1's PR seeds the row "Plan-pending" → "In-flight" → "Landed"
  per AGENTS.md milestone-doc Phase Status conventions. Plan
  owns the exact wording.

## Plan-Structure Handoff

The plan doc covers:

- **Status** — `In draft` until inputs settle (every input
  named in this scoping doc as "settled" must be live in the
  plan), then `Proposed`, then `Landed`.
- **Context** — restated phase intent at implementation time,
  scoped to what merged code looks like at phase-start.
- **Goal** — the bulleted post-PR state, mirroring the
  milestone doc's "After M2:" but at phase 2.1's resolution
  (script committed, agent assigned, journey verified).
- **Cross-Cutting Invariants** — bind the four epic-level + the
  five M2 milestone-level invariants by reference, plus any
  phase-level rule the plan adds.
- **Files Touched** — script path, plan / scoping doc paths,
  milestone-doc updates, possibly a committed agent-assignment
  SQL file or `madrona-demo-game.json` content file (deferred
  to plan-time).
- **Implementation Steps** — script authoring, runbook
  drafting, execution against production, agent-role SQL
  execution, journey walkthrough, capture, PR body assembly,
  closure-doc updates.
- **Validation Gate** — `npm run lint`, `npm run build:web`,
  the journey walkthrough captures, the testEvent-grep audit,
  and any other phase-specific check.
- **Self-Review Audits** — every milestone invariant's audit;
  the testEvent-grep audit; the `noindex`-posture audit; the
  cross-app theme-continuity audit.
- **Risk Register** — phase-level risks; the milestone-level
  risks are inherited by reference, not restated.
- **Documentation Currency PR Gate** — milestone-doc Phase
  Status update; epic Sizing Summary M2 reconciliation;
  whatever doc-currency the phase surfaces.
- **Backlog Impact** — the operations.md follow-up if manual
  agent assignment recurs; any other follow-ups surfaced by
  phase-time grep.
- **Related Docs** — milestone doc, epic, prior phases,
  relevant migrations, AGENTS.md.

## Reality-Check Inputs The Plan Must Verify

Reality checks the plan doc re-runs at plan-drafting time
against merged code, not at scoping time:

- **`isTestEventSlug` / `testEvent` grep over apps/web/src and
  shared/.** Re-confirms the three known sites; surfaces any
  new site introduced after the milestone-session snapshot.
- **`scripts/` directory structure.** Re-confirms
  `scripts/testing/` vs `scripts/release/` convention against
  the phase-start state; picks the script's home accordingly.
- **`docs/operations.md` shape.** Re-confirms the doc's
  current scope and decides whether the manual agent-assignment
  command is a fit (Decision 8 default is "no, inline in plan").
- **`event_role_assignments` schema and constraints.** The
  agent-assignment SQL runbook entry must produce the right
  row shape; the plan-time check confirms `event_id`, `user_id`,
  `role` columns and any `created_at`/`updated_at` defaults.
- **`game_event_drafts` schema.** The script's INSERT must
  produce a valid row; plan-time check confirms required
  columns (`id`, `slug`, `event_code`, `name`, `schema_version`,
  `content`, ...).
- **`createStarterDraftContent` / `AuthoringGameDraftContent`
  shape.** The script's content literal must conform; plan-time
  type check during script authoring is the proof.
- **Demo-mode banner / disclaimer copy on the apps/web
  surfaces under non-test slug.** The journey walkthrough
  exercises every page; if any surface accidentally shows
  test-event-only copy under Madrona, that's an invariant
  break the plan must catch and fix in the same PR.
- **`event_code` collision.** The `publish_game_event_draft`
  RPC checks for `slug` collision but the `event_code` is
  `unique` constraint-bound. The script must generate or
  receive an `event_code` that doesn't collide with existing
  events. Plan-time check: pick a 3-character code, grep
  `event_code` values in production via a service-role
  read or accept the rare-collision risk and let the publish
  fail loudly.
- **The script's safety story.** Running against production
  Supabase from a developer machine is the operational shape;
  the script must guard against accidental wrong-environment
  runs (env-var assertion, prompt-to-confirm, or environment
  echo-check). Plan owns the safety pattern.

## Related Docs

- [`docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md`](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
  — milestone doc.
- [`docs/plans/epics/madrona-demo-build/epic.md`](/docs/plans/epics/madrona-demo-build/epic.md)
  — parent epic.
- [`docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
  — sibling phase plan; canonical reference for the capture-pair
  shape and Theme-foundation precedent.
- [`docs/plans/archive/database-backed-quiz-content.md`](/docs/plans/archive/database-backed-quiz-content.md)
  — published-content schema and PostgREST read path.
- [`docs/plans/archive/quiz-authoring-plan.md`](/docs/plans/archive/quiz-authoring-plan.md)
  — quiz authoring flow context (the path the script bypasses
  by using service_role).
- [`docs/plans/archive/reward-redemption-phase-a-1-plan.md`](/docs/plans/archive/reward-redemption-phase-a-1-plan.md)
  — `event_role_assignments` table introduction.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, Plan
  content rules, Estimate Deviations, Plan-to-PR Completion
  Gate.
