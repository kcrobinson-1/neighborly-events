# Self-Review Audit Catalog

## Purpose

Named, reusable audits to run on a diff before push. Each audit is a
reviewer's lens — a specific class of issue that reviewers (human or AI)
would otherwise flag.

The goal: catch recurring issues at self-review time, not at review time.

Self-review by itself is cheap. Good self-review is cheap **and** focused:
knowing which specific failure modes to look for, and what concrete checks
tell you you're safe.

## How to use

1. Before pushing any commit, identify which audits apply to the diff's
   surface — match on the **Trigger** field.
2. Walk each applicable audit's **Check** steps against the diff.
3. For multi-commit branches, run the audits at each commit boundary,
   not only at the end. Small diffs are easier to audit honestly.

PR plans should name the audits they commit to running — see
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Planning Depth" and [`AGENTS.md`](/AGENTS.md) "Pre-Edit Gate."

## Contributing

Add a new audit when **either**:
- A reviewer (human or Codex) flags the same class of issue on two or
  more distinct PRs, **or**
- A single P1-severity finding has a root cause that clearly
  generalizes beyond the specific file.

Drop an audit when:
- An automated check (linter, type system, CI gate) now enforces it.
- The pattern has not recurred in six months and new code in that
  surface is unlikely to reintroduce it.

Every entry must have **Trigger** (one-sentence diff pattern, not a
vibe), **Check** (concrete walk-through), and **Example**. Link the
example when a durable incident, PR, or commit reference exists.

Short triggers beat elaborate ones. A trigger like "any migration
touches GRANT EXECUTE" is actionable; "think about authorization" is
not.

## Workflow-discipline audits

Read-logs-first, speculative-commit-traceability, and local-vs-CI-baseline
discipline live in
[`docs/agents/workflows/debugging.md`](/docs/agents/workflows/debugging.md)
"Debugging Discipline." They are not duplicated here; the triggers fire on
most non-trivial debugging work and are closer in intent to process than
to diff review.

---

## SQL migrations & RPCs

### Grant/body contract audit

**Trigger.** A migration adds or changes `GRANT EXECUTE` on a function,
**or** a function adds early guard logic that reads JWT claims
(`current_request_user_id()`, `current_request_email()`, `is_admin()`,
the A.1 role helpers).

**Check.** For every role named in a `GRANT EXECUTE`, walk the function
body end-to-end and confirm a caller from that role can actually reach
a success path. The dangerous pattern is an early-return guard that
reads a JWT claim the role does not carry: the grant advertises a path
that the body always rejects. Either revoke the grant to match the body's
accept criteria, or relax the body to accept the role.

**Example.** [PR #58](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/58)
— Codex P1: `redeem_entitlement_by_code` granted `service_role` EXECUTE,
but the first guard (`v_user_id IS NULL → not_authorized`) rejected every
`service_role` caller because `service_role` JWTs don't carry a UUID
`sub`. Fix: revoked `service_role` EXECUTE, forcing Edge Functions to
forward the user bearer token.

### CHECK-constraint NULL-handling audit

**Trigger.** A migration adds a `CHECK` constraint involving comparisons
(`=`, `<>`, `>`) against a nullable column.

**Check.** PostgreSQL CHECK constraints treat NULL as pass — any
comparison against a NULL column evaluates to NULL, and NULL is not
FALSE, so the constraint admits the row. If the semantic intent is
"when X holds, Y must equal Z," add an explicit `IS NOT NULL` for Y (or
use `IS DISTINCT FROM` where appropriate). Write a pgTAP case that
inserts a NULL value and expects rejection.

**Example.** [PR #54](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/54)
— Codex P1 on `redemption_columns`: the redeemed-branch check only
tested `redeemed_event_id = event_id`, which let rows with
`redemption_status = 'redeemed'` and `redeemed_event_id IS NULL`
persist. Fix: added `redeemed_event_id IS NOT NULL` to the branch plus
a regression test.

### Privilege-test vacuous-pass audit

**Trigger.** A pgTAP test asserts `not has_table_privilege(…)` or uses
`has_table_privilege(role, table, 'A,B,C')` with a comma-separated
privilege list.

**Check.** Two related traps:
1. **Baseline-grant divergence.** Bare-PostgreSQL gives the test role no
   grants at all, so `not has_table_privilege('service_role', table,
   'UPDATE')` passes vacuously. Supabase's CI applies a baseline
   `grant all on all tables in schema public to service_role`, which
   flips the assertion. Reproduce the baseline grants locally before
   trusting a negative-privilege assertion.
2. **Comma-list ANY-semantics.**
   `has_table_privilege(role, table, 'SELECT,INSERT,DELETE')` returns
   true if **any** privilege is held, not all. Split into per-privilege
   calls joined with AND when the intent is "all of these are granted."

**Example.** Fix [`36f2b4b`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/36f2b4b)
— a "service_role cannot UPDATE" assertion passed locally but failed in
CI under the baseline grant; the same commit also split a
`'SELECT,INSERT,DELETE'` comma list into AND-joined per-privilege
checks. See also
[`docs/agents/workflows/debugging.md`](/docs/agents/workflows/debugging.md)
"Debugging Discipline."

### Legacy-data precheck for constraint tightening

**Trigger.** A migration adds `UNIQUE`, `NOT NULL`, a new `CHECK`, or
tightens an existing constraint on a table that already has rows in
any real deployment.

**Check.** Before the `ALTER TABLE` that adds the constraint, add a
precheck (a `DO $$ BEGIN … RAISE EXCEPTION … END; $$` block, or a
`SELECT` that errors on duplicate-pair detection) that produces a clear
remediation error if existing data violates the new rule. Otherwise the
constraint addition fails with a cryptic PostgreSQL error mid-deploy
and leaves the environment in a partially-migrated state.

**Example.** Fix [`e215463`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/e215463)
— adding `UNIQUE (event_id, verification_code)` without a duplicate
precheck would abort the deployment on any environment carrying legacy
duplicates from the pre-constraint generator. Fix: added an explicit
duplicate-detection RAISE before the constraint.

### Replica-mode trigger suppression audit

**Trigger.** A pgTAP test sets
`session_replication_role = 'replica'` (usually to bypass an FK during
fixture seeding), **and** the same test later asserts a cascade delete,
a trigger side effect, or other FK-enforced behavior.

**Check.** Replica mode suppresses FK triggers, cascade triggers, and
user-defined triggers. An assertion that depends on a trigger firing
will pass for the wrong reason (or fail non-deterministically) while
replica mode is active. Reset the role to `'origin'` **before** the
trigger-dependent assertion, and keep the scope of replica mode as
narrow as possible.

**Example.** Fix [`230d718`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/230d718)
plus fix [`b2382d8`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/b2382d8)
— a cascade-delete assertion in the A.1 redemption tests ran under
replica mode and did not actually exercise the cascade. Fix: reset to
origin before the assertion.

### Supabase-owned-schema FK fragility

**Trigger.** A migration declares a foreign key against `auth.users`,
`storage.objects`, or any other Supabase-managed schema, **and** the
pgTAP tests will seed rows referencing synthetic UUIDs.

**Check.** Seeding `auth.users` fixtures is fragile across Supabase CLI
versions (NOT NULL columns vary). In-test `ALTER TABLE … DROP
CONSTRAINT` may require superuser and interact with other triggers.
Replica mode helps but introduces its own trap (see above). For MVP
tables, prefer an enforcement boundary outside the FK — a DO-block in
the role-management runbook that validates existence at insert time —
and keep the schema column nullable/unconstrained. FKs to
Supabase-owned schemas can be reinstated later once the testing story
is stable.

**Example.** Fix [`0417a96`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/0417a96)
and fix [`f494741`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/f494741)
— the `auth.users` FK on `event_role_assignments.user_id` caused five
distinct CI failures; removing the FK and moving existence validation
to the runbook restored test stability. (Note: this FK was later
partially reinstated; the audit is about weighing FK rigor against
test stability, not about a blanket rule.)

### pgTAP output-format stability audit

**Trigger.** A pgTAP test uses `col_type_is`, `col_is_null`,
`col_not_null`, `has_index`, `has_table`, or inspects function default
expressions via `pg_get_expr` — any check whose exact string output
varies across pgTAP or Supabase CLI versions.

**Check.** Supabase CLI version bumps have shifted pgTAP wrapper output
formatting (e.g., timestamp type strings, boolean defaults). Tests that
compare against literal strings break silently after a CLI bump. Prefer
`information_schema` / `pg_catalog` queries where output shape is
stable, or pin assertions to canonical values rather than wrapper
output.

**Example.** Fix [`e52d0b3`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/e52d0b3)
— several pgTAP wrappers produced different output under a Supabase CLI
bump; swapped to catalog queries and canonical-value assertions.

---

## Frontend forms & save paths

### Dirty-state tracked-inputs audit

**Trigger.** A form holds state across multiple variables (e.g.,
`values` + `localEventCode` + controlled sub-components), and the
diff touches the dirty/save gating logic.

**Check.** The dirty/save gating must consider **every** variable that
holds form state, not just the primary one. Enumerate the state
variables; for each, confirm the gating reads it. A common failure:
editing a field held in a "satellite" state variable (not the primary
form object) fails to enable the Save button, leaving the user unable
to persist the change.

**Example.** [PR #53](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/53)
— Codex P1: `AdminEventDetailsForm` held `localEventCode` separately
from `values`, and the dirty check only read `values`; editing the
event code alone could not be saved. Fix
[`547f22f`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/547f22f)
added `localEventCode` to the dirty gating.

### Post-save reconciliation audit

**Trigger.** A save handler updates client state after an async write
succeeds.

**Check.** Reconcile from the **server response**, not from the
pre-save payload. Servers often normalize inputs (empty → null →
preserve-existing; trim; lowercase; apply defaults). Reconstructing
client state from the submitted values bypasses that normalization and
produces drift — the UI shows what was sent, not what was saved. Ensure
the save API returns the canonical persisted value, and the client
syncs to it.

**Example.** Fix [`55605b3`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/55605b3)
— saving with an empty event-code field caused the client to think the
code was cleared, but the server preserved the existing code (empty =
preserve). The UI briefly showed an empty code while the DB kept the
old one. Fix: have `save-draft` return the resolved `event_code` and
sync client state to it.

### Unchanged-vs-explicit-write audit

**Trigger.** A form submits to an API that treats a field's absence or
null as "unchanged / preserve existing" (distinct from "explicit write
of current value"), and multiple writers can edit the same record.

**Check.** Distinguish "the user did not edit this field" from "the
user explicitly wrote the field's current value." In a multi-writer
workflow, always sending the current client value can clobber a newer
write from another session. Either track edited-vs-untouched client-
side and send null/absent for untouched, or rely on an optimistic
concurrency token.

**Example.** Fix [`547d29e`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/547d29e)
— the admin form always sent `localEventCode`, so a stale form could
overwrite a newer event-code change made by another admin, or
erroneously raise `event_code_taken`. Fix: send null when the code was
not edited, triggering the server's preserve-existing path.

### Error-surfacing for user-initiated mutations

**Trigger.** A user-initiated async action (button click, form submit)
invokes a fetch, RPC, or other rejectable promise.

**Check.** Every user-initiated mutation needs visible failure feedback
on network errors, auth errors, 4xx/5xx responses, and unhandled
exceptions. Watch for `void promise` or unawaited chains in click
handlers — they swallow failures silently. Ensure the UI surfaces the
failure (inline banner, toast, or field error) with a recovery path
(retry, clear, or a link to troubleshooting).

**Example.** Fix [`6bd8a48`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/6bd8a48)
— `handleRegenerateEventCode` awaited `generateEventCode()` without a
catch; the click handler used `void`, so 500s and auth failures were
silent. Fix: catch, surface, and add a visible error state.

---

## Frontend lifecycle & async

### Effect cleanup audit

**Trigger.** A diff adds or modifies a React `useEffect` that schedules
a recurring side effect — `setInterval`, chained `setTimeout`,
`EventSource`, `WebSocket`, Supabase channel subscription, or any
async resource whose lifetime must match the component's mount
lifetime.

**Check.** Walk every exit path against four guarantees:
1. The cleanup function clears timers, aborts in-flight requests (via
   `AbortController` or equivalent), and closes subscriptions.
2. Post-unmount settlement of an in-flight async operation does not
   call `setState`. Use the `isCancelled` flag pattern, an
   `AbortController` whose signal the awaiter checks, or both.
3. Effects keyed on a dependency (`useEffect(..., [eventId])`)
   terminate the prior cycle before the new one begins. Two cycles
   must never run concurrently for the same component instance.
4. A scheduled callback that fires after a `clearTimeout` race must
   itself observe the cancellation (re-check the cancel flag inside
   the callback body), since `clearTimeout` does not stop a callback
   already on the microtask/macrotask queue.

The dangerous pattern is a "fire and forget" promise inside an effect
with no cancellation signal — the cleanup function returns, the
component unmounts, and a late-resolving fetch then calls `setState`
on a dead tree. Tests must assert cleanup behavior, not only
initial-render output.

**Example.** Introduced alongside `useAttendeeRedemptionStatus` in
Phase C.1
([`reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)),
the first interval-based fetch in the web app. The closest prior art
is the `isCancelled` pattern in
[`apps/web/src/game/useGameSession.ts`](/apps/web/src/game/useGameSession.ts),
which guards a single completion submit; the polling case generalizes
the same discipline to a recurring loop. No production incident at
audit creation time; the audit exists so future polling, subscription,
and long-lived-async sites inherit the cleanup contract from day one
rather than retrofitting after a leak surfaces.

---

## CI & testing infrastructure

### CLI / tooling pinning audit

**Trigger.** A change adds, renames, or modifies invocation of any
pinned CLI (Supabase, Deno, Node-version manager, Playwright), **or**
parses the output of such a CLI in a script, **or** updates a pin in
`mise.toml` / `.nvmrc` / `package.json`.

**Check.** CLI behavior drifts across versions — subcommand flags, output
keys, status JSON shape, default verbosity. Pin the version explicitly
and enforce that local, CI, and any contributor-facing script resolve
to the same pin. For scripts that parse CLI output, normalize across
known key variations or pin to a single known version. Document the
pin's location so future bumps update all callers in lockstep.

**Example.** Fixes
[`87185fb`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/87185fb),
[`b744839`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/b744839),
[`0fff75c`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/0fff75c),
[`8ba89b8`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/8ba89b8)
— a recurring family of Supabase CLI / Deno resolution drift. Each fix
addresses one drift axis: version bump, output-key normalization,
subcommand compatibility, Deno import pinning.

### Rename-aware diff classification

**Trigger.** A script or CI step classifies a diff by file path (e.g.,
"docs-only", "no backend change", "skip heavy tests"), **and** uses
`git diff --name-only` or an equivalent that collapses renames.

**Check.** `--name-only` collapses renames to the destination path. A
rename like `src/app.ts → docs/app.md` is reported only as
`docs/app.md`, so a "docs-only" classifier sees the move as a pure docs
change even though production code was deleted or relocated. Use
`git diff --name-status` (or `--find-renames=0`) so both sides of a
rename are visible, and classify conservatively when either side falls
outside the "safe" set.

**Example.** [PR #57](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/57)
— Codex P1: the docs-only CI detector could be bypassed by a
source-to-docs rename. Fix: switched to `--name-status` and treated any
rename whose source side was code as a non-docs-only change.

### Readiness-gate truthfulness audit

**Trigger.** A CI step, smoke test, or doctor-style preflight decides
"the system is ready" from an HTTP probe, a cache warm-up, or a
subshell return code.

**Check.** The probe must return **negative** when the system is not
ready, not just when it is outright broken. Two common failures:
- Accepting any response as "ready," including 404s that indicate a
  deploy routed to nothing.
- Probing a synthetic surface that bypasses the real code path (e.g.,
  type-checking a stub file instead of the actual import graph).
Walk the probe's success criteria against a concrete "what if the
real thing is broken?" scenario; if the probe would pass, tighten it.

**Example.** Fix [`74e2cdd`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/74e2cdd)
— production admin smoke readiness gate accepted 404 as "ready,"
masking deploys routed to nothing. Fix: reject 404 explicitly. See
also fix [`138d445`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/138d445)
— doctor validated a synthetic surface instead of the real
edge-function import graph.

---

## Operational scripts & runbooks

### Psql meta-syntax portability audit

**Trigger.** A runbook or deployable SQL snippet documents how to run
the SQL (e.g., "paste into the Supabase SQL editor", "apply via a
branch project") **and** the file uses psql meta-commands (`\set`,
`\echo`, `:variable` substitution, `\include`).

**Check.** Psql meta-commands are parsed by the `psql` client, not by
PostgREST, the Supabase SQL editor, Supabase branch deploys, or most
other clients. If the runbook advertises a non-psql runtime, the
snippet must use portable SQL — no backslash commands, no
`:variable` psql bindings. Either convert to portable SQL (plpgsql DO
blocks, dollar-quoted scripts) or document `psql` as the required
runtime.

**Example.** [PR #54](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/54)
— Codex P2: `supabase/role-management/` README advertised the SQL
editor as a valid runtime, but the snippets used `\set` / `:variable`,
which the editor does not parse. Fix: documented psql as the required
runtime and tightened the snippet pattern.

### Silent-no-op on missing lookup audit

**Trigger.** A parameterized operational script (role assignment,
data patch, user-specific migration) combines a lookup (by email,
slug, or ID) with an `INSERT ... ON CONFLICT DO NOTHING` or similar
idempotent write.

**Check.** Idempotent writes are indistinguishable from zero-row
lookups: a typo in the parameter produces the same "success" envelope
as an intended re-run. Add a fail-fast DO block that raises when the
lookup returns zero rows, and make the error message name the missing
input. Keep the idempotent write for the success path, but refuse to
silently do nothing when the input is wrong.

**Example.** [PR #54](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/54)
— Codex P1: `assign-agent.sql` / `assign-organizer.sql` returned a
success envelope when `:user_email` or `:event_slug` didn't resolve;
the user stayed unassigned while the operator thought the script had
re-run harmlessly. Fix
[`e52d0b3`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/e52d0b3):
DO-block fail-fast on empty lookup.

---

## Edge Functions & deployment config

### Platform-auth-gate config audit

**Trigger.** A commit adds a new `supabase/functions/<name>/index.ts`
handler, **or** changes an existing handler's authentication surface so
the handler owns auth (signed session cookie/header, in-handler bearer
verification, or any scheme that does not rely on Supabase's platform
JWT gate).

**Check.** For every such function, confirm `supabase/config.toml`
contains `[functions.<name>]` with `verify_jwt = false`. Supabase's
platform default is `verify_jwt = true`, which rejects requests lacking
a valid Supabase Auth JWT **before** the handler runs. For
session-bound attendee endpoints this rejects every real request — a
P1 on the happy path. For operator endpoints that verify the bearer
themselves via `supabase.auth.getUser(token)`, the default produces
double-gating inconsistent with the rest of `supabase/functions/`.
Unit tests stub the auth layer and cannot catch this; the audit is
always a config-vs-code consistency check. Grep `supabase/config.toml`
for the new function name before push.

**Example.** `feat/reward-redemption-a-2b` — Codex P1:
`get-redemption-status` authenticates attendees via
`readVerifiedSession` (signed cookie/header), but the branch shipped
without a matching `[functions.get-redemption-status] verify_jwt = false`
entry. The platform gate would 401 every attendee request before the
handler ran. Fix
[`19cee10`](https://github.com/kcrobinson-1/neighborly-scavenger-game/commit/19cee10):
added `verify_jwt = false` for all three new redemption functions to
restore the session-auth path and match the `save-draft` /
`complete-game` convention.

### Composed-predicate error-treatment audit

**Trigger.** An Edge Function helper composes two or more async
authorization checks (RPC calls, role probes, JWT lookups) under OR or
AND semantics — e.g., "admit if organizer OR root admin," "admit if A
AND B."

**Check.** Walk per-branch error treatment, not just success/false.
- **OR semantics.** An RPC error on one branch must NOT preempt the
  others. Treat the error as "non-positive for this branch only" and
  fall through. Forbidden only when every branch returns a definitive
  false or errors without any branch yielding a positive signal.
- **AND semantics.** An error on either branch can short-circuit (any
  false → overall false; the unknown is conservatively treated as
  false).

For each independent async call, mentally inject a transient error and
confirm the OR/AND truth table survives. The dangerous pattern is a
copy-pasted single-RPC guard (`if (error || !ok) return forbidden`)
lifted into a multi-branch helper — it collapses OR the moment the
first branch errors. The plan's Contracts section should also name the
per-branch error rule explicitly ("RPC error on branch X is treated as
non-positive for branch X only"), not just success/false.

**Example.** [PR #109](https://github.com/kcrobinson-1/neighborly-events/pull/109)
— Codex P1 on `authenticateEventOrganizerOrAdmin` (M2 phase 2.1.2): the
helper short-circuited to `forbidden` the moment
`is_organizer_for_event` returned an RPC error, never invoking
`is_root_admin`. A transient or config-specific failure on the
organizer branch would have denied a root admin across save / publish /
unpublish / generate-event-code with a 403. Fix
[`db7e0c0`](https://github.com/kcrobinson-1/neighborly-events/commit/db7e0c0):
restructured so an error on either branch counts as a non-positive
signal for that branch only; the caller is admitted as soon as either
branch returns true, and forbidden only when neither branch yields a
positive signal.

---

## Documentation drift

### Route or topology coupling audit

**Trigger.** A commit touches Vercel rewrite or proxy configuration,
or Next.js routing configuration, in either app.

**Check.** Enumerate the routing-config carriers — currently
[`apps/web/vercel.json`](/apps/web/vercel.json),
[`apps/site/next.config.ts`](/apps/site/next.config.ts), and
[`apps/site/vercel.json`](/apps/site/vercel.json) — and confirm the
diff against the canonical prose that describes the resulting
topology (root [`README.md`](/README.md),
[`docs/architecture.md`](/docs/architecture.md), and
[`docs/dev.md`](/docs/dev.md) per the Doc Ownership table in
[`docs/README.md`](/docs/README.md)). The authoritative source is the
config; the canonical docs must match it. The dangerous pattern is
prose describing one Vercel topology (e.g., "apps/web is the
canonical project that proxies to apps/site") while the configs
encode the opposite direction.

**Example.** [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"Why This Plan" first bullet — pre-corrections-plan PR 1, the root
README and [`docs/architecture.md`](/docs/architecture.md) described
opposite Vercel topologies; the architecture-doc version matched the
config and the README's did not.

### Validation-command coupling audit

**Trigger.** A commit adds, renames, or removes an entry in the
documented validation-gate command list (a new
[`supabase/functions/<name>/`](/supabase/functions/) directory
implicitly adding a new `deno check` target counts), **or** a commit
changes CI workflow definitions under
[`.github/workflows/`](/.github/workflows/) in a way that changes
which commands run on PR, **or** a commit changes local-setup config
([`mise.toml`](/mise.toml), root devcontainer config).

**Check.** Authoritative sources for the command set are
[`package.json`](/package.json) scripts and the
[`supabase/functions/`](/supabase/functions/) directory listing (each
non-`_shared` subdirectory is one `deno check` target); for CI behavior
the authoritative source is the workflow definitions under
[`.github/workflows/`](/.github/workflows/); for local setup the
authoritative source is [`mise.toml`](/mise.toml) and any root
devcontainer config. The canonical docs that must match are root
[`README.md`](/README.md), [`docs/dev.md`](/docs/dev.md), and
[`docs/testing.md`](/docs/testing.md). Walk each doc's command list
against the authoritative source touched by the diff and confirm
parity. The dangerous pattern is a new Edge Function or script
landing without the corresponding `deno check` / `npm run` entry
appearing in every doc that catalogs validation commands.

**Example.** [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"Why This Plan" fifth and sixth bullets — pre-corrections-plan, the
`deno check` validation list in [`docs/dev.md`](/docs/dev.md),
[`docs/testing.md`](/docs/testing.md), and the root
[`README.md`](/README.md) named six Edge Functions but omitted four
shipped functions (`redeem-entitlement`,
`reverse-entitlement-redemption`, `get-redemption-status`,
`read-demo-event`); separately, [`docs/testing.md`](/docs/testing.md)
did not list `npm run build:site` while the other two docs did. The
CI-behavior and local-setup arms of this audit have no current
historical example; they are bound at category altitude alongside the
validation-command arm so the retirement of the matching discipline
checklist item is clean rather than partial.

### Canonical-owner duplication audit

**Trigger.** A commit adds or expands prose in any canonical doc —
the root [`README.md`](/README.md) and the docs under
[`docs/`](/docs/) that the Doc Ownership table in
[`docs/README.md`](/docs/README.md) marks as canonical "what is"
prose — on a topic another canonical doc already covers in depth.

**Check.** Consult the Doc Ownership table to identify which doc owns
the topic the diff touches. If another canonical doc carries
depth-equivalent prose on the same topic, choose the table-named
owner and replace the duplicated passage in the non-owner with a
link to the owner. The dangerous pattern is two canonical docs
expanding in parallel on the same topic; the
[`Editing Rule Of Thumb`](/docs/README.md) in the doc index forbids
exactly this shape.

**Example.** [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"Why This Plan" seventh bullet — pre-corrections-plan PR 3,
[`docs/architecture.md`](/docs/architecture.md) and
[`docs/dev.md`](/docs/dev.md) carried duplicated coverage of the
Vercel routing layout, the Supabase Auth surface description, and the
`@supabase/ssr` cookie internals. The broader canonical-doc scope —
duplication across any pair the Doc Ownership table marks as
canonical — has no current historical example beyond the
architecture/dev pair; the audit is bound at the broader category to
make the retirement of the matching discipline checklist item clean.

### Phase-identifier and target-state-language audit

**Trigger.** A commit edits an evergreen "what is" surface — the root
[`README.md`](/README.md) and any doc the
[`Doc Ownership`](/docs/README.md) table marks as canonical "what is"
prose — **and** the edit either introduces or fails to remove
internal phase identifiers (phase names keyed to the milestone /
phase rollout layer) or future-tense status language.

**Check.** The canonical "what is" surface today is the root
[`README.md`](/README.md) plus the docs the Doc Ownership table
designates as canonical descriptive prose (currently
[`docs/product.md`](/docs/product.md),
[`docs/experience.md`](/docs/experience.md),
[`docs/architecture.md`](/docs/architecture.md), and
[`docs/dev.md`](/docs/dev.md)); re-resolve the set against the table
before walking the audit. Grep the diff and the touched file for
phase-identifier patterns (`M[0-9] phase`, `Phase [0-9A-Z]`,
named-milestone tokens) and future-tense status language (`future`,
`later`, `next`, `will become`, `to be implemented`). Each hit is
either project-tracking noise to scrub out of evergreen prose,
behavior the doc should now describe in the present tense, or a
deferred decision that belongs in
[`docs/open-questions.md`](/docs/open-questions.md). The dangerous
pattern is rollout-layer vocabulary fossilizing into evergreen "what
is" prose, which then encodes a target state long after the actual
state has caught up or diverged.

**Example.** [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"Why This Plan" eighth bullet — pre-corrections-plan PR 3, internal
phase identifiers appeared 13 times in
[`docs/architecture.md`](/docs/architecture.md), 12 times in
[`docs/dev.md`](/docs/dev.md), and five additional times in the root
[`README.md`](/README.md) (one on the Vercel topology paragraph and
four across the "Next Phase" block).
