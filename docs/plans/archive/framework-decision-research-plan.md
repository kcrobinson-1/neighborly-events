# Framework Decision Research — Execution Plan

## Status

Landed. Superseded by [`framework-decision.md`](../framework-decision.md),
which captures the chosen framework and rationale. This document is
preserved in the archive as a methodology reference for future
documentation-only research passes.

**Parent epic:** [`event-platform-epic.md`](../event-platform-epic.md), Milestone
M0, Phase 0.2. The parent epic uses the word "spike" for this phase, which
historically implies a hands-on side-by-side build. This plan deliberately
narrows that to **documentation and consensus research only** — no code is
written, no throwaway branches are created, no `tmp/` artifacts are produced.
The PR that lands the decision doc also tightens phase 0.2's wording in the
parent epic so the two are aligned.

**Deliverable:** `docs/plans/framework-decision.md` landed on `main` via a
single PR. The PR adds the decision doc and updates the parent epic's
phase 0.2 wording; it adds no other files and changes no production surface.

## Purpose

Phase 0.2 of the Event Platform Epic locks the framework choice for
`apps/site` — the SSR/SSG-capable second app that will serve `/event/:slug`
landing pages. The epic names two candidates, **Next.js App Router** and
**Remix / React Router 7 framework mode**.

This plan governs the research. It defines what must be learned, how to
learn it from documentation and accepted community consensus, what
dimensions the decision must address, and the exact shape of the decision
doc the PR lands. It does not pre-commit to a choice; both candidates are
treated as live until the research concludes.

## Research Posture

The research is purely literature- and consensus-based. Authoritative
sources, in order of preference:

1. **Official framework documentation** for the pinned version under
   evaluation, including production-deploy guides, server-rendering guides,
   metadata APIs, and any official Supabase or Vercel integration pages.
2. **Official Supabase and Vercel docs** for each framework, when those
   vendors publish framework-specific guides.
3. **Framework changelogs and release notes** for the version pinned in
   the decision doc, to capture recent posture changes.
4. **Accepted community consensus** — RFC threads, well-known maintainer
   posts, framework-team blog posts. Treated as evidence, but lower
   confidence than official docs and tagged accordingly.
5. **Existing repo state** for the team-familiarity dimension and for
   anything about how `shared/` will be consumed.

Where two sources conflict, the research prefers the more recent official
doc, and notes the conflict explicitly in the decision doc.

The research does **not**:

- build, run, or import either framework
- create throwaway branches, scratch directories, or `tmp/` artifacts
- claim to have verified anything that would require running code
- run `npm run lint`, `build:web`, or any other repo validation surface
  beyond what the doc-only PR exercises

This posture trades concrete observation for speed and review surface area.
The accepted residual risk — that a framework's docs over-promise or
under-warn relative to production reality — is owned by **M0 phase 0.3**,
which is the first phase that runs the chosen framework against the
production domain and the cookie boundary. The decision doc names this
handoff explicitly.

## Scope

In scope:

- documentation- and consensus-based research on each candidate against
  the criteria below
- a decision doc capturing candidates, criteria, evidence sources, choice,
  and rationale, plus any open questions surfaced for later milestones
- a small wording update to phase 0.2 in
  [`event-platform-epic.md`](../event-platform-epic.md) so the epic
  reflects the research-only posture

Out of scope:

- any hands-on framework build, even minimal or scratch
- throwaway branches, `tmp/spike/` directories, scratch notes committed
  to the repo
- evaluating frameworks outside the epic's named candidate list. If both
  candidates appear non-viable from the documentation, the research
  escalates to a stop-and-report per the epic's risk-register entry
  "Framework spike outcome," not a unilateral introduction of a third
  option
- the `apps/site` scaffold proper. That is M0 phase 0.3 and lands in its
  own PR after this decision merges
- production cookie-boundary verification across `apps/web` and
  `apps/site`. That is also M0 phase 0.3
- per-event theme content authoring; themes remain TypeScript modules per
  the epic's Out Of Scope list
- any change to `apps/web`, `shared/`, `supabase/`, `docs/architecture.md`,
  or any other production surface during the research
- any commitment of screenshots, scratch files, or local notes to `main`

## Why Now

The two candidates differ on choices that ripple through every subsequent
milestone:

- M1's `shared/` foundation extraction needs to know whether the consuming
  app uses RSC (Next.js) or route loaders (Remix) so the extracted
  primitives expose the right idioms for both consumers
- M2's per-event admin route shell renders inside `apps/web` but must
  share auth and theme primitives with `apps/site`; the chosen framework
  affects which primitives are server-rendered and which are client-only
- M3's rendering pipeline depends on the framework's SSR/SSG capabilities
  for unfurl previews and per-event meta tags
- M4's Madrona launch rides on whatever the chosen framework enables for
  performance and SEO posture

Resolving the choice with documented evidence rather than instinct
unblocks all four later milestones simultaneously and keeps the per-PR
review cost on M1–M4 focused on extraction and feature work rather than
re-litigating the framework.

## Cross-Cutting Invariants

These invariants hold across the research, the decision doc, and any
subsequent epic work the decision touches.

- **No code lands and no code is written.** The PR's file list is the
  decision doc plus the parent-epic wording tweak. No package, lockfile,
  config, or scratch artifact is touched. Reviewer should be able to
  confirm by inspecting the PR diff.
- **Both candidates are evaluated against the same evidence shape.** Every
  criterion has the same depth of investigation for each candidate, drawn
  from the same source-quality tier where possible. A one-sided
  evaluation (deep on the favored option, shallow on the other) is a
  stop-and-report condition.
- **Criteria are named before evidence is gathered.** The criteria list
  in the decision doc is fixed up front (this plan + the epic). New
  criteria surfaced mid-research are added with explicit rationale, not
  inserted silently to favor one option.
- **Every evidence claim names its source and confidence tag.** Each
  per-dimension observation in the decision doc points at a specific
  doc URL, changelog entry, or community thread, with a confidence tag
  (`from docs`, `from changelog`, `from consensus`, `from repo state`,
  `unknown`). Claims with no source, or claims tagged `verified` without
  a documented run, are forbidden — verification belongs to phase 0.3.
- **Decision is decision-complete.** The decision doc names the chosen
  framework, the rationale, and at minimum one rejected-but-reasonable
  alternative path so future readers can reconstruct the call. Soft
  language ("probably," "leaning toward," "either could work") is banned
  per the AGENTS.md plan-soft-commitment rule.
- **The two-day budget is the budget.** If at the end of day two the
  evidence is not conclusive enough to call, the research stops and the
  epic's risk-register "framework spike outcome" path is followed
  (escalate to broader re-evaluation), not extended unilaterally.

## Background The Researcher Should Read First

Before opening either framework's docs, the researcher reads:

- `docs/plans/event-platform-epic.md` — full epic, with attention to
  M0/M1/M3 dependencies on the framework choice and the URL contract
  invariant
- `docs/architecture.md` — current `apps/web` shape, trust boundary, and
  data flow
- `apps/web/src/lib/supabaseBrowser.ts`, `apps/web/src/auth/`, and
  `apps/web/src/lib/authApi.ts` — the existing Supabase Auth and session
  surface that `shared/auth/` will encapsulate in M1; the framework
  choice constrains what server-side primitives `shared/auth/` can
  expose
- `apps/web/vercel.json` — current rewrite topology; the new topology
  for two apps is named in M0 phase 0.3 and constrains how each
  framework integrates with Vercel monorepo routing
- `docs/dev.md` validation commands and the existing Vite + React 19
  posture — the team's current familiarity baseline
- `docs/open-questions.md` for any prior framework-shaped questions that
  may pre-bias the call

The researcher should be able to summarize, in two paragraphs, the
current SPA architecture and the specific gaps that motivate `apps/site`
before opening any framework docs. If they cannot, the desk research
starts inside the repo, not on the web.

## Dimensions The Decision Must Address

The epic names five criteria. The research treats each as a first-class
section in the decision doc, with documented evidence per candidate. The
list below is the canonical set; the research does not silently expand
or contract it.

1. **Auth integration.** What server-side Supabase Auth helpers does each
   framework's documented integration provide? What seam shape does the
   framework impose on `shared/auth/` (RSC + Server Actions vs. route
   loader + action)? Documented session-cookie behavior across same-
   domain path-routed apps. Source priority: official Supabase
   framework-specific guide, then the framework's own auth docs, then
   community consensus on the cookie-boundary pattern.
2. **Supabase data loading.** Documented pattern for calling Supabase
   from server context per framework. Where generated TypeScript types
   are imported and how. Caching, revalidation, or streaming primitives
   exposed by the framework that affect the M3 `EventContent` lookup.
3. **SSR/SSG ergonomics.** Documented support for request-time HTML on
   dynamic `/event/:slug`, per-route metadata APIs (Next.js `metadata`
   export vs. Remix/RR7 `meta` function), static-at-build vs. render-at-
   request defaults. Documented approach to server-rendering a
   `<ThemeScope>` equivalent that injects CSS custom properties without
   FOUC.
4. **Deploy cost.** Vercel's documented integration model for each
   framework in a monorepo with path-based rewrites. Function-count and
   cold-start posture per framework's defaults. Edge vs. node runtime
   defaults. Whether the deploy model is consistent with the epic's "no
   remote staging Supabase" constraint.
5. **Team familiarity.** The team currently ships a Vite + React 19 SPA.
   Distance from that baseline per candidate, drawn from public learning
   resources and the framework's own "migrating from SPA" or "for React
   developers" docs. Whether ramp is one-time per-framework learning or
   recurring per-PR cost.

The research also addresses these secondary dimensions explicitly,
because each shapes the rest of the epic even if it is not on the
epic's named list:

6. **Theme rendering posture.** Per the epic's "Theme route scoping"
   invariant, `<ThemeScope>` (or framework equivalent) wraps event
   routes and CSS custom properties carry themable tokens. The research
   identifies, from each framework's docs, how the wrapper renders
   server-side and what FOUC mitigations are documented. This is the
   single biggest hidden-cost surface, because a framework whose docs
   only describe client-only theming forces a follow-up redesign in
   M1.5.2.
7. **Cross-app navigation and cookie domain.** The research documents
   the *expected* cookie story across `apps/web` and `apps/site` per
   candidate based on each framework's auth-helper docs and Supabase's
   framework-specific guidance. Production verification is M0 phase
   0.3.
8. **Test story.** Existing Playwright tiers
   (`playwright.*.config.ts`) stay; the research confirms from each
   framework's testing-docs page that the candidate has documented
   support for the existing test runners and that unit/integration
   tests for server-rendered routes have a documented path.
9. **Consumption shape for `shared/`.** From each framework's docs, the
   research identifies the idioms it expects `shared/auth/`,
   `shared/db/`, `shared/urls/`, `shared/events/`, `shared/styles/` to
   ship — RSC-friendly server modules vs. universal-runtime modules vs.
   route-loader-shaped helpers — and which one minimizes adapter code
   in `apps/web` (which stays Vite + React) and `apps/site`.
10. **Future flexibility.** Whether the framework choice would lock the
    epic into one runtime model for `apps/web` later. The epic does not
    migrate `apps/web` off Vite, but a framework whose `shared/` idioms
    actively fight Vite consumption is a hidden tax on every M1 phase.

The decision doc lists all ten dimensions even when one candidate
dominates; "no contest on this axis" is itself useful evidence and helps
future readers understand the call.

## Phases

The research is two days. The phases below are bounded by deliverable,
not strictly by clock; the budget is enforced at the research level, not
per phase. Each phase is a working session by the researcher; only the
final phase opens a PR.

### Phase 0.2.A — Per-candidate documentation pass

For each candidate, working from the pinned major/minor version, walk
the framework's documentation and capture per-dimension observations in
local working notes (the researcher's environment, not the repo).
Sources are linked by URL, changelog reference, or doc anchor.

Output of this phase is a per-candidate evidence table covering all ten
dimensions, with each entry tagged by source and confidence. Time
budget: most of day one.

This phase is symmetric across the two candidates; the researcher does
not deeply investigate one and shallowly survey the other.

### Phase 0.2.B — Cross-candidate consolidation and verdicts

Working from the two per-candidate evidence tables, produce, per
dimension:

- the concrete observation per candidate, with source link
- the implication for `apps/site` and for `shared/`
- a relative comparison verdict (`A better`, `B better`, `tie`, or
  `not differentiating`) with a one-sentence justification rooted in
  the cited evidence

Conflicts between sources are noted explicitly with the conflict and
the resolution rule applied (most recent official doc wins, with the
older source listed for traceability). Time budget: morning of day
two.

### Phase 0.2.C — Decision and PR

Land the decision doc at `docs/plans/framework-decision.md` via a
single PR against `main`. The PR contains exactly:

- the new decision doc
- a small wording update to phase 0.2 in
  `docs/plans/event-platform-epic.md` reflecting research-only posture
  (replacing the "throwaway branch" language)
- this plan doc itself, deleted in the same PR per AGENTS.md "delete
  temporary execution-plan/checklist docs," unless the team explicitly
  decides to archive it under `docs/plans/archive/` for methodology
  reuse

Time budget: afternoon of day two.

The PR body uses the standard PR template. The Validation section
checks `npm run lint` (the repo lint covers the doc tree's referenced
file paths and confirms no incidental edits) and explicitly notes that
no build-touching files changed.

## Decision Doc Structure

The PR lands `docs/plans/framework-decision.md` with this exact section
structure. The doc is the durable artifact; this plan is discarded
after the PR merges.

1. **Status.** `Landed in commit <SHA>` flipped per AGENTS.md
   plan-to-PR-completion gate.
2. **Decision.** One paragraph: chosen framework, headline rationale.
3. **Candidates evaluated.** Versioned list of the two candidates and
   the explicit choice not to evaluate others, with the epic's
   risk-register escalation path noted.
4. **Research posture.** One paragraph stating that the decision is
   based on documentation and accepted consensus, that no code was
   built, and that production verification is M0 phase 0.3's
   responsibility.
5. **Criteria.** The ten dimensions enumerated above, in order,
   verbatim.
6. **Evidence per dimension.** For each of the ten dimensions, a
   subsection with per-candidate observations (each with source URL
   and confidence tag) and a relative verdict from phase 0.2.B.
7. **Rationale.** Why the chosen framework wins on the dimensions that
   matter most for this epic, and why the dimensions where the other
   candidate was stronger do not change the call.
8. **Implications for downstream milestones.** Concrete callouts for
   M0 phase 0.3, M1 (every subphase), M3, and M4 about decisions the
   framework choice enables or constrains. This is the section that
   later milestone PRs cite when justifying their structure.
9. **Open questions opened.** Any decision the research could not close
   from the documentation (e.g., a sub-choice between two adapter
   packages, or a doc gap that phase 0.3 must verify) is logged here
   and mirrored into `docs/open-questions.md` per the epic's "Open
   Questions Newly Opened" rule.
10. **Risks accepted.** Anything the research chose to defer rather
    than answer (e.g., "framework version X is one minor behind
    latest; we accept the risk of upgrading in M0.3"; "the cookie
    boundary is documented but not exercised; phase 0.3 owns that
    verification"), with rationale.

## Validation Gate

- `npm run lint` (the PR adds a doc; lint covers the repo and confirms
  no incidental edits)
- visual confirmation that the PR's file list is the decision doc, the
  parent-epic wording update, and (if not archived) the deletion of
  this plan — no other files
- self-review walk against this plan's Cross-Cutting Invariants section,
  applied to both the decision doc and the PR diff

The PR does not introduce any framework dependency, so `npm run
build:web` is unchanged and not a relevant validation surface for this
PR. `npm run build:site` does not yet exist; it lands in M0 phase 0.3.

## Documentation

This phase's only durable doc is `docs/plans/framework-decision.md`
itself, plus the parent-epic wording tweak. The epic's M0 row is not
flipped by this phase; M0 status flips when phase 0.3 lands. The
decision doc cross-references but does not modify:

- `docs/plans/event-platform-epic.md` — referenced as parent; only the
  phase 0.2 wording is touched
- `docs/architecture.md` — referenced for current SPA shape; updated in
  later milestones, not this PR
- `docs/dev.md` — referenced for current Vite/React baseline; updated
  in M0 phase 0.3 when `npm run build:site` is added

If the research opens a new question, `docs/open-questions.md` is
updated in the same PR per the epic's open-questions rule.

This plan doc itself is removed from `docs/plans/` once the decision PR
merges, per AGENTS.md "delete temporary execution-plan/checklist docs
or convert them into durable reference docs." It can be archived to
`docs/plans/archive/` if a future reader would benefit from
reconstructing the research methodology, otherwise it is deleted.

## Self-Review Audits

From `docs/self-review-catalog.md`, applied at the decision-doc PR's
commit boundary:

- **Readiness-gate truthfulness audit.** This is the most important
  audit for a research-only PR. Every claim in the decision doc must
  carry a source and confidence tag. Claims that read as "verified"
  or "confirmed" without a documented run are rewritten to reflect
  their actual basis (`from docs`, `from consensus`). The audit is
  what stops the doc from over-stating evidence the research did not
  actually exercise.
- **Rename-aware diff classification.** N/A for this PR (decision doc
  added, epic wording tweaked), but the auditor confirms no incidental
  file renames slipped in.
- **CLI / tooling pinning audit.** N/A in this PR (no dependency
  changes), but the decision doc's "candidate version under
  evaluation" entries are pinned to specific majors/minors, so M0
  phase 0.3 inherits a reproducible target.

## Risks

- **Documentation gap.** A framework's docs may not cover a dimension
  the research must address (especially the cookie-boundary or theme-
  FOUC dimensions). Mitigation: the relevant dimension's entry in the
  decision doc tags the gap as `unknown` and routes the verification
  to phase 0.3's open-questions list rather than guessing.
- **Docs over-promise relative to production reality.** The accepted
  residual risk of research-only posture. Mitigation: phase 0.3 owns
  end-to-end verification on the production domain. The decision doc
  states this handoff explicitly so the M0.3 implementer treats the
  framework-doc claims as hypotheses to confirm, not as facts.
- **Confirmation bias.** The researcher may arrive with a preference.
  Mitigation: the criteria list is locked in this plan before evidence
  gathering, the per-candidate doc-pass is symmetric (phase 0.2.A),
  and the decision doc requires per-candidate evidence on every
  dimension — including ones where the favored candidate is weaker.
- **Two-day budget overrun.** Mitigation: the budget is enforced at
  the research level, the doc-pass is structured to surface "decisive
  enough" or "not decisive" by end of day one, and the epic's
  risk-register escalation path is invoked rather than the research
  unilaterally extending.
- **Framework changelogs drifting.** Both candidates ship frequently.
  Mitigation: pin versions in the decision doc and accept a stated
  risk that the M0 phase 0.3 implementation may bump within the same
  major.

## Related Docs

- [`event-platform-epic.md`](../event-platform-epic.md) — parent epic
- [`docs/architecture.md`](../../architecture.md) — current SPA shape
- [`docs/dev.md`](../../dev.md) — current contributor workflow baseline
- [`docs/open-questions.md`](../../open-questions.md) — log destination for
  any new question the research opens
- [`docs/self-review-catalog.md`](../../self-review-catalog.md) — audits
  named above
