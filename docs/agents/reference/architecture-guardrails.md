# Architecture Guardrails

Stub — content will land in a follow-up commit per
[`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md)
Execution Step 3.

**Mandatory pre-edit read** for any session whose diff surface
intersects `apps/web/`, `apps/site/`, `shared/`, `supabase/`, or
styling — see "Mandatory pre-edit reference reads" in the
restructure plan and the pre-edit-gate routing in
[`workflows/implementation.md`](../workflows/implementation.md).
Despite living under `reference/`, this file is not an optional
lookup; the rules it carries bind before the first edit, not at
PR-open time.

This file will carry: the responsibility split (visual /
interaction in `apps/web/src`; shared styling in
`apps/web/src/styles/`; quiz definitions / catalog / validation /
scoring in `shared/game-config.ts` and `shared/game-config/`;
trust / session / persistence / entitlement in `supabase/`),
no-business-rule-duplication, shared-source-of-truth-for-quiz-
correctness, no-production-fallback-drift (browser-only completion
fallback is dev-only), and the full Styling Token Discipline
(themable per-event brand vs platform-shared structural buckets,
naming, when to add a token vs keep it local, behavior-preserving
token refactors compare compiled CSS). The cross-app
hard-navigation guidance lives in
[`planning/phase.md`](../planning/phase.md) because it binds at
plan-drafting time; this file points at it for implementation-time
discoverability.
