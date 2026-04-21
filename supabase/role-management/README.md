# Role Management Runbook

This directory holds the operator-facing SQL snippets and process for
assigning and revoking event-scoped redemption roles. It is the canonical
entry point referenced by the reward redemption MVP design
(`docs/plans/reward-redemption-mvp-design.md`, checklist item 9) and the
Phase A.1 plan (`docs/plans/reward-redemption-phase-a-1-plan.md`).

## Role model

Three concepts, two storage locations:

- **`agent`** — can redeem entitlements for one or more assigned events.
  Stored as a row in `public.event_role_assignments` with
  `role = 'agent'`.
- **`organizer`** — can reverse redemptions for one or more assigned
  events. Stored as a row in `public.event_role_assignments` with
  `role = 'organizer'`.
- **`root_admin`** — global redemption + administrative override. Stored
  as a row in `public.admin_users`, the same allowlist that powers the
  existing authoring surface. The redemption feature reaches it through
  `public.is_root_admin()`, which aliases `public.is_admin()`.

Agent and organizer assignments are **event-scoped**. The same user may
hold different roles on different events, and may hold both `agent` and
`organizer` on the same event if needed.

## Required inputs

To assign or revoke a role you need:

- the user's login **email** (Supabase `auth.users.email`), or their
  `auth.users.id` if email lookup is not sufficient
- the **event slug** (`public.game_events.slug`), e.g. `fall-fest-2026`
- the **role** — exactly one of `agent` or `organizer`
- for revocations, a one-line **reason** captured in the PR description

Root-admin changes live in a separate runbook path (authoring allowlist
management) and are out of scope here.

## Execution process

**Role changes are applied through reviewed pull requests.** The commit
history is the audit trail; no role change is applied from a local-only
script.

1. Clone the repository and create a branch named
   `role/<assign|revoke>-<role>-<short-identifier>`.
2. Open the relevant snippet file
   (`assign-agent.sql`, `assign-organizer.sql`, or
   `revoke-assignment.sql`) and replace the placeholder values at the
   top. Do not modify the body.
3. Commit the edited snippet with a message shaped like
   `role: <assign|revoke> <role> <email> for <event-slug>`.
4. Open a PR titled the same way. The PR description must state:
   - who requested the change
   - which event (slug) and role
   - why
   - for revocations: whether the user keeps any other assignments
5. Request review from `@kcrobinson`.
6. After approval and merge, apply the snippet against the target
   Supabase project (branch project for staging, production project for
   prod) with `psql`. The snippet files use `\set` meta-commands, which
   require psql and will not parse in the Supabase SQL editor. Capture
   the output of the `returning *` block in a PR comment for the audit
   record.
7. If the snippet is idempotent (assignments always are; revocations are
   idempotent in the sense that re-running deletes nothing), re-running
   on the same inputs is safe.

## Revocation and audit

Revocation deletes one row from `public.event_role_assignments` keyed
by `(user_id, event_id, role)`. The `returning *` in the snippet surfaces
the deleted row so the reviewer-and-executor can confirm exactly what was
removed.

There is no self-serve revocation path in MVP, and no automated review
cadence. If manual change volume grows, the post-MVP follow-up is either
a role-change log table or a dedicated admin UI; see checklist item 9 of
the reward redemption design.

## Files in this directory

- `README.md` — this document.
- `assign-agent.sql` — assigns `role = 'agent'` for one user on one
  event. Idempotent via `on conflict do nothing`.
- `assign-organizer.sql` — assigns `role = 'organizer'` for one user on
  one event. Idempotent via `on conflict do nothing`.
- `revoke-assignment.sql` — deletes a single `(user_id, event_id, role)`
  row and returns the deleted row for audit.

Each SQL file begins with
`-- This file is applied by a reviewed PR only. See README.md.` so
accidental direct execution against a live database is visibly
discouraged.
