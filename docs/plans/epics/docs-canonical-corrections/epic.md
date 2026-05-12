# Documentation Canonical Corrections Epic

## Status

Proposed. One-time correction sweep against the top-level canonical
docs, scoped to land within ~one week across four PRs. Closes out on
PR 4 landing by flipping this doc's Status to `Landed` in place — the
epic folder stays at
`docs/plans/epics/docs-canonical-corrections/` per the in-place-as-
archive convention in
[`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
(lines 37–40) — and by removing the active-effort pointer from
[`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
in the same PR.

## Purpose

A 2026-05-11 audit against the top-level canonical docs surfaced 13
findings clustering into two character classes: mechanical
inaccuracies verifiable against current code, and editorial drift
(verbatim duplication, internal phase-tracking jargon leaking into
evergreen prose, and doc-index omissions). Several of the mechanical
findings actively mislead a reader — Vercel topology, slug and
event-code lock semantics, and the validation-gate `deno check` list
all describe a state the repo has already left behind.

This epic corrects the canonical surface so an outsider reading the
docs can trust them, without restructuring `docs/plans/` or
`docs/tracking/` and without changing product scope.

## Why This Epic

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
  ever issued (the Madrona pre-launch case); the entitlement guard
  preserves the redeem RPC's `<event_code>-<suffix>` reconstruction
  guarantee.
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
  `grep -n 'Phase\|M[0-9] phase' docs/architecture.md docs/dev.md`).
  These are project-tracking artifacts polluting evergreen "what is"
  prose.
- The doc index at [`docs/README.md`](/docs/README.md) omits four
  active top-level docs entirely:
  [`redemption-design.md`](/docs/redemption-design.md),
  [`styling.md`](/docs/styling.md),
  [`testing-tiers.md`](/docs/testing-tiers.md), and
  [`backlog.md`](/docs/backlog.md). A reader following the index walks
  past all four. (Verified by: `ls docs/*.md` returns 13 files
  including `docs/README.md` itself; the Doc Ownership table in
  `docs/README.md` carries 8 entries pointing at flat `docs/*.md`
  files, leaving 4 unindexed once `docs/README.md` is excluded as
  the index itself.)

## Goal

After the epic lands, the canonical doc set:

- Describes current code accurately on Vercel routing, the migration
  inventory, slug and event-code lock semantics, the Edge Function
  inventory, the validation-gate command list, and the apps/site
  landing-page status.
- Documents the feedback feature (route, tables, RPC, RLS posture) in
  the canonical product and architecture docs.
- Carries each topic in exactly one canonical doc; the other doc
  links to the owner where the topic is referenced.
- Has no internal phase identifiers
  (`M[0-9] phase X.Y`, `Phase A.2a`, `Phase 4.5 deferred post-MVP`,
  and equivalents) in
  [`docs/architecture.md`](/docs/architecture.md),
  [`docs/dev.md`](/docs/dev.md), or the root
  [`README.md`](/README.md), confirmed by a final grep over those
  three files at PR 3 close-out. ([`docs/README.md`](/docs/README.md)
  carries no phase identifiers today and is verified at zero hits in
  PR 4 close-out; no scrub work lands on it.)
- Has a doc index at [`docs/README.md`](/docs/README.md) where every
  active top-level doc under `docs/` appears exactly once in the Doc
  Ownership table, and the Start Here section contains no links into
  `docs/plans/archive/`.

## Drift Prevention

A reviewer of this epic is reasonably entitled to ask: "and how do
you prevent needing to do this again?" This epic does not answer
that question by itself — its scope is correcting current drift, not
hardening the pre-push surfaces that should have caught the drift
earlier. Substantively, the 13 audit findings split into two
classes: ones where an existing rule (in
[`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
or repo-feedback memory) covers the case but didn't fire, and ones
where no rule covers the trigger today.

A note on framing for the prevention work: the right quality bar is
"does the doc describe the intended product state correctly?" not
"do the canonical docs say the same things as each other?"
Cross-doc consistency is a useful tripwire but a weaker test —
matching docs encode the same wrong state just as easily as the
right one. The prevention work should anchor on the authoritative
source for each trigger class (SQL migrations, route configs, code)
plus whatever named design intent that source carries (policy
comments, commit messages, the relevant plan doc), and use
cross-doc consistency only as a cheap second check.

Recurrence prevention is scoped in a sibling backlog entry under
Tier 5 of [`docs/backlog.md`](/docs/backlog.md): "Pre-push
drift-prevention surfaces anchor on intended product state, not
cross-doc consistency." The classification (enforcement-gap vs
rule-gap) and the concrete catalog updates are designed at pickup
time, not in this epic. The backlog entry sequences after this
epic merges so the corrections inform the prevention scoping rather
than racing it.

## Out Of Scope

- Restructuring `docs/plans/` or `docs/tracking/`.
- Editing archived plans under `docs/plans/archive/`.
- Reducing the total volume of plan and tracking docs across the
  repo (separate concern, tracked outside this epic).
- Adding new product features beyond documenting the already-shipped
  feedback feature.
- Sweeping phase identifiers out of `docs/plans/` or `docs/tracking/`
  docs — phase identifiers belong there and this epic does not touch
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
indexes the post-PR-3 state.

### PR 1 — Factual corrections (bundled)

Corrects the seven mechanical inaccuracies. Each correction names a
source-of-truth file in the PR body so the reviewer spot-checks
against current code, not against the prior doc text.

Surfaces:

- [`README.md`](/README.md) — Vercel topology paragraph corrected
  against `apps/site/next.config.ts` and `apps/web/vercel.json`;
  `raffle-entry` wording in the milestone snapshot replaced with the
  current `reward` / `entitlement` noun.
- [`docs/architecture.md`](/docs/architecture.md) — migration
  inventory extended through the current `supabase/migrations/`
  directory; slug-lock wording corrected to name the currently-live
  trigger condition only (per
  `20260507000000_relax_slug_lock_to_currently_live.sql`);
  event-code-lock wording corrected to name both trigger conditions
  separately — currently-live OR any `game_entitlements` row exists
  for the event — and to call out that post-unpublish rotation is
  permitted only when no entitlements were ever issued, with the
  redeem RPC's `<event_code>-<suffix>` reconstruction named as the
  reason the entitlement guard exists (per
  `20260507010000_relax_event_code_lock_with_entitlements_guard.sql`);
  Backend Structure adds `read-demo-event` and notes the omitted
  redemption functions.
- [`docs/dev.md`](/docs/dev.md) — the apps/site landing
  "placeholder until M3" line dropped; `deno check` validation list
  extended to cover every shipped Edge Function entrypoint.
- [`docs/testing.md`](/docs/testing.md) — `npm run build:site` added
  to the validation set; `deno check` list extended to match
  `docs/dev.md`.
- [`README.md`](/README.md) — `deno check` validation list extended
  to match `docs/dev.md`.

Contracts:

- Every changed claim cites a source-of-truth file in the PR body
  (migration filename, package.json script name, Edge Function
  directory entry, apps/site or apps/web code path).
- **Supersession check on every newly-added migration entry.**
  Migration files are deltas, not snapshots; the current state of
  any grant, RLS policy, trigger, check constraint, or column shape
  is the *last* migration that touched it. For each migration entry
  newly added or rewritten in this PR, the author scans the rest of
  `supabase/migrations/` for any later migration that retracts,
  relaxes, or replaces what the entry describes. When a supersession
  is found, the earlier entry must not describe the retired state
  in isolation; either annotate it with a one-line "later relaxed
  by `<filename>`" pointer, or rewrite the later entry as
  superseding and keep the earlier entry minimal. The two known
  supersession pairs already corrected in this epic
  (`20260415000000` ← `20260507000000`,
  `20260418050000` ← `20260507010000`) are the template, not the
  exhaustive list — the entitlement-RLS broadening
  (`20260427010000`) and the feedback RPC hardening
  (`20260506000000` ← `20260509000000`) are at minimum two more
  pairs the author will encounter.
- The PR introduces no new content beyond what the cited source
  proves is missing or wrong; this is a corrections pass, not a
  rewrite.
- All three docs that carry the `deno check` list end PR 1 with
  matching entries covering `issue-session`, `complete-game`,
  `save-draft`, `generate-event-code`, `publish-draft`,
  `unpublish-event`, `redeem-entitlement`,
  `reverse-entitlement-redemption`, `get-redemption-status`, and
  `read-demo-event`.

### PR 2 — Feedback feature documentation

Adds canonical coverage of the shipped feedback feature. Independent
from PR 1.

Surfaces:

- [`docs/product.md`](/docs/product.md) — one paragraph naming
  feedback collection as part of the implemented slice.
- [`docs/architecture.md`](/docs/architecture.md) — feedback tables
  (`feedback_submissions`, `feedback_enabled_events`, and the
  newsletter opt-in log from the newsletter-subscription-split
  migration) added to the Backend Structure inventory;
  `submit_feedback` RPC named as the only anon-reachable write path
  to `feedback_submissions` in Current Backend Surface, with a
  one-line note that direct anon `INSERT` and the original
  `with-check` policy from `20260506000000_add_feedback_tables.sql`
  were revoked by
  `20260509000000_add_submit_feedback_rpc.sql` to gate trust at the
  function-grant boundary rather than the table-grant boundary; the
  `/event/:slug/feedback` apps/site route named in the apps/site
  routes section.
- [`docs/dev.md`](/docs/dev.md) — no edit unless a developer
  workflow exercises feedback today; if not, omitted.

Contracts:

- Feature description sourced from the migration SQL and the
  apps/site route file, not from product intent or the
  madrona-feedback plan-doc text.
- RLS and grant posture documented matches the **post-hardening**
  state in `20260509000000_add_submit_feedback_rpc.sql`, not the
  retired direct-anon-insert state in
  `20260506000000_add_feedback_tables.sql`. PR 2's author reads
  both migrations in order and describes the resulting state
  table-by-table:
  - `submit_feedback()` is `SECURITY DEFINER`; `EXECUTE` is granted
    to `anon` and `authenticated` and the RPC is the only
    anon-reachable write path on `feedback_submissions`.
  - `feedback_submissions`: direct `INSERT` is revoked from `anon`
    (the "anon can insert feedback for registered events" policy is
    dropped); `authenticated` retains `SELECT`, gated by the
    organizer-or-admin RLS policy on the matching event.
  - `feedback_enabled_events`: `anon` has all grants revoked (the FK
    from `feedback_submissions.event_slug` enforces registered-slug
    submissions without anon needing to read the registry);
    `authenticated` retains `SELECT`, gated by an RLS policy that
    scopes rows to organizers and admins of the matching event;
    service role is unrestricted. The registry `SELECT` policy is
    unchanged across both feedback migrations
    (per `20260509000000_add_submit_feedback_rpc.sql` line 76).
  The doc explains *why* the RPC indirection exists rather than just
  *that* it does: PostgREST's default `INSERT` handler emits
  `RETURNING *` which requires `SELECT`, so a direct anon insert path
  was unworkable without granting anon read access to submissions.
- No plan-doc citations are load-bearing; the migrations and the
  route file are the authoritative sources.

### PR 3 — Architecture / dev deduplication and phase-jargon scrub

Editorial surgery on `docs/architecture.md` and `docs/dev.md`, with
the same phase-identifier scrub extended to the root `README.md`
because it carries the identical `Phase 4.5 / Phase 4.7 deferred
post-MVP` block (root `README.md` lines around 267–273) and the
corresponding identifiers in architecture.md and dev.md retire in the
same operation. This is the only judgment-heavy PR in the epic and
the one where reviewer attention concentrates.

Surfaces:

- [`docs/architecture.md`](/docs/architecture.md)
- [`docs/dev.md`](/docs/dev.md)
- [`README.md`](/README.md) — phase-identifier scrub only; PR 3 does
  not edit the root README for any other purpose. PR 1's Vercel
  topology rewrite incidentally removes the `M2 phase 2.5` identifier
  on the Vercel paragraph line; PR 3 picks up the remaining "Next
  Phase" / `Phase 4.5` / `Phase 4.7` block.

Contracts:

- For each duplicated topic, one doc owns the explanation and the
  other links to it rather than restating it:
  - Vercel routing topology → `docs/architecture.md`.
  - Supabase Auth surface internals (chunked cookie format, PKCE vs
    implicit flow, `@supabase/ssr` deep-import rationale) →
    `docs/architecture.md`.
  - `shared/db/` and `shared/auth/` module-shape descriptions →
    `docs/architecture.md`.
  - Local dev workflow (which command to run, env files,
    prerequisites, fresh-fork deployment) → `docs/dev.md`.
  - Validation command list and PR CI inventory → `docs/dev.md`.
  - Code documentation standard → `docs/dev.md`.
- Internal phase identifiers removed from all three surfaces
  (architecture.md, dev.md, and root README.md). Where an
  identifier carried meaning, the surrounding prose carries the
  meaning instead — for example, "Phase 4.5 deferred post-MVP"
  becomes "admin draft preview, deferred post-MVP." Where an
  identifier was pure historical residue, the meaning is restated
  before the identifier is dropped; meaning and identifier never
  strip together.
- Net line count across architecture.md and dev.md decreases. The
  PR body reports before-and-after `wc -l` for both files. Root
  README scrub is small enough (~5 hits across two paragraphs) that
  a line-count delta is not load-bearing for it.

Audit:

- After the cut, `grep -nE 'M[0-9] phase|Phase [0-9A-Z]' docs/architecture.md docs/dev.md README.md`
  returns no hits. If any hits remain, the PR body names them and
  justifies the carve-out.

### PR 4 — Doc index rebuild and active-archive link cleanup

Rebuilds the doc index against the post-PR-3 doc set, removes
active→archive links from the Start Here section, and closes out the
epic.

Surfaces:

- [`docs/README.md`](/docs/README.md)
- [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — remove the active-effort pointer added when this epic opened.
- Epic Status flipped to `Landed` in place. The epic folder stays at
  `docs/plans/epics/docs-canonical-corrections/` per the in-place-as-
  archive convention in
  [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  (lines 37–40); no move into `docs/plans/archive/`.

Contracts:

- Every top-level doc directly under `docs/` appears exactly once in
  the Doc Ownership table. The four currently omitted docs gain
  entries: [`backlog.md`](/docs/backlog.md),
  [`redemption-design.md`](/docs/redemption-design.md),
  [`styling.md`](/docs/styling.md), and
  [`testing-tiers.md`](/docs/testing-tiers.md).
- The Start Here section contains no links into
  `docs/plans/archive/`. For each previously-archived target, either
  a non-archive replacement is named or the entry is dropped
  entirely; no orphan redirects.
- The Start Here section reflects the post-PR-3 ownership split
  (e.g., the entry for "Vercel routing" points to architecture, not
  dev).
- The active-effort pointer added to
  `documentation-quality-checklist.md` when this epic opened is
  removed in the same PR, leaving no tracker residue.

## Ordering Rationale

PR 1 and PR 2 are independent — PR 1 corrects existing claims, PR 2
adds new content for a feature neither doc currently mentions. Either
can land first.

PR 3 must wait for both. Reshaping content that PR 1 has not yet
corrected would carry the errors forward; reshaping before PR 2 lands
would force PR 2 to re-litigate the new ownership split for feedback.

PR 4 must land last. Rebuilding the index before PR 3 would require a
second rebuild against the PR 3 ownership state.

## Cross-Cutting Invariants

1. **Doc-vs-code direction is one-way.** Every claim changed by this
   epic is verified against current code, not against prior doc text.
   When a current-code claim and a prior-doc claim disagree, the code
   wins and the doc gets corrected.
2. **No active→archive links introduced.** Replacements for the
   existing archive links in [`docs/README.md`](/docs/README.md)
   either point to a non-archive surface or are dropped entirely.
   This applies to every PR in the epic, not only PR 4.
3. **No fenced code blocks added to this epic doc.** Validation
   command lists, env var snippets, and existing fenced blocks
   already present in the canonical docs may be edited in place
   during the implementing PRs but no new fenced blocks are
   introduced into this epic doc itself.
4. **Phase-identifier scrub is scoped.** PR 3 strips phase
   identifiers from `docs/architecture.md`, `docs/dev.md`, and the
   root `README.md` only. `docs/README.md` carries no phase
   identifiers today; PR 4 verifies that with a grep at close-out
   but performs no scrub work on it. Plan docs under `docs/plans/`
   and tracker docs under `docs/tracking/` keep their phase
   identifiers — that is where they belong.
5. **Subtractive PRs report what was removed.** PR 1, PR 3, and
   PR 4 are net-subtractive on at least one surface. Each PR body
   states what was removed and why, not only what was added —
   subtractive doc PRs are easy to under-describe.

## Risk Register

- **Reshape forces ownership calls not anticipated.** PR 3's
  deduplication may surface a topic whose owner is genuinely
  unclear (e.g., the local prototype-fallback story sits on both
  system shape and dev workflow). Mitigation: when ownership is
  unclear at PR time, the PR body names the call and the reasoning;
  the reviewer can push back on the choice rather than the whole PR.
- **Reviewer fatigue across four doc-only PRs.** Doc-only PRs are
  easy to rubber-stamp; this epic specifically asks reviewers to
  spot-check cited sources. Mitigation: each PR's body lists the
  source-of-truth files used for verification so the reviewer's pass
  is "open these files and check," not "read all the docs."
- **Phase-identifier scrub strips load-bearing context.** Some phase
  identifiers anchor an explanation (the localStorage → cookie
  migration story names a phase to date the one-time re-sign-in
  event). Mitigation: PR 3 restates the meaning before stripping the
  identifier; PR 3's audit grep confirms no identifier remains, not
  that no context was lost — reviewer reads PR 3 for context loss
  specifically.
- **Time-to-close stretches past one week.** The epic is scoped at
  ~one week. If PR 3 stalls (the only judgment-heavy PR), the epic
  surface stays open longer. Mitigation: PR 1, PR 2, and PR 4 are
  each small enough to land in a single sitting; if PR 3 needs more
  review rounds, it can do so without blocking the other three from
  shipping value.
- **The audit itself missed something.** The 2026-05-11 audit was
  one pass against five top-level docs. If a sixth issue surfaces
  during PR work, mitigation: name it in the PR body and either
  fold it into the in-flight PR (small, mechanical) or add a fifth
  PR to the epic (larger, judgment-shaped) rather than letting it
  drift.

## Open Questions

None at the epic level. Open questions surfaced during PR work
should land back here if they turn out to be load-bearing across
PRs.

## Resolved Decisions

- **Epic shape, not tracker.** Recurring discipline belongs in
  [`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md);
  a bounded one-week correction sweep with ordered PRs is
  epic-shaped. The tracker gains one line pointing at this epic
  while active and loses that line on PR 4 landing.
- **Subfolder location.** This epic lives at
  `docs/plans/epics/docs-canonical-corrections/epic.md`, matching
  the pattern of the existing
  [`madrona-demo-build`](/docs/plans/epics/madrona-demo-build/epic.md),
  [`demo-expansion`](/docs/plans/epics/demo-expansion/epic.md), and
  [`madrona-feedback`](/docs/plans/epics/madrona-feedback/epic.md)
  epics.
- **No phase or milestone subdocs.** Four PRs is small enough that
  the epic doc owns the per-PR contracts directly. Phase subdocs
  exist when each phase needs its own scoping pass; that does not
  apply here.
- **Standard validation gate only.** These are documentation PRs;
  the standard `npm run lint`, `npm run build:web`,
  `npm run build:site` gate runs per repo convention, but no new
  tests are introduced.
- **Close-out shape: in-place, not archived.** On PR 4 landing the
  epic's Status flips to `Landed` and the folder stays at
  `docs/plans/epics/docs-canonical-corrections/`, per the
  in-place-as-archive convention in
  [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  (lines 37–40): new epics are not bulk-moved into
  `docs/plans/archive/` on landing. The flat-file pattern under
  `docs/plans/archive/` applies only to plans authored before that
  convention (per line 42), which this epic is not.

## Related Docs

- [`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — recurring discipline tracker; gains a one-line pointer to this
  epic while active and loses it on close-out.
- [`docs/README.md`](/docs/README.md) — doc index, edited in PR 4.
- [`docs/architecture.md`](/docs/architecture.md) — edited in PR 1
  and PR 3.
- [`docs/dev.md`](/docs/dev.md) — edited in PR 1 and PR 3.
- [`docs/testing.md`](/docs/testing.md) — edited in PR 1.
- [`docs/product.md`](/docs/product.md) — edited in PR 2.
- [`README.md`](/README.md) — edited in PR 1 (Vercel topology,
  `raffle-entry` wording, `deno check` list) and PR 3
  (phase-identifier scrub of the "Next Phase" block).
