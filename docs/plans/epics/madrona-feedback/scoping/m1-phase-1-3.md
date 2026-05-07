# M1 phase 1.3 — Scoping

## Status

Active.

This scoping doc is the transient artifact for phase 1.3 of the
Madrona feedback child epic, M1. Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Phase Planning Sessions" it owns the deliberation prose with
rejected alternatives, the open decisions handed to plan-drafting,
the plan-structure handoff, and the reality-check inputs the plan
must verify. The durable record of this phase will live in
`m1-phase-1-3-plan.md` (drafted in this same PR, mirroring the
1.1 / 1.2 precedent of scoping+plan-together planning PRs). This
scoping doc deletes in batch with sibling scoping docs at the M1
milestone-terminal PR per the milestone doc's batch-deletion
commitment
([`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).

## Phase Summary

Land the route + form + content-opt-in half of the M1 feedback
MVP. After this phase, a Madrona '26 attendee can reach
`/event/madrona/feedback` from the landing-page CTA (which
[`EventFeedbackCTA`](/apps/site/components/event/EventFeedbackCTA.tsx)
1.2 shipped now renders, because madrona.ts opts feedback in),
fill out per-dimension star ratings + an optional free-text
field + an optional email + the decline / newsletter checkboxes,
submit, and see a thank-you message replace the form in place.
The submission lands as a row in `feedback_submissions` (the FK
to `feedback_enabled_events` already accepts `'madrona'` because
phase 1.1 seeded it).

This is the **terminal phase of M1**, so the implementing PR
(or the last sub-phase PR if a sub-split is taken) also flips
the M1 milestone doc Status `Proposed` → `Landed` and batch-
deletes the three M1 scoping docs (1.1, 1.2, 1.3) per the
milestone doc's Documentation Currency commitment.

Both blocking dependencies are merged: 1.1 (DB substrate +
`madrona` registry seed) in [#205](https://github.com/kcrobinson-1/neighborly-events/pull/205);
1.2 (`EventContent.feedback?` type + `EventFeedbackCTA`
section component + landing-page wiring) in
[#213](https://github.com/kcrobinson-1/neighborly-events/pull/213).

## Decisions Made At Scoping Time

Per
[`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
"Verify before recording any cross-phase decision," each decision
below cites the actual code or contract that grounds the call.
Rejected alternatives stay recorded so the plan doc inherits the
option-set without re-deriving.

### Decision 1: Two-PR sub-split — `1.3.1` route + form + disabled-event branch (no opt-in), then `1.3.2` madrona.ts opt-in

The milestone doc's Phase Status table authorizes a 1.3 sub-split
as an Estimate Deviation if the branch test names it (`Verified by:`
[m1-form-and-storage-mvp.md:140-145](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).

Branch test (per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"PR-count predictions need a branch test"):

- **Subsystems touched:** Next.js route layer (new `page.tsx`),
  client-side form component (new), Supabase anon insert
  contract (new client-side consumer), event content opt-in
  (`madrona.ts`), SCSS form styling (new ruleset),
  Vitest fixture (new file), milestone Phase Status flip.
  That is **7 distinct subsystems** — over the >5 threshold the
  plan.md branch test names.
- **LOC estimate:** route ~50, form component ~250, tests ~150,
  madrona.ts opt-in ~25, SCSS ~100. **~575 LOC of substantive
  logic** — well over the >300 threshold.

Sub-split shape:

- **1.3.1 — route + form + disabled-event branch.** Lands the
  Next.js page at `app/event/[slug]/feedback/page.tsx`, the
  client-side form component, the disabled-event branch, the
  Vitest tests, and the SCSS. **`madrona.ts` is not touched.**
  After 1.3.1 ships: `/event/madrona/feedback` exists and
  renders the disabled-event state (because madrona hasn't
  opted in yet); the landing-page `EventFeedbackCTA` doesn't
  render either (same reason). The intermediate state is "code
  without consumer" — same shape as 1.2's intermediate state.
- **1.3.2 — madrona.ts opt-in (terminal M1 PR).** Single-file
  change adds the `feedback: {...}` literal to madrona's
  content module. The moment this PR lands, the CTA appears
  on `/event/madrona`, the form goes live, and real attendee
  submissions can land. Plus the M1 milestone-terminal
  documentation responsibilities: flip M1 Status to `Landed`,
  batch-delete the three M1 scoping docs.

**Decision: 2-PR split as above.**

Rationale for 2 over 3:

- Splitting form from route adds ceremony without falsifier
  benefit — neither half is independently usable, and the
  Vitest fixture for the form needs the route's three-branch
  shape to assert against. Single PR for route + form keeps
  the test surface coherent.
- The opt-in change is uniquely small (one literal in one
  file) and uniquely high-leverage (it's the moment the system
  goes live for one event slug). Isolating it from the form's
  bug surface is the same discipline 1.2 took with the
  "type and section exist; no event uses either" intermediate
  state.

Rejected — **single PR for all three**: ~575 LOC over 7
subsystems, hits the branch-test thresholds. The "intermediate
state would be broken" framing is a weak default per
[memory](feedback_pr_split_rejection_pattern.md); 1.3.1's
intermediate state is *not* broken — it's "no event opts in,
so the route renders the disabled-event state for everyone,"
which is a coherent shape the milestone-level no-404 invariant
covers.

Rejected — **3-PR split (form / route / opt-in)**: form and
route are tightly coupled at the type level; splitting forces
1.3.1 to ship a component nothing reaches.

(`Verified by:` the milestone doc's collapse-rejection
paragraph and 1.3 sub-split authorization at
[m1-form-and-storage-mvp.md:140-151](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md);
the phase.md branch-test thresholds at
[docs/agents/planning/phase.md:288-294](/docs/agents/planning/phase.md);
the PR-split-rejection memory at
`feedback_pr_split_rejection_pattern.md`)

### Decision 2: Submission path — direct anonymous Supabase insert from the client

The 1.1 migration grants anon INSERT on `feedback_submissions`
(`Verified by:`
[supabase/migrations/20260506000000_add_feedback_tables.sql:74-87](/supabase/migrations/20260506000000_add_feedback_tables.sql)
for the `grant insert on table public.feedback_submissions to
anon` and the matching policy `"anon can insert feedback for
registered events"`). The FK on `event_slug` enforces "must be a
registered slug" at the database. The two named CHECK constraints
enforce the milestone-level consent invariants. So the submission
shape is structurally bounded at the DB layer regardless of how
the client gets there.

Three options for the submission path:

**(a) Direct anon insert from the browser.** Form calls
`getBrowserSupabaseClient().from('feedback_submissions').insert({...})`.
Existing pattern at
[apps/site/lib/supabaseBrowser.ts:32-45](/apps/site/lib/supabaseBrowser.ts).

**(b) Next.js Server Action.** Form posts to a server action
that writes through a server-side Supabase client.

**(c) Supabase Edge Function.** Form posts to an Edge Function
that wraps the insert (paralleling the redemption flow's
SECURITY DEFINER RPC pattern).

**Decision: (a) direct anon insert.**

The form is unauthenticated by design (epic Product Surface).
No server-side context is needed: no auth check (anon), no
multi-step orchestration, no privileged DB operation. (b) and
(c) add an indirection layer with no authorization or
orchestration justification.

The integrity story holds end-to-end without server mediation:

- FK rejects unregistered slugs (only `'madrona'` is registered
  per 1.1; a future event opts in via a registry-insert
  migration in its own phase).
- CHECK constraints reject decline-with-email, opt-in-without-
  email, and opt-in-with-declined-email on the way in.
- RLS denies all reads under anon (the `select` policy is
  authenticated-only); no data leak from misconfigured client.
- The Risk Register on
  [m1-phase-1-1-plan.md](/docs/plans/epics/madrona-feedback/m1-phase-1-1-plan.md)
  already accepted the open-REST-surface risk for `madrona`
  (anyone with the publishable key can hit the endpoint
  directly bypassing the form); adding a server hop here
  would not close that surface, only obscure it.

Rejected — **(b) Server Action**: adds Next.js framework
coupling for no benefit. Server Actions are correct when the
operation needs server-side state (auth, server env vars,
private API keys, transactional sequencing). None apply here.

Rejected — **(c) Edge Function**: even more indirection. The
redemption flow uses an Edge Function because that flow is
SECURITY DEFINER and orchestrates multiple writes
(entitlement state machine, audit log) under the service-role
key. Feedback submission is one row, written under anon, with
DB-layer integrity. The shape doesn't match.

(`Verified by:`
[supabase/migrations/20260506000000_add_feedback_tables.sql:74-87](/supabase/migrations/20260506000000_add_feedback_tables.sql)
for the anon-insert grant + policy;
[apps/site/lib/supabaseBrowser.ts:32-45](/apps/site/lib/supabaseBrowser.ts)
for the existing browser-client helper this phase reuses;
the redemption Edge Function pattern at
[supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
for the contrast)

### Decision 3: Three-branch route — opted-in (form), known-but-not-opted-in (friendly disabled state), unknown slug (404)

The milestone doc binds a "no 404 for disabled events" invariant:
"feedback isn't being collected for this event" is the friendly
state, not a 404 (`Verified by:`
[m1-form-and-storage-mvp.md:255-261](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
on the test-event invariant context;
[epic.md:114-119](/docs/plans/epics/madrona-feedback/epic.md)
for the friendly-state product framing).

But that invariant covers events the platform *knows about* —
events whose `EventContent` exists but doesn't opt feedback in.
Unknown slugs entirely (a typo, a brand-confused URL, a slug
that simply doesn't exist on the platform) are a different
shape. The existing landing-page route at
[apps/site/app/event/[slug]/page.tsx:107-110](/apps/site/app/event/[slug]/page.tsx)
calls `notFound()` for unknown slugs, returning Next.js's
standard 404. Diverging from that on the feedback sub-route
would surface "feedback isn't being collected for this event"
on `/event/totally-fake-slug/feedback`, which is misleading —
the issue isn't the feedback toggle, it's that the slug doesn't
exist.

**Decision: three-branch route.**

- `EventContent.feedback` present → render the form.
- `EventContent` exists but `feedback` absent → render the
  friendly disabled-event state.
- `getEventContentBySlug(slug)` returns null → call
  `notFound()`, matching the landing-page route's convention.

The friendly disabled-event state is a small inline message;
exact copy is plan-time. No form, no rating rows, no submit
button — just the message + a return-to-landing link.

(`Verified by:`
[apps/site/app/event/[slug]/page.tsx:100-117](/apps/site/app/event/[slug]/page.tsx)
for the `notFound()` precedent on unknown slugs;
[apps/site/lib/eventContent.ts:151-162](/apps/site/lib/eventContent.ts)
for the resolver's `null` return on miss)

### Decision 4: Form state — local React `useState`, no library, simple state machine

The form is a single component on a single page. Four high-level
states: **idle** (user is filling fields), **submitting** (insert
in flight), **success** (thank-you replaces form), **error**
(retry-able message visible alongside form fields, fields
preserved). No multi-step wizard, no cross-page state, no shared
store needed.

**Decision: local `useState` for field values + a string-tagged
state machine for the submission lifecycle.** No Redux, no
Zustand, no React Hook Form. The form fields are few enough
(per-dimension ratings, free text, email, two checkboxes) that
hand-rolled state is simpler than the form-library overhead.

(`Verified by:` `apps/site` package contents at
[apps/site/package.json](/apps/site/package.json) — no form
library is present, so introducing one is its own decision and
out of scope for M1.)

### Decision 5: Rating row UX — labeled buttons per star, not native radios; N/A as a separate toggle

The epic's UX paragraph names the row shape: "labeled 1–5 star
rows, each with an N/A option. Tapping a star sets the rating;
tapping N/A clears stars and marks the row N/A." (`Verified by:`
[epic.md:205-208](/docs/plans/epics/madrona-feedback/epic.md)).

**Decision: each rating row is a `<fieldset>` with the
dimension `label` as `<legend>`; five star-buttons inside as
the `1..5` rating, plus a sixth N/A button. Selecting a star
sets the row's rating to its number; selecting N/A clears the
star selection and marks the row N/A.**

Accessibility shape (locked in plan):

- `<fieldset>` carries the dimension's label as `<legend>` so
  the row group has an accessible name.
- Each star-button has `aria-label="Rate {label} {n} stars"`
  (or similar — copy is plan-time).
- The N/A button has `aria-label="Mark {label} not applicable"`.
- The currently-selected button carries `aria-pressed="true"`;
  others `aria-pressed="false"`.

Rejected — **native `<input type=radio>` set**: works for the
1..5 selection, but the N/A option doesn't compose cleanly with
the radio group (it's not a sixth value of the same type — it's
a "no value" assertion), and the visual styling needed to make
radios look like tap-targetable stars on a phone is at least as
much CSS as the custom buttons need.

Rejected — **slider input + N/A toggle**: 1..5 sliders are
imprecise on touch devices and don't communicate the discrete
choice well.

(`Verified by:` epic UX paragraph at
[epic.md:205-208](/docs/plans/epics/madrona-feedback/epic.md))

### Decision 6: Email validation — minimal regex on submit, no DNS

Per epic Resolved Decisions: "presence of `@` and a dot,
non-empty domain segment; no deliverability or DNS check"
(`Verified by:`
[epic.md:480-482](/docs/plans/epics/madrona-feedback/epic.md)).

**Decision: a minimal regex enforcing one `@`, at least one
character on each side, and at least one `.` in the domain
segment with at least one character on each side. Validation
fires on submit, not on every keystroke. When the decline
checkbox is checked, the email field is hidden and not
validated.**

The exact regex is plan-time; the rule is the contract. The
validation is a UX guard, not a security one — DB doesn't
validate format (per the epic-settled decision the PR #205
review surfaced).

Rejected — **on-keystroke validation**: more annoying for
attendees actively typing.

Rejected — **stricter regex with deliverability heuristics**:
out of scope per epic.

### Decision 7: Submit button label — platform-uniform "Submit feedback," not content-authored

Most form-side copy is content-authored on `EventContent.feedback`
(per 1.2's locked shape: `cta.heading`, `cta.body`,
`freeTextPrompt`, `emailCopy.label`, `emailCopy.declineLabel`,
`emailCopy.newsletterOptInLabel`, `thankYouMessage`). The submit
button label is the one form-side string that did *not* land in
the type extension — and a deliberate omission, because the
button label is a platform convention rather than per-event
voice.

**Decision: hardcoded `Submit feedback` string in the form
component.**

If a future event needs to override the submit-button label,
extend the `feedback.emailCopy` object (or add a parallel
`buttonCopy` field) at that point. M1 doesn't need it.

Rejected — **author the submit label on `EventContent.feedback`**:
adds a field nothing in the M1 corpus needs (single event
opting in). Adds field-name-foreclosure exposure for what would
be a bare "submit" or "buttonLabel" generic name. The 1.2
field-name-specificity discipline argues against generic field
names that future epics might also want; same logic argues
against widening the type for a string that's likely uniform.

### Decision 8: Validation tier — Vitest for form, manual dev-server check for the live submission, no Playwright

The Vitest + Testing Library surface that 1.2 extended already
covers section components and renders against synthetic content
shapes (`Verified by:`
[tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)).
The form component fits the same surface: render it, exercise
the rating-button selection, the email decline toggle, the
submit-state-machine transitions, the thank-you replacement.

**Decision:**

- **Vitest** is the primary validation surface for the form
  component's behavior (rating selection, validation rules,
  state-machine transitions, conditional rendering of email +
  newsletter rows).
- **Manual dev-server check** runs the form against the local
  Supabase stack to verify a real anon insert lands in
  `feedback_submissions` with the correct shape. This is the
  "render the consequence" discipline the 1.2 plan adopted —
  same shape applied to the submission path. The implementing
  PR records the manual-check outcome in the PR body.
- **Playwright is not required.** The pgTAP fixture in 1.1
  (`feedback_tables.test.sql`) already exercises the anon
  insert at the DB layer; adding a Playwright test that
  exercises the same insert through the browser is a fourth
  gate over the same falsifier and adds CI cost without new
  coverage. If a future post-launch issue surfaces that only
  a Playwright-shaped test would catch, file as backlog work
  at that point.

Rejected — **Playwright e2e in CI**: cost vs. falsifier-set
analysis above.

Rejected — **mock the Supabase client in Vitest**: tempting
because it's faster than the manual check, but mocks drift
from the real client and we just removed an entire class of
"mocked tests pass, prod fails" risk in another epic. The
manual dev-server check exercises the real client against the
real local stack.

(`Verified by:`
[tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
for the existing test surface;
[supabase/tests/database/feedback_tables.test.sql](/supabase/tests/database/feedback_tables.test.sql)
for the pgTAP coverage 1.1 already shipped;
[scripts/testing/run-db-tests.cjs](/scripts/testing/run-db-tests.cjs)
for the wrapper)

## Open Decisions To Make At Plan-Drafting

None blocking promotion to plan. Plan-drafting picks:

- The exact email-validation regex (Decision 6 fixes the
  rule).
- The exact ARIA labels for rating-row buttons (Decision 5
  fixes the shape).
- The exact disabled-event-state copy (Decision 3 fixes the
  branching, the inline message and the return-link copy are
  plan-time).
- The exact rating-dimension list authored on `madrona.ts`
  (the milestone names the starting set of five and flags 1–2
  more — the epic's "Rating dimensions" section names food /
  vendors / volunteer interactions / scavenger game as
  candidates;
  [`Verified by:`](/docs/plans/epics/madrona-feedback/epic.md)
  epic.md:255-268). Plan-drafting picks the final M1 list.
- The exact form copy on `madrona.ts` (Decision 7 fixes the
  submit button; the rest are content-authored per 1.2's
  locked shape).
- The Vitest case names and synthetic content shapes (Decision
  8 fixes the assertion targets).
- Whether `apps/site/app/styles/_event.scss` needs the form
  styling colocated with the existing event rules, or whether a
  new partial (`_feedback-form.scss`) reads cleaner. Plan-
  drafting calls it after the dev-server consequence check.

## Plan Structure Handoff

The plan doc owns Status, Context preamble, Goal, Cross-Cutting
Invariants, Naming, Contracts (full final shape), Files To
Touch, Execution Steps, Commit Boundaries, Validation Gate,
Self-Review Audits, Documentation Currency PR Gate, Out Of
Scope, Risk Register, and Backlog Impact per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Scoping owns / plan owns."

The plan doc opens with a 1–3-paragraph Context preamble per
"Plan opens with a plain-language context preamble," and binds
the parent epic's six invariants and the M1 milestone's five
invariants by reference. Of those, this phase's diff actually
moves on:

- Epic Invariant 1 (platform-genericity) — the form reads its
  shape from `EventContent.feedback` and submits with the slug
  from the route param; no madrona-keyed branches.
- Epic Invariant 2 (no foreclosure of donation epic) — no new
  fields on `EventContent` shape (1.2 already locked them).
- Epic Invariant 3 (rating-dimension keys are content-authored) —
  the form iterates over `feedback.ratingDimensions` and emits
  the keys verbatim into the `ratings` jsonb.
- Epic Invariant 4 (decline-as-first-class-path) — the form
  renders the decline checkbox prominently, hides the email
  field when checked, and submits `email_declined: true` with
  `email: null`.
- Epic Invariant 5 (newsletter is opt-in not opt-out) — the
  newsletter checkbox defaults unchecked and is hidden when
  decline is checked.
- Epic Invariant 6 (DB-level integrity) — the form's submission
  shape matches the schema; the FK and CHECK constraints are
  the load-bearing enforcement, not the client.
- Milestone invariant: test events render the same section set
  with no new section sprouting — this phase doesn't change
  `EventLandingPage`, but the test events still need to render
  unchanged after `madrona.ts` opts in (1.3.2 only mutates
  madrona's content). Self-review walks the assertion.
- Milestone invariant: no 404 for disabled events — Decision 3
  binds the three-branch route shape that satisfies it.
- Milestone invariant: newsletter opt-in alongside consent
  context — the form submits `newsletter_opt_in`, `email`,
  `email_declined`, and lets `submitted_at` + `event_slug`
  default; the schema records the consent context.

Validation Gate names Vitest cases per Decision 8 plus the
manual dev-server submission check. `npm run lint` and
`npm run build:site` cover the type-and-build surface.

## Reality-Check Inputs

Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Reality-check gate between scoping and plan," the plan doc's
load-bearing claims must verify against current code. Inputs the
plan must re-confirm at plan-drafting time:

- The 1.1 anon-insert grant and policy at
  [supabase/migrations/20260506000000_add_feedback_tables.sql:74-87](/supabase/migrations/20260506000000_add_feedback_tables.sql).
  Plan-drafting confirms the surface hasn't drifted.
- The 1.2 type extension shape at
  [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts).
  Plan-drafting confirms the inner-field set the form reads
  against.
- The 1.2 `EventFeedbackCTA` href at
  [apps/site/components/event/EventFeedbackCTA.tsx](/apps/site/components/event/EventFeedbackCTA.tsx).
  Plan-drafting confirms the link target this phase's route
  serves matches `/event/<slug>/feedback` (with
  `encodeURIComponent` per the PR #213 fix).
- The browser Supabase client helper at
  [apps/site/lib/supabaseBrowser.ts](/apps/site/lib/supabaseBrowser.ts).
  Plan-drafting confirms the call shape and config requirements.
- The existing Server Component → client component boundary
  pattern in apps/site (the route page is a Server Component
  that imports a `'use client'` form component). Plan-drafting
  reads the existing apps/site routes for an in-repo precedent
  if any exists.
- The Vitest section-component fixture at
  [tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
  for the test-extension pattern.
- The local Supabase stack via
  [scripts/testing/run-db-tests.cjs](/scripts/testing/run-db-tests.cjs)
  — confirms the manual dev-server check has a working local
  DB to submit against.
- `apps/site/app/styles/_event.scss` rule set — informs the
  styling-Decision call (colocate vs. new partial).
- `docs/product.md` — milestone Doc Currency map names this
  doc as a 1.3-owned grep check ("any attendee-feedback
  reference that named the surface as deferred extends to
  reflect what M1 ships"). Plan-drafting greps for it.
- `docs/styling.md` — milestone Doc Currency map names this
  as a 1.3-owned grep check ("if any styling-discipline
  paragraph is touched, phase 1.3 plan-drafting re-verifies by
  grep"). Plan-drafting greps for it.
- `apps/site/events/madrona.ts` — confirms the content module's
  current shape so 1.3.2's diff is just the `feedback` block
  added before `footer`.
- `docs/backlog.md` Tier 1 entries on slug case-sensitivity
  and slug-format prevention — confirm whether either bites
  the feedback flow before launch (e.g., a typo'd slug in a
  printed URL would silently fall to the disabled-event
  branch under Decision 3, not 404; whether that's OK or
  needs preempting is plan-time).

If any of these reality-checks fail (file moved, helper
signature changed, a sibling phase landed an unexpected shape),
the plan doc records the discrepancy and adjusts the affected
decision before promoting `In draft` → `Proposed`.
