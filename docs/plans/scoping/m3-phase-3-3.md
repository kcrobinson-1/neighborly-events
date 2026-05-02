# M3 Phase 3.3 — Scoping

## Status

Transient scoping artifact for M3 phase 3.3 ("Cross-app navigation
verification + M3 closure") per the M3 milestone doc
([m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) and
[AGENTS.md](/AGENTS.md) "Phase Planning Sessions." This doc plus its
sibling scoping docs at
[`scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md),
[`scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md),
and [`scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
delete in batch in the implementing PR for this phase per the
milestone doc's "Phase Status" subsection
([m3-site-rendering.md lines 86-95](/docs/plans/m3-site-rendering.md)).
The durable contract for 3.3 lives in
[`m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md);
this scoping doc is the input that plan compresses from.

Per AGENTS.md "Phase Planning Sessions → Scoping owns / plan owns,"
this doc carries deliberation prose with rejected alternatives, the
open decisions handoff, plan-structure handoff, and reality-check
inputs the plan must verify — content with no audience after the
plan lands. File inventory, contracts, cross-cutting invariants,
validation gate, self-review audits, and risks live in the plan and
are not restated here.

3.3 is the milestone-terminal phase: the implementing PR flips the
M3 milestone doc Status from `Proposed` to `Landed`, flips the M3
row in the epic's Milestone Status table from `Proposed` to
`Landed`, and deletes all four M3 scoping docs (3.1, 3.1.2, 3.2,
and 3.3 itself) in batch.

## Phase summary in one paragraph

3.1.1, 3.1.2, and 3.2 shipped the apps/site `/event/[slug]`
rendering pipeline, two test events on visibly distinct themes, and
SSR meta with consumer-client unfurl proof. 3.3 closes M3 by
(a) verifying that cross-app navigation from apps/site CTAs into
apps/web `/event/:slug/game` works without auth disruption and that
the browser-back trip preserves state across the rewrite boundary,
(b) updating [docs/architecture.md](/docs/architecture.md) and
[README.md](/README.md) to record the now-shipped rendering pipeline
and multi-theme proof, (c) flipping the milestone doc Status and
the epic's M3 milestone-status row to `Landed`, and (d) deleting
the four M3 scoping docs in batch. No new code is expected in 3.3;
the cross-app navigation contracts named in the milestone doc were
already in place by 3.1.1 (plain-`<a>` CTAs in
[EventCTA.tsx](/apps/site/components/event/EventCTA.tsx) and
[EventHeader.tsx](/apps/site/components/event/EventHeader.tsx)) and
the cookie-boundary verification was satisfied in M1 phase 1.3.2
(see [shared-auth-foundation.md](/docs/plans/shared-auth-foundation.md)
"Verification Evidence"), so 3.3's verification surface is a
production walk-through captured in the PR body, not new test
infrastructure.

## Decisions made at scoping time

These resolve the open decisions named in the M3 milestone doc and
the 3.2 scoping/plan docs that 3.3 inherits. Each decision lists
rejected alternatives with rationale and a `Verified by:` cite to
the code or doc that grounded the call. Implementation specifics
(file paths, contract shapes, validation procedures) live in the
plan; this section explains *why* those choices are correct, not
*what* they are.

### Phase shape → docs + verification + status flips; no rendering-layer or apps/web code changes

The M3 milestone doc names 3.3's load-bearing work as "cross-app
navigation polish" plus the milestone closure paperwork. Walking
the merged 3.1.1/3.1.2/3.2 surface against that framing:

- The apps/site → apps/web CTA contract ("hard navigation, not
  client-side") is already enforced by plain `<a>` elements in
  [apps/site/components/event/EventCTA.tsx line 24](/apps/site/components/event/EventCTA.tsx)
  and
  [apps/site/components/event/EventHeader.tsx line 30](/apps/site/components/event/EventHeader.tsx).
  Both files carry inline comments naming the rationale ("plain
  `<a>` (not `<Link>`) because `routes.game(slug)` lives behind
  the apps/web Vercel rewrite — soft client-side navigation would
  keep the user inside apps/site and never re-enter the proxy").
  No code change is needed to enforce the contract; reviewer
  attention plus the existing comments are the tripwire.
- The apps/web → apps/site reverse trip is the browser back
  button after a CTA click. The same-origin Vercel rewrites at
  [apps/web/vercel.json lines 20-26](/apps/web/vercel.json)
  proxy `/event/:slug` and `/event/:slug/:path*` to apps/site;
  no apps/web code is involved in surfacing the back-trip — the
  browser's history stack handles it and the proxy fires
  naturally on history navigation. Verification is observational
  (does the back button land on the apps/site landing without
  flash), not a contract requiring source.
- Auth-cookie state preservation across the apps/site ↔ apps/web
  boundary was the production-domain gate satisfied in M1 phase
  1.3.2 against commit
  [`5af99f4`](https://github.com/kcrobinson-1/neighborly-events/commit/5af99f4)
  per
  [shared-auth-foundation.md](/docs/plans/shared-auth-foundation.md)
  "Verification Evidence." M3 has not touched authentication, so
  the cookie boundary is presumed-still-good; 3.3's manual
  walk-through re-confirms it on production after deploy.

**Decision.** 3.3 ships as a docs + verification + status-flip PR.
**No new components, no apps/web changes, no apps/site code changes,
no new tests, no new validation commands.** If implementation
surfaces an actual cross-app navigation bug (e.g., a 3.2 sponsor-asset
URL accidentally bound to apps/site's origin and breaking when
fetched through apps/web's rewrite), that is a **rule deviation**
triggering either a fix sub-PR per AGENTS.md "Plan-to-PR Completion
Gate" or a scope split per AGENTS.md "Stop-And-Report Conditions."

A "ship a Playwright cross-app e2e fixture for the navigation
boundary" alternative is rejected: Playwright across two Vercel
projects requires either staging-domain test wiring (out of epic
scope per the epic's "remote staging Supabase project" Out Of
Scope bullet) or local production-build emulation
(`next build && next start` for apps/site, `vercel dev` for
apps/web), which is the heavier setup the M3 milestone doc
deliberately did not gate on. Manual production walk-through plus
PR-body capture is the milestone-bounded scope.

### Cross-app navigation verification → manual production walk-through, captured in PR body

Three options:

- **No verification beyond reading source.** The hard-navigation
  contract is provable by inline comment + reviewer attention; the
  cookie boundary was already proven in M1 phase 1.3.2; the
  rewrite topology is unchanged from M0/M2. Skipping verification
  is defensible on paper but loses the
  AGENTS.md "Bans on surface require rendering the consequence"
  discipline — the milestone doc *named* a verification step, so
  shipping 3.3 without it would silently downgrade the milestone's
  closure rigor.
- **Local-only verification via `npm run dev:web` + `npm run
  dev:site`.** Two Vite/Next dev servers in parallel against
  apps/web's local Vercel rewrite emulation. The recurring trap
  named in AGENTS.md "Bans on surface require rendering the
  consequence" applies here in full: dev servers self-serve their
  own asset paths (`/_next/*`, `/@vite/*`) and hide cross-project
  gaps the production proxy exposes. M2 phase 2.3 already
  surfaced exactly this trap. So local verification is *less*
  trustworthy than the production walk-through; it would be a
  procedural box-tick rather than a real falsifier.
- **Manual production walk-through after deploy, captured in the
  PR body.** Sign in on apps/web's primary alias, navigate to
  `/event/harvest-block-party` (apps/site behind apps/web's
  rewrite), click the hero CTA → land on
  `/event/harvest-block-party/game` (apps/web SPA), browser-back →
  land on the apps/site landing without auth disruption. Repeat
  for `/event/riverside-jam`. PR body records the result as a
  short text walk-through, optionally with screenshots for the
  multi-theme contrast. This is a Tier 5 production smoke per
  [docs/testing-tiers.md](/docs/testing-tiers.md), so the
  Plan-to-Landed pattern applies: code merges with plan Status
  `In progress pending prod smoke`, then flipped to `Landed`
  after the production walk-through is captured.

**Decision.** Manual production walk-through, captured in PR body
text (and optional screenshots). The plan's Validation Gate names
the walk-through steps and the falsifier observations the
implementer asserts against ("CTA returns 200 in apps/web SPA, not
404; auth state visible in apps/site after back-navigation;
no full-page flash beyond a single document load"). The
two-phase Plan-to-Landed Status pattern applies because the
walk-through cannot run pre-merge (no production deploy yet).

The exact walk-through script and the falsifier list are
plan-owned; this scoping doc records the verification *strategy*
and rationale.

### docs/architecture.md scope → present-tense rewrite of the rendering surface; new file inventory entries; routing-table cleanup

The M3 milestone doc's Documentation Currency
([m3-site-rendering.md lines 405-416](/docs/plans/m3-site-rendering.md))
names architecture.md as 3.3-owned with four sub-claims:
"rendering pipeline, apps/site responsibilities, `EventContent`
shape, test event posture, the cross-app ThemeScope asymmetry
through M4." Walking architecture.md as it stands today:

- [docs/architecture.md lines 30-33](/docs/architecture.md):
  "SSR/SSG public event landing pages — event landing remains a
  placeholder until M3 of the Event Platform Epic". M3 has now
  shipped the landing pipeline; the placeholder caveat must drop.
- [docs/architecture.md lines 61-67](/docs/architecture.md): the
  apps/site Top-Level Layout description still says "Event landing
  remains a placeholder until M3 of the Event Platform Epic." Same
  caveat must drop.
- [docs/architecture.md lines 208-225](/docs/architecture.md): the
  apps/site Frontend Structure inventory ends at
  `apps/site/lib/setupAuth.ts` with no entries for the rendering
  layer that 3.1/3.2 shipped. Need new inventory bullets for
  `apps/site/app/event/[slug]/page.tsx` (route + metadata
  resolver), `apps/site/app/event/[slug]/opengraph-image.tsx` and
  `twitter-image.tsx` (file-convention metadata routes from
  3.1.2), `apps/site/lib/eventContent.ts` (registry + lookup),
  `apps/site/events/<slug>.ts` (per-event TS modules — directory
  of record), `apps/site/components/event/` (section components
  including `EventCTA`, `EventHeader`, `TestEventDisclaimer`),
  and `apps/site/lib/eventOgImage.tsx` (shared og/twitter image
  helper).
- [docs/architecture.md lines 354-358](/docs/architecture.md):
  the per-event Theme registry note describes the registry as
  "empty in M1 phase 1.5.2; M3 phase 3.1 adds the first test
  event theme alongside the rendering pipeline, M3 phase 3.2
  adds the second test event theme." 3.1 and 3.2 have landed —
  the present-tense form is "the registry holds the
  `harvest-block-party` and `riverside-jam` test event Themes;
  M4 phase 4.1 adds Madrona." A historical-tense version is
  technically still accurate but stales the doc's voice; the
  rest of architecture.md describes shipped state in present
  tense, so M3's surface should match.
- [docs/architecture.md line 898](/docs/architecture.md) (Vercel
  routing topology table row 5): Lifetime cell reads "Permanent
  (placeholder in 0.3; real landing page in M3)". Drop the
  parenthetical entirely (or shorten to "Permanent (event-scoped
  landing)"). The placeholder context belongs in git history,
  not the present-tense table.
- The cross-app ThemeScope asymmetry through M4 (test events
  render their themes on apps/site, render against apps/web
  warm-cream `:root` defaults on `/event/:slug/game` until M4
  phase 4.1) is currently called out only inside the epic and
  the M3 milestone doc, not architecture.md. The M3 milestone
  doc explicitly assigned this callout to 3.3
  ([m3-site-rendering.md lines 405-416](/docs/plans/m3-site-rendering.md)).
  The plan's architecture.md edit lands a short paragraph (or
  expands the existing per-event Theme registry note) naming
  the asymmetry and referencing the epic's "Deferred ThemeScope
  wiring" invariant by name.

**Decision.** The plan's architecture.md edit covers all five
sites above. Specific section ordering, bullet wording, and
whether the asymmetry callout is inline at the registry note vs. a
separate "Cross-app ThemeScope state through M4" subsection are
plan-drafting concerns. The plan's Files to touch — modify section
names architecture.md with the five line ranges above as the
expected edit surface.

A "ship architecture.md edits in a separate doc-only PR after the
status flips merge" alternative is rejected: per AGENTS.md
"Doc Currency PR Gate" the plan-implementing PR must update its
named docs in the same change, and per AGENTS.md "Plan-to-PR
Completion Gate" the milestone-terminal PR is the natural binding
site for M3-scoped doc closure.

### README.md scope → drop placeholder caveats; add multi-event rendering capability bullet

[README.md lines 67-73](/README.md) currently states:

> Platform landing, platform admin, auth callback, and public event
> landing pages built with Next.js 16 (App Router, server rendered).
> Owns `/`, `/auth/callback`, `/admin*`, `/event/:slug`, and any
> other event-scoped path not carved out for `apps/web`. Event
> landing is still a placeholder; the real landing page lands in M3
> of [the Event Platform Epic](/docs/plans/event-platform-epic.md).

The placeholder caveat must drop. The README's What Works Today /
capabilities section at
[README.md lines 22-58](/README.md) lists shipped surfaces by
behavior; M3's contribution is "multi-event rendering on apps/site
proven against two test events on distinct themes, with SSR meta
and consumer-client unfurl previews." The plan's README edit drops
the placeholder caveat in the apps/site description and adds a
capability bullet (or extends an existing one) naming the
multi-event landing surface.

**Decision.** Both edits ship in the plan's README.md update.
Exact wording is plan-drafting; the bullet captures M3's user-
visible capability without restating internal architecture (which
belongs in architecture.md). The plan's Files to touch — modify
section names README.md with both edit sites.

A "delay README updates until M4 lands so the README jumps straight
from placeholder → Madrona-launched without an interim multi-test-
event description" alternative is rejected: M3 is the milestone
that ships the platform capability, M4 is the first *customer* of
the platform. The README must reflect shipped capability at each
milestone gate.

### docs/open-questions.md scope → no edit; milestone-doc claim was inaccurate

The M3 milestone doc
([m3-site-rendering.md lines 423-432](/docs/plans/m3-site-rendering.md))
named open-questions.md as 3.3-owned for an "Event landing route
model" in-progress note. Walking docs/open-questions.md as it
stands:

- [docs/open-questions.md lines 23-27](/docs/open-questions.md)
  in the "Product And Live Event Operation" section reads: "No
  currently open questions in this section under the current
  tracking rule. Product/live-event follow-up direction is
  represented as direct backlog items, including the event
  landing route model, and should be tracked there."

The "Event landing route model" is *not* an open-questions.md
entry — it lives as a backlog item at
[docs/backlog.md lines 143-147](/docs/backlog.md). The milestone
doc was written under an outdated assumption that the question
still had an open-questions.md entry; that entry was already
collapsed into the backlog item under the current tracking rule
before M3 milestone planning ran.

**Decision.** 3.3 does not touch docs/open-questions.md. The
plan's Documentation Currency PR Gate names the milestone-doc
discrepancy explicitly — the load-bearing claim is "M3
contributes infrastructure half of the event landing route
model resolution; M4 phase 4.2 closes it" — and records that
the contribution is reflected by the backlog item's "Detail"
link, not by an open-questions entry that does not exist. The
backlog item itself stays open through M3 because M3 ships
infrastructure-only; M4 phase 4.2 closes it per the milestone
doc.

A "create a brand-new open-questions.md entry for the question
just so 3.3 can mark it in-progress and then close it in M4"
alternative is rejected: it inverts the current tracking rule
that consolidates Product/live-event follow-up direction into
backlog items. Re-bifurcating into open-questions + backlog for
one entry would weaken the rule for everyone else.

### docs/backlog.md scope → no edit; "Event landing page" closes at M4 phase 4.2 per milestone doc

[docs/backlog.md lines 143-147](/docs/backlog.md) has the "Event
landing page for `/event/:slug`" item open. Per the M3 milestone
doc:

> [docs/backlog.md](/docs/backlog.md) — touched by 3.3 only if
> any backlog item becomes unblocked by M3's work. The "Event
> landing page for /event/:slug" entry closes with M4 phase 4.2
> (Madrona content), not M3 — M3 ships infrastructure only. No
> backlog status changes expected inside M3.
> ([m3-site-rendering.md lines 433-438](/docs/plans/m3-site-rendering.md))

Walking backlog.md for items that *might* be M3-unblockable but
aren't currently expected: M4 phases 4.1 and 4.2 are epic
milestones, not separately-tracked backlog items, so they don't
imply backlog edits. Other M3-adjacent backlog items
(`Richer publish controls`, `Sponsor reporting requirements`,
`Organizer-managed agent assignment`) were either unblocked by
earlier milestones (M2's broadened RLS) or remain blocked on
out-of-scope authoring infrastructure.

**Decision.** 3.3 does not touch docs/backlog.md. The plan's
Documentation Currency PR Gate names the milestone-doc claim and
the absence of unblocked items.

### docs/dev.md scope → no edit; no new validation commands

The M3 milestone doc
([m3-site-rendering.md lines 418-423](/docs/plans/m3-site-rendering.md))
notes dev.md is touched "only if the M3 set introduces new
validation commands or workflow changes; none expected because
`npm run build:site` already covers SSR validation, and unfurl
validation is a manual one-off procedure documented inline in
3.1's plan rather than as a standing dev.md command."

3.1.1, 3.1.2, and 3.2 shipped with no new validation commands —
each phase's Validation Gate uses `npm run lint`, `npm run
build:site`, `npm test` plus inline curl/manual procedures. 3.3
adds a manual production walk-through, also inline in the plan
rather than codified as a dev.md command (one-off
post-deploy procedure, not a standing contributor workflow).

**Decision.** 3.3 does not touch docs/dev.md. The plan's
Documentation Currency PR Gate names the absence and the
rationale.

### Epic doc scope → flip M3 row in Milestone Status table

[docs/plans/event-platform-epic.md lines 14-23](/docs/plans/event-platform-epic.md)
holds the epic's Milestone Status table. The M3 row currently
shows `Proposed`. Per AGENTS.md "Plan-to-PR Completion Gate" the
implementing PR for the milestone-terminal phase flips the row in
the same change. The plan codifies the flip as a contract.

The epic's M3 phase paragraphs at
[docs/plans/event-platform-epic.md lines 711-779](/docs/plans/event-platform-epic.md)
were already marked as pre-milestone-planning estimates by the
milestone-doc PR (see the "Milestone doc." subsection at line
712); 3.3 does not rewrite those paragraphs. Per the milestone
doc, "Landed plan docs that reference M3's phase numbering for
behavior whose ownership did not move (e.g., references to M3
phase 3.3 for cross-app navigation) are not retroactively
rewritten — git history preserves the original numbering and
those references remain accurate under the new 3-phase shape
where 3.3 still owns cross-app navigation."
([m3-site-rendering.md lines 463-468](/docs/plans/m3-site-rendering.md)).

**Decision.** 3.3's PR flips the M3 row in the epic's Milestone
Status table to `Landed` and otherwise does not edit the epic.

### Milestone doc scope → flip top Status; flip 3.3 row + add PR link; no other edits

[docs/plans/m3-site-rendering.md lines 4-8](/docs/plans/m3-site-rendering.md)
holds the top-level Status block (currently `Proposed`). Per the
milestone doc itself: "Status mirrors the epic milestone row.
Flipped to `Landed` in M3 phase 3.3's PR alongside the epic
M3-row flip."

[docs/plans/m3-site-rendering.md lines 70-74](/docs/plans/m3-site-rendering.md)
holds the Phase Status table. The 3.3 row currently shows
`Proposed` with no plan link. The plan-drafting commit (this PR's
first commit) updates the row to point at the new
`m3-phase-3-3-plan.md` with `Proposed` status; the implementing
PR's final commit flips Status to `Landed` and adds the PR link.

The milestone doc's other content (Goal, Sequencing, Cross-Phase
Invariants, Cross-Phase Decisions, Cross-Phase Risks,
Documentation Currency, Backlog Impact, Related Docs) describes
durable cross-phase coordination unchanged by 3.3 shipping. No
edits beyond the two Status flips.

**Decision.** 3.3's PR flips the milestone doc's top Status to
`Landed` and the 3.3 phase-status row to `Landed` with the PR
link. No other milestone-doc edits.

### Scoping doc batch deletion → all four M3 scoping docs delete in 3.3's PR

The M3 milestone doc
([m3-site-rendering.md lines 86-95](/docs/plans/m3-site-rendering.md))
names the deletion scope: 3.1's scoping doc, 3.1.2's scoping doc,
3.2's scoping doc, and 3.3's scoping doc all delete in batch in
3.3's PR. The intent is to keep mid-milestone cross-references
intact (sibling scoping docs link to each other for inherited
decisions; deleting any one early would break those references)
but to clear the directory once every M3 phase has shipped its
plan, since the durable contract content moved into the per-phase
plans (or, for cross-phase content, into the milestone doc).

This scoping doc explicitly **self-deletes** in the same PR that
consumes it — the implementer should not be surprised to remove
the file they are working from. Git history preserves the content
for any future reader.

**Decision.** 3.3's PR deletes:

- [docs/plans/scoping/m3-phase-3-1.md](/docs/plans/scoping/m3-phase-3-1.md)
- [docs/plans/scoping/m3-phase-3-1-2.md](/docs/plans/scoping/m3-phase-3-1-2.md)
- [docs/plans/scoping/m3-phase-3-2.md](/docs/plans/scoping/m3-phase-3-2.md)
- [docs/plans/scoping/m3-phase-3-3.md](/docs/plans/scoping/m3-phase-3-3.md) (this doc)

The plan's Files to touch — delete section names all four. The
order of deletion within the PR does not matter; landing the
deletions in the same commit as the Status flips keeps the
milestone-closure shape coherent.

A "delete only the four scoping docs whose phases have already
landed (3.1, 3.1.2, 3.2) and keep 3.3's scoping doc as a
standing-alone artifact" alternative is rejected: the milestone
doc names the *full set* deletes in batch, and the scoping content
has no audience after its plan lands per AGENTS.md "Phase Planning
Sessions → Scoping owns / plan owns." Keeping 3.3's scoping doc
would create a singleton in `docs/plans/scoping/` that future
M4 / next-milestone scoping cycles would have to sweep separately.

### PR shape → single PR; no sub-phase split

Branch test per AGENTS.md "PR-count predictions need a branch
test." Estimated diff surface:

- 1 modified docs/architecture.md (~30-50 lines: line 32-33 +
  line 65-67 placeholder removal, ~10-line file-inventory
  bullet additions in the apps/site Frontend Structure section,
  line 354-358 present-tense rewrite, line 898 routing-table
  parenthetical removal, ~5-10 line cross-app ThemeScope
  asymmetry callout)
- 1 modified README.md (~5-10 lines: lines 71-73 placeholder
  removal + capability-bullet addition or extension)
- 1 modified milestone doc (2 Status flips, ~3 line touches)
- 1 modified epic doc (1 Status flip in the Milestone Status
  table, ~1 line touch)
- 1 new plan doc at
  [docs/plans/m3-phase-3-3-plan.md](/docs/plans/m3-phase-3-3-plan.md)
  (~300-400 lines following the structure of
  [m3-phase-3-2-plan.md](/docs/plans/m3-phase-3-2-plan.md))
- 4 deleted scoping docs (negative line count; net repo size
  shrinks)

Total substantive-logic LOC: ~0 (no code changes). Total doc
LOC change: net negative (the four scoping docs collectively
hold ~2,200 lines; the new plan + edits add ~400-500). Spans
two coherent doc subsystems (M3 closure paperwork + M3
documentation currency) that review on the same axis (milestone
closure). Well under the 300-LOC substantive-logic threshold.
No 3.3.1/3.3.2 sub-phase split is justified.

The PR fits the doc-only profile (no code, no tests, no
migrations, no validation-command changes), so the validation
gate is correspondingly compact: `npm run lint` and
`npm run build:site` for the doc tree, plus the manual
production walk-through for the cross-app navigation gate.

### Plan Status pattern → two-phase `In progress pending prod smoke` → `Landed`

Per [docs/testing-tiers.md](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation," any plan whose
Validation Gate names a Tier 5 production-smoke check that can
only run post-deploy lands in two phases:

1. Code merges with the plan Status set to the verbatim string
   `In progress pending prod smoke` (per AGENTS.md "Quote labels
   whose enforcement depends on exact-match matching" — this
   exact string, not `Landed` and not a paraphrase).
2. After the post-deploy production walk-through is captured
   (cross-app navigation works, auth cookie state preserved,
   browser back returns to apps/site landing), the plan Status
   flips to `Landed` in a follow-up commit on the same branch
   (or a fast-follow PR if the branch already merged).

The same two-phase pattern applies to the milestone doc Status
and the epic's M3 row: both flip from `Proposed` →
`In progress pending prod smoke` → `Landed` rather than directly
to `Landed`, so all three Statuses (plan, milestone, epic row)
travel in lockstep.

**Decision.** The plan codifies the two-phase Status pattern as a
Cross-Cutting Invariant. The validation-gate walk-through
procedure names the falsifier observations the implementer must
record before the second-phase flip. The plan's Risk Register
names the post-merge follow-through commitment so it doesn't
strand the milestone in `In progress pending prod smoke` as drift.

A "treat the cross-app walk-through as a pre-merge local gate
against a production-built apps/site emulated through `vercel
dev` against apps/web" alternative is rejected per the local-only
verification rationale above (dev/prod gap traps named in
AGENTS.md "Bans on surface require rendering the consequence";
two Vercel projects need real production deploys to exercise
honestly).

## Open decisions to make at plan-drafting

These are open questions left for the plan to resolve.

- **Architecture.md edit shape — inline expansion vs. new
  subsection for the cross-app ThemeScope asymmetry.** The
  asymmetry callout could either expand the existing per-event
  Theme registry note at lines 354-358 with a "through M4 phase
  4.1, apps/site renders test event Themes; apps/web event
  routes render against warm-cream `:root` defaults" sentence,
  or land as a separate small subsection within the
  `shared/styles/` description. Decide at plan-drafting against
  whether the expanded note reads naturally or grows the
  paragraph past readability.
- **Architecture.md file-inventory ordering.** The new apps/site
  rendering-layer bullets (`apps/site/app/event/[slug]/...`,
  `apps/site/lib/eventContent.ts`, `apps/site/events/`,
  `apps/site/components/event/`, `apps/site/lib/eventOgImage.tsx`)
  could go in different orders relative to the existing
  apps/site bullets. Default: alphabetical-by-path within the
  apps/site Frontend Structure section, after the existing
  apps/site bullets. Decide at plan-drafting.
- **README.md capability bullet wording.** The new bullet (or
  extension to an existing bullet) names the multi-event
  rendering capability without restating architecture-internal
  detail. The plan picks final wording; default form is "public
  event landing pages at `/event/:slug` rendered server-side
  from per-event TypeScript content modules, proven against
  two test events on distinct themes." Decide at plan-drafting
  whether to add a new bullet or extend the existing
  apps/site placeholder line.
- **Whether to capture multi-theme contrast screenshots in the
  PR body.** The cross-app walk-through requires text observation;
  optional extras include a `/event/harvest-block-party` /
  `/event/riverside-jam` apps/site contrast capture (already
  shipped in 3.2's PR body), or a side-by-side apps/site landing /
  apps/web game capture per slug to make the cross-app
  ThemeScope asymmetry visible. Decide at plan-drafting against
  whether the asymmetry is already adequately documented in
  architecture.md.
- **Plan Status string lifecycle.** Verbatim-correct string for
  the in-progress phase is `In progress pending prod smoke` per
  [docs/testing-tiers.md](/docs/testing-tiers.md) "Plan-to-Landed
  Gate." The plan's Status block uses the exact string verbatim
  with a `path:line` citation per AGENTS.md "Quote labels whose
  enforcement depends on exact-match matching."
- **Whether the plan's Validation Gate also names a curl-based
  falsifier on production for the noindex meta on test events.**
  3.1.2's plan documented the cache-bust pattern and the curl
  falsifier shape; M3 closure could re-run the noindex falsifier
  on production as a regression check. Default: no — 3.1.2
  already exercised the gate, M3 hasn't touched the meta
  pipeline. Decide at plan-drafting whether the regression check
  is paranoia or insurance.

## Plan structure handoff

The plan at
[`docs/plans/m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md)
matches the structure of the just-landed
[`m3-phase-3-2-plan.md`](/docs/plans/m3-phase-3-2-plan.md) with
sections in this order:

1. Status (with terminal-PR note: 3.3's PR flips this plan, the
   M3 milestone doc, and the epic's M3 row from `Proposed` →
   `In progress pending prod smoke` → `Landed` per the two-phase
   pattern; verbatim Status strings cited per AGENTS.md
   "Quote labels whose enforcement depends on exact-match
   matching")
2. Plain-language Context preamble (per AGENTS.md "Plan opens
   with a plain-language context preamble")
3. Goal
4. Cross-Cutting Invariants (the two-phase Status pattern, the
   batch-delete scope, the no-code-change phase shape)
5. Naming
6. Contracts (architecture.md edit sites, README.md edit
   sites, milestone-doc / epic Status flips, scoping-doc
   deletions)
7. Cross-Cutting Invariants Touched (epic-level — Doc Currency
   PR Gate, Plan-to-PR Completion Gate, Deferred ThemeScope
   wiring callout)
8. Files to touch — new (the new plan doc itself)
9. Files to touch — modify (architecture.md, README.md,
   milestone doc, epic doc)
10. Files to touch — delete (the four scoping docs, including
    self)
11. Files intentionally not touched (open-questions.md,
    backlog.md, dev.md, source code, tests)
12. Execution steps
13. Commit boundaries
14. Validation Gate (lint, build:site, manual production
    walk-through with named falsifiers)
15. Self-Review Audits
16. Documentation Currency PR Gate
17. Out Of Scope
18. Risk Register (post-merge follow-through, walk-through
    failures surfacing real bugs, local-vs-prod dev-server gap
    traps)
19. Backlog Impact
20. Related Docs

Estimative sections (Files to touch new/modify/delete/
intentionally not touched, Execution steps, Commit boundaries)
carry the one-line "estimate, not rule" preface per AGENTS.md
"Plan content is a mix of rules and estimates — label which is
which."

The plan structure adds a "Files to touch — delete" section that
3.2's plan did not need — the four scoping-doc deletions are the
3.3-specific surface and deserve their own section so reviewer
attention sees them as deliberate batch deletions, not
move-noise.

## Reality-check inputs the plan must verify

The plan's load-bearing technical claims need "Verified by:" cites
to actual code or generated output, per AGENTS.md "'Verified by:'
annotations on technical claims." The candidates the plan should
hit:

- Site CTAs are plain `<a>` (hard navigation) — verify by
  reading
  [apps/site/components/event/EventCTA.tsx line 24](/apps/site/components/event/EventCTA.tsx)
  and
  [apps/site/components/event/EventHeader.tsx line 30](/apps/site/components/event/EventHeader.tsx).
- The apps/web Vercel rewrites for `/event/:slug` and
  `/event/:slug/:path*` proxy to apps/site — verify by reading
  [apps/web/vercel.json lines 20-26](/apps/web/vercel.json).
- The cookie-boundary verification was satisfied in M1 phase
  1.3.2 against production — verify by reading
  [shared-auth-foundation.md "Verification Evidence"](/docs/plans/shared-auth-foundation.md).
- The M3 milestone doc's documentation-ownership claims for 3.3
  — verify by reading
  [m3-site-rendering.md lines 405-471](/docs/plans/m3-site-rendering.md).
- The current state of architecture.md placeholder caveats —
  verify by reading
  [docs/architecture.md lines 30-33](/docs/architecture.md),
  [docs/architecture.md lines 61-67](/docs/architecture.md),
  [docs/architecture.md lines 354-358](/docs/architecture.md), and
  [docs/architecture.md line 898](/docs/architecture.md).
- The current state of architecture.md's apps/site file
  inventory — verify by reading
  [docs/architecture.md lines 208-225](/docs/architecture.md)
  and confirming the absence of any apps/site rendering-layer
  bullets.
- The current state of README.md placeholder caveats — verify
  by reading
  [README.md lines 67-73](/README.md).
- The current state of docs/open-questions.md "Product And
  Live Event Operation" section — verify by reading
  [docs/open-questions.md lines 23-27](/docs/open-questions.md).
- The current state of docs/backlog.md "Event landing page"
  item — verify by reading
  [docs/backlog.md lines 143-147](/docs/backlog.md).
- The epic's Milestone Status table M3 row — verify by reading
  [docs/plans/event-platform-epic.md lines 14-23](/docs/plans/event-platform-epic.md).
- The milestone doc's top Status block — verify by reading
  [m3-site-rendering.md lines 4-8](/docs/plans/m3-site-rendering.md).
- The milestone doc's Phase Status table — verify by reading
  [m3-site-rendering.md lines 70-74](/docs/plans/m3-site-rendering.md).
- The milestone doc's batch-delete scope — verify by reading
  [m3-site-rendering.md lines 86-95](/docs/plans/m3-site-rendering.md).
- The verbatim Status string `In progress pending prod smoke`
  — verify by reading
  [docs/testing-tiers.md](/docs/testing-tiers.md) "Plan-to-Landed
  Gate For Plans With Post-Release Validation."
- The Plan-to-PR Completion Gate plan-walk requirement — verify
  by reading
  [AGENTS.md](/AGENTS.md) "Plan-to-PR Completion Gate" section.
- The Doc Currency PR Gate same-PR requirement — verify by
  reading the corresponding AGENTS.md section.
- The Estimate Deviations PR-body section requirement — verify
  by reading
  [.github/pull_request_template.md](/.github/pull_request_template.md)
  and the AGENTS.md cross-reference at
  [AGENTS.md lines 1283-1290](/AGENTS.md).
- `npm run lint` covers the M3 doc tree (markdown linting via
  the workspace script) — verify by reading
  [package.json line 17](/package.json).
- `npm run build:site` still passes against the unchanged 3.2
  surface — verify by running it locally before merge.

## Related Docs

- [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) — M3
  milestone doc; cross-phase invariants, decisions, risks,
  documentation-ownership map. The 3.3 row in its Phase Status
  table flips through this scoping doc → plan → implementing PR.
- [event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  parent epic; the M3 row in its Milestone Status table flips
  to `Landed` in 3.3's PR alongside the milestone-doc Status
  flip.
- [m3-phase-3-1-1-plan.md](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 plan; pattern reference for plan structure.
- [m3-phase-3-1-2-plan.md](/docs/plans/m3-phase-3-1-2-plan.md) —
  3.1.2 plan; pattern reference for the
  `In progress pending prod smoke` two-phase Status pattern.
- [m3-phase-3-2-plan.md](/docs/plans/m3-phase-3-2-plan.md) —
  3.2 plan; immediate predecessor and pattern reference.
- [docs/plans/scoping/m3-phase-3-1.md](/docs/plans/scoping/m3-phase-3-1.md) —
  3.1.1's scoping doc. Records the slug + theme + asset path
  conventions M3 inherits. Deletes in batch with this doc in
  3.3's PR.
- [docs/plans/scoping/m3-phase-3-1-2.md](/docs/plans/scoping/m3-phase-3-1-2.md) —
  3.1.2's scoping doc. Records the OG image + `metadataBase`
  decisions M3 inherits. Same batch-deletion in 3.3.
- [docs/plans/scoping/m3-phase-3-2.md](/docs/plans/scoping/m3-phase-3-2.md) —
  3.2's scoping doc. Records the second-event Theme + content
  decisions M3 inherits. Same batch-deletion in 3.3.
- [m3-phase-3-3-plan.md](/docs/plans/m3-phase-3-3-plan.md) —
  3.3 plan; durable contract this scoping doc compresses to.
- [docs/architecture.md](/docs/architecture.md) — primary
  doc-currency edit target; 3.3 updates the rendering pipeline
  description, apps/site file inventory, per-event Theme
  registry note, Vercel routing topology table, and adds the
  cross-app ThemeScope asymmetry callout.
- [README.md](/README.md) — secondary doc-currency edit
  target; 3.3 drops the placeholder caveat and adds the
  multi-event rendering capability bullet.
- [docs/testing-tiers.md](/docs/testing-tiers.md) —
  Plan-to-Landed Gate For Plans With Post-Release Validation;
  binds the plan's two-phase Status pattern.
- [shared-auth-foundation.md](/docs/plans/shared-auth-foundation.md) —
  M1 phase 1.3 plan. "Verification Evidence" subsection
  records the production cookie-boundary verification 3.3
  re-confirms in its walk-through.
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) —
  audit name source (consumed by the plan's Self-Review Audits
  section).
- [apps/site/AGENTS.md](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. 3.3 introduces no new framework API
  surface, so the only reading the plan needs to re-confirm is
  the file-convention docs already cited by 3.1.2's plan; in
  practice the plan's Validation Gate inherits from 3.2 without
  new framework reading.
- [AGENTS.md](/AGENTS.md) — Phase Planning Sessions rules
  (including the "Scoping owns / plan owns" split this doc
  follows), Plan-to-PR Completion Gate, "Verified by:"
  annotation rule, "Quote labels whose enforcement depends on
  exact-match matching" rule (binds the verbatim
  `In progress pending prod smoke` string), "Plan content is a
  mix of rules and estimates" rule (the plan's estimate-shaped
  sections must carry the one-line preface).
