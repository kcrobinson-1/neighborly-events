# Framework Decision Spike — Execution Plan

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md), Milestone
M0, Phase 0.2.

**Deliverable:** `docs/plans/framework-decision.md` landed on `main` via a
single PR. Spike code itself is built on a throwaway branch and is not merged.

## Purpose

Phase 0.2 of the Event Platform Epic locks the framework choice for
`apps/site` — the SSR/SSG-capable second app that will serve `/event/:slug`
landing pages. The epic names two candidates, **Next.js App Router** and
**Remix / React Router 7 framework mode**, and bounds the investigation to a
two-day spike whose only durable artifact is a decision doc.

This plan governs the spike. It defines what must be learned, how to learn it
under the time budget, what dimensions the decision must address, and the
exact shape of the decision doc the PR lands. It does not pre-commit to a
choice; both candidates are treated as live until the spike concludes.

## Scope

In scope:

- desk research on each candidate against the epic's named criteria
- a minimal, throwaway side-by-side build of the same target page in each
  candidate, scoped tightly enough to finish inside the two-day budget
- a decision doc capturing candidates, criteria, evidence, choice, and
  rationale, plus any open questions surfaced for later milestones

Out of scope:

- merging any spike code (the only merged artifact is the decision doc)
- evaluating frameworks outside the epic's named candidate list. If both
  candidates feel non-viable, the spike escalates to a stop-and-report per
  the epic's risk register entry "Framework spike outcome," not a unilateral
  introduction of a third option
- the `apps/site` scaffold proper. That is M0 phase 0.3 and lands in its own
  PR after this decision merges
- production cookie-boundary verification across `apps/web` and `apps/site`.
  That is also M0 phase 0.3 and is not a spike concern; the spike only
  surfaces the *expected* cookie story per framework, not a verified one
- per-event theme content authoring; themes remain TypeScript modules per
  the epic's Out Of Scope list
- any change to `apps/web`, `shared/`, `supabase/`, `docs/architecture.md`,
  or any other production surface during the spike
- any commitment of `tmp/`, screenshots, throwaway branches, or scratch
  artifacts to `main`

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

Resolving the choice with evidence rather than instinct unblocks all four
later milestones simultaneously and keeps the per-PR review cost on M1–M4
focused on extraction and feature work rather than re-litigating the
framework.

## Cross-Cutting Invariants

These invariants hold across the spike, the decision doc, and any
subsequent epic work the decision touches.

- **Spike code is throwaway.** No spike code, dependency, or config lands
  on `main`. The only PR merged from this phase is the decision doc.
  Reviewer should be able to confirm by inspecting the PR's file list.
- **Both candidates are evaluated against the same evidence shape.** Every
  criterion has the same depth of investigation for each candidate. A
  one-sided evaluation (deep on the favored option, shallow on the other)
  is a stop-and-report condition.
- **Criteria are named before evidence is gathered.** The criteria list in
  the decision doc is fixed up front (this plan + the epic). New criteria
  surfaced mid-spike are added with explicit rationale, not inserted
  silently to favor one option.
- **Decision is decision-complete.** The decision doc names the chosen
  framework, the rationale, and at minimum one rejected-but-reasonable
  alternative path so future readers can reconstruct the call. Soft
  language ("probably," "leaning toward," "either could work") is banned
  per the AGENTS.md plan-soft-commitment rule.
- **The two-day budget is the budget.** If at the end of day two the
  evidence is not conclusive enough to call, the spike stops and the
  epic's risk-register "framework spike outcome" path is followed
  (escalate to broader re-evaluation), not extended unilaterally.

## Background The Spike Author Should Read First

Before opening either framework's docs, the spike author reads:

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
- the open-questions doc (`docs/open-questions.md`) for any prior
  framework-shaped questions that may pre-bias the call

The author should be able to summarize, in two paragraphs, the current
SPA architecture and the specific gaps that motivate `apps/site` before
opening any framework docs. If they cannot, the desk research starts
inside the repo, not on the web.

## Dimensions The Decision Must Address

The epic names five criteria. The spike treats each as a first-class
section in the decision doc, with evidence per candidate. The list below
is the canonical set; the spike does not silently expand or contract it.

1. **Auth integration.** How does each framework integrate with Supabase
   Auth such that the cookie set in `apps/web` is readable from
   `apps/site` on the production domain? What server-side helpers exist
   per framework? What does `shared/auth/` need to expose to satisfy
   both app consumers? Identify the seam shape the framework imposes
   (RSC + Server Actions vs. route loader + action) and how it
   constrains `shared/auth/`'s public API in M1.
2. **Supabase data loading.** How does each framework call Supabase from
   server context? Where do generated TypeScript types live and how are
   they imported? How does `shared/db/` (M1.1) shape its export surface
   to feed both frameworks' idioms cleanly? Are there caching or
   revalidation primitives the candidate exposes that affect the
   `EventContent` lookup in M3?
3. **SSR/SSG ergonomics.** How does each framework render dynamic
   `/event/:slug` pages with full HTML at request time, including
   `<meta>` tags for unfurl previews? Static-at-build vs.
   render-at-request defaults? Per-route metadata APIs? How is
   `<ThemeScope>`, which the epic mandates wrap event-route content,
   server-rendered to avoid FOUC of CSS custom properties?
4. **Deploy cost.** How does each framework integrate with Vercel
   monorepo deploys and the path-based rewrite topology in M0 phase
   0.3? Cold-start expectations, build-time expectations, function
   count, edge vs. node defaults. Does the deploy model match the
   epic's "no remote staging Supabase" constraint? Any cost surprise
   that future M3/M4 traffic would amplify?
5. **Team familiarity.** The team currently ships a Vite + React 19
   SPA. How close is each candidate's idiom to that baseline? What
   ramp does each impose on the implementer? Is the ramp front-loaded
   (one-time per-framework learning) or recurring (every PR pays cost)?

The spike also addresses these secondary dimensions explicitly, because
each shapes the rest of the epic even if it is not on the epic's named
list:

6. **Theme rendering posture.** Per the epic's "Theme route scoping"
   invariant, `<ThemeScope>` (or framework equivalent) wraps event
   routes and CSS custom properties carry themable tokens. The spike
   identifies how each framework renders the wrapper server-side and
   what FOUC mitigations are available. This is the single biggest
   hidden-cost surface, because a framework that requires client-only
   theming forces a follow-up redesign in M1.5.2.
7. **Cross-app navigation and cookie domain.** The spike documents the
   *expected* cookie story across `apps/web` and `apps/site` per
   candidate (production verification is M0 phase 0.3, not the spike).
   Specifically: same-domain path-routed apps, session token cookie
   scope, any framework default that fights the architecture.
8. **Test story.** Existing Playwright tiers (`playwright.*.config.ts`)
   stay; the spike confirms each candidate plays nicely with the
   existing test runners and that unit/integration tests for
   server-rendered routes have a documented path.
9. **Migration and consumption shape for `shared/`.** The spike
   identifies which idioms the framework expects `shared/auth/`,
   `shared/db/`, `shared/urls/`, `shared/events/`, `shared/styles/` to
   ship — RSC-friendly server modules vs. universal-runtime modules vs.
   route-loader-shaped helpers — and which one minimizes adapter code
   in `apps/web` (which stays Vite + React) and `apps/site`.
10. **Future flexibility.** Does the framework choice lock the epic into
    one runtime model for `apps/web` later? The epic does not migrate
    `apps/web` off Vite, but a framework whose `shared/` idioms actively
    fight Vite consumption is a hidden tax on every M1 phase.

The decision doc lists all ten dimensions even when one candidate
dominates; "no contest on this axis" is itself useful evidence and helps
future readers understand the call.

## Phases

The spike is two days. The phases below are bounded by deliverable, not
strictly by clock; the budget is enforced at the spike level, not per
phase. Each phase is a commit on the throwaway spike branch except the
final phase, which is the decision doc PR against `main`.

### Phase 0.2.A — Desk research and dimension snapshot

Before any code is written, produce a written snapshot, on the spike
branch under `tmp/spike-notes/desk-research.md` (untracked, scratch
only), that for each candidate covers each of the ten dimensions with
linked-source evidence. The snapshot is the input to the head-to-head
spike build; if a dimension cannot be answered from docs alone, it is
flagged for the build phase to exercise concretely.

The desk-research snapshot includes:

- candidate version under evaluation (pin specific major/minor to keep
  the comparison reproducible)
- per-dimension summary, evidence link(s), and a confidence tag
  (`from docs`, `from changelog`, `from blog`, `unknown`)
- explicit list of dimensions the build phase must verify because docs
  alone are insufficient

Output is a scratch file. Time budget: one work session of day one.

### Phase 0.2.B — Head-to-head minimal build

On a throwaway branch, build the same target deliverable in each
candidate, in parallel sibling directories under `tmp/spike/` (e.g.
`tmp/spike/next/`, `tmp/spike/remix/`). Both directories are scratch and
never merged.

The target deliverable, identical for both candidates:

- a single dynamic route at `/event/:slug` rendering server-side
- a hardcoded `EventContent`-shaped object with title, two schedule
  items, two sponsor records, theme slug
- per-event `<meta>` tags (title, description, og:image, twitter:card)
  populated from the content object
- a `<ThemeScope>` equivalent that injects three CSS custom properties
  on the route shell from a static theme module, server-rendered
- a hardcoded read of one `events` row from a local Supabase using the
  generated types from `supabase/` to validate the data-loading path
  from server context (no auth required for this read; auth flow is
  documented from docs only inside the spike, not exercised here, since
  cookie-boundary verification is M0 phase 0.3's job)
- a Vercel build that resolves locally via `vercel build` or framework
  equivalent, not necessarily a deployed preview

Each candidate's build is time-boxed to the back half of day one plus
the morning of day two. If either candidate cannot reach the target
deliverable inside its time box, that fact is itself the evidence —
documented in the decision doc as a friction signal, not papered over.

The build phase is deliberately small. The temptation to "just add
this one more thing" is the failure mode; the spike answers the named
dimensions, not every possible question.

### Phase 0.2.C — Evidence consolidation

Working from the desk-research snapshot and the head-to-head build,
produce the decision doc's per-dimension evidence section. For each
dimension and each candidate, capture:

- the concrete observation (file, command, behavior, or doc reference)
- the implication for `apps/site` and for `shared/`
- a relative comparison verdict (`A better`, `B better`, `tie`, or
  `not differentiating`) with a one-sentence justification

The consolidation step happens in the decision doc draft itself, not
in a separate scratch file. Time budget: afternoon of day two.

### Phase 0.2.D — Decision and PR

Land the decision doc at `docs/plans/framework-decision.md` via a
single PR against `main`. The PR contains exactly that one new file,
plus any cross-references touched in `docs/architecture.md` or
`docs/dev.md` if the decision doc refers to them and they need to
exist (typically not at this milestone — the doc references-but-does-
not-update them).

The PR body uses the standard PR template. The Validation section
checks `npm run lint` (touched only the docs tree, but lint runs across
the repo) and explicitly notes that no build-touching files changed.

Throwaway branches and `tmp/spike/` directories are deleted from the
local environment after the PR opens. The PR does not include them.

## Decision Doc Structure

The PR lands `docs/plans/framework-decision.md` with this exact
section structure. The doc is the durable artifact; this plan is
discarded after the PR merges per AGENTS.md "delete temporary
execution-plan/checklist docs."

1. **Status.** `Landed in commit <SHA>` flipped per AGENTS.md
   plan-to-PR-completion gate.
2. **Decision.** One paragraph: chosen framework, headline rationale.
3. **Candidates evaluated.** Versioned list of the two candidates and
   the explicit choice not to evaluate others, with the epic's
   risk-register escalation path noted.
4. **Criteria.** The ten dimensions enumerated above, in order,
   verbatim.
5. **Evidence per dimension.** For each of the ten dimensions, a
   subsection with per-candidate observations and a relative verdict
   from phase 0.2.C.
6. **Rationale.** Why the chosen framework wins on the dimensions that
   matter most for this epic, and why the dimensions where the other
   candidate was stronger do not change the call.
7. **Implications for downstream milestones.** Concrete callouts for
   M0 phase 0.3, M1 (every subphase), M3, and M4 about decisions the
   framework choice enables or constrains. This is the section that
   later milestone PRs cite when justifying their structure.
8. **Open questions opened.** Any decision the spike could not close
   (e.g., a sub-choice between two adapter packages) is logged here
   and mirrored into `docs/open-questions.md` per the epic's "Open
   Questions Newly Opened" rule.
9. **Risks accepted.** Anything the spike chose to defer rather than
   answer (e.g., "framework version X is one minor behind latest; we
   accept the risk of upgrading in M0.3"), with rationale.

## Validation Gate

- `npm run lint` (the PR adds a doc; lint covers the repo and confirms
  no incidental edits)
- visual confirmation that the PR's file list is exactly the decision
  doc plus, if applicable, doc cross-references — no spike code, no
  `tmp/` artifacts, no `package.json` changes
- self-review walk against this plan's Cross-Cutting Invariants section,
  applied to both the decision doc and the PR diff

The PR does not introduce any framework dependency, so `npm run
build:web` is unchanged and not a relevant validation surface for this
PR. `npm run build:site` does not yet exist; it lands in M0 phase 0.3.

## Documentation

This phase's only durable doc is `docs/plans/framework-decision.md`
itself. The epic doc is not flipped by this phase; M0 status flips when
phase 0.3 lands. The decision doc cross-references but does not modify:

- `docs/plans/event-platform-epic.md` — referenced as parent
- `docs/architecture.md` — referenced for current SPA shape; updated in
  later milestones, not this PR
- `docs/dev.md` — referenced for current Vite/React baseline; updated
  in M0 phase 0.3 when `npm run build:site` is added

If the spike opens a new question, `docs/open-questions.md` is updated
in the same PR per the epic's open-questions rule.

This plan doc itself is removed from `docs/plans/` once the decision PR
merges, per AGENTS.md "delete temporary execution-plan/checklist docs
or convert them into durable reference docs." It can be archived to
`docs/plans/archive/` if a future reader would benefit from
reconstructing the spike methodology, otherwise it is deleted.

## Self-Review Audits

From `docs/self-review-catalog.md`, applied at the decision-doc PR's
commit boundary:

- **Readiness-gate truthfulness audit.** Any claim in the decision doc
  about cookie behavior, deploy cost, or framework capability that
  reads as "verified" must point to a phase 0.2.B observation; claims
  derived from docs alone must say so. The audit is what stops the doc
  from over-stating evidence the spike did not actually exercise.
- **Rename-aware diff classification.** N/A for this PR (single new
  doc), but the auditor confirms no incidental file renames slipped in.
- **CLI / tooling pinning audit.** N/A in this PR (no dependency
  changes), but the decision doc's "candidate version under
  evaluation" entries are pinned to specific majors/minors, so M0
  phase 0.3 inherits a reproducible target.

## Risks

- **Confirmation bias.** The spike author may arrive with a preference.
  Mitigation: the criteria list is locked in this plan before evidence
  gathering, and the decision doc requires per-candidate evidence on
  every dimension — including ones where the favored candidate is
  weaker.
- **Two-day budget overrun.** Mitigation: the budget is enforced at the
  spike level, the head-to-head build is deliberately tiny, and the
  epic's risk register escalation path is invoked rather than the
  spike unilaterally extending.
- **Framework changelogs drifting.** Both candidates ship frequently.
  Mitigation: pin versions in the decision doc and accept a stated
  risk that the M0 phase 0.3 implementation may bump within the same
  major.
- **Spike code leaking to `main`.** Mitigation: the throwaway branch is
  never targeted by a PR; the decision-doc PR is opened from a
  separate branch with only the doc change.
- **Cookie-boundary surprise found later.** The spike documents
  expected behavior; M0 phase 0.3 verifies actual behavior on
  production domain. The risk is owned by phase 0.3, not by this PR.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent epic
- [`docs/architecture.md`](../architecture.md) — current SPA shape
- [`docs/dev.md`](../dev.md) — current contributor workflow baseline
- [`docs/open-questions.md`](../open-questions.md) — log destination for
  any new question the spike opens
- [`docs/self-review-catalog.md`](../self-review-catalog.md) — audits
  named above
