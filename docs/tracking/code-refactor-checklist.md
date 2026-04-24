# Code Refactor Checklist

## Purpose

Track small, non-functional refactor tasks for files that have grown large
enough that splitting them would improve reviewability and local ownership.

Release readiness passes described in
[`docs/plans/release-readiness.md`](../plans/release-readiness.md) feed cleanliness findings
into this file. When that methodology surfaces a new oversized file or
mixed-responsibility module, capture it here under Candidate Tasks rather than
tracking it inside the release readiness doc.

Rules for this checklist:

- keep each task behavior-preserving
- move tests with the code they cover
- run the existing validation command for the touched area
- avoid mixing these cleanups with product or schema behavior changes
- add a task only when the issue was observed while implementing or reviewing
  real work
- name the exact file or module, the concrete responsibility problem, the
  desired target shape, and the minimum validation command
- keep each task small enough for one focused PR
- do not add tasks for cosmetic preferences, speculative abstraction, or general
  cleanup without clear reviewability, correctness, ownership, duplication, or
  future-change-cost value
- styling refactor tasks should prefer semantic tokens, avoid tokenizing one-off
  layout values, and include compiled CSS comparison in validation when practical

## Candidate Tasks

- [ ] Extract shared event-context resolver from the redeem and redemptions
  authorization files. `apps/web/src/redeem/authorizeRedeem.ts` and
  `apps/web/src/redemptions/authorizeRedemptions.ts` share a slug→event
  resolution + boolean role-RPC + retry pattern with only the role RPC
  name differing (`is_agent_for_event` vs `is_organizer_for_event`).
  B.2a parallels the B.1 file deliberately so the extraction can land
  once B.2b introduces a third consumer; at that point, extract a
  `resolveEventContext(slug)` helper that returns
  `{ eventId, eventCode } | { status: "role_gate" } | { status: "transient_error" }`
  plus a tiny `checkRole(eventId, rpcName)` helper, and reshape all
  three consumers to thin compositions. Behavior-preserving. Score:
  5/10.
  Validation: `npm run lint`, `npm test`, and `npm run build:web`.

- [ ] Split reward-redemption operator wrapper pipeline from endpoint-specific payload/RPC seams.
  `supabase/functions/redeem-entitlement/index.ts` and
  `supabase/functions/reverse-entitlement-redemption/index.ts` both own nearly
  the same origin gate, method gate, config gate, bearer-auth check, JSON
  response helper, failure mapping, and RPC result handling. Extract a small
  shared operator-handler pipeline or helper family so future operator
  endpoints do not copy the same boilerplate while preserving the current HTTP
  contract. Score: 6/10.
  Validation: `npm run test:functions` and
  `deno check --no-lock supabase/functions/redeem-entitlement/index.ts supabase/functions/reverse-entitlement-redemption/index.ts`.

- [x] Split authoring draft parsing primitives from draft mapping.
  `shared/game-config/draft-content.ts` contains JSON parsing primitives,
  question/option parsing, draft row types, validation, and draft-to-runtime
  mapping. Move generic JSON expectation helpers and question parsing into
  focused shared modules so `draft-content.ts` reads as the public authoring
  contract. Score: 8/10.
  Validation: `npm test -- tests/shared/game-config/draft-content.test.ts` and
  `npm run build:web`.

- [ ] Split browser game API local fallback from Supabase transport.
  `apps/web/src/lib/gameApi.ts` owns local prototype entitlement storage,
  server-session bootstrap, completion submission, retry handling, and response
  mapping. Extract local fallback storage/completion into a separate module so
  the production Supabase path is easier to review. Score: 8/10.
  Validation: `npm test -- tests/web/lib/gameApi.test.ts` and
  `npm run build:web`.

- [ ] Split admin question editor structure UI from field editing.
  `apps/web/src/admin/AdminQuestionEditor.tsx` now owns the local draft buffer,
  question list controls, delete confirmation, focused question fields, option
  controls, dirty state, and save messages for the Phase 4.4 question builder.
  Extract focused presentation pieces such as `AdminQuestionList` and
  `AdminOptionEditor` so the top-level editor reads as buffer/save
  orchestration. Score: 7/10.
  Validation: `npm test -- tests/web/pages/AdminPage.test.tsx` and
  `npm run build:web`.

- [x] Split admin question structure helpers from question form mapping.
  `apps/web/src/admin/questionBuilder.ts` now owns form-value mapping,
  save-time normalization, id generation, question structure transforms,
  option structure transforms, and correctness repair. Move structure helpers
  into a focused module while preserving the existing public helper behavior.
  Score: 8/10.
  Validation: `npm test -- tests/web/admin/questionBuilder.test.ts` and
  `npm run build:web`.

- [ ] Split selected draft publish/unpublish state from draft loading and save state.
  `apps/web/src/admin/useSelectedDraft.ts` is now one of the largest frontend
  source files. It owns selected draft loading, focused question state, event
  detail saves, question saves, publish state, unpublish confirmation/state,
  draft-list synchronization, and dirty-state bookkeeping. Extract the
  publish/unpublish transition logic into a focused hook or helper so
  `useSelectedDraft.ts` reads as selected draft loading plus save orchestration.
  Score: 7/10.
  Validation: `npm test -- tests/web/pages/AdminPage.test.tsx tests/web/lib/adminGameApi.test.ts` and `npm run build:web`.

- [x] Split admin dashboard orchestration from mutation and selection state.
  `apps/web/src/admin/useAdminDashboard.ts` now owns session bootstrap,
  allowlist checks, draft loading, create, duplicate, event-details saves,
  question saves, publish/unpublish state, and the selected-question focus
  state. Extract the selected-draft and mutation state machines into focused
  hooks so the top-level dashboard reads as auth/loading orchestration rather
  than one long event handler module. Score: 9/10.
  Validation: `npm test -- tests/web/pages/AdminPage.test.tsx tests/web/admin/draftCreation.test.ts tests/web/admin/eventDetails.test.ts tests/web/admin/questionBuilder.test.ts tests/web/lib/adminGameApi.test.ts tests/web/routes.test.ts` and `npm run build:web`.

- [ ] Split admin event workspace presentation from route-level state wiring.
  `apps/web/src/admin/AdminEventWorkspace.tsx` mixes summary counts, selected
  draft orientation, save-state messaging, create/duplicate navigation, and the
  event-details/question-editor composition. Extract smaller presentational
  pieces for the summary card, selected draft header, and action groups so the
  route-level component mainly coordinates layout and callbacks.
  Score: 6/10.
  Validation: `npm test -- tests/web/pages/AdminPage.test.tsx tests/web/admin/draftCreation.test.ts tests/web/admin/eventDetails.test.ts tests/web/admin/questionBuilder.test.ts tests/web/lib/adminGameApi.test.ts tests/web/routes.test.ts` and `npm run build:web`.

- [ ] Split admin authoring API transport from session and draft mapping.
  `apps/web/src/lib/adminGameApi.ts` combines browser session restore, allowlist
  RPC calls, draft reads, function transport, and response mapping for all admin
  mutations. Extract shared transport and response helpers so the public exports
  focus on intent-specific admin operations instead of request plumbing.
  Score: 5/10.
  Validation: `npm test -- tests/web/lib/adminGameApi.test.ts` and `npm run build:web`.

- [ ] Split the admin screenshot runner’s admin mode into dedicated helpers.
  `scripts/ui-review/capture-ui-review.cjs` now mixes attendee capture,
  admin-specific Supabase mocks, admin screenshot sequences, and environment
  loading. Extract the admin mode into focused helper modules so the shared
  runner stays readable and future admin capture changes do not keep inflating
  one 800+ line script.
  Score: 7/10.
  Validation: `npm run ui:review:capture:admin`.

- [ ] Extract shared "Open live game" e2e assertions across admin workflow and production smoke specs.
  `tests/e2e/admin-workflow.admin.spec.ts` and
  `tests/e2e/admin-production-smoke.spec.ts` currently duplicate
  `expectOpenLiveGameDisabledState(...)` logic (aria-disabled + describedby +
  reason text). Move the shared assertion(s) into a focused helper module (for
  example `tests/e2e/helpers/openLiveGame.ts`) so copy changes cannot drift
  across tiers.
  Score: 4/10.
  Validation: `npm run test:e2e:admin`.

- [ ] Rename phase-named pgTAP test files to describe their surface.
  `supabase/tests/database/game_authoring_phase2_auth.test.sql`,
  `game_authoring_phase3_publish_failure_permissions.test.sql`,
  `game_authoring_phase3_publish_projection.test.sql`,
  `game_authoring_phase3_unpublish_audit.test.sql`, and
  `game_authoring_phase5_1_invariants.test.sql` are each named after the
  authoring rollout phase that produced them. Once that planning context ages
  out, the filenames read as noise and require cross-referencing the plan doc
  to know what each file actually tests. Rename to follow the
  `<feature>_<aspect>.test.sql` convention established by
  `event_code_data_model.test.sql`, `redemption_data_model.test.sql`,
  `verification_code_rewrite.test.sql`, and
  `complete_game_and_award_entitlement.test.sql`. Pure rename; no assertion or
  fixture changes. Score: 5/10.
  Validation: `npm run test:db` and a repo-wide grep for each old filename
  (none are expected to be referenced outside the file itself).

## Large Files To Leave Alone For Now

- `supabase/migrations/20260406130000_add_published_quiz_content.sql` is large
  because it includes historical seed data. Do not split an already-applied
  migration just to reduce line count.
- `shared/game-config/sample-games.ts` is mostly explicit sample content. Split
  it only when adding or reorganizing sample fixtures for a concrete reason.
