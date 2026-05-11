# Documentation Canonical Corrections Epic

## Status

Proposed. One-time correction sweep against the top-level canonical
docs, scoped to land within ~one week across four PRs. Closes out on
PR 4 landing by archiving the epic folder to a single flat entry under
`docs/plans/archive/docs-canonical-corrections.md` and removing the
active-effort pointer from
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
  The event-code lock has the same staleness against
  `supabase/migrations/20260507010000_relax_event_code_lock_with_entitlements_guard.sql`.
- The architecture doc's migration inventory stops at the 2026-04-21
  redemption series. The repo carries 11 additional migrations
  through `20260510010000_constrain_event_slug_shape.sql`, including
  the admin-status view, RLS broadening, the feedback tables, the
  `submit_feedback` RPC, the newsletter opt-in split, and the
  feedback-mode check extension.
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
  redemption-path code.
- [`docs/testing.md`](/docs/testing.md) does not list
  `npm run build:site` in its validation set; the other two docs do.
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
  past all four.

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
  [`docs/dev.md`](/docs/dev.md), the root [`README.md`](/README.md),
  or [`docs/README.md`](/docs/README.md), confirmed by a final-PR
  grep over those four files.
- Has a doc index at [`docs/README.md`](/docs/README.md) where every
  active top-level doc under `docs/` appears exactly once in the Doc
  Ownership table, and the Start Here section contains no links into
  `docs/plans/archive/`.

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
  directory; slug-lock and event-code-lock wording softened to match
  the actually-live trigger semantics; Backend Structure adds
  `read-demo-event` and notes the omitted redemption functions.
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
  `submit_feedback` RPC added to Current Backend Surface; the
  `/event/:slug/feedback` apps/site route named in the apps/site
  routes section.
- [`docs/dev.md`](/docs/dev.md) — no edit unless a developer
  workflow exercises feedback today; if not, omitted.

Contracts:

- Feature description sourced from the migration SQL and the
  apps/site route file, not from product intent or the
  madrona-feedback plan-doc text.
- RLS posture documented matches the policy installed by the
  relevant migration (anonymous insert into `feedback_submissions`;
  auth-gated reads via the event-scoped role helpers; service-role
  writes to the `feedback_enabled_events` registry).
- No plan-doc citations are load-bearing; the migrations and the
  route file are the authoritative sources.

### PR 3 — Architecture / dev deduplication and phase-jargon scrub

Editorial surgery on `docs/architecture.md` and `docs/dev.md`. This
is the only judgment-heavy PR in the epic and the one where reviewer
attention concentrates.

Surfaces:

- [`docs/architecture.md`](/docs/architecture.md)
- [`docs/dev.md`](/docs/dev.md)

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
- Internal phase identifiers removed from both docs. Where an
  identifier carried meaning, the surrounding prose carries the
  meaning instead — for example, "Phase 4.5 deferred post-MVP"
  becomes "admin draft preview, deferred post-MVP." Where an
  identifier was pure historical residue, the meaning is restated
  before the identifier is dropped; meaning and identifier never
  strip together.
- Net line count across the two docs decreases. The PR body reports
  before-and-after `wc -l` for both files.

Audit:

- After the cut, `grep -n 'M[0-9] phase\|Phase [0-9A-Z]' docs/architecture.md docs/dev.md`
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
- Epic Status flipped to Landed and the epic folder archived to a
  single flat file at `docs/plans/archive/docs-canonical-corrections.md`.

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
   identifiers from `docs/architecture.md`,
   `docs/dev.md`, and (PR 4) `docs/README.md` and the root
   `README.md` only. Plan docs under `docs/plans/` and tracker docs
   under `docs/tracking/` keep their phase identifiers — that is
   where they belong.
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
- **Archive shape on close-out.** On PR 4 landing, the epic folder
  collapses to a single flat archive entry at
  `docs/plans/archive/docs-canonical-corrections.md`, matching the
  existing archive layout where landed epics flatten on archive.

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
- [`README.md`](/README.md) — edited in PR 1.
