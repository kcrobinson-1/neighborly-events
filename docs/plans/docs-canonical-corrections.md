# Documentation Canonical Corrections Plan

## Status

Landed. One-time correction pass against the top-level canonical
docs, scoped to land within ~one week across four PRs. PR 1 corrected
the seven mechanical inaccuracies; PR 2 documented the shipped
attendee-feedback feature; PR 3 deduplicated the canonical coverage
that overlapped between `docs/architecture.md` and `docs/dev.md` and
scrubbed internal phase identifiers from those two docs and the root
`README.md`; PR 4 rebuilt the doc index at
[`docs/README.md`](/docs/README.md) against the post-PR-3 doc set,
removed the active-effort pointer from
[`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md),
and flipped this doc's Status to `Landed` in place.

## Purpose

A 2026-05-11 audit against the top-level canonical docs surfaced 13
findings: mechanical inaccuracies verifiable against current code,
plus editorial drift (verbatim duplication, internal phase-tracking
jargon leaking into evergreen prose, and doc-index omissions).
Several findings actively mislead a reader — Vercel topology, slug
and event-code lock semantics, and the validation-gate `deno check`
list all describe a state the repo has already left behind.

This plan corrects the canonical surface so an outsider reading the
docs can trust them. Restructuring `docs/plans/` or `docs/tracking/`,
reducing total doc volume, and adding new product features are out
of scope. Drift prevention is scoped separately (see Drift Prevention
below).

## Why This Plan

- The root [`README.md`](/README.md) and
  [`docs/architecture.md`](/docs/architecture.md) describe opposite
  Vercel topologies. The root README still calls apps/web the
  canonical project that proxies to apps/site; the architecture doc
  describes apps/site as canonical with apps/web reached only through
  one-direction proxy rewrites. The architecture-doc version matches
  current code (Verified by:
  [`apps/site/next.config.ts`](/apps/site/next.config.ts) and
  [`apps/web/vercel.json`](/apps/web/vercel.json)).
- [`docs/architecture.md`](/docs/architecture.md) describes the slug
  lock as enforcing immutability "once an event is first published."
  The actual trigger fires only while the event is currently live,
  per
  `supabase/migrations/20260507000000_relax_slug_lock_to_currently_live.sql`.
  The event-code lock is stale on the same axis but its corrected
  shape is different: per
  `supabase/migrations/20260507010000_relax_event_code_lock_with_entitlements_guard.sql`,
  the trigger fires while the event is currently live OR while any
  `game_entitlements` row exists for the event. After unpublish,
  event-code rotation is permitted only when no entitlements were
  ever issued; the entitlement guard preserves the redeem RPC's
  `<event_code>-<suffix>` reconstruction guarantee.
- The architecture doc's migration inventory stops at
  `20260421000500_add_redemption_rls_policies.sql`. The repo carries
  10 additional migrations through
  `20260510010000_constrain_event_slug_shape.sql`, including the
  admin-status view, RLS broadening, the feedback tables, the
  `submit_feedback` RPC, the newsletter opt-in split, and the
  feedback-mode check extension. (Verified by:
  `ls supabase/migrations/ | awk '$0 > "20260421000500_zzz"'`
  returns 10 filenames between `20260423010000_...` and
  `20260510010000_...`.)
- The feedback feature has shipped end-to-end (tables, RPC, route in
  the apps/site rewrite table) but is undocumented in product,
  architecture, and dev surfaces. A reader following the doc index
  would not know the feature exists.
- The `deno check` validation list in
  [`docs/dev.md`](/docs/dev.md),
  [`docs/testing.md`](/docs/testing.md), and the root
  [`README.md`](/README.md) names six Edge Functions but omits four
  more that ship in the repo (`redeem-entitlement`,
  `reverse-entitlement-redemption`, `get-redemption-status`, and
  `read-demo-event`). The validation gate is silently incomplete on
  redemption-path code. (Verified by:
  `ls supabase/functions | grep -v '^_shared$'` returns 10 entries;
  `grep -c '^deno check' docs/dev.md` and
  `grep -c 'deno check --no-lock' docs/testing.md` each return 6.)
- [`docs/testing.md`](/docs/testing.md) does not list
  `npm run build:site` in its validation set; the other two docs do.
  (Verified by: `grep -c 'build:site' docs/testing.md` returns 0;
  `grep -c 'build:site' docs/dev.md` returns 1; the root README
  carries it in its Validation commands block.)
- [`docs/architecture.md`](/docs/architecture.md) and
  [`docs/dev.md`](/docs/dev.md) carry duplicated coverage of the
  Vercel routing layout, the Supabase Auth surface description, and
  the `@supabase/ssr` cookie internals. The "Editing Rule Of Thumb"
  in [`docs/README.md`](/docs/README.md) forbids exactly this shape.
- Internal phase identifiers appear 13 times in
  [`docs/architecture.md`](/docs/architecture.md) and 12 times in
  [`docs/dev.md`](/docs/dev.md) (Verified by:
  `grep -nE 'Phase|M[0-9] phase' docs/architecture.md docs/dev.md`).
  These are project-tracking artifacts polluting evergreen "what is"
  prose. The root [`README.md`](/README.md) carries five additional
  hits: one on the Vercel topology paragraph (line 103) and four
  across the "Next Phase" block (lines 267, 268, 272, 273), per
  `grep -nE 'M[0-9] phase|Phase [0-9A-Z]' README.md`.
- The doc index at [`docs/README.md`](/docs/README.md) omits four
  active top-level docs entirely:
  [`redemption-design.md`](/docs/redemption-design.md),
  [`styling.md`](/docs/styling.md),
  [`testing-tiers.md`](/docs/testing-tiers.md), and
  [`backlog.md`](/docs/backlog.md). A reader following the index
  walks past all four. (Verified by: `ls docs/*.md` returns 13 files
  including `docs/README.md` itself; the Doc Ownership table in
  `docs/README.md` carries 8 entries pointing at flat `docs/*.md`
  files, leaving 4 unindexed once `docs/README.md` is excluded as
  the index itself.)

## Goal

After this plan lands, the canonical doc set:

- Describes current code accurately on Vercel routing, the migration
  inventory, slug and event-code lock semantics, the Edge Function
  inventory, the validation-gate command list, and the apps/site
  landing-page status.
- Documents the feedback feature (route, tables, RPC, RLS and grant
  posture) in the canonical product and architecture docs.
- Carries each topic in exactly one canonical doc; the other doc
  links to the owner where the topic is referenced.
- Has no internal phase identifiers
  (`M[0-9] phase X.Y`, `Phase A.2a`, `Phase 4.5 deferred post-MVP`,
  and equivalents) in
  [`docs/architecture.md`](/docs/architecture.md),
  [`docs/dev.md`](/docs/dev.md), or the root
  [`README.md`](/README.md), confirmed by a final grep over those
  three files at PR 3 close. ([`docs/README.md`](/docs/README.md)
  carries no phase identifiers today and is verified at zero hits in
  PR 4 close-out; no scrub work lands on it.)
- Has a doc index at [`docs/README.md`](/docs/README.md) where every
  active top-level doc under `docs/` appears exactly once in the Doc
  Ownership table, and the Start Here section contains no links into
  `docs/plans/archive/`.

## Drift Prevention

A reviewer of this plan can reasonably ask: "and how do you prevent
needing to do this again?" This plan does not answer that question
by itself — its scope is correcting current drift, not hardening the
pre-push surfaces that should have caught the drift earlier.

The right quality bar for the prevention work is "does the doc
describe the intended product state correctly, and does any plan-doc
contract specify the right grain (shape, not content)?" — not "do
the canonical docs say the same things as each other?" Cross-doc
consistency is a useful tripwire but a weaker test: matching docs
encode wrong state just as easily as right. The authoritative source
(SQL migrations, route configs, code) plus named design intent
(policy comments, commit messages, plan docs) is what the prevention
work should anchor on.

Recurrence prevention is scoped in a sibling backlog entry under
Tier 5 of [`docs/backlog.md`](/docs/backlog.md): "Pre-push
drift-prevention surfaces anchor on intended product state and
right-grain contracts." Classification of findings (enforcement-gap
vs rule-gap vs grain-gap) and the concrete catalog updates are
designed at pickup time, not in this plan. The backlog entry
sequences after this plan merges so the corrections inform the
prevention scoping rather than racing it.

The grain-gap class — where plan-doc contracts specify content
("anon and authenticated both revoked"; "two trigger conditions
named separately") rather than shape ("describe per-table per-role
from the migrations"; "name both arms separately") — is closely
related to the in-place sibling effort at
[`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md),
which targets the underlying "current state is only knowable by
reading every migration in order" problem that produced several
findings in this plan.

## Out Of Scope

- Restructuring `docs/plans/` or `docs/tracking/`.
- Editing archived plans under `docs/plans/archive/`.
- Reducing the total volume of plan and tracking docs across the
  repo (separate concern, tracked outside this plan).
- Adding new product features beyond documenting the already-shipped
  feedback feature.
- Sweeping phase identifiers out of `docs/plans/` or `docs/tracking/`
  docs — phase identifiers belong there and this plan does not touch
  them.
- Editing [`docs/experience.md`](/docs/experience.md),
  [`docs/operations.md`](/docs/operations.md),
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
  [`docs/redemption-design.md`](/docs/redemption-design.md),
  [`docs/styling.md`](/docs/styling.md), or
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) beyond what
  cross-link updates in PR 4 require.

## PR Sequence

Four PRs. PR 1 and PR 2 are independent and can land in either order
or in parallel; both must precede PR 3. PR 4 lands last because it
indexes the post-PR-3 ownership state.

Each PR contract below specifies the *shape* of the changed
content — which doc, which trigger, which verification path. The
specific prose lands in the implementing PR, where it can be
verified against the cited source-of-truth in the same change.

### PR 1 — Factual corrections (bundled)

Goal: correct the seven mechanical inaccuracies listed in Why
against current code.

Surfaces: [`README.md`](/README.md),
[`docs/architecture.md`](/docs/architecture.md),
[`docs/dev.md`](/docs/dev.md),
[`docs/testing.md`](/docs/testing.md).

Contracts:

- Every changed claim cites a source-of-truth file in the PR body
  (migration filename, package.json script name, Edge Function
  directory entry, apps/site or apps/web code path). The author
  reads the cited source fresh in the same change; doesn't carry
  prior doc text forward.
- For each migration entry newly added or rewritten in PR 1, the
  author scans `supabase/migrations/` for any later migration that
  retracts, relaxes, or replaces what the entry describes. When a
  supersession is found, the earlier entry must not describe the
  retired state in isolation; either annotate it with a one-line
  pointer to the relaxing migration, or rewrite the later entry as
  superseding and keep the earlier entry minimal. Migration files
  are deltas, not snapshots — current state is the last migration
  that touched it.
- All three docs that carry the `deno check` validation list end
  PR 1 with matching entries covering every shipped Edge Function
  entrypoint.
- Corrections only — no new content beyond what cited sources
  prove is missing or wrong.

### PR 2 — Feedback feature documentation

Goal: document the shipped feedback feature against current
migrations and the apps/site route file.

Surfaces: [`docs/product.md`](/docs/product.md),
[`docs/architecture.md`](/docs/architecture.md).

Contracts:

- Feature description sourced from migration SQL and the apps/site
  route file, not from product intent or plan-doc text in
  `docs/plans/epics/madrona-feedback/` or elsewhere.
- RLS and grant posture described per-table per-role from the
  post-hardening state across both feedback migrations
  (`20260506000000_add_feedback_tables.sql` and
  `20260509000000_add_submit_feedback_rpc.sql`). Author reads both
  in order; the doc names anon, authenticated, and service-role
  posture for each affected table separately.
- The doc explains *why* the RPC indirection exists, not just
  *that* it does.

### PR 3 — Architecture / dev deduplication and phase-jargon scrub

Goal: deduplicate verbatim coverage between
[`docs/architecture.md`](/docs/architecture.md) and
[`docs/dev.md`](/docs/dev.md); remove internal phase identifiers
from those two docs and the root [`README.md`](/README.md). This is
the only judgment-heavy PR in the sequence.

Surfaces: [`docs/architecture.md`](/docs/architecture.md),
[`docs/dev.md`](/docs/dev.md), [`README.md`](/README.md) (phase
scrub of the "Next Phase" block; PR 1's Vercel rewrite handles the
single phase identifier on the Vercel paragraph incidentally).

Contracts:

- For each duplicated topic, one doc owns the explanation and the
  other links to it rather than restating it. Ownership calls
  surfaced during the cut are named in the PR body so the
  reviewer can push back on the choice rather than the whole PR.
- Phase identifiers removed only after surrounding prose carries
  the meaning they encoded; meaning and identifier never strip
  together.
- Audit grep
  `grep -nE 'M[0-9] phase|Phase [0-9A-Z]' docs/architecture.md docs/dev.md README.md`
  at PR close returns no hits. If any remain, the PR body names
  them and justifies the carve-out.

### PR 4 — Doc index rebuild and plan close-out

Goal: rebuild [`docs/README.md`](/docs/README.md) against the
post-PR-3 doc set; remove active→archive links from the Start Here
section; close this plan out.

Surfaces: [`docs/README.md`](/docs/README.md),
[`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md),
this plan doc.

Contracts:

- Every active top-level doc directly under `docs/` appears
  exactly once in the Doc Ownership table.
- The Start Here section contains no links into
  `docs/plans/archive/`. For each previously-archived target,
  either a non-archive replacement is named or the entry is
  dropped entirely; no orphan redirects.
- The Start Here section reflects the post-PR-3 ownership split.
- Plan Status flips to `Landed` in place; the file stays at
  `docs/plans/docs-canonical-corrections.md`. The active-effort
  pointer in `documentation-quality-checklist.md` is removed in
  the same PR so the tracker carries no residue.

## Ordering Rationale

PR 1 and PR 2 are independent. Both must precede PR 3 because
reshaping content PR 1 has not yet corrected would carry errors
forward, and reshaping before PR 2 would force PR 2 to re-litigate
the ownership split for feedback. PR 4 lands last because it
indexes the post-PR-3 state.

## Risk Register

- **Ownership calls during deduplication.** PR 3 may surface a
  topic whose owner is genuinely unclear (e.g., the local
  prototype-fallback story sits on both system shape and dev
  workflow). Mitigation: PR 3 body names the call and the
  reasoning; the reviewer can push back on the choice rather than
  the whole PR.
- **Reviewer fatigue across four doc-only PRs.** Mitigation: each
  PR body lists the source-of-truth files used for verification so
  the reviewer's pass is "open these files and check," not "read
  all the docs."
- **Phase-identifier scrub strips load-bearing context.** Some
  identifiers anchor an explanation. Mitigation: PR 3 restates the
  meaning before stripping the identifier; PR 3's audit grep
  confirms no identifier remains, not that no context was lost —
  reviewer reads PR 3 for context loss specifically.
- **Time-to-close stretches past one week.** Mitigation: PR 1,
  PR 2, and PR 4 are each small enough for a single sitting; if
  PR 3 needs more review rounds, it can do so without blocking the
  other three from shipping value.
- **The audit missed something.** Mitigation: if a fourteenth
  finding surfaces during PR work, name it in the PR body and
  either fold it into the in-flight PR (small, mechanical) or
  defer to a follow-up rather than letting it drift.

## Resolved Decisions

- **Plan shape, not epic.** The effort produces four ordered PRs
  with shared corrections context but no milestones and no cross-
  cutting invariants beyond standard plan-level constraints. A
  prior draft was labeled "epic"; that misclassification let the
  contracts carry too much content. The underlying taxonomy gap is
  scoped separately in a Tier 5 backlog entry.
- **Flat file location.** This plan lives at
  `docs/plans/docs-canonical-corrections.md` rather than under
  `docs/plans/epics/`, matching the older flat-plan pattern in
  `docs/plans/`. The location may move once the plan-taxonomy
  revamp settles where flat plans belong; until then, the flat
  location matches existing plans of similar shape.
- **Standard validation gate only.** Documentation-only PRs; the
  standard `npm run lint`, `npm run build:web`,
  `npm run build:site` gate runs per repo convention. No new
  tests.
- **Close-out shape: in-place, not archived.** On PR 4 landing,
  Status flips to `Landed` and the file stays where it is. Per the
  in-place-as-archive convention in
  [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  (lines 37–40), landed plans authored under the current
  convention are not bulk-moved into `docs/plans/archive/`.

## Related Docs

- [`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — recurring discipline tracker; gains a one-line pointer to this
  plan while active and loses it on close-out.
- [`docs/README.md`](/docs/README.md) — doc index, edited in PR 4.
- [`docs/architecture.md`](/docs/architecture.md) — edited in
  PR 1, PR 2, and PR 3.
- [`docs/dev.md`](/docs/dev.md) — edited in PR 1 and PR 3.
- [`docs/testing.md`](/docs/testing.md) — edited in PR 1.
- [`docs/product.md`](/docs/product.md) — edited in PR 2.
- [`README.md`](/README.md) — edited in PR 1 (Vercel topology,
  `raffle-entry` wording, `deno check` list) and PR 3
  (phase-identifier scrub).
- [`docs/backlog.md`](/docs/backlog.md) — sibling backlog entry
  for the prevention work landing in the same PR as this plan.
- [`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
  — sibling prevention task plan (with scoping doc at
  [`docs/plans/scoping/db-permissions-snapshot.md`](/docs/plans/scoping/db-permissions-snapshot.md))
  targeting the in-order-migration-read problem that produced
  several findings in this plan.
