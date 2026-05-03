# M3 Phase 3.1 — Demo-Mode Data-Access-Semantics Decision (Doc-Only)

## Status

Landed.

This plan ships its decision-record contracts in the same PR
that introduces it per AGENTS.md "Plan-to-PR Completion Gate."
Because 3.1 is doc-only, the implementing PR contents are this
plan's edit contracts: the scoping doc (created during the
planning session, deletes in batch at M3-terminal PR per
AGENTS.md "Phase Planning Sessions → Output set"), this plan
doc, milestone-doc edits, and the
[`docs/open-questions.md`](/docs/open-questions.md) closure.
The implementing PR sets Status to Landed in this same edit
per the M1 phase 1.1 precedent
([`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md)).

## Context

The demo-expansion epic ships a marketing/demo experience that
threads internal partners through the platform's
attendee/admin/redeem/redemptions surfaces on the two test events
(`harvest-block-party`, `riverside-jam`). M1 wired per-event
themes into the apps/web event-route shells; M2 rebuilt the home
page with role-door entry points whose Organizer + Volunteer cards
carry "Sign in or wait for demo mode" framing pending M3. M3
removes the auth interception on those role-door targets so a
visitor without sign-in can reach the admin / redeem / redemptions
surfaces on the two test slugs.

Removing the page-level `SignInForm` interception is necessary
but not sufficient for the bypassed surfaces to render — the data
each surface fetches is RLS-gated and currently denies anonymous
reads, and the mutation Edge Functions reject anonymous callers
at their manual auth gates. M3's milestone doc therefore opened
this phase as a doc-only decision phase: settle the demo-mode
data-access semantics (read-only browse / functional with
persistence and reset / sandbox-ephemeral) before any
implementation phase commits to a code shape that depends on
the answer.

What this phase touches at the conceptual level: the doc
surface (this plan, the milestone doc, the open-questions ledger)
and nothing else. No code, no migrations, no tests. The
artifacts this PR ships are the canonical decision record that
phase 3.2+ plan-drafting reads when it picks the implementation
shape, plus two correctness fixes to milestone-doc claims that
deliberation-time reality-check refuted.

## Goal

Produce the canonical written record of M3's demo-mode
data-access semantics, scoped to:

- **What M3 ships:** read-only browse on the bypassed test-event
  surfaces, with reads mediated by an Edge Function shim and
  writes rejected with HTTP 403 + a structured error body so the
  UI can switch on the error code.
- **What M3 explicitly does NOT commit to:** functional with
  persistence and reset (B), or sandbox-ephemeral (C). Both are
  live candidates for the second-iteration scoping pass the
  epic already contemplates against M4–M6, against partner
  feedback from the M3-shipped surfaces.
- **What 3.2+ phase planning inherits:** the read-mediation
  pattern (Edge Function shim) and the write-side server
  contract (403 + structured body) are bound here. The
  client-side rejection UX shape (disabled / hidden /
  click-and-error) is bound only as a contract — "the UI must
  communicate the read-only state on mutation controls" — with
  shape deferred to 3.2+ plan-drafting against rendered
  components. The 3.2+ phase split (1 PR vs. 2 PRs along a
  read-side / write-side seam) is deferred to 3.2's plan-drafting
  branch test.
- **Doc-currency corrections this PR also lands** (per AGENTS.md
  "Plan-to-PR Completion Gate"): the milestone-doc claim that
  no unauthenticated-Edge-Function precedent exists in
  `supabase/functions/`, and the milestone-doc framing that
  "the data each surface fetches" implies all three bypassed
  surfaces need read mediation.

After 3.1's PR merges, 3.2's plan-drafting can begin against an
actually-merged decision record rather than a placeholder.

## Cross-Cutting Invariants

3.1's PR is doc-only. It does not modify code, schema, or
tests. The cross-phase invariants that bind the M3 set
(test-event allowlist single source of truth, real events never
receive bypass, cross-app demo signaling stays honest, M2
role-door copy revision lands with bypass) are stated in the
milestone doc at
[m3-demo-mode-auth-bypass.md "Cross-Phase Invariants"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
3.1's diff has no surface against which they could be evaluated
(no code paths added, no UI surfaces added) and this plan does
not restate them. Phase 3.2+'s plan documents are responsible
for binding each invariant against their own diff surface.

**Per-phase invariants.** The decision record in this plan
binds two per-phase invariants that 3.2+ self-review walks
against its diff:

- **Phase 3.2+ implementation honors the read-only-for-M3
  scope.** No phase 3.2+ PR may introduce demo-mode write
  paths against real tables, demo-mode write rejection
  branches that silently no-op, sandbox tables, or any other
  surface that lands B-shaped or C-shaped functionality
  inside M3. If a 3.2+ planner concludes that some
  B-shaped or C-shaped element is unavoidable to ship A
  meaningfully, that is a signal to revise THIS plan in the
  same PR per AGENTS.md "Plan-to-PR Completion Gate," not to
  silently absorb the scope.
- **Phase 3.2+ implementation preserves option-preservation
  for B and C.** The Edge Function shim's data source for M3
  is real tables; the shim's structure and call-site
  branching pattern must allow a future second-iteration C to
  switch the data source from real tables to sandbox tables
  without restructuring the call sites. The write-side 403
  short-circuits in the five mutation Edge Functions must be
  shaped so a future second-iteration B can replace them with
  real write paths without restructuring the surrounding auth
  flow. Phase 3.2+'s plan-drafting walks this invariant
  against its own contracts.

## Naming

- **Decision A / read-only browse.** The semantics M3 ships:
  bypassed surfaces render, mutation attempts are rejected.
- **Decision B / functional with persistence and reset.** The
  semantics deferred to second-iteration scoping: bypassed
  surfaces accept writes that land in real tables; a reset
  story keeps the booth runnable across visitors.
- **Decision C / sandbox-ephemeral.** The semantics deferred
  to second-iteration scoping: bypassed surfaces accept
  writes that land in parallel/ephemeral state; real tables
  stay pristine; each visitor gets a fresh booth.
- **Edge Function read shim.** The new Edge Function (or new
  endpoints on existing functions) phase 3.2+ introduces to
  serve RLS-gated reads to allowlist-allowed unauthenticated
  visitors. Validates allowlist server-side; queries with
  service-role privileges; returns the data shape the page
  components expect.
- **Demo-mode read-only error code.** The structured-body
  error code returned by the five mutation Edge Functions
  when allowlist matches and no auth is present. Working
  name: `demo_mode_read_only`. Final spelling owned by
  phase 3.2+ when it touches the functions.

## Contracts

### Decision contract (canonical)

**The following is the canonical record of the
data-access-semantics decision M3 ships.** Phase 3.2+
plan-drafting consumes this contract; the milestone doc's
"Settled at phase-time" subsection is a one-paragraph
pointer to this section.

**Settled by phase 3.1:**

1. **M3 ships read-only browse (Decision A).** The three
   bypass-target surfaces (`/event/:slug/admin`,
   `/event/:slug/game/redeem`,
   `/event/:slug/game/redemptions`) render for an
   unauthenticated visitor on the two test-event slugs
   (`harvest-block-party`, `riverside-jam`). Mutation
   attempts on those surfaces are rejected.

2. **B and C are explicitly NOT rejected.** Both remain
   live candidates for the second-iteration scoping pass
   the epic contemplates for M4–M6 (`Verified by:`
   [epic.md:24-28](/docs/plans/epics/demo-expansion/epic.md)).
   The decision to ship A in M3 is a roadmap commitment, not
   a destination commitment. Second-iteration triggers that
   should reopen the question:

   - Partner feedback that read-only is insufficient for
     evaluating the platform (push toward B or C).
   - Partner feedback that booth-style co-walkthroughs
     across the day need fresh state per visitor (push
     toward C specifically).
   - Operational signal that read-only is sufficient and
     the M4 deferral can collapse to "tour + behind-the-
     scenes" rather than reopening B/C work (push toward
     leaving A as the durable shape and rescoping M4).

3. **Read mediation: Edge Function shim.** The
   read-mediation pattern is an Edge Function shim that
   validates the allowlist server-side and returns RLS-gated
   data with service-role privileges. Pattern is
   non-novel — three existing functions
   (`complete-game`, `issue-session`, `get-redemption-status`)
   already accept callers without a Supabase user JWT via
   the shared `readVerifiedSession` helper.
   `Verified by:` [`supabase/config.toml:1-29`](/supabase/config.toml)
   (all nine functions run with `verify_jwt = false`);
   [`supabase/functions/_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts).
   The shim's exact shape (one new function vs. new
   endpoints on existing functions; one shim for all
   surfaces or one per surface; payload schema) is owned
   by phase 3.2+ plan-drafting against the actual read
   paths it has to mediate.

4. **Read mediation surface (refinement).** The mediation
   surface is finer-grained than the milestone doc's "the
   data each surface fetches" framing implies:
   - **Admin** — 2 read paths need mediation. Slug →
     event-id resolution at
     [`useOrganizerForEvent.ts:67-72`](/shared/auth/useOrganizerForEvent.ts)
     reads `game_event_drafts` (anon SELECT denied); the
     page's subsequent draft-data load reads
     `game_event_drafts` again.
   - **Redemptions** — 1 read path needs mediation.
     Slug → event-id resolution at
     [`authorizeRedemptions.ts:31-35`](/apps/web/src/redemptions/authorizeRedemptions.ts)
     reads `game_events` (anon-readable for published
     events); `fetchRedemptionSlices(eventId)` reads
     `game_entitlements` (anon SELECT denied).
   - **Redeem** — 0 read paths need mediation.
     [`authorizeRedeem.ts:31-35`](/apps/web/src/redeem/authorizeRedeem.ts)
     reads `game_events` (anon-allowed for published
     events); the role-gate RPCs return `false` for anon
     and the bypass branch in 3.2+ skips that response
     without needing a mediated read. The keypad's
     `redeem-entitlement` call is a write path covered
     by the rejection contract below.

5. **Write rejection (server side): 403 with structured
   error body.** All five mutation Edge Functions
   (`save-draft`, `publish-draft`, `unpublish-event`,
   `redeem-entitlement`, `reverse-entitlement-redemption`)
   short-circuit to HTTP 403 with a structured error
   body when the calling slug is in the allowlist and no
   auth context is present. Working error code:
   `demo_mode_read_only`. Body schema (working draft;
   final shape owned by phase 3.2+):

   ```
   {
     "error": "demo_mode_read_only",
     "message": "<human-readable, content owned by 3.2+>"
   }
   ```

   The 403 short-circuit branch sits beside each
   function's existing manual auth-gate call:
   - [`save-draft/index.ts:351`](/supabase/functions/save-draft/index.ts)
     (`authenticateEventOrganizerOrAdmin` call site)
   - [`publish-draft/index.ts:173`](/supabase/functions/publish-draft/index.ts)
   - [`unpublish-event/index.ts:124`](/supabase/functions/unpublish-event/index.ts)
   - [`redeem-entitlement/index.ts:178`](/supabase/functions/redeem-entitlement/index.ts)
     (`authenticateRedemptionOperator` call site)
   - [`reverse-entitlement-redemption/index.ts:204`](/supabase/functions/reverse-entitlement-redemption/index.ts)

6. **Write rejection (client side): contract bound, shape
   deferred to phase 3.2+.** Bypass-rendered surfaces
   communicate the read-only state on mutation controls;
   the visitor never sees a mutation control that
   appears actionable but silently does nothing. The
   shape of the communication (disabled-with-tooltip,
   hidden, click-and-error toast/banner, or a per-surface
   combination) is owned by phase 3.2+ plan-drafting
   against the actually-rendered components per
   AGENTS.md "Bans on surface require rendering the
   consequence."

7. **3.2+ phase split: deferred to 3.2's plan-drafting
   branch test.** Working estimate is 1 PR (3.2 alone);
   2-PR fallback is pre-authorized along the read-side /
   write-side seam:
   - **3.2 (if split)** — allowlist constant + shared
     module + tests; page-component bypass branches
     across the three surfaces; Edge Function read shim;
     pgTAP / equivalent enforcement assertion that a
     non-test slug never resolves through the bypass
     branch.
   - **3.3 (if split)** — Edge Function write-rejection
     branches (the five mutation functions); UI demo-mode
     signaling per surface; noindex emit on apps/web
     bypass-rendered routes; M3 closer (M2 role-door copy
     revision in apps/site, full M3 documentation
     currency, milestone-doc Status flip, epic Milestone
     Status table flip).
   3.2's plan-drafting runs the AGENTS.md
   "PR-count predictions need a branch test" pass against
   actually-merged code and picks. The M3-closing
   responsibility travels with whichever phase ships
   last. Phase numbering reflects the recommended ship
   order; if 3.2 splits to 3.2 + 3.3, the milestone doc's
   Phase Status table grows accordingly at 3.2's
   plan-drafting time.

### Doc-correction contracts

8. **Milestone-doc correction (a): unauthenticated-Edge-
   Function-precedent claim.** The milestone-doc claim "the
   absence of any existing precedent for unauthenticated
   Edge Function mediation in `supabase/functions/`" (under
   Cross-Phase Decisions → Deferred to phase-time → "Demo-
   mode data-access semantics," reality-check inputs
   paragraph) is refuted. The replacement framing: precedent
   exists for callers without a Supabase user JWT — three
   functions (`complete-game`, `issue-session`,
   `get-redemption-status`) verify a signed session cookie
   via the shared `readVerifiedSession` helper at
   [`_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts);
   all nine functions in `supabase/functions/` run with
   `verify_jwt = false` per
   [`supabase/config.toml:1-29`](/supabase/config.toml). The
   four authoring functions and two redemption-operator
   functions require authenticated callers via the
   `authenticateEventOrganizerOrAdmin` /
   `authenticateRedemptionOperator` helpers and are the
   exception, not the platform rule. The exact text of the
   replacement paragraph in the milestone doc is owned by
   3.1's PR; the contract above binds the framing the new
   text must carry.

9. **Milestone-doc correction (b): read-mediation surface
   framing.** The milestone-doc Goal-section framing that
   "the data each surface fetches (admin's `loadDraftEvent`
   against `game_event_drafts`, redemptions' list query
   against `game_entitlements`) is RLS-gated and currently
   denies anonymous reads" is refined to the surface picture
   in contract item 4 above (admin: 2 read paths;
   redemptions: 1 read path; redeem: 0 read paths). The
   milestone-doc edit replaces the existing framing with a
   pointer to this plan's contract item 4 for the precise
   surface picture, or restates the corrected picture inline
   — shape owned by 3.1's PR against the on-disk milestone
   doc.

### Milestone-doc edit contract

10. **Phase Status table.** Row 3.1 updates: Plan column
    populated with a link to this plan; Status column
    flips Proposed → Landed in 3.1's PR. The 3.2 row stays
    as a single-row placeholder — 3.1 does not split the
    estimate per contract item 7.

11. **Cross-Phase Decisions section.** A new "Settled at
    phase-time" subsection is added (peer to "Settled by
    default" and "Deferred to phase-time"), containing a
    single one-paragraph entry for "Demo-mode data-access
    semantics" that names the headline decision (A as M3's
    iteration scope, B and C as live second-iteration
    candidates, Edge Function shim as the read-mediation
    pattern, 403 + structured body as the write-side
    rejection contract) and points to this plan as
    canonical for rationale and rejected alternatives. The
    existing "Demo-mode data-access semantics" entry under
    "Deferred to phase-time" is removed (the cross-reference
    in the "3.2+ phase split" deferred entry is updated to
    point to the new "Settled at phase-time" subsection
    instead). Final shape owned by 3.1's PR against on-disk
    content.

### open-questions.md edit contract

12. **Section removal.** The entire
    "Demo Expansion Epic — M3 Demo-Mode Data Access"
    section in
    [`docs/open-questions.md`](/docs/open-questions.md)
    (including the "Demo-mode data-access semantics for
    test-event slugs" subsection beneath it) is removed.
    Per the milestone doc Documentation Currency
    assignment, this closure is 3.1's deliverable, not the
    M3-closing phase's.

## Files To Touch

This list is an **estimate** of the expected file inventory
per AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may revise it when a structural call requires
deviation; deviations are reported via the PR body's
"Estimate Deviations" callout per AGENTS.md "Plan-to-PR
Completion Gate." Estimate scope is what scoping read on
2026-05-03; plan-drafting re-verified on the same date.

### New

- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md`
  — created during the planning session before this plan
  drafted; deletes in batch with sibling scoping docs at the
  M3-terminal PR per AGENTS.md "Phase Planning Sessions →
  Output set."
- `docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md` —
  this file.

### Modify

- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
  — Phase Status table row 3.1 (contract item 10);
  Cross-Phase Decisions section (contract item 11); two
  correctness fixes (contract items 8 and 9). Plan-drafting
  greps for the actual on-disk paragraph locations because
  line numbers drift from the scoping snapshot.
- `docs/open-questions.md` — section removal (contract
  item 12). Scoping snapshot read 2026-05-03 found the
  section at lines 111–134; plan-drafting re-confirms.

### Intentionally not touched

- All apps/web page components. M3's bypass branches land
  in phase 3.2+, not in 3.1.
- All Edge Functions. The 403 short-circuit branches and
  any read shim land in phase 3.2+.
- All migrations. No schema changes in 3.1; if 3.2+'s read
  shim choice introduces SQL surface (e.g., a helper
  function that the shim consumes), it lands in that
  phase, not in 3.1.
- M2 role-door copy in
  `apps/site/components/home/`. The copy revision is the
  M3-closing phase's deliverable per the M2 cross-phase
  invariant inheritance hook in the milestone doc, not
  3.1's.
- README, `docs/architecture.md`, `docs/product.md`,
  `docs/operations.md`, `docs/styling.md`,
  `docs/backlog.md`. The milestone doc Documentation
  Currency map assigns these to the M3-closing phase. 3.1
  owns only `docs/open-questions.md` and the milestone-doc
  edits above.

## Execution Steps

This sequence is an **estimate** per AGENTS.md "Plan content
is a mix of rules and estimates." The implementer may
re-order or combine steps; deviations from rules (e.g.,
adding a step that introduces code) require revising this
plan in the same PR.

1. Re-verify reality-check inputs against current code per
   the scoping doc's "Reality-check inputs the plan must
   verify" handoff.
2. Land the scoping doc and this plan doc in the working
   branch (already-created during the planning session;
   verify both files exist with substantive content).
3. Edit
   [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md):
   - Phase Status table row 3.1 — Plan column populated,
     Status flipped Proposed → Landed.
   - Cross-Phase Decisions section — add "Settled at
     phase-time" subsection per contract item 11; remove
     the "Demo-mode data-access semantics" entry from
     "Deferred to phase-time"; update the
     cross-reference in the "3.2+ phase split" deferred
     entry.
   - Two correctness fixes per contracts 8 and 9 against
     the actual on-disk paragraph locations.
4. Edit [`docs/open-questions.md`](/docs/open-questions.md):
   - Remove the "Demo Expansion Epic — M3 Demo-Mode Data
     Access" section in full.
5. Run the doc-shaped Validation Gate checks (markdown
   lint, link-check if available — see Validation Gate
   below).
6. Self-review against the Self-Review Audits below.
7. Open the PR with the contract list above as the
   change summary; PR body's Validation section names
   the doc-shaped checks that ran and the manual
   reading pass against the milestone doc's Cross-Phase
   Invariants.

## Commit Boundaries

This split is an **estimate** per AGENTS.md "Plan content is
a mix of rules and estimates." The implementer may refine
based on actual edit shape.

- **Commit 1:** scoping doc + plan doc. New files only;
  reviewable as a self-contained doc-set.
- **Commit 2:** milestone-doc edits + open-questions.md
  edit. Modifies existing docs; the milestone-doc edits
  carry the Phase Status row update + Cross-Phase
  Decisions section update + two correctness fixes;
  open-questions.md carries the section removal. All
  doc-currency edits cohesively.

## Validation Gate

3.1 ships only doc edits; the validation surface is
doc-shaped rather than test-suite.

**Doc-shaped checks** (run before opening the PR; named
explicitly so the PR body's Validation section names them):

- Markdown lint per existing repo convention. Plan-drafting
  reads `package.json` `scripts` per AGENTS.md "Prefer
  existing wrapper scripts" to identify the existing
  markdown-lint command (if any). If no markdown-lint
  wrapper exists, this Validation Gate names that absence
  explicitly rather than reaching for a lower-level
  invocation.
- Link-check on the doc set (the new scoping + plan docs
  carry many in-repo links and external references; broken
  links in newly-introduced doc-set surfaces would surface
  during review otherwise). Same wrapper-script discipline:
  if a link-check wrapper exists, name it; if not, name
  the absence.

**Manual reading pass:**

- The four cross-phase invariants from the milestone doc
  walked against the artifact set per AGENTS.md
  "self-review walks each one against every phase's actual
  changes." The diff is doc-only and the invariants bind
  diffs that touch the slug-allowlist guard sites, the
  bypass-branch render paths, the demo-mode signaling
  surface, and the M2 role-door copy — none of those
  surfaces are touched by 3.1's diff. The walk records the
  observation that the invariants are not violated because
  the invariant-bound surfaces are not touched, not that
  the invariants are inapplicable.
- Plan doc and scoping doc each read end-to-end for
  internal consistency; the canonical decision record in
  this plan compared paragraph-by-paragraph with the
  milestone doc's new "Settled at phase-time" subsection
  for drift.
- The two corrections in contracts 8 and 9 walked against
  the milestone-doc edit to confirm the corrected text
  carries the framing the contracts bind.

**Falsifiability check on the manual reading pass:**
the falsifier for "the milestone-doc Cross-Phase
Decisions section update is consistent with this plan's
canonical decision record" is "the milestone doc says
something about A/B/C semantics, the read-mediation
pattern, the write-side rejection shape, the UI rejection
contract, or the 3.2+ phase split that contradicts the
plan doc's contract section." The reading pass walks each
of those claim families across both docs.

## Self-Review Audits

The Self-Review Audit set against
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
is **estimated to be empty or near-empty** because 3.1's
diff has no SQL, no Edge Functions, no UI, no migrations,
no test changes, and no client/server boundary changes —
the audit catalog's named audits target those surfaces.
The implementer walks the catalog at PR time; if any
named audit applies (e.g., a doc-currency audit if one
exists; a planning-doc-internal-consistency audit if one
exists), it is named in the PR body's Validation section.

The expectation that the set is empty or near-empty is
explicitly named here per AGENTS.md "Plan content is a mix
of rules and estimates" — if the implementer finds an
applicable audit, the discovery is recorded and walked, not
absorbed silently.

## Documentation Currency PR Gate

The full M3-set doc-currency map lives in the milestone
doc at
[m3-demo-mode-auth-bypass.md "Documentation Currency"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).
3.1's PR satisfies these entries from that map:

- **`docs/open-questions.md`** — closes the "Demo
  Expansion Epic — M3 Demo-Mode Data Access" section.
  Owned by 3.1 per the milestone doc; landed by this PR
  per contract item 12.
- **This milestone doc** — Phase Status table row 3.1
  update (Plan column populated, Status flipped
  Proposed → Landed). Owned by 3.1 per the milestone
  doc; landed by this PR per contract item 10.
- **This milestone doc — Cross-Phase Decisions section.**
  The "Settled at phase-time" subsection is added; the
  "Deferred to phase-time" entry for "Demo-mode
  data-access semantics" is removed. Landed by this PR
  per contract item 11.

3.1's PR does NOT satisfy any of the other milestone-doc
Documentation Currency entries. README, architecture,
operations, product, styling, backlog, milestone-doc
top-level Status, and epic Milestone Status table are all
M3-closing-phase responsibilities.

## Out Of Scope

This plan does not authorize any of the following in
3.1's PR:

- Code changes in apps/web, apps/site, or `supabase/`.
- Schema changes (no migrations).
- Test additions (the pgTAP / equivalent enforcement
  assertion the milestone doc names is owned by phase
  3.2+, not 3.1).
- README, architecture, product, operations, styling, or
  backlog edits (the M3-closing phase owns them).
- The M2 role-door copy revision in apps/site (the
  M3-closing phase owns it per the M2 cross-phase
  invariant inheritance hook).
- Any change to the apps/web routing dispatcher's
  three bypass-target branches at
  [`App.tsx:21-71`](/apps/web/src/App.tsx) — those branches
  are 3.2+'s edit surface.
- A determination that B or C is wrong, dispreferred, or
  rejected — the contract explicitly leaves both as live
  second-iteration candidates.

## Risk Register

Phase-implementation risks specific to 3.1. Milestone-level
risks (Allowlist drift between guard sites, 3.1's chosen
semantics shifts during 3.2 implementation, RLS broadening
accidentally extends to non-test events, Copy contract
revision missed at M3 closure, M4 pulls forward into M3
unintentionally) live in the milestone doc at
[m3-demo-mode-auth-bypass.md "Cross-Phase Risks"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
this plan does not restate them.

- **Decision record gets misread by 3.2+ plan-drafting.**
  The canonical record in the Contracts section binds
  multiple settled decisions (A as M3 scope, B/C deferred,
  Edge Function shim as read mediation, 403 + structured
  body as write rejection, UI contract bound but shape
  deferred, 3.2+ phase split deferred to branch test). A
  3.2+ planner skimming for "what semantics did 3.1 pick"
  could anchor on "A" alone and miss the option-preservation
  invariant in Cross-Cutting Invariants, then ship a
  read-shim shape that closes off C unnecessarily.
  *Mitigation:* the Contracts section sequences the
  decisions with explicit numbering and the
  per-phase-invariants section names option-preservation
  as binding for 3.2+; phase 3.2+'s plan-drafting reads
  this plan end-to-end, not by skim, per AGENTS.md
  "Reality-check gate between scoping and plan."

- **Doc-only PR understaffs review attention.** Doc-only
  PRs sometimes attract less rigorous review than
  code-bearing PRs because there is no test suite to fail
  and no obvious code-shaped artifact to walk. 3.1's PR
  carries load-bearing decisions (A vs. B vs. C is the
  headline open question of M3) and two milestone-doc
  corrections that propagate into 3.2+'s reality-check
  inputs. *Mitigation:* the PR body explicitly lists the
  decisions in the change summary, names the manual
  reading pass as the load-bearing validation, and asks
  the reviewer to walk the canonical decision record
  end-to-end against the new milestone-doc subsection.

- **Second-iteration triggers go unwatched.** The decision
  record names the partner-feedback signals that should
  reopen the B/C question, but no surface in the doc set
  watches for them — the M4 reopening depends on someone
  noticing the trigger has fired. *Mitigation:* the
  Backlog Impact below adds an explicit
  partner-feedback-capture-mechanism backlog item so the
  triggers have a tracked surface; the second-iteration
  scoping pass against M4–M6 is the natural reading time
  for that backlog entry.

## Backlog Impact

Items closed by 3.1's PR:

- The
  [`docs/open-questions.md`](/docs/open-questions.md)
  "Demo Expansion Epic — M3 Demo-Mode Data Access"
  entry. Closure mechanic is the section removal in
  contract item 12.

Items unblocked by 3.1's PR (but not landed):

- Phase 3.2+ plan-drafting becomes runnable against the
  canonical decision record. Per the milestone doc
  "Sequencing → Plan-drafting cadence," 3.2's plan-drafting
  starts after 3.1's PR merges.
- The second-iteration M4 scoping pass becomes runnable
  against a known M3 shape (read-only, Edge Function
  shim, 403 + structured body) once M3 ships, with B and
  C as live candidates rather than implicit-rejected
  options.

Items added by 3.1's PR for post-M3 work:

- **Partner-feedback capture mechanism for demo-mode
  surfaces.** The decision record names partner feedback
  as the load-bearing input that reopens B vs. C in
  second-iteration scoping. No mechanism exists today for
  capturing that feedback systematically. Backlog entry
  added per AGENTS.md "Feature-Time Cleanup And Refactor
  Debt Capture" — the M3-closing phase's
  `docs/backlog.md` edit absorbs this addition (3.1
  itself does not edit backlog per the milestone doc
  Documentation Currency assignment; 3.1's PR records
  the addition in this Backlog Impact section so the
  M3-closing phase has a contract to satisfy).
- The two epic-level post-epic items the epic Backlog
  Impact already named (demo-mode generalization beyond
  test-event allowlist; production-friendly demo-mode for
  partner-onboarding scenarios) remain unchanged by 3.1's
  scoping; the M3-closing phase confirms they are present
  in `docs/backlog.md` per the milestone doc
  Documentation Currency assignment.

## Related Docs

- [`scoping/m3-phase-3-1.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md) —
  the transient scoping doc for this phase. Uses a two-tier
  structure (deliberation-shape on the headline only, compact
  form on items that fell out of rules / scope / cascades, and
  a separate section for the two reality-check findings) that
  is the load-bearing process precedent for future doc-only
  decision phases.
- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; this plan's edit contracts target
  its Phase Status table, Cross-Phase Decisions section,
  and Goal-section + reality-check-inputs paragraphs (for
  the two correctness fixes). Cross-phase invariants and
  cross-phase risks reference its sections rather than
  restating.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; "Open Questions Newly Opened" → "Demo-mode
  data-access semantics" entry (the question this plan
  resolves); the M4 paragraph (which essentially describes
  Decision B and is the implicit roadmap reference behind
  the A-as-checkpoint framing).
- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — the
  routing dispatcher whose three bypass-target branches
  (admin lines 21-33, redeem lines 45-57, redemptions
  lines 59-71) phase 3.2+'s implementation modifies. Not
  touched by 3.1.
- [`shared/auth/useOrganizerForEvent.ts`](/shared/auth/useOrganizerForEvent.ts),
  [`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts),
  [`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts)
  — the authorize helpers whose read paths the read-shim
  surface refinement (contract item 4) characterizes.
- [`supabase/config.toml`](/supabase/config.toml),
  [`supabase/functions/_shared/session-cookie.ts`](/supabase/functions/_shared/session-cookie.ts),
  [`supabase/functions/complete-game/index.ts`](/supabase/functions/complete-game/index.ts),
  [`supabase/functions/issue-session/index.ts`](/supabase/functions/issue-session/index.ts),
  [`supabase/functions/get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts)
  — the unauthenticated-Edge-Function-precedent evidence
  that grounds correction (a) in contract item 8.
- [`supabase/functions/save-draft/index.ts`](/supabase/functions/save-draft/index.ts),
  [`supabase/functions/publish-draft/index.ts`](/supabase/functions/publish-draft/index.ts),
  [`supabase/functions/unpublish-event/index.ts`](/supabase/functions/unpublish-event/index.ts),
  [`supabase/functions/redeem-entitlement/index.ts`](/supabase/functions/redeem-entitlement/index.ts),
  [`supabase/functions/reverse-entitlement-redemption/index.ts`](/supabase/functions/reverse-entitlement-redemption/index.ts)
  — the five mutation Edge Functions whose 403 short-
  circuit branches phase 3.2+ adds beside the cited
  manual-auth-helper call sites.
- [`docs/open-questions.md`](/docs/open-questions.md) —
  carries the entry this plan's PR removes.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions,
  Plan-to-PR Completion Gate, "Defer rather than
  over-resolve," "PR-count predictions need a branch
  test," "Bans on surface require rendering the
  consequence," "anti-pattern: planning artifacts that
  only cite each other," "Plan content is a mix of rules
  and estimates."
