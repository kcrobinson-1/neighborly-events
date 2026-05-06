# M1 phase 1.2 — Scoping

## Status

Active.

This scoping doc is the transient artifact for phase 1.2 of the
Madrona feedback child epic, M1. Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Phase Planning Sessions" it owns the deliberation prose with
rejected alternatives, the open decisions handed to plan-drafting,
the plan-structure handoff, and the reality-check inputs the plan
must verify. The durable record of this phase will live in
`m1-phase-1-2-plan.md` (drafted next). This scoping doc deletes
in batch with sibling scoping docs at the M1 milestone-terminal
PR per the milestone doc's batch-deletion commitment
([`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).

## Phase Summary

Land the type-and-section-component half of the feedback MVP:
extend `EventContent` with an additive-optional `feedback?` field,
ship a new `EventFeedbackCTA` section component, and wire it into
`EventLandingPage`'s composition between `EventCTA` and
`EventFooter` with a `feedback`-presence omission guard. No event
opts feedback in during this phase — that is 1.3's responsibility,
along with the route + form. The deliberate intermediate state
1.2 lands is "the type and the section exist; no event uses
either; every event renders byte-for-byte unchanged." That state
is the falsifier the milestone doc's collapse-rejection paragraph
preserves: if the omission guard regresses, the test events would
sprout an empty section heading.

Independent of phase 1.1 (Supabase-only). Drafting and
implementation may run in parallel with 1.1's review.

## Decisions Made At Scoping Time

Per
[`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
"Verify before recording any cross-phase decision," each decision
below cites the actual code or type that grounds the call.
Rejected alternatives stay recorded so the plan doc inherits the
option-set without re-deriving.

### Decision 1: `EventContent.feedback` shape — full M1 needs in 1.2, not staged across 1.2 and 1.3

The milestone doc owns the field's outer shape ("optional `feedback?` —
field-name specificity preserves epic Invariant 2") and the epic
sketches the inner shape as
`feedback?: { enabled: true; ratingDimensions: { key: string; label: string }[]; ... }`
(`Verified by:`
[docs/plans/epics/madrona-feedback/epic.md:320-324](/docs/plans/epics/madrona-feedback/epic.md)).

The scoping question: does 1.2 land **only the fields its section
component reads** (CTA copy) and let 1.3 extend the type with
`ratingDimensions` + free-text prompt + email copy, or does 1.2
land the **full M1 inner shape** so 1.3 only adds the per-event
literal on `madrona.ts` and the form code that reads the existing
fields?

**Decision: 1.2 lands the full M1 inner shape.**

Three reasons:

1. **Single shape change vs. two.** Splitting forces
   `EventContent` to evolve twice in M1 — first 1.2 adds CTA
   fields, then 1.3 extends with rating dimensions and form
   copy. Each evolution risks foreclosure of Invariant 2 on a
   different axis; landing once means one field-name audit
   instead of two.
2. **The header-comment paragraph is the load-bearing surface
   for the type's documented shape.** Per the milestone's
   Documentation Currency map, 1.2 owns extending
   `eventContent.ts`'s additive-optional discipline paragraph
   to name the `feedback?` field. Rewriting that paragraph
   twice in two PRs is the same drift trap the
   [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
   "scoping does not restate plan-owned content" rule names.
3. **1.3's branch test stays cleaner.** If 1.3 only adds the
   `feedback: {...}` literal on `madrona.ts` and the form
   route consumer, its diff stays narrowly scoped to the
   route + form + content opt-in — the milestone doc's
   intended split. If 1.3 also has to extend the type, its
   diff straddles the type system and the form, which is the
   shape the [phase.md](/docs/agents/planning/phase.md)
   "PR-count predictions need a branch test" rule guards
   against.

Rejected alternative — **1.2 ships only CTA fields**: simpler
1.2 PR but pushes the type-extension drift trap onto 1.3, where
it composes badly with the route + form work. The marginal cost
in 1.2 (a few extra fields nobody reads yet) is small compared to
the downstream cost.

The plan doc owns the exact field set; the scoping handoff
records the constraint set.

(`Verified by:` epic Data Shape sketch at
[docs/plans/epics/madrona-feedback/epic.md:320-324](/docs/plans/epics/madrona-feedback/epic.md);
the milestone Cross-Phase Decision "EventContent.feedback exact
field shape — Phase 1.2 owns" at
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:423-432](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))

### Decision 2: `EventContent.feedback` field-name specificity — `feedback`-prefixed inner field names where ambiguity is plausible

Epic Invariant 2 forbids foreclosing the donation child epic's
shape needs (`Verified by:`
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:488-496](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).
The donation child epic does not have a scoping doc yet — there
is nothing concrete to coordinate against — but the milestone
risk register explicitly names a recurring trap: a generic field
name (`prompt`, `dimensions`, `cta`) that the donation epic
might also want under a different semantic. The lineup / sponsor
depth fields adopted field-name specificity (`extendedBio`,
`featuredQuote`, `externalLinks`, `socialLinks`) as the
working precedent (`Verified by:`
[apps/site/lib/eventContent.ts:67-71](/apps/site/lib/eventContent.ts)).

**Decision: prefix or qualify any inner field name whose generic
form is plausibly something the donation child epic would also
want.**

Concrete shape the plan locks (illustrative, not contractual —
plan-drafting may refine):

```
feedback?: {
  cta: {                        // landing-page section copy
    heading: string;
    body?: string;
  };
  ratingDimensions: Array<{     // form's per-dimension rows
    key: string;
    label: string;
  }>;
  freeTextPrompt: string;       // form's optional textarea label
  emailCopy: {                  // form's email-field copy
    label: string;
    declineLabel: string;
    newsletterOptInLabel: string;
  };
  thankYouMessage: string;      // post-submit replacement copy
};
```

Note the outer field is `feedback` (already locked by the epic and
milestone). The inner fields don't carry a `feedback` prefix
**because the outer field already provides that namespace** —
`event.feedback.cta` is unambiguous. The donation epic would
introduce its own `donation?` outer field with its own inner
shape; collision is impossible at the inner-field level when the
outer field disambiguates. The trap the milestone names ("a
generic field name the donation epic might also want") applies
when an inner field is generic enough that splitting it across
two outer fields invites confusion or duplication — but every
inner field above is feedback-domain-specific.

The two names worth flagging for plan-drafting attention:

- **`cta`** — `EventContent` already has a top-level `cta` field
  (gameplay CTA;
  [apps/site/lib/eventContent.ts:123](/apps/site/lib/eventContent.ts)).
  `feedback.cta` is unambiguous because it nests under
  `feedback`, but plan-drafting verifies the section-component
  prop interface doesn't pun on the bare name in a way readers
  trip on.
- **`ratingDimensions`** — donation epic might want
  `donationOptions` or `tiers`, neither of which collide. Safe.

Rejected alternative — **prefix every inner field with
`feedback`**: `feedback.feedbackCta`, `feedback.feedbackRatings`.
Reads awkwardly because the outer field already namespaces.
Adopted nowhere else in `EventContent`.

(`Verified by:` the field-name-specificity precedent at
[apps/site/lib/eventContent.ts:67-71](/apps/site/lib/eventContent.ts);
the milestone risk-register paragraph naming the recurring trap
at
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:488-496](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))

### Decision 3: `EventFeedbackCTA` is a thin section component reading from `EventContent.feedback`, not a hardcoded-copy component

Two options for where the CTA's copy lives:

**(a)** Hardcoded in the component ("How was the show? Tell us
what you liked or didn't"). The component reads only `slug` to
build the href; presence of `EventContent.feedback` is the
omission gate.

**(b)** Authored on `EventContent.feedback.cta`. The component
reads `feedback.cta.heading` and `feedback.cta.body`; the section
renders nothing if `feedback` is absent.

**Decision: (b).**

The Madrona MVP only has one event opting feedback in, so the
day-one copy difference between (a) and (b) is zero. But the
type extension under Decision 1 carries the full M1 shape, which
already includes content-authored form copy (`freeTextPrompt`,
`emailCopy`, `thankYouMessage`); making the CTA copy the one
exception that lives in code rather than content drifts from the
discipline `EventContent` enforces everywhere else (`Verified by:`
the existing per-event `cta.label` and `cta.sublabel` content
authoring at
[apps/site/lib/eventContent.ts:123](/apps/site/lib/eventContent.ts);
the gameplay CTA reading those at
[apps/site/components/event/EventCTA.tsx:24-29](/apps/site/components/event/EventCTA.tsx)).

Operational benefit: future events that opt feedback in get to
author CTA copy alongside their other content without a code
change. That matches the platform-genericity discipline epic
Invariant 1 binds.

The component itself is shaped after `EventCTA`:

```
function EventFeedbackCTA({ feedback, slug }) {
  return (
    <section className="event-feedback-cta" aria-labelledby="…">
      <h2 …>{feedback.cta.heading}</h2>
      {feedback.cta.body ? <p …>{feedback.cta.body}</p> : null}
      <Link className="event-feedback-cta-button" href={…}>
        Share feedback
      </Link>
    </section>
  );
}
```

(`Verified by:` `EventCTA` shape at
[apps/site/components/event/EventCTA.tsx](/apps/site/components/event/EventCTA.tsx))

### Decision 4: Use Next.js `<Link>` for the CTA href (in-app navigation)

`EventCTA` uses a plain `<a>` because `routes.game(slug)` proxies
to apps/web (`Verified by:` the comment at
[apps/site/components/event/EventCTA.tsx:5-11](/apps/site/components/event/EventCTA.tsx);
the apps/web rewrite for `/play/:slug` shape, owned by apps/web).
`/event/<slug>/feedback` is **in-app** — apps/site owns
`/event/:slug/:path*` (`Verified by:`
[apps/web/vercel.json:23-26](/apps/web/vercel.json)) — so soft
client-side navigation via Next.js `<Link>` is the correct
default. The phase.md "Cross-app destinations need hard
navigation" rule applies in reverse: in-app destinations should
use the in-app navigation API, not a plain `<a>` that forces a
full document reload.

Rejected alternative — **plain `<a>`**: a full reload on a
same-app navigation costs a re-fetch of the route shell with no
upside; Next.js `<Link>` preserves the SPA-like UX inside
apps/site.

(`Verified by:` the apps/web rewrite at
[apps/web/vercel.json:23-26](/apps/web/vercel.json) for apps/site
ownership of `/event/:slug/:path*`)

### Decision 5: Section omission guard — `content.feedback ? <EventFeedbackCTA …/> : null` pattern, byte-for-byte test event invariant

The existing `EventLandingPage` composition uses two omission
patterns (`Verified by:`
[apps/site/components/event/EventLandingPage.tsx:30-39](/apps/site/components/event/EventLandingPage.tsx)):

- `content.testEvent ? <TestEventDisclaimer/> : null` — boolean
  presence on a literal `true` field
- `content.schedule.days.length > 0 ? <EventSchedule …/> : null` —
  array-length guard on a required field

`EventContent.feedback` is `?: T` (optional object) with no array
shape. The natural guard:

```
{content.feedback ? (
  <EventFeedbackCTA feedback={content.feedback} slug={slug} />
) : null}
```

This is structurally identical to the `testEvent` pattern (truthy
check on an optional/boolean). The milestone-level invariant on
test events rendering byte-for-byte unchanged
([m1-form-and-storage-mvp.md:255-261](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))
is the falsifier: if `harvest-block-party` or `riverside-jam`
(neither sets `feedback`) emits any DOM change after this PR
lands, the guard regressed.

Section ordering: `EventCTA` → `EventFeedbackCTA` → `EventFooter`.
The CTA-then-feedback ordering matches the epic's "Visual weight
intentionally below the gameplay CTA" call (`Verified by:`
[docs/plans/epics/madrona-feedback/epic.md:189-204](/docs/plans/epics/madrona-feedback/epic.md);
the milestone Cross-Phase Decision pinning placement at
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:357-363](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).

Rejected alternative — **`content.feedback?.cta && …`**: deeper
guard reading `.cta` specifically. Wrong because the `feedback`
object is the opt-in signal; a `feedback` object missing `.cta`
would be a content-authoring bug, not a render-it-without-the-CTA
case. The section component asserts its props are non-empty per
[apps/site/components/event/EventLandingPage.tsx:11-18](/apps/site/components/event/EventLandingPage.tsx).

### Decision 6: Validation tier — Vitest section-component tests, no dev-server gate, no Playwright

The existing test surface for section components is Vitest +
Testing Library at
[`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx).
It already covers `EventLandingPage` composition with the test
events' content shapes (`Verified by:` the
`EventLandingPage` describe block at
[tests/site/event/sectionComponents.test.tsx:383-445](/tests/site/event/sectionComponents.test.tsx)).

**Decision:** extend that file with `EventFeedbackCTA` cases plus
a composition test confirming:

- A content with `feedback` set renders `EventFeedbackCTA`'s
  heading.
- A content without `feedback` (the test events' shape) does NOT
  render any `event-feedback-cta` markup or the heading text.
- The href the CTA emits is `/event/<slug>/feedback`.

`npm run lint` and `npm run build:site` (the apps/site Next.js
build, since this PR touches apps/site) run as the type-currency
gate.

Rejected alternative — **Playwright e2e against the dev server**:
overkill for a section-component change. The existing apps/site
e2e coverage doesn't gate section-component additions; the
Vitest + build pair catches the failure modes 1.2 introduces
(type errors, omission-guard regression, prop-shape drift). If
1.3's form-route work surfaces a need for Playwright coverage of
the landing-page → feedback-route hop, 1.3's plan owns that.

(`Verified by:` the existing Vitest section-component coverage at
[tests/site/event/sectionComponents.test.tsx:383-445](/tests/site/event/sectionComponents.test.tsx);
the `package.json` `scripts.test` and `scripts.build:site`
entries at
[package.json](/package.json))

### Decision 7: Styles — minimal addition, render-the-consequence check

The `event-feedback-cta` section needs *some* styling to render
acceptably; the apps/site stylesheet at
[`apps/site/app/globals.css`](/apps/site/app/globals.css) is
where event-section CSS lives. The phase.md "Bans on surface
require rendering the consequence" rule applies: before declaring
"reuses existing button styles, no new CSS," plan-drafting runs
the dev server and views the section on a synthetic
`feedback`-opted-in event to confirm the no-new-CSS render is
acceptable.

**Decision:** plan-drafting picks the exact styles after the
dev-server consequence check; the scoping commitment is "land
whatever styling makes the section coherent with the existing
section-heading + button-link pattern, and prove it by looking at
the dev server before merge." This is the same discipline M2
phase 2.3 named after the SCSS / module CSS misstep
(`Verified by:` the recurring-trap paragraph at
[docs/agents/planning/phase.md:295-308](/docs/agents/planning/phase.md)).

Rejected alternative — **scope no new CSS at scoping time**:
violates the rendering-the-consequence rule. The dev-server check
might reveal the section reads as a default-browser link (the
exact M2 phase 2.3 trap); deferring that check to plan-drafting
is fine, deferring it past merge is not.

## Open Decisions To Make At Plan-Drafting

None blocking promotion to plan. Plan-drafting picks:

- The exact field set on `EventContent.feedback` (Decision 1
  locks the constraint that 1.2 lands the full M1 inner shape;
  the illustrative shape in Decision 2 is the starting point).
- The exact heading copy in the `EventFeedbackCTA` component
  shell (the heading itself comes from `feedback.cta.heading`;
  the surrounding label like "Share feedback" on the button is a
  small in-component string).
- The exact CSS class names and rule-set additions (post
  dev-server consequence check per Decision 7).
- The Vitest test names and synthetic-content shapes for the new
  cases (Decision 6 fixes the assertion targets).
- Whether the existing `EventLandingPage` composition comment
  block needs an edit (Documentation Currency map says "may
  produce no edit" — plan-drafting calls it).

## Plan Structure Handoff

The plan doc opens with a 1–3-paragraph Context preamble per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Plan opens with a plain-language context preamble," names the
Goal, restates the seven decisions above as the Contract section,
and adds standard Files To Touch / Execution Steps / Commit
Boundaries / Validation Gate / Self-Review Audits / Documentation
Currency PR Gate / Out Of Scope / Risk Register / Backlog Impact
sections. Cross-Cutting Invariants reference the parent epic's
six and the M1 milestone's five by reference (no restatement);
of those, this phase's diff actually moves on:

- Epic Invariant 1 (platform-genericity) — `EventFeedbackCTA`
  reads from `EventContent.feedback`, no madrona-keyed branches.
- Epic Invariant 2 (no foreclosure of donation epic) — Decision 2
  binds the field-name discipline.
- Milestone invariant: test events render byte-for-byte unchanged
  — Decision 5's omission guard is the load-bearing mechanism.

Validation Gate: Vitest section-component tests (per Decision 6) +
`npm run lint` + `npm run build:site`. Plus the dev-server
render-the-consequence check from Decision 7, recorded as a
plan-time validation step (not a CI gate, but an
implementer-must-do step before commit).

Files To Touch (estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan content is a mix of rules and estimates"):

- New: `apps/site/components/event/EventFeedbackCTA.tsx`
- Modify: `apps/site/lib/eventContent.ts` (type extension +
  header comment paragraph extension)
- Modify: `apps/site/components/event/EventLandingPage.tsx`
  (import + section composition)
- Modify: `tests/site/event/sectionComponents.test.tsx` (new
  cases per Decision 6)
- Modify (likely): `apps/site/app/globals.css` (styling per
  Decision 7; plan-drafting confirms after consequence check)
- Modify: `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md`
  Phase Status row 1.2: flip to `Landed` with PR link

Intentionally not touched:

- `apps/site/events/madrona.ts` — content opt-in is 1.3 scope.
- `apps/site/events/harvest-block-party.ts` and
  `apps/site/events/riverside-jam.ts` — test events stay as-is
  to make the byte-for-byte invariant a structural falsifier.
- `apps/web/vercel.json` — the existing `/event/:slug/:path*`
  rewrite already covers `/event/<slug>/feedback`; no change.
- `supabase/migrations/` — DB substrate is 1.1 scope.

## Reality-Check Inputs

Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Reality-check gate between scoping and plan," the plan doc's
load-bearing claims must verify against current code. Inputs the
plan must re-confirm at plan-drafting time:

- `EventContent` definition shape and the additive-optional
  discipline paragraph at
  [apps/site/lib/eventContent.ts:1-125](/apps/site/lib/eventContent.ts).
  Plan-drafting confirms the field set hasn't drifted and that
  the header comment's "additive-optional discipline" paragraph
  is the right place to extend.
- `EventLandingPage` composition shape at
  [apps/site/components/event/EventLandingPage.tsx:11-44](/apps/site/components/event/EventLandingPage.tsx).
  Plan-drafting confirms the section ordering hasn't shifted
  (current: Header → Schedule → Lineup → Sponsors → FAQ → CTA →
  Footer) and that the existing omission patterns are the two
  named in Decision 5.
- `EventCTA` component pattern at
  [apps/site/components/event/EventCTA.tsx](/apps/site/components/event/EventCTA.tsx)
  — the cross-app `<a>` precedent that `EventFeedbackCTA`
  diverges from (in-app `<Link>` per Decision 4).
- The apps/web rewrite at
  [apps/web/vercel.json:23-26](/apps/web/vercel.json) — confirms
  apps/site owns `/event/:slug/:path*` and the in-app navigation
  call in Decision 4 is correct.
- `tests/site/event/sectionComponents.test.tsx` shape — confirms
  the existing fixtures + the `EventLandingPage` describe block
  are the right extension surface, not a parallel test file.
- `apps/site/app/globals.css` rule set for the existing CTA /
  section-heading classes — informs Decision 7's render-the-
  consequence check and any new rule shape.
- `package.json` scripts: `scripts.test` (Vitest), `scripts.lint`,
  `scripts.build:site`. Confirms the validation gate command
  shape.
- Donation child epic existence: at scoping time, no scoping doc
  for a donation child epic exists under
  `docs/plans/epics/`; the only references are the parent
  epic's Invariant 2 and the milestone risk register. Plan-
  drafting re-greps in case a sibling scoping session lands one;
  if so, the plan reads it for any field-name asks Decision 2's
  shape would collide with.

If any of these reality-checks fail (file moved, composition
shape shifted, a sibling phase landed an unexpected omission
pattern, a donation-epic scoping doc lands with conflicting
field names), the plan doc records the discrepancy and adjusts
the affected decision before promoting to `Proposed`.
