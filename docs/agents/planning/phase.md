# Phase Planning Sessions

Per-level planning playbook for **phase-planning** sessions. Loads
[`shared.md`](./shared.md) for cross-level planning rules
(`Verified by:` annotations, falsifiability check, rules-vs-
estimates labeling, plan-code minimalism, plan-doc review
stance, planning-artifacts-cite-each-other anti-pattern, exact-
match label quoting, `In draft` → `Proposed` promotion gate,
and the Plan-to-PR Completion Gate including the Status
lifecycle the implementing PR consumes — all in
[`shared.md`](./shared.md)). This file covers what is unique to
the phase level.

A phase planning session produces the per-phase plan that an
implementing PR consumes. Run this session just-in-time before a
phase's implementation starts. Drafting the scoping and plan docs
may begin while the prior phase is still in implementation or
review, provided every still-pending decision in the prior phase
is enumerated as a named "input from prior phase" in the scoping
doc and carried through the plan doc as an open input the plan
must verify before promotion. A pending input is only valid if it
cites the concrete surface where the decision is being made — a
PR number, a scoping-doc section heading, a review-comment
thread, an issue number, or a named cross-phase decision in the
milestone doc. Bare "TBD," "pending," or
unattributed-prose entries do not count and must be resolved
(either by citing the surface or by deciding the question now)
before they can be carried as inputs. The plan's `Status:` stays
`In draft` (not `Proposed`) until every named input has settled —
this is the canonical pre-`Proposed` label per [`shared.md`](./shared.md)
"`In draft` → `Proposed` promotion gate," and the gate's full
self-review walk runs before the flip. Updating
the next-phase draft if the prior phase shifts during
implementation or review is an accepted cost — preferable to
forcing serial execution. Do **not** open phase planning in batch
alongside the prior phase's planning session: that risks
recording assumptions before any code exists to ground them; the
relaxation here is about parallelism with **implementation or
review**, not with **planning**.

- **Goal.** Produce two artifacts that split ownership cleanly
  rather than co-cover the same content: a phase scoping doc
  (transient — deletes in batch with sibling scoping docs at the
  milestone-terminal PR) and a phase plan doc (durable — survives
  the feature). Paths follow the epic's in-repo plan layout (see
  the path-conventions paragraph in [`epic.md`](./epic.md)): for
  epics under the epic-folder convention, scoping at
  `docs/plans/epics/<epic-slug>/scoping/m<N>-phase-<X>-<Y>.md` and
  plan at `docs/plans/epics/<epic-slug>/m<N>-phase-<X>-<Y>-plan.md`;
  for pre-convention epics, scoping at
  `docs/plans/scoping/m<N>-phase-<X>-<Y>.md` and plan at
  `docs/plans/m<N>-phase-<X>-<Y>-plan.md`. The next bullet
  specifies what each owns; both docs may carry a Status block and
  a one-paragraph phase summary for orientation, and that is the
  only intentional overlap.
- **Scoping owns / plan owns.** Because scoping deletes at
  milestone-terminal PR, the durable plan must end up with
  everything worth persisting in record after the feature
  launches; restating the same content in scoping during the
  scoping doc's lifetime burns drafting time and creates drift
  risk every time one side updates without the other.
  - **Scoping owns** the deliberation prose with rejected
    alternatives (the "Decisions made at scoping time" section,
    each decision carrying `Verified by:` code citations), the
    open decisions to make at plan-drafting (handoff), the
    plan-structure handoff, and the reality-check inputs the
    plan must verify (handoff). This content has no audience
    after the plan lands — exactly why it lives somewhere
    transient.
  - **Plan owns** Status (Proposed → Landed lifecycle), Context
    preamble (per the rule below), Goal, Cross-Cutting
    Invariants, Naming, Contracts (full final shape), Files to
    touch (new / modify / intentionally not touched), Execution
    Steps, Commit Boundaries, Validation Gate, Self-Review
    Audits, Documentation Currency PR Gate, Out Of Scope (final,
    not deliberation), Risk Register, and Backlog Impact.
  - **Scoping does not restate plan-owned content.** Where a
    scoping decision touches the file inventory, a contract, an
    invariant, a validation procedure, or a risk, scoping
    references the plan's section by name ("the `EventContent`
    type defined in the plan…"); it does not duplicate the
    artifact. The reality-check gate (named below) operates on
    scoping's decisions — load-bearing claims about the codebase or
    supporting services that reality-check verifies — not on
    duplicated contract text.
  - Recurring trap from M3 phase 3.1's first drafts: scoping +
    plan together ran ~4,300 lines because both docs carried the
    full file inventory, full Contracts, full Cross-Cutting
    Invariants, full Risk Register, and (in 3.1.2) full
    Self-Review Audits — roughly 60% duplication for the same
    coverage, with drift risk every time one side updated
    without the other. Existing landed phase plans (M2 phases
    2.1 through 2.5, M3 phase 3.1.1) predate this rule and are
    not retroactively non-conforming. Live phase docs
    mid-flight when this rule lands (M3 phase 3.1.2 is the
    in-flight case at land time) are not retroactively
    non-conforming either; the rule applies to phase planning
    sessions opened from this point forward, though authors of
    mid-flight scoping docs may opt to trim duplicated content
    into "see the plan" references if the scoping has not yet
    been promoted to a merged implementing PR
- **Scoping precedes plan drafting; check before starting plan
  draft.** Before opening the plan doc to write, verify the
  scoping doc exists at this phase's canonical scoping path per
  the epic's in-repo plan layout (paths named in the "Goal"
  bullet above) with substantive scoping-owned content per the
  rule above — at minimum, a
  "Decisions made at scoping time" section with at least one
  decision carrying a `Verified by:` code citation, plus
  whichever of "Open decisions to make at plan-drafting,"
  "Plan structure handoff," and "Reality-check inputs" the
  phase needs. Not empty, not a stub, not a placeholder
  paragraph saying "scoping pending." If the scoping doc does
  not exist or is a stub, do scoping first as its own artifact;
  plan-drafting cannot start without it. Without scoping
  content, the reality-check gate below has nothing to operate
  on, and plan-drafting silently collapses into
  scoping-during-drafting — exactly what scoping exists to
  separate from drafting. The substantive-content list named
  here is the falsifier for that gate; it intentionally tracks
  scoping's owned content per "Scoping owns / plan owns"
  above, not the plan-owned content (file inventory, contracts,
  validation surface, risks) that earlier drafts of this rule
  asked scoping to also carry. The check is a simple
  file-existence + first-paragraph read, takes seconds, and
  protects against the most common procedural skip when phase
  planning starts in a fresh agent session that did not produce
  the scoping doc
- **Doc-only decision phases satisfy the substantive-content
  gate via cited open-question constraints, not resolved
  decisions.** When the whole phase output is the decision
  artifact — no code ships, no contracts get implemented; the
  durable plan doc IS the recorded decisions plus rejected
  alternatives — the scoping doc may surface the decision space
  without resolving any decisions at scoping-doc-open time.
  Decisions resolve through the collaborative deliberation that
  constitutes the phase, then absorb back into the durable
  artifact. The protective intent of the rule above (prevent
  stub-scoping → drafting collapse) holds, but is satisfied
  differently: the scoping doc must carry code-grounded
  `Verified by:` citations on the constraints that bound each
  open question, and on the reality-check inputs the resolution
  will rest on. Citation-free constraints, generic "TBD"
  placeholders, or open-question sections that don't decompose
  the decision space against actual code still fail the gate —
  the carve-out is for decision-deferral, not for skipping the
  code grounding. Code-shipping phases do not get this carve-
  out: the decision-resolved-at-scoping-time bar still applies
  because the plan-drafting step that scoping precedes is real
  for them. Demo-expansion phase 3.1
  ([scoping/m3-phase-3-1.md](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md))
  is the canonical example: doc surfaces nine open questions
  with multi-citation constraints per question and resolves
  none at scoping time, by deliberate user direction; the
  closing PR will land the decisions into the durable
  artifact (either by promoting the scoping doc or by drafting
  a thin plan that links to it for the deliberation prose)
- **Narrow-surface phases may skip the scoping doc.** A phase
  whose estimated implementation surface is bounded enough that
  options-considered analysis and reality-check input gathering
  would not produce material content may go straight to drafting
  the plan doc. A phase qualifies as **narrow-surface** when ALL
  of these hold:

  1. **Single subsystem.** Touches one of: a UI surface (route,
     section, component), a data-model layer (table, migration),
     or backend logic (RPC, edge function). Phases spanning more
     than one of these classes are multi-subsystem and do not
     qualify.
  2. **Bounded file count.** Plan estimates ≤ 8 files touched
     (excluding generated types and test files).
  3. **No new public-API contract.** No new RPC, no new auth /
     authz boundary, no new route family. Additive schema-touch
     (CREATE TABLE, ADD COLUMN) is allowed; non-additive changes
     (ALTER on existing tables, FK refactor, RLS rewrite) require
     the full path.
  4. **No new cross-cutting invariant.** The change does not
     introduce a rule that multiple files must agree on.
     Cross-cutting invariants are the load-bearing reason scoping
     docs exist; their absence is the load-bearing reason to skip.
  5. **No novel mechanism.** Uses patterns already established in
     the codebase. Novel mechanisms (a new auth shape, a new
     framework idiom, a new SECURITY DEFINER pattern) trigger the
     "Spike before plan for novel mechanisms" rule below and
     warrant scoping.

  All five must hold. If any fails, draft the scoping doc as the
  "Scoping precedes plan drafting" rule above requires. This
  carve-out is an exception the planner explicitly invokes; the
  default direction stays "scoping first," matching the precedent
  of the "Doc-only decision phases" carve-out above (also an
  explicitly-invoked exception to the same rule).

  **Verification protocols are not optional under this carve-out.**
  Narrow-surface phases must still carry the reality-check inputs
  the implementing pass walks (per the "Reality-check gate between
  scoping and plan" rule below). The plan doc absorbs them inline
  when the scoping doc is skipped — the *form* compresses (a
  Reality-check inputs section in the plan rather than a separate
  scoping artifact), the *function* (falsifier protocol against
  load-bearing claims) does not. A narrow-surface phase whose plan
  doc has no Reality-check inputs section has skipped the
  carve-out's protective intent, not just its prose.

  **Recent M1 phases as ground truth.** Phase 1.2 (one TypeScript
  field on `EventContent` + one section component, ~6 files, no
  DB, no auth, no novel mechanism) qualifies. Phase 1.3 (form
  route + additive DB) is borderline on criterion 1 (UI surface +
  data-model layer = two subsystems) and likely does not qualify.
  Phase 1.1 (DB foundation including initial RLS policies and
  grants) does not qualify because it introduces cross-cutting
  RLS / grants invariants. Pre-existing phases drafted before this
  rule are not retroactively non-conforming; phases drafted from
  this point forward apply the carve-out when its criteria hold.
- **Plan opens with a plain-language context preamble.** Before any
  implementation specifics (file paths, framework names, function
  signatures, phase-numbering shorthand), the plan must contain
  1–3 paragraphs that name three things in plain English: **what
  this phase is** (the surface or capability under change, not the
  file paths), **why it's being done now** in human terms ("closes
  the loose end of apps/web still owning non-event-scoped URLs
  after 2.3 landed," "lays the foundation for organizer self-serve
  work in a future phase"), and **what surfaces this touches** at
  the conceptual level (admin pages, routing layer, e2e fixtures,
  docs — not file paths). Phase-numbering prose ("depends on 2.2 +
  2.3," "prerequisite for 2.5") describes the dependency graph,
  not the motivation, and does not satisfy "why now." The preamble
  can live at the top of `## Goal` or in a separate `## Context`
  section before Goal; structure is implementer choice. The
  protective check this rule enforces: a reader who hasn't read
  the epic, milestone, or scoping doc can understand what problem
  this phase solves and why anyone should care after reading the
  plan's first ~250 words. Implementation-detail-first openings
  are the recurring trap that motivates this rule — M2 phase 2.4's
  first draft opened with "Migrate /admin from apps/web (Vite/React)
  to apps/site (Next.js 16 App Router) as the root-admin platform
  surface," which is true, complete, mechanical, and silent on why
  anyone other than the plan author should care. Existing landed
  plans (M2 phases 2.1, 2.2, 2.3) predate this rule and are not
  retroactively non-conforming; the rule applies to plans drafted
  from this point forward
- **Reality-check gate between scoping and plan.** Before promoting
  the scoping doc to plan-drafting, do a forced reality-check pass on
  every load-bearing claim about the codebase or supporting services.
  For SQL contracts: read the actual migration files for named
  tables, policies, RPCs; confirm the predicates, grants, and
  constraints exist as scoped. For RPC behavior claims: read the
  function body — if the scoping says "widen the X gate," confirm
  the gate exists. For PostgreSQL semantics claims: write one
  sentence that would falsify the claim and check whether it
  falsifies (recurring trap: PostgreSQL applies SELECT during
  UPDATE/DELETE, so write policies don't fire if the row isn't
  SELECT-visible). For TypeScript / Edge Function contracts: read
  the function signature and at least one real call site. For URL
  contracts and route topology: confirm any URL the plan names is a
  distinct route the platform actually serves (not an inline-
  conditional render at the same URL); when an affordance points at
  "where the user does X today," verify that X has a URL distinct
  from the affordance's render site. For *validation-procedure*
  claims ("`vercel dev` will validate X," "the existing fixture
  covers Y," "`npm test` will catch Z"), trace whether the procedure
  actually exercises the surface it claims. For dev-tool semantics
  specifically (Vercel CLI, Next.js dev server, Vite, Playwright),
  read the project's actual config (`vercel.json`, `next.config.ts`,
  `vite.config.ts`) before claiming runtime behavior — these tools
  are config-dependent and general knowledge will not catch
  project-specific overrides. For external-service-behavior claims
  (Vercel rewrites / CDN ordering, Supabase RLS / auth / config
  semantics, Next.js framework conventions, Deno / Vite / Playwright
  runtime semantics, any other vendored or hosted dependency the
  codebase consumes but does not contain proof of), read the
  upstream / vendor documentation; "I think Vercel does X" is not a
  reality-check, "the Vercel docs at <URL> say X" is. Recurring
  trap: `apps/web/vercel.json` destinations are absolute production
  URLs, so `vercel dev` proxies to deployed apps/site rather than
  the branch's local Next.js dev server; "vercel dev validates the
  new local routes" was a wrong claim because the config's absolute
  destinations were never checked. If the reality-check finds a
  discrepancy, fix the scoping before drafting the plan; do not
  carry wrong premises into plan time
- **When a URL retarget changes which component renders, re-audit
  every assertion the test makes after the retarget — not just URL
  strings.** A test's locator inventory before and after a URL
  change can differ even when the URL is the only line edited. A
  test that called `getByRole("button", { name: "Foo" })` on the
  old URL's component may find a different component (with no
  "Foo" button) on the new URL. Locator-stability invariants on
  the *new* page (e.g., the apps/site `/admin` event-list surface
  in M2 phase 2.4.2) cover what that page must preserve; the
  per-phase plan must additionally walk the test against the *new*
  component reached at every navigation step in the test, not just
  the entrypoint. Cite the target component file for each
  navigation step the test takes, and verify the assertions
  resolve against that component's actual markup. Recurring trap:
  M2 phase 2.4.2's plan listed `Back to all events` in its
  stability set, but after `Open workspace`'s URL retargeted from
  `/admin/events/:eventId` (legacy `AdminEventWorkspace`) to
  `/event/:slug/admin` (deep-editor `EventAdminWorkspace`), the
  test reached a different component with no `Back to all events`
  button — surfaced as a mid-validation Playwright timeout, not at
  plan time. The plan's "every other assertion stays unchanged"
  claim was wrong because it audited the entrypoint surface only,
  not the post-navigation surface
- **Prefer existing wrapper scripts over lower-level CLI invocations
  in plan validation steps.** Before naming a validation command in
  a plan, search `package.json` `scripts` and `scripts/testing/` for
  an existing wrapper. If a wrapper exists, name it — the wrapper is
  what future contributors will run, and naming the lower-level
  invocation silently skips meaningful orchestration the wrapper
  does (local Docker Supabase stack, DB reset, function runtime,
  env-var sourcing, fixture seeding). The lower-level command
  usually still works, but it forces the implementer to reinvent
  setup the wrapper already handles, which is a parallel-track
  procedure rather than the project's canonical local path. This
  rule is distinct from the reality-check gate above: that one asks
  "does the named procedure exercise the right surface;" this one
  asks "is the named procedure the canonical entry point, or am I
  reinventing orchestration the project already wrapped." Recurring
  trap: M2 phase 2.4.2's plan named
  `npx playwright test --config playwright.admin.config.ts` for the
  local auth e2e exercise, missing the canonical
  `npm run test:e2e:admin` wrapper that provisions a local Supabase
  Docker stack and forwards `SERVICE_ROLE_KEY` from it
  automatically. The lower-level command worked, but it forced the
  implementer to source a production service-role key into a tmp
  file as a workaround — exactly the kind of operational drift the
  wrapper exists to prevent
- **Spike before plan for novel mechanisms.** When the phase
  introduces a new mechanism (a new authorization shape, a new
  cross-app boundary, a new SECURITY DEFINER pattern, a new
  framework idiom), build a 30-minute throwaway spike that exercises
  the mechanism end-to-end before writing the plan. The spike's job
  is to find dealbreakers — wrong assumptions about runtime
  semantics, missing constraints, hidden coupling. **Worktree
  handling for spikes** (resolves the conflict with the Pre-Edit
  Gate's clean-worktree rule): create a throwaway branch named
  `spike/<phase-or-mechanism>` off the planning branch; commit
  freely on the spike branch; do not merge it. When the spike
  concludes, either delete the branch (`git branch -D spike/...`)
  or leave it dangling for reference and continue plan-drafting on
  the original branch with a clean worktree. Spike code is never
  promoted into the implementation PR — the plan describes the
  contract, the implementation PR builds it from scratch. If a
  scratch script or non-code artifact would help, write it under
  `tmp/spikes/<phase>/` (already git-ignored under `tmp/`)
- **PR-count predictions need a branch test.** Before declaring "1
  PR" in the plan's Status block, create the branch and sketch the
  file list. If the diff would touch >5 distinct subsystems or >300
  LOC of substantive logic, split. Either ship as sub-phases
  (`m<N>-phase-<X>-<Y>-<Z>-plan.md`) or justify the size with
  concrete review-coherence reasoning. The milestone doc's PR-count
  estimate does not bind the phase plan
- **Bans on surface require rendering the consequence.** When a
  plan writes "no X" / "minimum surface" / "intentionally not
  done" for a user-visible or operationally-important surface,
  state in concrete terms what the absence looks like. For UX
  surfaces, render it: run the dev server and look at the page
  before declaring minimum sufficient. Optimizing for diff size
  produces plans that ship regressed UX. Recurring trap: M2 phase
  2.3 first drafted "no SCSS, no module CSS" for the new apps/site
  landing without checking that
  [`apps/site/app/globals.css`](/apps/site/app/globals.css)
  provided no button styling — the public-facing CTA would have
  rendered as a default-browser link. The discipline is not
  "always add CSS" but "before banning the surface, prove the no-X
  outcome is acceptable by looking at it"

  For routing/proxy/CDN config changes specifically, run the
  consequence check against a *production build* of the
  destination app, not its dev server: `next build && next start`
  at the destination, `vercel dev` (or equivalent edge emulator)
  at the source app proxying at it. Dev servers self-serve their
  own asset paths (`/_next/*` for Next, `/@vite/*` for Vite,
  etc.), which hides cross-project gaps the production proxy
  exposes — dev returns the asset, production 404s. Recurring
  trap: M2 phase 2.3's `apps/web/vercel.json` migrated
  `/auth/callback` and `/` to apps/site; the plan's local check
  ran `npm run dev:site` and never exercised the apps/web proxy
  against a production-built apps/site, so the missing
  `/_next/:path*` proxy rule stayed invisible until Codex review
  caught it pre-merge. Hydration on the `'use client'` callback
  route would have broken in production.
- **Cross-app destinations need hard navigation, not client-side
  navigation.** Client-side navigation APIs (also called soft
  navigation: `useRouter().replace(href)` / `router.push` from
  `next/navigation`, `<Link href>` components,
  `history.pushState` / `replaceState`, react-router's
  `navigate(path)`) update the URL in the browser without
  triggering a full document load, so the upstream routing layer
  (Vercel rewrites, CDN, ingress proxy) never re-evaluates.
  That's correct for in-app destinations and broken for
  destinations served by a *different* app behind a same-origin
  proxy rule — the SPA stays on itself, the proxy never fires,
  and the user lands on a 404 or a stale page. Cross-app
  destinations need hard navigation
  (`window.location.replace` / `assign`) that exits the SPA and
  re-enters the routing layer. The same trap shows up in reverse
  when a route migrates *out* of an SPA: existing client-side
  navigation tooling that still produces the migrated URL (button
  handlers, `<Link>`s, `pushState` callers) must be audited and
  converted to hard navigation; the URL is generated correctly
  but the SPA never leaves itself, so the proxy never fires. When
  a plan specifies any of these APIs as a contract, walk every
  destination and classify in-app vs. cross-app. Recurring traps
  from M2 phase 2.3: the plan contract specified
  `useRouter().replace(path)` for the apps/site `/auth/callback`
  page, but the `next=/admin` destination is owned by apps/web —
  implementer corrected to `window.location.replace(path)` so the
  apps/web Vercel rewrite layer fires. Same class: apps/web's
  `usePathnameNavigation` used `history.pushState` for
  `routes.home`, which kept users in the SPA after `/` migrated
  to apps/site; implementer added a hard-navigation seam scoped
  to `routes.home`.
- **Cap.** ~90 minutes for scope + plan combined for a typical
  phase. If you're at 3+ hours and still drafting, diminishing
  returns have hit — stop, reality-check the actual scope size, and
  either ship what's clearly right or escalate
- **Cross-phase coordination is thin.** When this phase's plan needs
  something from a sibling phase that hasn't shipped yet, write down
  the assumption and tag it for verification at sibling-merge time.
  Don't wait for the sibling phase to catch up; don't pre-coordinate
  every detail. Recording assumptions to verify-on-merge is more
  honest than committing to a contract neither side has built yet
