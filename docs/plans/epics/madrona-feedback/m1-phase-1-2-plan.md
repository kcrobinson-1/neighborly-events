# M1 phase 1.2 — `EventContent.feedback` shape + `EventFeedbackCTA` section + landing-page wiring

## Status

Landed in [#213](https://github.com/kcrobinson-1/neighborly-events/pull/213).
The type extension, the new section component, the landing-page
composition wiring, the test extensions, the style additions
(post the dev-server consequence check), the doc-currency edit
to `eventContent.ts`, and the milestone doc Phase Status row
1.2 → `Landed` flip all ship in that PR per the
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
Plan-to-PR Completion Gate. Plan-doc retained because it owns the
Contracts and Validation Gate the implementation encodes; deletes
in batch with sibling phase plan docs at the M1 milestone-terminal
PR.

The deliberation prose with rejected alternatives lives in
[`scoping/m1-phase-1-2.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-2.md);
that scoping doc deletes in batch with sibling scoping docs at
the M1 milestone-terminal PR.

## Context

The M1 form-and-storage MVP for the Madrona feedback child epic
needs three things to ship: the database substrate (1.1, merged
in [#205](https://github.com/kcrobinson-1/neighborly-events/pull/205)),
the **type-and-section-component** half (this phase, 1.2), and the
route + form + content opt-in (1.3). Phase 1.2 is the part that
makes "any future event can opt feedback in by setting a field on
its `EventContent`" structurally true, even though no event opts
in until 1.3 ships.

Phase 1.2 is doing this *now* because (a) it is independent of
1.1 (1.1 is Supabase-only, 1.2 is apps/site-only) so it can run
in parallel with 1.1's review and merge, and (b) the milestone
doc's collapse-rejection paragraph commits to 1.2 landing as a
distinct PR with the explicit intermediate state "type and section
exist; no event uses either; every event renders the same set of
sections it did before" — that intermediate state is the falsifier
the
landing-page omission guard regression would erase.

The surfaces this touches at the conceptual level: the
`EventContent` type contract that every event's content module
binds to, the landing-page section composition that the
`/event/[slug]` route renders, and the section-component test
file that gates UI invariants on the existing test events. No
route, no form, no DB code, and no event opts in yet — that's
1.3's scope.

The deliberation behind the calls below — full M1 inner shape in
1.2 vs. staged across 1.2/1.3, field-name specificity, content-
authored vs. hardcoded CTA copy, in-app `<Link>` vs. plain `<a>`,
omission guard shape, validation tier, styling posture — lives in
[`scoping/m1-phase-1-2.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-2.md).

## Goal

After this PR:

- `EventContent` carries an additive-optional `feedback?` field
  whose presence opts an event in to the feedback surface, with
  the **full M1 inner shape** (CTA copy + rating dimensions +
  free-text prompt + email-field copy + thank-you message — the
  exact field set is locked in this plan's Contracts section);
- a new `EventFeedbackCTA` section component lives at
  `apps/site/components/event/EventFeedbackCTA.tsx`, reads CTA
  copy from `EventContent.feedback.cta`, and links to
  `/event/<slug>/feedback` via Next.js `<Link>`;
- `EventLandingPage` composes the new section between `EventCTA`
  and `EventFooter` under a `content.feedback ?` omission guard
  matching the existing `content.testEvent ?` pattern, so test
  events without `feedback` set render the same section set
  with no `EventFeedbackCTA` heading, copy, or markup reachable;
- `tests/site/event/sectionComponents.test.tsx` extends with the
  cases this plan's Validation Gate names (presence-renders /
  absence-omits / href-shape / no-CTA-on-test-events);
- `apps/site/app/styles/_event.scss` gains the minimal styling
  the dev-server consequence check this plan binds determines
  is necessary — written down post-check, not pre-judged;
- `apps/site/lib/eventContent.ts` header comment paragraph
  extends to name the `feedback?` field alongside the existing
  lineup / sponsor depth-field paragraph;
- `npm run lint` and `npm run build:site` pass against the
  type-extended code (`build:web` is workspace-scoped to the
  apps/web Vite SPA and does not exercise apps/site; per the
  [PR template gate memory](feedback_pr_template.md)
  `build:site` is required when apps/site is touched);
- `npm test` (Vitest) passes including the new section-component
  cases;
- the M1 milestone doc's Phase Status row 1.2 flips to `Landed`
  with the PR link; no other Phase Status row moves.

This phase does **not** opt feedback in on
`apps/site/events/madrona.ts` (1.3 scope), does **not** ship the
`/event/<slug>/feedback` route or the form component (1.3 scope),
does **not** touch the existing test events
(`harvest-block-party`, `riverside-jam`) — they stay as-is so the
same-section-set invariant is structurally falsifiable on those
events, and does **not** ship any
Supabase, vercel.json, or apps/web change.

## Cross-Cutting Invariants

This phase binds the six parent-epic invariants
([epic.md:106-177](/docs/plans/epics/madrona-feedback/epic.md))
and the five M1 milestone-level invariants
([m1-form-and-storage-mvp.md:229-296](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))
verbatim by reference; self-review walks each against this PR's
diff. Of those, the invariants this phase's diff actually moves
on:

- **Epic Invariant 1 (platform-genericity).**
  `EventFeedbackCTA` reads exclusively from
  `EventContent.feedback`; no madrona-keyed branches,
  no slug-keyed lookups inside the component body. The
  component's omission rule is generic — any event whose
  `EventContent.feedback` is absent renders no CTA.
- **Epic Invariant 2 (no foreclosure of donation child epic).**
  The `feedback?` outer field provides namespace for inner
  fields, so inner field names stay domain-natural (`cta`,
  `ratingDimensions`, `freeTextPrompt`, `emailCopy`,
  `thankYouMessage`) without colliding with anything a future
  `donation?` outer field might want. Self-review walks every
  new field name and asserts it's either feedback-domain-
  specific or namespaced-by-the-outer-field.
- **Milestone invariant: test events render the same set of
  sections — no new section sprouts.** Neither
  `harvest-block-party` nor `riverside-jam` sets `feedback`;
  the omission guard (`content.feedback ? <…/> : null`) keeps
  the rendered section set unchanged on those events (no
  `EventFeedbackCTA` heading, copy, or `event-feedback-cta`
  markup reachable). The validation gate's no-CTA-on-test-events
  assertion is the load-bearing falsifier; markup-level drift
  inside an existing section's body is not bound by this
  invariant.

The other epic / milestone invariants (DB-level integrity,
consent-record column shape, decline-as-first-class-path) are
not exercised by this phase's diff — those are 1.1's surface
(now merged) and 1.3's surface (form code).

## Naming

- Type field: `EventContent.feedback?` (outer field name locked
  by the epic and milestone).
- Inner fields (locked by this plan's Contracts):
  `feedback.cta` (object — `heading`, optional `body`),
  `feedback.ratingDimensions` (array of `{ key, label }`),
  `feedback.freeTextPrompt` (string),
  `feedback.emailCopy` (object — `label`, `declineLabel`,
  `newsletterOptInLabel`),
  `feedback.thankYouMessage` (string).
- Component file: `apps/site/components/event/EventFeedbackCTA.tsx`.
- Component export: `EventFeedbackCTA`.
- CSS class names: `.event-feedback-cta` (section wrapper) and
  `.event-feedback-cta-button` (the link styled as a button) —
  parallel to `.event-cta` / `.event-cta-button` at
  [apps/site/app/styles/_event.scss:85-100](/apps/site/app/styles/_event.scss)
  and
  [apps/site/app/styles/_event.scss:400-409](/apps/site/app/styles/_event.scss).
  Distinct names rather than reusing `.event-cta-*` because the
  test surface uses class names as queryable selectors and the
  two CTAs are semantically different sections; the dev-server
  consequence check confirms whether the rule shapes copy
  verbatim or share via SCSS extend / mixin.
- Heading id (for `aria-labelledby`):
  `event-feedback-cta-heading`, parallel to `event-cta-heading`
  at
  [apps/site/components/event/EventCTA.tsx:21](/apps/site/components/event/EventCTA.tsx).
- Button copy (in-component string, not content-authored):
  `Share feedback`. The CTA copy that varies per event is the
  heading and body lines, which come from `feedback.cta`; the
  button label is platform-uniform.

## Contracts

### `EventContent.feedback` shape

Illustrative shape — the contract structure for plan-time
clarity, not exact syntax the implementer transcribes. Per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan code minimalism" data-structure carve-out, the block below
is an inert type literal communicating field structure; the
prose around it is the load-bearing contract:

```
feedback?: {
  cta: {
    heading: string;
    body?: string;
  };
  ratingDimensions: Array<{
    key: string;
    label: string;
  }>;
  freeTextPrompt: string;
  emailCopy: {
    label: string;
    declineLabel: string;
    newsletterOptInLabel: string;
  };
  thankYouMessage: string;
};
```

The field is `?: T` (optional object). When present, the
landing-page CTA renders and 1.3's form route reads the rest of
the shape. When absent, the CTA omits and the route renders the
disabled-event state (1.3's branch).

Inner-field nullability:

- `cta.heading`, `freeTextPrompt`, `thankYouMessage`,
  `emailCopy.label`, `emailCopy.declineLabel`,
  `emailCopy.newsletterOptInLabel`, every
  `ratingDimensions[number].key`, every
  `ratingDimensions[number].label` are required strings when
  `feedback` is present. Empty strings are not rejected at the
  type layer — content authoring is the load-bearing surface,
  per the same discipline existing `meta.title` / `meta.description`
  fields adopt.
- `cta.body` is the only optional inner field (the CTA may
  render with just a heading; the body is decorative).
- `ratingDimensions` is required and may be empty, but a
  zero-dimension `feedback` configuration is content-authoring
  nonsense; 1.3's form code may render zero rating rows in that
  case rather than crash. This plan does not add a runtime check.

### `EventFeedbackCTA` component contract

The component accepts a non-null `feedback` object (typed as
`NonNullable<EventContent["feedback"]>`) and the event `slug`
string, and returns the rendered section element. The omission
guard lives in `EventLandingPage`, not inside the component —
the component itself asserts its `feedback` prop is non-empty
when called, matching the section-component discipline at
[apps/site/components/event/EventLandingPage.tsx:11-18](/apps/site/components/event/EventLandingPage.tsx).

Component renders:

- a `<section>` wrapper with class `event-feedback-cta` and an
  `aria-labelledby` pointing at the heading id below;
- an `<h2>` carrying `feedback.cta.heading`, with the same
  `event-section-heading` class the other section headings use
  and an `id` of `event-feedback-cta-heading`;
- an optional `<p>` carrying `feedback.cta.body` when that
  field is present (omitted when absent);
- a Next.js `<Link>` styled as the section button (class
  `event-feedback-cta-button`), labeled `Share feedback`,
  pointing at `/event/<slug>/feedback`.

The href is built inline as the route string, not via
the `routes` helper at
[shared/urls/index.ts](/shared/urls/index.ts), because that
helper is the apps/web cross-app navigation surface (per the
`EventCTA` precedent at
[apps/site/components/event/EventCTA.tsx:5-11](/apps/site/components/event/EventCTA.tsx))
and the feedback route is in-app to apps/site. If a future
shared apps/site URL helper lands, switch to it; for now the
inline string is more honest about which app owns the path.

### `EventLandingPage` composition change

The composition gains one new section, omission-guarded on the
truthiness of `content.feedback`, inserted between the existing
`EventCTA` render and the existing `EventFooter` render. When
`content.feedback` is present, the new `EventFeedbackCTA`
section renders with `feedback` and `slug` passed as props;
when absent, no markup is emitted for it.

The omission guard pattern matches the existing `testEvent`
truthiness-on-optional-field guard at
[apps/site/components/event/EventLandingPage.tsx:28](/apps/site/components/event/EventLandingPage.tsx),
not the `length > 0` array-guard the other sections use (which
doesn't apply to an optional object).

## Files To Touch

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer may deviate with rationale recorded as an
Estimate Deviation.

### New

- `apps/site/components/event/EventFeedbackCTA.tsx` — the
  section component per the contract above.

### Modify

- `apps/site/lib/eventContent.ts` — extend the `EventContent`
  type with the `feedback?` field per the Contracts section.
  Extend the header-comment additive-optional discipline
  paragraph (currently naming lineup / sponsor depth fields) to
  also name the `feedback?` field. The `eventContentBySlug`
  registry literal does not change — no event opts in yet (1.3
  scope).
- `apps/site/components/event/EventLandingPage.tsx` — import
  `EventFeedbackCTA`, add the conditional render between
  `EventCTA` and `EventFooter`. The composition comment block
  may need a small edit if the new section's omission shape
  reads differently from the existing `length > 0` /
  `testEvent ?` patterns; the implementer judges at edit time
  per the milestone Documentation Currency map's "verification
  may produce no edit" qualifier.
- `apps/site/app/styles/_event.scss` — add the
  `.event-feedback-cta` and `.event-feedback-cta-button` rule
  set (or share via SCSS extend — implementer decides post the
  dev-server consequence check this plan's Execution Steps
  binds).
- `tests/site/event/sectionComponents.test.tsx` — extend with
  the cases the Validation Gate names.
- `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md` —
  Phase Status row 1.2 flips to `Landed` with the PR link. No
  other rows move; the milestone-level Status stays `Proposed`
  (the milestone-terminal PR flips to `Landed`).

### Intentionally not touched

- `apps/site/events/madrona.ts` — feedback opt-in is 1.3 scope.
- `apps/site/events/harvest-block-party.ts` and
  `apps/site/events/riverside-jam.ts` — test events stay as-is
  to keep the same-section-set invariant a structural falsifier
  (if either started setting `feedback`, the omission guard
  would no longer be falsifiable on those events).
- `apps/web/vercel.json` — the existing `/event/:slug/:path*`
  rewrite already covers `/event/<slug>/feedback`; no change.
- `supabase/migrations/`, `shared/db/types.ts` — DB substrate is
  1.1's surface (merged).
- `shared/urls/index.ts` — adding an apps/site URL helper is
  out of scope; the inline `\`/event/\${slug}/feedback\`` string
  is honest about app ownership and a future helper PR can
  refactor.
- `docs/architecture.md`, `docs/product.md`, `docs/styling.md`,
  `docs/dev.md`, `docs/operations.md`, `README.md` — not
  knowingly touched per the milestone Documentation Currency
  map; this plan's Documentation Currency PR Gate re-verifies
  by grep.

## Execution Steps

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer may deviate with rationale recorded as an
Estimate Deviation.

1. Pull latest `main` on the implementing branch. Verify the
   reality-check inputs from the scoping doc still hold (the
   `EventContent` type shape, `EventLandingPage` composition,
   `EventCTA` precedent, the existing `_event.scss` rule
   shapes, the test-file structure, the absence of a donation-
   child-epic scoping doc).
2. Extend the `EventContent` type per the Contracts section.
   Update the header-comment additive-optional discipline
   paragraph to name `feedback?`. Run `tsc --noEmit` (via
   `npm run build:site` or directly) to confirm no existing
   event content module breaks (the field is `?: T`, so they
   should not).
3. Author `EventFeedbackCTA.tsx` per the component contract.
   Mirror the shape of `EventCTA.tsx` for the section / heading
   / link wrapping.
4. Add the omission-guarded composition line to
   `EventLandingPage.tsx`. Audit the composition comment block
   per the Documentation Currency map; edit only if the new
   omission shape reads differently from existing patterns.
5. Run the dev server and view a synthetic
   `feedback`-opted-in event to perform the
   render-the-consequence check per
   [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
   "Bans on surface require rendering the consequence." If the
   rendered section reads as a default-browser link or otherwise
   looks broken, write the SCSS rule set; if `.event-feedback-cta`
   reusing the `.event-cta` rule shape via SCSS extend is
   cleaner, do that. Either way, **don't ship without looking
   at the page**. The implementer's judgment call is which
   shape the SCSS takes; the discipline is the consequence
   check.
6. Extend `tests/site/event/sectionComponents.test.tsx` with
   the cases the Validation Gate names. Run `npm test` (Vitest)
   and confirm pass.
7. Run `npm run lint` and `npm run build:site`. Both must pass.
8. Update the milestone doc's Phase Status row 1.2: flip Status
   to `Landed`, add the PR link.
9. Commit, push, open PR using the project's PR template.

## Commit Boundaries

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer may deviate with rationale recorded as an
Estimate Deviation.

Two commits:

1. **`feat(site): add EventContent.feedback type + EventFeedbackCTA section`**
   — the `EventContent` type extension, the new component file,
   the `EventLandingPage` composition change, the SCSS rule set,
   and the test file extensions in one commit. Body explains the
   omission-guard shape, the same-section-set invariant, and the
   in-app `<Link>` choice.
2. **`docs(plans): flip M1 phase 1.2 status to Landed`** — the
   milestone-doc Phase Status row update. Separate commit
   because it is the close-out flip per the Plan-to-PR
   Completion Gate, distinct from the substrate change. Per the
   memory rule on close-out PRs, this commit may sit alongside
   the substrate commit in one PR.

A reviewer-feedback fix-up commit (if any) lands as a third
commit, kept distinct per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"keep review-fix commits distinct."

## Validation Gate

The phase's load-bearing claims are (a) every event whose
`EventContent.feedback` is absent continues to render the
landing page identically, (b) an event whose `feedback` is
present renders the new CTA section, (c) the CTA's link points
at `/event/<slug>/feedback`, and (d) the type extension does
not break compilation of any existing event content module.

The Vitest fixture
[`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
extends with these cases:

1. **Presence renders the section.** A synthetic content with
   a populated `feedback` object renders a section with the
   heading from `feedback.cta.heading` and a link with
   `href="/event/<slug>/feedback"`. Falsifies "the section
   never appears."
2. **Absence omits the section.** The existing `baseContent`
   (no `feedback`) rendered through `EventLandingPage` produces
   no `event-feedback-cta` class anywhere in the DOM and no
   "Share feedback" text. Falsifies a regression in the
   omission guard.
3. **Body is optional.** A `feedback` shape with no `cta.body`
   renders the heading and the link but no `<p>` element with
   the body class. Falsifies a "body is required" regression.
4. **Test events render no feedback CTA: harvest-block-party
   and riverside-jam.** Render `EventLandingPage` with each of
   the two real test event content modules. Confirm no
   `event-feedback-cta` class and no "Share feedback" text
   appears. Falsifies the milestone-level same-section-set
   invariant the collapse-rejection paragraph preserves.
   Markup-level drift inside an existing section's body is not
   bound by this assertion — only the *presence* of the new
   feedback section on test events would falsify it.
5. **Href shape.** Render the CTA in isolation with
   `slug="any-slug"` and confirm the link's `href` is
   `/event/any-slug/feedback`. Falsifies the in-app navigation
   contract (Decision 4 in scoping).

In addition:

- `npm run lint` — passes against the type-extended code.
- `npm run build:site` — passes (the apps/site Next.js build
  consumes the extended `EventContent` type).
- `npm test` (Vitest) — passes including the new cases.
- **Manual:** dev-server consequence check per Execution Step
  5. Recorded in the PR body's Validation section as
  "performed; here's what it looked like." Not a CI gate, but a
  ship-block.

`npm run build:web` is not required because this phase does
not touch `apps/web`. `npm run test:db` and `npm run test:functions`
are not relevant — no SQL or Edge Function changes.

## Self-Review Audits

Audit names from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
implementer reads the catalog at implementation time and matches
audit names to the diff surfaces below.

- **Type-currency:** `EventContent.feedback?` is `?: T`
  (optional); no required field added. All existing event
  content modules (`harvest-block-party.ts`, `madrona.ts`,
  `riverside-jam.ts`) compile without changes.
- **Field-name foreclosure walk (epic Invariant 2):** every
  inner field name on `feedback` is either feedback-domain-
  specific or namespaced-by-`feedback`; nothing the donation
  child epic would plausibly want under a different semantic.
- **Section-component composition discipline (epic Invariant
  1):** `EventFeedbackCTA` reads only from `feedback` and `slug`
  props; no slug-keyed branches inside the body, no
  madrona-specific imports.
- **Byte-for-byte test-event invariant:** the test cases above
  exercise this; self-review walks the rendered DOM under
  `harvest-block-party` and `riverside-jam` and confirms the
  diff is empty modulo the new section omission.
- **Documentation currency:** the `eventContent.ts` header
  comment paragraph extends to name `feedback?`; the
  `EventLandingPage` composition comment may or may not need an
  edit (per the milestone Doc-Currency map); the milestone doc
  Phase Status flips in this PR (gate below).
- **Verified-by citation walk:** every `Verified by:`
  annotation in this PR's diff (in commit messages, PR body,
  or any code comments added) cites a path:line retrieved
  fresh from a tool result in the same response that wrote
  the citation.
- **Plan-to-PR Completion Gate:** every Goal bullet is
  satisfied in the PR or explicitly deferred in the plan with
  rationale.

## Documentation Currency PR Gate

Doc updates this PR must land:

- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  header comment additive-optional discipline paragraph
  (currently lines 49-71) extends to name the `feedback?` field
  alongside the existing lineup / sponsor depth fields.
  **Owned by this PR.**
- [`docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
  Phase Status row 1.2: flip to `Landed`, add PR link.

Doc updates this PR is **not** responsible for (per the
milestone doc's Documentation Currency map):

- `apps/site/events/madrona.ts` header (1.3 scope).
- `apps/site/components/event/EventLandingPage.tsx` composition
  comment block — verification may produce no edit per the
  milestone map's qualifier; this plan's Execution Step 4 binds
  the audit.
- `docs/architecture.md`, `docs/product.md`, `docs/styling.md`,
  `docs/dev.md`, `docs/operations.md`, `README.md` — not
  knowingly touched. The plan re-verifies at implementation time
  by grep that none of these surfaces reference the
  `EventFeedbackCTA` shape or `EventContent.feedback` in a way
  that would now drift; if they do, fix in this PR per the
  "plan re-verifies by grep at phase-start" rule.

## Out Of Scope

- Form implementation, route, content opt-in on `madrona.ts`,
  rating-dimension authoring, form copy — phase 1.3 scope.
- DB substrate, RLS policies, generated types — phase 1.1
  surface (merged).
- An admin-UI flow for opting events into feedback — future-epic
  concern (M2 owns the read surface; opt-in stays migration- /
  content-authoring-driven).
- A shared apps/site URL helper for event-scoped paths —
  considered, deferred. The inline string is honest about
  app ownership; if a second apps/site path appears that
  pattern-matches this one, refactor then.
- Server-side rendering changes, theme-token additions, dark-mode
  variants — not knowingly required by this section's render;
  the dev-server consequence check is the falsifier (if dark
  mode looks broken, fix in this PR).
- Updating `docs/architecture.md`, etc. — phase ownership lives
  in the milestone doc's Documentation Currency map.

## Risk Register

- **Inner-field name collides with a future donation-epic
  field.** Mitigation: Decision 2 in scoping locks the field-
  name discipline; self-review walks every new field name
  against the donation-child-epic asks (none documented at
  plan time per the scoping reality-check). If a donation
  scoping doc lands between plan promotion and PR merge, the
  implementer re-walks and adjusts before commit. The outer
  `feedback?` namespace makes inner-field collision structurally
  impossible at the type level even if a donation epic picks
  the same inner names; the risk is reader confusion, not a
  type error.
- **CSS rule shape regresses an existing section's render.** The
  new `.event-feedback-cta` and `.event-feedback-cta-button`
  rules are scoped to new class names; existing
  `.event-cta` rules don't change. Mitigation: if the
  implementer chooses SCSS extend / mixin rather than verbatim
  rule duplication, the dev-server consequence check views the
  existing `.event-cta` section to confirm it renders unchanged.
- **Dev-server consequence check produces a "this looks broken"
  outcome that requires more SCSS than the plan estimates.**
  Accepted; the rule is "look at the page before declaring
  done." Recorded as an Estimate Deviation if the SCSS diff
  exceeds ~30 lines.
- **Test events accidentally regress the same-section-set
  invariant (a feedback CTA appears).** The existing fixtures don't set `feedback`, so
  the omission guard is structurally exercised. Mitigation: the
  Validation Gate's case 4 asserts no `event-feedback-cta`
  class appears under either real test event's content.
- **`<Link>` import path / Next.js 16 idiom drift.** Next.js 16
  is the apps/site framework version
  ([apps/site/package.json:18](/apps/site/package.json));
  `<Link>` is `next/link`'s default export and the import path
  has been stable across Next.js major versions. Mitigation:
  the build:site gate catches an import error.
- **Donation-child-epic scoping doc lands during plan promotion
  and surfaces a colliding outer field name.** Accepted;
  Decision 2 in scoping documents that the donation epic would
  need its own `donation?` outer field, which can't collide
  with `feedback?`. If the donation epic somehow proposes
  packing donation into `feedback` (it would be a wrong shape),
  surface as a pre-promotion blocker on the donation epic, not
  on this plan.

## Backlog Impact

- **Closed by this phase.** Nothing in
  [`docs/backlog.md`](/docs/backlog.md). The epic's Backlog
  Impact already established no attendee-feedback items live
  in the backlog.
- **Unblocked by this phase.** Phase 1.3 (route + form +
  content opt-in) gains the `EventContent.feedback` type it
  reads against and the landing-page CTA users will see once
  `madrona.ts` opts in.
- **Opened by this phase.** Anticipated candidates if
  implementation surfaces them: an apps/site URL helper for
  event-scoped paths (deferred per Out Of Scope above); any
  styling-discipline rule-shape ripple if the dev-server
  consequence check surfaces a need to extract shared
  section-CTA SCSS. Implementer logs concrete entries with
  rationale per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  doc-currency rules if any are surfaced.

## Related Docs

- [`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
  — parent milestone doc; the "Settled by default" CTA placement
  decision and the "EventContent.feedback exact field shape —
  Phase 1.2 owns" deferred decision this plan's Contracts
  section locks.
- [`scoping/m1-phase-1-2.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-2.md)
  — transient scoping doc; deliberation prose with rejected
  alternatives for the seven scoping-time decisions this plan's
  Contracts section locks.
- [`docs/plans/epics/madrona-feedback/epic.md`](/docs/plans/epics/madrona-feedback/epic.md)
  — parent epic; Cross-Cutting Invariants 1 (platform-genericity)
  and 2 (no foreclosure of donation child epic) are the
  load-bearing constraints this phase ships under.
- [`docs/plans/epics/madrona-feedback/m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-feedback/m1-phase-1-1-plan.md)
  — sibling phase plan; ships the DB substrate the route in
  1.3 will write to. Independent of 1.2 — they ship in
  parallel.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent` type this phase extends.
- [`apps/site/components/event/EventLandingPage.tsx`](/apps/site/components/event/EventLandingPage.tsx)
  — composition surface this phase wires the new section into.
- [`apps/site/components/event/EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx)
  — sibling section component; the shape `EventFeedbackCTA`
  mirrors (with the `<Link>` vs. `<a>` divergence per
  Decision 4 in scoping).
- [`apps/site/app/styles/_event.scss`](/apps/site/app/styles/_event.scss)
  — SCSS partial this phase extends.
- [`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
  — test surface this phase extends.
- [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  — phase planning rules; "Bans on surface require rendering
  the consequence" gate this plan's Execution Step 5 binds.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — cross-level rules; `Verified by:` annotations,
  rules-vs-estimates labeling, Plan-to-PR Completion Gate.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — audit-name source for Self-Review Audits.
