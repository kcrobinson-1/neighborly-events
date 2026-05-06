# M2 phase 2.1 — Placeholder Madrona game content + agent assignment + end-to-end journey

## Status

`Landed` 2026-05-06. See `## Estimate Deviations` below for the
substrate / close-out split rationale; the close-out attached
the six attendee-journey captures, flipped this and the M2
milestone doc's top-level status, deleted the scoping doc per
the milestone-doc batch-deletion commitment, and reconciled the
epic's Sizing Summary M2 line against actuals.

## Context

This phase ships the wiring that lets a stakeholder visit
`/event/madrona` and walk the full attendee journey end-to-end
against placeholder game content. M1 (phases 1.1 + 1.2) landed
the Madrona Theme, the `EventContent` shape extensions, and the
apps/site landing surface; until phase 2.1 lands, `/event/madrona/game`
resolves to an `unavailable` state because no published `game_events`
row carries `slug = 'madrona'`. After phase 2.1, the demo URL plays
through to the redeem booth handoff and an organizer can monitor the
redemption from the dashboard.

The phase is largely **operational** rather than **engineering**:
the gameplay, completion, redemption, and monitoring code paths
are already event-scoped (not test-event-scoped), so the only
code added is a service-role script that authors a Madrona draft
and publishes it via the canonical
`publish_game_event_draft(text, uuid)` RPC. Manual SQL adds an
`event_role_assignments.role = 'agent'` row for Madrona to
exercise the agent-role authorization branch on the redeem
surface (rather than silently leaning on the root-admin
fallthrough). The journey itself is recorded as PNG capture
pairs attached to the PR body.

The deliberation behind the calls below — service-role script
vs. admin-UI flow, single-PR vs. 2.2 split, agent identity
choice, organizer deferral, environment, capture-set shape,
question count and flavor, runbook home, and grep regression
check — lived in `scoping/m2-phase-2-1.md`, which deleted in
this phase's close-out (2026-05-06) per the milestone doc's
batch-deletion-at-terminal-PR commitment. The durable contract
derived from those nine settled-at-scoping decisions is the
content of this plan doc; the deliberation prose with rejected
alternatives and reality-check inputs is intentionally not
preserved past the milestone, matching how phase 2.1's M1
siblings were closed out.

## Goal

After this PR:

- a generic service-role seed script ships at
  [`scripts/release/seed-game-content.cjs`](/scripts/release/seed-game-content.cjs)
  that, given `TEST_SUPABASE_URL`, `TEST_SUPABASE_SERVICE_ROLE_KEY`,
  `GAME_SEED_PUBLISHED_BY_USER_ID`, and `--content <path>`,
  idempotently upserts the seeded draft row in `game_event_drafts`
  and invokes `publish_game_event_draft($content_id, $user_id)`.
  The script is event-agnostic: any future event seed adds one
  new module that exports `seedConfig: GameSeedConfig` and
  re-uses the same script;
- a `GameSeedConfig` type lives at
  [`shared/events/seed-config.ts`](/shared/events/seed-config.ts):
  `{ eventCode: string; content: AuthoringGameDraftContent }`. The
  `eventCode` peer field is on the wrapper because it lives on
  `game_event_drafts` / `game_events` directly rather than inside
  the `content` JSON;
- the Madrona placeholder content + event_code lives at
  [`shared/events/madrona-demo-game-content.ts`](/shared/events/madrona-demo-game-content.ts)
  as a `seedConfig: GameSeedConfig` export (re-exported from
  [`shared/events/index.ts`](/shared/events/index.ts) under the
  type-stable name `madronaDemoSeedConfig`). The wrapped content
  carries six music-and-neighborhood-themed questions, three to
  four options each, one correct option per question, with
  explanations and sponsor-fact strings populated for feedback
  richness;
- `npm run release:seed:madrona` is an alias that invokes the
  generic script with `--content shared/events/madrona-demo-game-content.ts`;
- the script has been executed against production Supabase
  (per the runbook below), and a
  `select slug, name, published_at from public.game_events where slug = 'madrona';`
  query confirms the row exists with a recent `published_at`;
- a manual SQL `INSERT` has assigned the active root-admin's
  `auth.users.id` an `event_role_assignments` row with
  `role = 'agent'` for `event_id = 'madrona'`, exercising the
  per-event agent-role branch on the redeem surface;
- the end-to-end journey has been walked on the deployed demo
  URL (PR Vercel preview against production Supabase): landing
  → game intro → mid-game answer → completion screen with
  verification code → agent keypad → redeem submit → redeemed
  state → organizer redemptions monitoring page showing the
  just-redeemed entitlement;
- six captures from the walkthrough are attached to the PR
  body's `## Validation` section with one-sentence match-
  assertion prose per capture;
- the M2 milestone doc's Phase Status row 2.1 is seeded as
  `In flight` in the substrate PR; the row flips to `Landed`
  in the close-out PR alongside the top-level milestone
  Status `Proposed` → `Landed across PR #<substrate> + PR
  #<close-out>` flip and the scoping doc deletion. Row 2.2
  stays `Collapsed into 2.1` (the closure work the scoping
  doc collapsed is what the close-out PR carries);
- the parent epic's Sizing Summary M2 line records the
  resulting 2-PR shape per AGENTS.md "Estimate Deviations" —
  estimated 1–2 PRs, actual 2 PRs (substrate + close-out),
  within range. Rationale for the substrate / close-out
  split lives in this plan's Estimate Deviations section.

This phase does **not** add an admin-UI "Create New Event"
affordance (deferred to a future phase or epic), does **not**
assign an organizer role for Madrona (deferred per scoping
Decision 4 — root-admin bypass covers redemptions monitoring),
does **not** ship real Madrona band/sponsor/question content
(M3's scope), does **not** modify `apps/site/events/madrona.ts`
or `EventContent` shape (M1 already settled both), does **not**
introduce demo-mode auth bypass for `slug=madrona` (epic
invariant 3 forbids), and does **not** flip `noindex` posture
on any Madrona surface (epic Risk Register binding from M1
onward).

## Cross-Cutting Invariants

This phase binds the four parent-epic invariants and the five
M2 milestone-level invariants verbatim by reference; self-review
walks each against this PR's diff:

- **Four epic-level invariants** from
  [docs/plans/epics/madrona-demo-build/epic.md:143-185](/docs/plans/epics/madrona-demo-build/epic.md):
  no foreclosure of '27 native series; no foreclosure of
  donation/feedback child epics; Madrona is not a test event;
  every `EventContent` consumer renders gracefully when new
  band/sponsor fields are absent.
- **Five M2 milestone-level invariants** from
  [m2-stubbed-attendee-journey.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md):
  end-to-end journey is the load-bearing falsifier; every
  test-event-only branch asserted unfired for `slug=madrona`;
  cross-app theme-continuity capture covers all four
  Madrona-themed surfaces; `noindex` posture preserved across
  every surface; placeholder content is content-neutral with
  respect to M3.

The plan adds one phase-level rule worth recording for
self-review:

- **Service-role script's safety contract.** The script
  refuses to run if `TEST_SUPABASE_URL` is unset or doesn't
  start with `https://`, refuses if `GAME_SEED_PUBLISHED_BY_USER_ID`
  is not a valid UUID, asserts the loaded `seedConfig` shape
  (eventCode + content), and echoes the resolved `event_id`,
  `slug`, `event_code`, and `TEST_SUPABASE_URL` host before
  performing any write. This guards the production-edit shape
  per scoping Decision 5's risk story.

## Naming

- **Generic script path** — `scripts/release/seed-game-content.cjs`.
  Reasoning: the `scripts/release/` directory currently holds
  one file (`post-merge-smoke-watch.cjs`) for release-phase
  tooling; the seed script is one-time-per-event release
  setup, closer in shape to release tooling than to the
  smoke-test scripts under `scripts/testing/`. The `.cjs`
  extension matches the existing scripts. The script is
  event-agnostic — it takes `--content <path>` so any future
  event seed re-uses it.
- **Type module path** — `shared/events/seed-config.ts`,
  exporting the `GameSeedConfig` type.
- **Madrona seed module path** —
  `shared/events/madrona-demo-game-content.ts`. Reasoning: the
  `shared/events/` directory already houses
  `draftCreation.ts`, `published.ts`, and other event-shaped
  helpers; an exported `seedConfig: GameSeedConfig` (with
  `eventCode + content` wrapper) fits there. The filename
  remains Madrona-specific because the data is Madrona-specific;
  generic naming would obscure the per-event uniqueness.
- **Module exports** — the seed module exports `seedConfig`
  (the canonical name the generic script imports). The
  package re-export at `shared/events/index.ts` aliases this
  to `madronaDemoSeedConfig` for type-safe consumers that
  want the more specific name. Future event seed modules
  follow the same pattern: each module exports a local
  `seedConfig`; the index re-exports under an event-specific
  alias.
- **Game `id` and `slug`** — both `"madrona"` (matches the
  apps/site content registry key and the `themeSlug` field).
  These come from `seedConfig.content.id` / `.slug`, not
  hardcoded in the script.
- **Game `event_code`** — `"MAD"` (3-character uppercase, the
  canonical shape per
  [migration 20260418030000_add_event_code_columns.sql](/supabase/migrations/20260418030000_add_event_code_columns.sql)).
  Lives at `seedConfig.eventCode`; the script asserts no
  existing event already holds this code (a SELECT against
  `game_events` and `game_event_drafts` before INSERT);
  collision aborts with a clear error.
- **npm script alias** — `release:seed:madrona` invokes the
  generic script with `--content shared/events/madrona-demo-game-content.ts`.
  Future events add their own alias if frequent invocation is
  expected; one-off seeds run the script directly.
- **Agent assignment SQL** — recorded inline in the
  `## Runbook` section below; the assignment is one row per
  identity, idempotent via `ON CONFLICT (event_id, user_id, role) DO NOTHING`.

## Files Touched

| File | Change shape |
| --- | --- |
| `scripts/release/seed-game-content.cjs` | New file. Generic service-role Node script (`--content <path>`). |
| `shared/events/seed-config.ts` | New file. `GameSeedConfig` type definition. |
| `shared/events/madrona-demo-game-content.ts` | New file. Madrona placeholder `seedConfig: GameSeedConfig` (eventCode + content wrapper) with the six placeholder questions. |
| `shared/events/index.ts` | Re-exports `GameSeedConfig` (type) and `madronaDemoSeedConfig` (alias for `seedConfig` from the Madrona module). |
| `package.json` | `release:seed:madrona` alias that invokes the generic script with `--content shared/events/madrona-demo-game-content.ts`. |
| `docs/plans/epics/madrona-demo-build/m2-phase-2-1-plan.md` | This file. |
| `docs/plans/epics/madrona-demo-build/scoping/m2-phase-2-1.md` | New scoping doc (drafted in the substrate PR; deleted in the close-out PR per the milestone-doc batch-deletion commitment). |
| `docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md` | Phase Status row 2.1 seeded as `In flight` in the substrate PR; flipped to `Landed` plus top-level Status flip in the close-out PR. Row 2.2 stays `Collapsed into 2.1` throughout. |
| `docs/plans/epics/madrona-demo-build/epic.md` | Sizing Summary M2 line reconciled in the close-out PR (estimated 1–2 PRs, actual 2 PRs — substrate + close-out). |

Files **intentionally not touched** (per AGENTS.md "Plan
content is a mix of rules and estimates"; touching one of
these is allowed if structural reasoning supports it, but
self-review must explain):

- `apps/site/events/madrona.ts` — M1 phase 1.1 settled the
  module shape; phase 2.1 is gameplay wiring, not content
  authoring on the landing page.
- `apps/site/lib/eventContent.ts` — `EventContent` shape was
  finalized for M1 in phase 1.2; M2 introduces no new fields.
- `shared/styles/themes/madrona.ts`,
  `shared/styles/themes/index.ts`,
  `shared/styles/getThemeForSlug.ts` — Theme registry settled
  in M1 phase 1.1.
- `apps/web/src/App.tsx` — ThemeScope wraps inherited from
  demo-expansion epic M1 phase 1.1 already cover all four
  event-route shells.
- `apps/web/src/pages/EventAdminPage.tsx`,
  `apps/web/src/pages/EventRedeemPage.tsx`,
  `apps/web/src/pages/EventRedemptionsPage.tsx` — the three
  test-event-only branches must remain in place; phase 2.1
  asserts them unfired for Madrona, not removes them.
- `shared/events/testEventAllowlist.ts` — Madrona is not a
  test event; epic invariant 3 forbids adding it.
- `supabase/migrations/` — phase 2.1 introduces no schema
  change.
- `apps/web/src/admin/` — no admin-UI authoring change; the
  service-role script bypasses the missing "Create New Event"
  UI by writing through service_role per scoping Decision 1.

## Contracts

### Script CLI + env-var contract

CLI argument:

- `--content <path>` — path to a TypeScript module that exports
  `seedConfig: GameSeedConfig`. Resolved relative to
  `process.cwd()`. Missing or unresolved path aborts.

Env vars (all required, asserted at startup before any DB
write):

- `TEST_SUPABASE_URL` — Supabase URL, must start `https://`.
- `TEST_SUPABASE_SERVICE_ROLE_KEY` — service-role JWT.
- `GAME_SEED_PUBLISHED_BY_USER_ID` — `auth.users.id` UUID of
  the actor recorded as `published_by` in
  `game_event_versions` and the audit log; must match the
  active root-admin's user ID.

Missing or malformed env vars cause the script to exit
non-zero before any DB write.

The script echoes
`Resolving seed for event_id="<id>" slug="<slug>" event_code="<code>" against <host>`
(host extracted from `TEST_SUPABASE_URL`, identity fields from
the loaded `seedConfig`) before any write, giving the operator
a final visual check that they're pointed at the intended
environment with the intended seed.

### Script behavior contract

1. Dynamic-import the module at `--content <path>` and assert
   the `seedConfig` export conforms to `GameSeedConfig`:
   `eventCode` is a 3-character uppercase string, `content.id` /
   `content.slug` / `content.name` are non-empty strings.
   Bind `eventId = content.id`, `slug = content.slug`, and
   `eventCode = seedConfig.eventCode` for the rest of the run.
2. SELECT existing `event_code` values from `game_events` and
   `game_event_drafts`, asserting `eventCode` is not held by
   any row whose `id`/`slug` differs from the seed's. Abort if
   collision; succeed if held by an existing seed-match row
   (idempotent re-run path).
3. UPSERT the `game_event_drafts` row keyed on `id = eventId`:
   `slug`, `event_code = eventCode`, `name = content.name`,
   `schema_version`, `content` JSONB. ON CONFLICT updates
   `content`, `name`, and any other shape that changed.
4. Invoke `publish_game_event_draft(eventId, $user_id)` via
   PostgREST RPC. Log the returned
   `(event_id, slug, version_number, published_at)` row.
5. Re-SELECT the published row from `game_events` and the
   first question from `game_questions` for the seed's
   `event_id`, asserting both are present. Exit zero on
   success, non-zero on any of: missing `seedConfig` export,
   schema-shape failure, collision, RPC error, identity-check
   failure, or missing post-publish row.

### Placeholder content contract

`shared/events/madrona-demo-game-content.ts` exports
`seedConfig: GameSeedConfig` (re-exported from
`shared/events/index.ts` as `madronaDemoSeedConfig`):

- `eventCode: "MAD"` (3-character uppercase).
- `content`: an `AuthoringGameDraftContent` literal with the
  fields below.
  - `id: "madrona"`, `slug: "madrona"`, `name: "Madrona Music
    in the Playfield"` (matches `apps/site/events/madrona.ts`'s
    `hero.name`).
  - `feedbackMode: "final_score_reveal"`,
    `allowBackNavigation: true`, `allowRetake: true`.
  - `estimatedMinutes: 2`, `entitlementLabel: "reward ticket"`.
  - `intro: "..."`, `summary: "..."`, `location: "Madrona
    Playfield, Seattle"`. Copy is concise stakeholder-honest
    prose, not marketing.
  - `questions[]` carries six entries. Each:
    - `id: "q1"` through `"q6"`.
    - `prompt`: music-and-neighborhood-themed neutral content
      (no real Madrona band, sponsor, or specific historical
      fact named — invariant 5 binds).
    - `selectionMode: "single"`.
    - `options[]`: 3–4 entries each with `id` and `label`.
    - `correctAnswerIds[]`: exactly one entry.
    - `explanation`: one sentence, present on every question.
    - `sponsorFact`: one sentence with a placeholder sponsor
      attribution; present on every question for feedback
      richness.
    - `sponsor`: one of three placeholder sponsor names rotated
      across the six questions (matching the placeholder
      sponsor list in `apps/site/events/madrona.ts`'s
      `sponsors[]`).

The validator
[`validateAuthoringGameDraftContent`](/shared/game-config/draft-content.ts)
gets exercised at module-load time during the script run; any
validation error aborts before the DB write.

### Agent-assignment SQL contract

One INSERT, run by hand in Supabase Studio (or via
`psql` / `supabase db query` against the production database)
using the operator's root-admin credentials:

```sql
INSERT INTO public.event_role_assignments (event_id, user_id, role)
VALUES ('madrona', '<root-admin auth.users.id UUID>', 'agent')
ON CONFLICT (event_id, user_id, role) DO NOTHING;
```

The `(event_id, user_id, role)` triple is the unique
constraint per
[migration 20260421000100_add_event_role_assignments.sql](/supabase/migrations/20260421000100_add_event_role_assignments.sql);
the ON CONFLICT clause makes re-runs idempotent.

The same `<root-admin auth.users.id UUID>` is the value
passed to `GAME_SEED_PUBLISHED_BY_USER_ID` for the script run,
so the operator looks up the UUID once and uses it twice.

## Implementation Steps

1. **Define the `GameSeedConfig` type.** Create
   `shared/events/seed-config.ts` with the
   `{ eventCode: string; content: AuthoringGameDraftContent }`
   shape and a header docstring naming the generic seed
   script as the consumer.
2. **Author the Madrona seed module.** Create
   `shared/events/madrona-demo-game-content.ts` with the
   typed content literal and an exported
   `seedConfig: GameSeedConfig` (eventCode `"MAD"` + content).
   Re-export at `shared/events/index.ts` as
   `madronaDemoSeedConfig`. Run `npm run lint` to confirm the
   type checks; field-shape errors surface at this step.
3. **Author the generic seed script.** Create
   `scripts/release/seed-game-content.cjs` per the contracts
   above. The script uses dynamic `import()` of the TS
   content module, which works under Node 24's native
   type-stripping. If the operator's environment does not
   strip types as expected, the plan's fallback is to inline
   the content as JSON in a sibling `.json` file alongside
   the `.ts` module and have the script accept either —
   recorded as Estimate Deviation if exercised.
4. **Wire the npm alias.** Add `release:seed:madrona` to
   `package.json` invoking the generic script with
   `--content shared/events/madrona-demo-game-content.ts`.
5. **Local dry-run.** Optional but recommended: point the
   script at a local Supabase instance (per
   `scripts/testing/setup-local-testing.cjs`) and verify the
   round-trip: draft INSERT, RPC call, published row read.
6. **Production execution (operator step, not in this PR's
   diff).** With the operator's root-admin
   `GAME_SEED_PUBLISHED_BY_USER_ID` env var, the production
   `TEST_SUPABASE_URL`, and the production
   `TEST_SUPABASE_SERVICE_ROLE_KEY`, run
   `npm run release:seed:madrona`. Confirm the post-publish
   SELECT shows the expected row.
5. **Agent-assignment SQL execution (operator step).** Run
   the INSERT from the contract above. Confirm via
   `select * from event_role_assignments where event_id = 'madrona'`.
6. **Journey walkthrough.** Sign in to the PR's Vercel
   preview as the root-admin-with-agent-role identity. Walk
   `/event/madrona` → `/event/madrona/game` → answer through
   to completion → see the verification code → navigate to
   `/event/madrona/game/redeem` → enter the verification
   code → see the redeemed-state confirmation → navigate to
   `/event/madrona/game/redemptions` → confirm the
   just-redeemed entitlement is listed with correct
   `redeemed_by_role` and `redeemed_at`. Capture each state
   per the capture set below.
7. **Capture pair generation.** Use
   [`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs)
   pointed at the PR preview origin, walking each journey
   state explicitly, or capture each state by hand if the
   script's path-walking doesn't naturally cover the
   completion → redeem → redeemed sequence. Save PNGs into
   `tmp/ui-review/<timestamp>/` and attach to the PR body.
8. **Doc-currency closure.** Update the milestone doc Phase
   Status table (row 2.1 → Landed, row 2.2 → Collapsed),
   flip the milestone doc Status to Landed, reconcile the
   epic Sizing Summary M2 line per Estimate Deviations, and
   delete the milestone's transient scoping docs (the
   `scoping/m1-phase-1-1.md` and `scoping/m1-phase-1-2.md`
   were already deleted in the M1 close-out (landed 2026-05-05),
   so the only
   transient doc deleting now is `scoping/m2-phase-2-1.md`).
9. **PR-body assembly.** Per the 10-section template, including
   the validation captures inline in the `## Validation` section
   with match-assertion sentences.

## Validation

- [ ] `npm run lint` — confirms `madrona-demo-game-content.ts`
      type-checks and the script's `.cjs` lints clean.
- [ ] `npm run build:web` — confirms the apps/web SPA still
      builds (no regression from the shared/events module
      change).
- [ ] `npm test` — runs the vitest suites; expected zero
      regressions (no apps/web or shared logic changes
      beyond the new module).
- [ ] `npm run test:functions` — runs Deno function tests if
      relevant; expected zero regressions.
- [ ] **Script smoke**: `npm run release:seed:madrona`
      against a local Supabase instance succeeds and the
      round-trip read confirms the row.
- [ ] **Production seed**: the script run against production
      Supabase succeeds; `select slug, name, published_at
      from public.game_events where slug = 'madrona'`
      returns the expected row.
- [ ] **Agent assignment**: the INSERT runs cleanly;
      `select * from event_role_assignments where event_id = 'madrona'`
      shows the row.
- [ ] **End-to-end journey walkthrough**: every state
      below renders coherently on the PR preview origin,
      with captures attached.
- [ ] **Capture set** in PR body, with match-assertion
      sentences per pair:
  1. `/event/madrona/game` intro screen — Madrona Theme
     applies; intro and CTA legible.
  2. Mid-game question screen — Madrona palette on
     question card and option chips; no warm-cream visible.
  3. Completion screen — verification code displayed
     clearly; Madrona Theme applies.
  4. `/event/madrona/game/redeem` keypad — agent
     authorized; keypad chrome under Madrona Theme.
  5. Redeem confirmation — redeemed state visible;
     entitlement label correct.
  6. `/event/madrona/game/redemptions` listing —
     just-redeemed entitlement shown with correct
     `redeemed_by_role` and `redeemed_at`.
- [ ] **noindex preservation**: `curl -sI <preview>/event/madrona`
      shows `x-robots-tag: noindex` (or apps/site's
      `<meta name="robots" content="noindex">` is in the
      rendered HTML); `curl -sI <preview>/event/madrona/game`
      shows the apps/web `x-robots-tag` header is present.

## Self-Review Audits

Per AGENTS.md, the audits below correspond to named entries in
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
phase-time grep re-confirms the audit name registry against
the merged code state.

- **Epic invariant 1: '27 native-series foreclosure.** The
  draft / published row is single-event keyed (no series
  field, no `madrona-2026` vs `madrona-2027` shape); the
  agent assignment is event-scoped via `event_role_assignments`
  per migration 20260421000100. Walk the diff for any
  series-shaped field name; expected: none.
- **Epic invariant 2: donation/feedback child-epic
  foreclosure.** The placeholder question content is reviewed
  for prompts/options/explanations/sponsor-fact strings that
  would constrain donation or feedback child-epic shape.
  Walk each of the six questions for: implicit donation CTA
  framing, implicit feedback-survey followup framing,
  sponsor-fact strings that imply the sponsor donates or
  surveys.
- **Epic invariant 3: Madrona is not a test event.** Grep
  diff for `testEvent`, `TEST_EVENT_SLUGS`, `isTestEventSlug`;
  expected: zero references in this PR's added files.
  `apps/site/events/madrona.ts` and
  `shared/events/testEventAllowlist.ts` confirmed unchanged.
- **Epic invariant 4: every `EventContent` consumer renders
  gracefully when new band/sponsor fields are absent.** No
  `EventContent` change in this PR; reaffirmed by inspection.
- **M2 invariant: end-to-end journey is the load-bearing
  falsifier.** Captured walkthrough exercises every leg.
- **M2 invariant: every test-event-only branch asserted
  unfired for `slug=madrona`.** Phase-time grep:
  `rg "isTestEventSlug|testEvent" apps/web/src shared/`.
  Compare hits against the milestone doc's three known sites
  (EventAdminPage, EventRedeemPage, EventRedemptionsPage).
  Any new site requires either an unfired-for-Madrona
  assertion via the journey walkthrough, or a follow-up
  filing.
- **M2 invariant: cross-app theme-continuity covers all
  four Madrona-themed surfaces.** Capture set demonstrates
  game / redeem / redemptions under Madrona Theme; the
  apps/site `/event/madrona` capture from M1 phase 1.1 plus
  the M2 captures together cover the four surfaces. Plan-time
  decision: optionally add a single inline cross-app pair if
  visual evidence of cross-app continuity under journey load
  is judged useful (not strictly required).
- **M2 invariant: `noindex` posture preserved across every
  surface.** `curl` checks against the PR preview confirm
  apps/site `<meta>` and apps/web `X-Robots-Tag`.
- **M2 invariant: placeholder content is content-neutral
  with respect to M3.** Each placeholder question and
  prompt walked against "would M3's real authoring need to
  delete or rewrite this for narrative-fit reasons, beyond
  simple content swap?" Expected: no.
- **Service-role script safety contract.** The script's env
  var assertions and host echo ran during the production
  execution; the operator's runlog is recorded in the PR
  body or as a hidden comment.
- **Token-classification bucket integrity for
  `/event/madrona*` apps/web surfaces.** Captures inspected
  for any warm-cream-leaking surface (a hard-coded color or
  wrong-bucket token that defeats the Madrona Theme). One-
  line corrections ship in this PR per
  demo-expansion-epic-M1-phase-1.1 precedent; rule-shape
  ripples surface as backlog with rationale.

## Risk Register

Phase-level risks. Milestone-level risks live in
[m2-stubbed-attendee-journey.md §Cross-Phase Risks](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
and are inherited by reference, not restated.

- **Service-role script wipes wrong-environment data.**
  The script runs against whatever `TEST_SUPABASE_URL`
  points at; an operator with a misconfigured shell could
  point at the wrong Supabase project. Mitigation: the
  script's safety contract above (URL must be `https://`,
  host echoed before any write, optional confirmation
  prompt). The script does not DELETE; the worst-case
  outcome is an unwanted `madrona`-keyed draft / event
  row in a wrong project, which is recoverable.
- **`event_code = "MAD"` collision.** Another existing event
  may already hold this 3-char code. Mitigation: the script's
  pre-INSERT collision check aborts with a clear error; if
  collision happens, the operator picks a different code
  (e.g., `"MUS"`, `"MDR"`) and the plan-doc records the
  Estimate Deviation in the PR.
- **Placeholder content authoring drift.** A reviewer
  surfaces that one of the six questions over-references
  Madrona-specifics or under-references music. Mitigation:
  invariant 5 audit during self-review; rephrasing in the
  same PR is cheap.
- **Production journey walkthrough discovers a non-test-event
  bug.** A code path that worked for `harvest-block-party` /
  `riverside-jam` (test events) breaks for Madrona because
  of an unmapped test-event-only assumption. Mitigation:
  the testEvent-grep audit catches the expected sites; an
  unexpected site that surfaces during the walkthrough
  becomes either a same-PR fix (if narrow) or a follow-up
  filing with the journey-walkthrough capture as the
  load-bearing evidence.
- **Vercel preview build-id drift between apps/site and
  apps/web during cross-app capture.** The capture-pair
  freshness check inspects build-id metadata or capture
  timestamps within N minutes of the latest deploys.
  Mitigation: time the captures inside a single 5-minute
  window; record the build IDs in the PR body's
  validation prose.
- **Agent-assignment SQL fat-fingered.** The wrong UUID
  could be inserted, breaking the journey's redeem step.
  Mitigation: the SELECT verification step in the runbook;
  the wrong UUID surfaces as a redeem failure with a
  clear "you don't have permission" message during the
  walkthrough.
- **Script's content-module import shape forces a build
  step.** Node's `.cjs` cannot directly import `.ts`; the
  plan's default is to use Node's
  `--experimental-strip-types` flag (Node 22+) or to inline
  the content as JSON in the script. If neither path is
  ergonomic, the plan ships the content as a `.json` file
  alongside the `.ts` typed wrapper. Mitigation: build-step
  call recorded as Estimate Deviation if the simpler
  options don't fit.

## Documentation Currency PR Gate

This phase's PR lands the following doc updates per AGENTS.md
"Documentation Currency PR Gate":

**Substrate PR (this PR):**

- This plan doc — Status `In draft` → `Proposed` (substrate
  landing); flip to `Landed` deferred to the close-out PR.
- [m2-stubbed-attendee-journey.md](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
  — Phase Status row 2.1 seeded as `In flight` with this PR's
  number. Top-level milestone Status stays `Proposed`; row 2.1
  `Landed` flip and the top-level Status flip both move to the
  close-out PR.

**Close-out PR (follow-up):**

- [m2-stubbed-attendee-journey.md](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
  — Phase Status row 2.1 → `Landed` with the close-out PR's
  number; row 2.2 stays `Collapsed into 2.1` (the closure work
  was the collapse target, now in the close-out PR);
  top-level Status `Proposed` → `Landed across PR #<substrate>
  + PR #<close-out>`.
- [epic.md](/docs/plans/epics/madrona-demo-build/epic.md)
  — Sizing Summary M2 line: estimated 1–2 PRs, actual 2 PRs
  (substrate + close-out), within range. The line records 2
  PRs with the substrate / close-out split rationale linking
  to this plan's Estimate Deviations.
- This plan doc — Status `Proposed` → `Landed` in the close-out
  PR.
- `scoping/m2-phase-2-1.md` — deleted in the close-out PR
  (2026-05-06) per the milestone doc's
  batch-deletion-at-terminal-PR commitment. Path retained
  here as a deletion-event marker, not as a link.
- [docs/operations.md](/docs/operations.md) — phase-time
  grep confirms whether the manual agent-assignment SQL
  belongs there. Per scoping Decision 8 the default is
  inline-in-plan (above), with operations.md follow-up
  filed as backlog if recurrence shape emerges.
- [docs/backlog.md](/docs/backlog.md) — backlog entries
  per the Backlog Impact section below.

## Backlog Impact

- **Closed by phase 2.1.** Nothing in
  [`docs/backlog.md`](/docs/backlog.md). M2's capability is
  the milestone's, not a separate backlog item; closure is
  at the M2 milestone-doc Status flip in the close-out PR.
- **Unblocked by phase 2.1.** M3 (real Madrona content
  authoring) inherits the gameplay wiring this phase
  ships; M3 swaps the placeholder content via the same
  `publish_game_event_draft` RPC (or via the future
  admin-UI authoring affordance if it lands first).
- **Opened by phase 2.1** (anticipated; final list lands
  with the implementation):
  - **(Possible) Operations.md runbook cross-reference for
    manual agent assignment.** If a future event surfaces
    the same pattern, move the SQL command from this plan
    to a reusable runbook entry.
  - **(Possible) `scripts/release/` README or pattern
    documentation.** The seed script is the second
    `scripts/release/` artifact; a README that frames the
    directory's purpose may help future contributors.
  - **(Possible) "Create New Event" admin-UI affordance.**
    If M3 or a future Madrona-related phase needs the
    admin UI to author from scratch (not just edit), this
    is the surfaced gap. Phase 2.1 does not file this
    proactively because the gap may not surface again.
  - **(Conditional) Token-classification rule-shape
    follow-up if the journey walkthrough surfaces a
    Madrona-only warm-cream-leaking surface.** Same
    pattern as demo-expansion-epic-M1-phase-1.1's
    derived-shade-cascade spinout.

## Estimate Deviations

- **Single-PR collapse → substrate + close-out split.**
  Scoping-time Decision 2 chose a single-PR shape on the
  rationale that the script alone cannot demonstrate the
  journey works (coupling too tight for the review-coherence
  benefit of splitting). The scoping doc that recorded that
  decision deleted in the close-out per the milestone-doc
  batch-deletion commitment; the inline summary here is the
  rationale's durable form.
  Plan-time and PR-time the call held; the operator-step
  seam is what shifted it. The actual shape splits along the
  natural boundary: the **substrate PR** ships the
  reviewable-by-CI artifacts (plan + script + content + type
  + tests + npm alias + milestone Phase Status `In flight`
  seeding); the **close-out PR** ships the
  operator-produced evidence (script run logs, agent SQL
  confirmation, journey-walkthrough captures), the milestone
  Status `Landed` flip, the scoping doc deletion, and the
  epic Sizing Summary reconciliation. Why the call is right:
  the substrate is independently reviewable + safely
  mergeable (the script does not run at build or runtime, so
  production behavior is unchanged until the operator step
  executes); keeping the substrate PR open while waiting for
  the operator step would block reviewers from verifying the
  reviewable parts. The split matches the M1 close-out
  precedent (landed 2026-05-05;
  [m1-brand-foundation.md `## Status`](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md))
  of substrate-then-close-out and produces a 2-PR
  outcome within the parent epic's M2 Sizing Summary 1–2 PR
  estimate.

## Related Docs

- [`docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md`](/docs/plans/epics/madrona-demo-build/m2-stubbed-attendee-journey.md)
  — milestone doc; Phase Status row 2.1, cross-phase
  invariants, milestone-level risks.
- [`docs/plans/epics/madrona-demo-build/epic.md`](/docs/plans/epics/madrona-demo-build/epic.md)
  — parent epic.
- [`docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
  — M1 phase 1.1 plan; canonical capture-pair shape and
  Theme-foundation precedent.
- [`docs/plans/archive/database-backed-quiz-content.md`](/docs/plans/archive/database-backed-quiz-content.md)
  — published-content schema and PostgREST read path.
- [`docs/plans/archive/quiz-authoring-plan.md`](/docs/plans/archive/quiz-authoring-plan.md)
  — quiz authoring flow context.
- [`docs/plans/archive/reward-redemption-phase-a-1-plan.md`](/docs/plans/archive/reward-redemption-phase-a-1-plan.md)
  — `event_role_assignments` table introduction.
- [`shared/events/published.ts`](/shared/events/published.ts)
  — `loadPublishedGameBySlug` resolver this phase satisfies.
- [`shared/events/draftCreation.ts`](/shared/events/draftCreation.ts)
  — starter-draft factory the placeholder content's shape
  echoes.
- [`shared/game-config/draft-content.ts`](/shared/game-config/draft-content.ts)
  — `AuthoringGameDraftContent` type and validator.
- [`scripts/testing/run-production-redemption-smoke.cjs`](/scripts/testing/run-production-redemption-smoke.cjs)
  — service-role-script env-var precedent.
- [`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs)
  — capture-pair tooling.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — audit-name source.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions,
  Plan-to-PR Completion Gate, Documentation Currency PR
  Gate, "Estimate Deviations," "PR-count predictions need
  a branch test."
