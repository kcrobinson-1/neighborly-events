# M2 Phase 2.1 — Scoping

## Goal

Broaden Postgres RLS so an authenticated user with an `organizer` row in
`event_role_assignments` for a given event can perform every write that
root-admin can perform on that event's data — including writes to
`event_role_assignments` itself (the staffing table). Extend pgTAP
coverage so each privilege is asserted independently per role
(organizer, agent, root-admin, unrelated-authenticated, anon) per event,
and extend the four authoring Edge Functions plus the shared admin-auth
helper to accept organizer callers in addition to root-admin. The phase
exists in M2 because it is the deliberate resolution of the
"Post-MVP authoring ownership" open question and the precondition for
phase 2.2's per-event admin route shell.

## Inputs From Siblings

Phase 2.1 is the first phase of M2; nothing flows in from sibling M2
phases. From M1 / pre-M2 work already in `main` it consumes:

- `public.is_root_admin()`, `public.is_organizer_for_event(text)`,
  `public.is_agent_for_event(text)` —
  [supabase/migrations/20260421000200_add_event_role_helpers.sql](../../../supabase/migrations/20260421000200_add_event_role_helpers.sql).
  All three take an `event_id text` (the `game_events.id` PK), not a
  slug — the broadening must use that same signature.
- `public.event_role_assignments` table —
  [supabase/migrations/20260421000100_add_event_role_assignments.sql](../../../supabase/migrations/20260421000100_add_event_role_assignments.sql).
  Already the canonical staffing table; phase 2.1 broadens its write
  policies, does not create a new variant.
- `public.is_admin()` — used by the existing authoring Edge Functions
  via [supabase/functions/_shared/admin-auth.ts](../../../supabase/functions/_shared/admin-auth.ts).
  Stays the root-admin check; broadening adds organizer as an OR-branch.

## Outputs Other Siblings Need

- **Lock the broadening predicate.** Every event-scoped write policy uses
  `is_organizer_for_event(event_id) OR is_root_admin()`; agents are not
  granted direct table writes by RLS. Phase 2.2 (per-event admin) names
  this exact predicate in its [Inputs From Siblings](./m2-phase-2-2.md)
  and inherits it verbatim.
- **Lock the Edge Function authorization helper.** A new shared helper
  in `supabase/functions/_shared/` (working name
  `authenticateEventOrganizerOrAdmin(request, eventId, ...)`) returns
  the same `AdminAuthResult` shape as the existing
  `authenticateQuizAdmin`. The four authoring functions (`save-draft`,
  `publish-draft`, `unpublish-event`, `generate-event-code`) migrate
  to it in this phase. Phase 2.2 confirms its per-event admin UI calls
  the existing function transports unchanged (each already passes
  `eventId` in the body), so the helper migration is purely internal.
- **Confirm `event_role_assignments` is the staffing table.** Per the
  epic's open-question resolution and 2.2's "concrete table for
  organizer/agent staffing" input, no new staffing table is
  introduced. Downstream organizer-managed-agent-assignment work
  (post-epic) targets this table.
- **Confirm broadening covers the full set 2.2 expects.** 2.2 names
  five tables that "must accept writes when `is_organizer_for_event`
  returns true": `game_event_drafts`, `game_event_versions`,
  `game_event_audit_log`, `event_role_assignments`, `game_events`.
  2.1 broadens this exact set, plus `game_questions`,
  `game_question_options`, `game_completions`, `game_entitlements`,
  and `game_starts` for completeness across every event-scoped write
  surface (the broader set protects future apps/site organizer
  surfaces from a second broadening migration).
- **pgTAP file naming convention for event-scoped privilege tests.**
  Per AGENTS.md anti-patterns, test files name the surface, not the
  phase: `event_scoped_writes_rls.test.sql`,
  `event_role_assignments_rls.test.sql`. Sibling pgTAP work follows
  the same pattern.

## File Inventory

**SQL** (`supabase/migrations/`):
- create — `supabase/migrations/<YYYYMMDDHHMMSS>_broaden_event_scoped_rls.sql`
  (one migration; broadens write policies on every event-scoped table
  enumerated under "Contracts" below, AND widens the
  `publish_game_event_draft()` and `unpublish_game_event()` RPC
  authorization predicates to accept organizer callers per the
  audit-log/versions write-policy resolution). Date prefix advances
  from `20260423020000_…` per existing convention.

**pgTAP** (`supabase/tests/database/`):
- create — `supabase/tests/database/event_scoped_writes_rls.test.sql`
  (per-table, per-privilege, per-role assertions for the broadened
  policies on `game_events`, `game_questions`, `game_question_options`,
  `game_event_drafts`, `game_event_versions`, `game_event_audit_log`,
  `game_completions`, `game_entitlements`, `game_starts`).
- create — `supabase/tests/database/event_role_assignments_rls.test.sql`
  (per-privilege organizer write coverage for the staffing table; agent
  / unrelated-authenticated / anon denial; cross-event isolation).

**supabase/functions**:
- create — `supabase/functions/_shared/event-organizer-auth.ts`
  (new helper; see Contracts).
- edit — [supabase/functions/_shared/admin-auth.ts](../../../supabase/functions/_shared/admin-auth.ts)
  (no behavior change required if the new helper lives in a sibling
  file; touched only if shared bearer-token reading is extracted).
- edit — [supabase/functions/save-draft/index.ts](../../../supabase/functions/save-draft/index.ts)
  (swap `authenticateQuizAdmin` for the event-organizer-or-admin
  helper; pass draft `id` / `event_id` from the request payload).
- edit — [supabase/functions/publish-draft/index.ts](../../../supabase/functions/publish-draft/index.ts)
  (same swap; payload already carries event identifier).
- edit — [supabase/functions/unpublish-event/index.ts](../../../supabase/functions/unpublish-event/index.ts)
  (same swap).
- edit — [supabase/functions/generate-event-code/index.ts](../../../supabase/functions/generate-event-code/index.ts)
  (same swap).

**docs**:
- edit — [docs/architecture.md](../../architecture.md) "Backend
  Structure" / "What Is Implemented Now" / "Current Backend Surface"
  (organizer write capability and broadened authoring-function gates).
- edit — [docs/plans/event-platform-epic.md](../event-platform-epic.md)
  M2 row → Status flip on landing of M2's final PR (not 2.1's PR; M2's
  Status flips with phase 2.5).
- edit — [docs/open-questions.md](../../open-questions.md) (no entry
  closes in 2.1 specifically — the epic closes the post-MVP authoring
  ownership entry once M2 lands; verify the entry is still open at 2.1
  merge so the closing edit lands in 2.5's terminal PR, not split).

**No changes**: `apps/web`, `apps/site`, `shared/*`, `vercel.json`. The
broadening is a backend-only PR; consumer surfaces (the per-event admin
in 2.2, the platform-admin in 2.4) consume the broadened gates without
needing 2.1 to wire any UI.

## Contracts

**SQL — broadening predicate.** Every event-scoped write policy added
or replaced takes the form
`with check (public.is_organizer_for_event(event_id) OR public.is_root_admin())`
and an equivalent `using (...)` clause for UPDATE / DELETE policies.
Tables whose `event_id` lives behind a join (e.g. draft tables keyed by
`id` text that doubles as the slug, version tables with composite keys)
either expose `event_id` directly via existing column or derive it via
a `select ... from game_events where id = ...` subquery inside the
predicate — preferred form is the direct column to avoid per-row
subqueries.

**SQL — agent write posture.** Agents do **not** receive direct table
writes through this broadening. The redeem path stays mediated by the
existing `redeem_entitlement_by_code(p_event_id, p_code_suffix)`
SECURITY DEFINER RPC at
[supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql](../../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql).
The RPC's gate of `is_agent_for_event(p_event_id) OR is_root_admin()`
is unchanged in 2.1 per the resolved decision to defer organizer-redeem
broadening (see Resolved Decisions).

**SQL — audit-log + versions writes.** Direct INSERT on
`game_event_audit_log` and `game_event_versions` stays
service-role-only. The publish/unpublish path is broadened by widening
the authorization predicates inside
`public.publish_game_event_draft()` and `public.unpublish_game_event()`
from `is_admin()` to `is_admin() OR is_organizer_for_event(...)`.
Audit-log and version rows continue to be written exclusively by those
RPCs, preserving the "rows reflect real state transitions" invariant.
Both RPCs already receive the event identifier as a parameter, so the
predicate widening is a one-line change in each function body; no new
SQL helper is introduced.

**SQL — `event_role_assignments` writes.** The broadening grants
organizers INSERT and DELETE (no UPDATE — UPDATE remains revoked at
the privilege layer per the original migration). DELETE policy mirrors
INSERT; SELECT policy stays as the existing self-or-root-admin policy
(per [supabase/migrations/20260421000500_add_redemption_rls_policies.sql](../../../supabase/migrations/20260421000500_add_redemption_rls_policies.sql))
plus a new branch granting organizers SELECT on assignments for events
they organize, so an organizer can list the agents/organizers they have
assigned.

**Edge Function — shared helper.**
`authenticateEventOrganizerOrAdmin(request, eventId, supabaseUrl, serviceRoleKey, supabaseClientKey) -> Promise<AdminAuthResult>`.
Same `AdminAuthResult` discriminated-union shape as
`authenticateQuizAdmin`. Internally: read bearer token, exchange via
service-role `auth.getUser(token)`, then call the user-scoped client's
`rpc("is_organizer_for_event", { target_event_id: eventId })` and
`rpc("is_root_admin")` (or `is_admin`) and accept on either OR-branch.
The helper does not assume the request payload shape; the caller passes
`eventId` extracted from the validated payload.

**Edge Function — caller migration.** Each of `save-draft`,
`publish-draft`, `unpublish-event`, `generate-event-code` resolves the
target `event_id` from its already-validated payload before calling
the new helper. `save-draft` is the subtle case: the payload is a draft
with `id` (text, doubles as slug). The helper consumes `id` as
`eventId` because the broadening predicate keys on `event_role_assignments.event_id`
which equals `game_events.id` (which equals draft `id`).

## Cross-Cutting Invariants Touched

- **Auth integration.** Edge Functions still authenticate via
  `shared/auth/`-issued JWTs; the new helper reuses the same
  service-role exchange + user-scoped RPC pattern as the existing
  `authenticateQuizAdmin`. No new client construction; no per-app
  duplication.
- **Trust boundary.** Authorization moves further into the database
  (RLS policies plus the SECURITY DEFINER RPC predicates). Application-
  layer gates in Edge Functions stay as defence-in-depth, not as the
  sole enforcement point. Compliant.
- **URL contract.** Not touched; 2.1 is backend-only.
- **Theme route scoping / Deferred ThemeScope wiring.** Not touched.
- **In-place auth.** Not touched (no UI surfaces created).

## Validation Gate

- `npm run lint` — passes (no apps/web or shared TS changed; the lint
  surface includes `supabase/functions/`).
- `deno check --no-lock supabase/functions/save-draft/index.ts`
- `deno check --no-lock supabase/functions/publish-draft/index.ts`
- `deno check --no-lock supabase/functions/unpublish-event/index.ts`
- `deno check --no-lock supabase/functions/generate-event-code/index.ts`
- `deno check --no-lock supabase/functions/_shared/event-organizer-auth.ts`
- `npm run db:reset && npm run db:test` (or the repo's pgTAP runner of
  record per `docs/dev.md`) — full pgTAP suite, including the two new
  files, passes against the Supabase CLI baseline grants (per the
  Privilege-test vacuous-pass audit).
- Manual exercise: with the local Supabase running, assign an
  `organizer` row for a test event to a fixture user, sign that user
  in via magic link, and confirm direct PostgREST writes against
  `game_event_drafts` (one slug they organize, one slug they do not)
  succeed and fail respectively. Repeat for `event_role_assignments`
  INSERT (own event vs. other event).
- `npm run build:web` is not gated on (no web changes), but run as a
  paranoia check that the binding-module `is_admin`-named copy in the
  admin module did not silently regress.

## Self-Review Audits

From [docs/self-review-catalog.md](../../self-review-catalog.md):

**SQL surface:**
- Grant/body contract audit — every `GRANT EXECUTE` or new RLS policy
  must be reachable by every role it advertises. The new helper RPCs
  (none planned beyond the existing `is_organizer_for_event`) and the
  broadened policies must accept actual organizer JWTs end-to-end.
- Privilege-test vacuous-pass audit — the new pgTAP files split per-
  privilege (`SELECT`, `INSERT`, `UPDATE`, `DELETE` separately, not
  `'SELECT,INSERT,DELETE'` comma lists) and re-verify the
  `service_role` baseline grant interaction.
- Legacy-data precheck for constraint tightening — applies only if 2.1
  tightens an existing CHECK or FK. The current scope adds no new
  CHECKs and tightens no FKs; the audit is named for completeness and
  marked "no constraint tightening in this phase" in the eventual plan.
- pgTAP output-format stability audit — the new tests use
  `information_schema` / `pg_catalog` for any structural assertion and
  prefer canonical-value checks over `pg_get_expr` strings.
- Replica-mode trigger suppression audit — the new tests do not seed
  fixtures via `session_replication_role = 'replica'` if any trigger-
  dependent assertion follows; reset to `'origin'` before such
  assertions.
- Supabase-owned-schema FK fragility — `event_role_assignments.user_id`
  references `auth.users(id)`. The existing role-management runbook
  pattern (DO-block existence check) covers fixture seeding; new tests
  reuse the same fixture pattern as `redemption_rls.test.sql`.

**Edge Function surface:**
- Platform-auth-gate config audit — no new Edge Functions are added;
  the four migrated functions already carry `verify_jwt = false` per
  `supabase/config.toml`. Re-verify that the four blocks remain present
  and unchanged.
- Error-surfacing for user-initiated mutations — the four authoring
  functions already surface 401 / 403 / 5xx through the binding-module
  responses; verify the `forbidden` branch's user-facing copy still
  reads correctly when the rejection reason is "not an organizer for
  this event" rather than "not allowlisted for game authoring".

**CI / runbook surface:**
- CLI / tooling pinning audit — no new dependencies introduced.
- Silent-no-op on missing lookup audit — applies to any new
  parameterized SQL added in the role-management runbook (out of scope
  here; flagged for the post-epic organizer-managed-agent-assignment
  work).

## Resolved Decisions

All open questions for 2.1 are settled. See
[m2-admin-restructuring.md](../m2-admin-restructuring.md)
"Cross-Phase Decisions" for the full deliberation; this section
records the resolutions and the rejected alternatives so the plan
author has a single source of truth.

- **Audit-log + versions write policy → broaden via the
  publish/unpublish RPCs; direct INSERT stays service-role-only.**
  In addition to the Edge Function widening, 2.1 widens
  `publish_game_event_draft()` and `unpublish_game_event()` to accept
  organizer callers. Direct-INSERT policies on `game_event_audit_log`
  and `game_event_versions` are **not** added.
  *Rejected: option 1 (direct organizer INSERT) — preserves a
  permissive RLS shape but breaks the audit log's "rows reflect real
  state transitions" invariant. Option 2 (read-only broaden) —
  dominated by option 3.*
- **`redeem_entitlement_by_code` organizer broadening → defer.** The
  RPC's `is_agent_for_event OR is_root_admin` gate is unchanged in
  2.1.
  *Rejected: option 1 (broaden in 2.1) — adds mass-redeem attack
  surface for zero in-epic feature value; an organizer-without-agent
  scenario at a real event has an existing role-assignment
  workaround.*
- **Combined SQL helper RPC `is_admin_or_organizer_for_event(eventId)`
  → not introduced.** RLS policies inline the OR directly; the
  per-event admin route composes `is_root_admin` +
  `is_organizer_for_event` client-side.
  *Rejected: combined RPC — a third helper for one consumer adds
  surface without removing real friction.*
- **Function-layer widening shape → shared TS helper
  `_shared/event-organizer-auth.ts`.** Already in this scoping doc's
  File Inventory and Contracts; called out here as a resolved
  decision rather than a contested option.
  *Rejected: per-call inline `is_admin() OR is_organizer_for_event(eventId)`
  composition — duplicates the predicate across four functions and
  drifts at the next change.*
- **`event_role_assignments.created_by` capture on organizer insert
  → defer.** 2.2 does not consume the signal; lands with the
  post-epic organizer-managed-agent-assignment follow-up.
  *Rejected: capture in 2.1 — premature without a UI consumer.*

## Risks

- RLS broadening could silently re-grant writes to a deprecated table
  organizers should not reach (e.g., misclassifying `admin_users` as
  event-scoped, or adding an INSERT policy on `game_event_audit_log`
  that bypasses the RPC's invariant). Mitigation: explicit
  per-table inventory in the migration's leading comment, matched 1:1
  by per-table assertions in the new pgTAP files.
- Organizers gain direct PostgREST write access to `game_event_drafts`,
  bypassing the validation in `save-draft`. The DB layer must enforce
  structural constraints (NOT NULL, CHECK, JSON shape via constraints
  or a future trigger) independently of the Edge Function's validation.
  Audit the existing CHECKs on `game_event_drafts` and surface any gap.
- Comma-separated `has_table_privilege` lists in the new pgTAP files
  would pass vacuously (per the catalog's audit); per-privilege splits
  are required even when "the intent is all of these are granted."
- Fixture instability from the `event_role_assignments → auth.users`
  FK could regress with a Supabase CLI bump; reuse the
  `redemption_rls.test.sql` fixture pattern verbatim rather than
  inventing a new seeding strategy.
- If the redeem RPC's gate is broadened to organizer in this phase
  without a UI consumer, organizers gain a mass-redeem path with no
  surface to invoke it — pure attack surface for zero feature value.
  Decide before drafting; default is "do not broaden the redeem RPC
  in 2.1."
