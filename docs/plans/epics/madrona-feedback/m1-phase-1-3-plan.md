# M1 phase 1.3 — Feedback route + form + madrona content opt-in

## Status

Landed across two PRs per the planned sub-split:
**1.3.1** in [#217](https://github.com/kcrobinson-1/neighborly-events/pull/217)
(route + form + disabled-event branch + SCSS + Vitest);
**1.3.2** in [#219](https://github.com/kcrobinson-1/neighborly-events/pull/219)
(`madrona.ts` opt-in literal + header-comment extension + M1
milestone Status flip + batch-deletion of the three M1 scoping
docs as the milestone-terminal PR).

Plan doc retained because it owns the route + form contracts the
1.3.1 implementation encodes; deletes in a future cleanup pass
once the M1 plan-doc-retention question is resolved at a higher
level (sibling 1.1 / 1.2 plan docs apply the same retention
rationale).

## Context

The Madrona feedback child epic's M1 has two halves merged
(1.1 in [#205](https://github.com/kcrobinson-1/neighborly-events/pull/205);
1.2 in [#213](https://github.com/kcrobinson-1/neighborly-events/pull/213))
and one half remaining: the route + form + madrona content
opt-in. After this phase, an attendee on a phone after the
Madrona '26 show can tap the `EventFeedbackCTA` button on
`/event/madrona`, land on `/event/madrona/feedback`, fill out
ratings + optional free text + optional email + the decline /
newsletter checkboxes, submit, and see a thank-you message
replace the form in place. The submission lands as a row in
`feedback_submissions` against the `'madrona'` slug the 1.1
migration registered.

The phase ships **now** because every blocking dependency has
landed: the schema and FK target (1.1), the type extension and
landing-page CTA (1.2). The 1.3 sub-split keeps the route + form
PR (1.3.1) reviewable as one coherent unit and isolates the
"system goes live for one event" moment to 1.3.2's single-file
opt-in.

The surfaces this phase touches at the conceptual level: a new
Next.js route under `/event/[slug]/feedback`, a new client-side
form component, the existing apps/site browser Supabase client
(consumed for the first anon-insert path), `madrona.ts`'s
content module (in 1.3.2 only), the SCSS event-styling partial,
the Vitest section-component fixture, and the M1 milestone /
phase plan doc-currency surfaces.

## Goal

After 1.3 ships (both sub-phases):

- A new route at `/event/[slug]/feedback` lives in
  `apps/site/app/event/[slug]/feedback/page.tsx`. It resolves
  the slug to an `EventContent` and branches three ways per
  scoping Decision 3:
  - present + `feedback` set → render the form;
  - present + `feedback` absent → render a friendly disabled-
    event state (no form, no rating rows, just an inline
    message and a return-to-landing link);
  - resolver returns `null` → call `notFound()` (matches the
    landing-page route's convention).
- A new client component `FeedbackForm` accepts the resolved
  `feedback` object and the `slug` string as props, renders
  per-dimension rating rows (custom buttons, not native radios,
  per scoping Decision 5), an optional free-text textarea, an
  email field with a decline checkbox and a newsletter opt-in
  checkbox, and a submit button. Submission writes a single
  `feedback_submissions` row through the existing
  `getBrowserSupabaseClient()` helper. Success replaces the
  form in place with `feedback.thankYouMessage`.
- 1.3.2 adds a `feedback: {…}` literal to
  `apps/site/events/madrona.ts` populating the full inner shape
  (CTA copy + the five locked rating dimensions + free-text
  prompt + email-field copy + thank-you message). The moment
  this PR lands, the CTA renders on `/event/madrona`, the form
  renders on `/event/madrona/feedback`, and real submissions
  start landing.
- `tests/site/event/feedbackForm.test.tsx` (new file) covers
  the form behavior; the existing
  `tests/site/event/sectionComponents.test.tsx` extends with
  route-shape cases (form vs. disabled-state).
- `apps/site/app/styles/_event.scss` (or a new
  `_feedback-form.scss` partial — call deferred to plan-time
  consequence check) gains the form styling.
- `docs/product.md` and `docs/styling.md` re-greppable changes
  per the milestone Doc Currency map: 1.3 plan-drafting greps
  both; updates land in 1.3.1 (or 1.3.2 if 1.3.1 doesn't
  surface the need).
- 1.3.2 flips the M1 milestone doc Status `Proposed` →
  `Landed`, flips Phase Status row 1.3 → `Landed` (with the
  PR link), and deletes the three M1 scoping docs (1.1, 1.2,
  1.3) per the milestone doc's batch-deletion commitment.
- `npm run lint`, `npm run build:site`, and `npm test` (Vitest)
  pass against the new code.
- A manual dev-server submission check exercises the live
  insert path against the local Supabase stack and records
  the outcome in 1.3.2's PR body.

This phase does **not** add new RLS policies (1.1's are
sufficient), does **not** introduce captcha / rate-limit / dedupe
(epic Resolved Decision), does **not** ship an organizer surface
(M2 scope), does **not** add a Server Action or Edge Function
for submission (scoping Decision 2), and does **not** touch
`shared/db/types.ts` (the 1.1-regenerated types already cover
`feedback_submissions`).

## Cross-Cutting Invariants

This phase binds the six parent-epic invariants
([epic.md:106-177](/docs/plans/epics/madrona-feedback/epic.md))
and the five M1 milestone-level invariants
([m1-form-and-storage-mvp.md:229-296](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))
verbatim by reference. Of those, this phase's diff actually
moves on:

- **Epic Invariant 1 (platform-genericity).** The form reads
  shape from `EventContent.feedback` and submits with the slug
  from the route param; no madrona-keyed branches inside the
  component or route body.
- **Epic Invariant 3 (rating-dimension keys are content-
  authored).** The form iterates over `feedback.ratingDimensions`
  and emits the `key` strings verbatim into the
  `ratings` jsonb. No platform-defined dimension list, no
  enum, no validation against an allowlist.
- **Epic Invariant 4 (decline-as-first-class-path).** The form
  renders the decline checkbox alongside the email field;
  checking it hides the email row and the newsletter row, and
  submission writes `email_declined: true` with `email: null`.
- **Epic Invariant 5 (newsletter is opt-in not opt-out).** The
  newsletter checkbox defaults unchecked. The form does not
  pre-check it under any circumstance.
- **Epic Invariant 6 (DB-level integrity).** The form does not
  client-side validate "is this slug feedback-enabled" — it
  trusts the FK to reject unregistered slugs at submit time.
  The thank-you state renders only after the insert succeeds.
- **Milestone invariant: no 404 for disabled events.** Decision
  3 in scoping binds the three-branch route shape; the friendly
  state covers events whose `EventContent` exists without
  `feedback`.
- **Milestone invariant: same-section-set test events.** 1.3.1
  doesn't change `EventLandingPage`. 1.3.2's diff is scoped to
  `madrona.ts` — the test events stay untouched, the no-new-
  section-sprouts assertion in
  `sectionComponents.test.tsx` continues to pass.
- **Milestone invariant: newsletter opt-in alongside consent
  context.** The form's submission shape includes
  `newsletter_opt_in`, `email`, `email_declined`. The schema
  defaults `submitted_at` and `event_slug` is required — the
  consent context is durable.

## Naming

- Route file: `apps/site/app/event/[slug]/feedback/page.tsx`.
- Form component file:
  `apps/site/app/event/[slug]/feedback/FeedbackForm.tsx`
  (colocated with the route per the Next.js segment convention).
- Form export: `FeedbackForm`.
- CSS class names: `.event-feedback-form` (form wrapper),
  `.event-feedback-form-rating-row` (one per rating dimension),
  `.event-feedback-form-rating-button` (each star),
  `.event-feedback-form-na-button` (the N/A toggle),
  `.event-feedback-form-textarea`,
  `.event-feedback-form-email`,
  `.event-feedback-form-decline`,
  `.event-feedback-form-newsletter`,
  `.event-feedback-form-submit`,
  `.event-feedback-form-error`,
  `.event-feedback-form-thanks`,
  `.event-feedback-disabled` (disabled-event state wrapper).
- Submit button copy: `Submit feedback` (platform-uniform per
  scoping Decision 7).
- Disabled-event copy: `Feedback isn't being collected for this
  event.` plus a `Back to {event name}` link to `/event/<slug>`.
- Submission error copy: `Couldn't submit your feedback. Please
  try again.`
- Email validation regex: matches one `@`, at least one
  non-whitespace non-`@` character before, at least one `.`
  in the domain segment with at least one non-whitespace non-
  `@` character on each side. (Plan-time exact regex; the rule
  is locked.)

## Contracts

### Submission shape (illustrative — the schema is the contract)

The form's submit handler builds an insert payload matching
`Database['public']['Tables']['feedback_submissions']['Insert']`
(generated in 1.1). Per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan code minimalism" data-structure carve-out, the block
below is an illustrative shape — the surrounding prose is the
load-bearing contract; the schema in
`shared/db/types.ts` and the migration in
`supabase/migrations/20260506000000_add_feedback_tables.sql`
are the actual contract:

```
{
  event_slug: string,             // from route param
  ratings: Record<string, number | "n/a">,   // jsonb keyed by dimension.key
  free_text: string | null,       // null when the textarea is empty after trim
  email: string | null,           // null when declined OR when blank-after-trim
  email_declined: boolean,        // true iff the decline checkbox is checked
  newsletter_opt_in: boolean,     // true iff the checkbox is checked AND email is present non-declined
}
```

The component does not set `id` (UUID default), does not set
`submitted_at` (default `now()`).

The submit handler is responsible for the four
client-side guards before insert:

1. Strip whitespace from `free_text`; if empty, write `null`
   not `""`.
2. If decline is checked: write `email_declined: true`,
   `email: null`, `newsletter_opt_in: false` regardless of any
   transient state in the email or newsletter fields.
3. If decline is unchecked and `email` is non-empty: validate
   format (Decision 6 regex). On fail, abort submit, surface
   inline error on the email field, no insert.
4. If decline is unchecked and `email` is empty: write
   `email: null`, `email_declined: false`, `newsletter_opt_in:
   false` (the milestone invariant on opt-in-requires-email
   means a checked-newsletter-but-blank-email is a UX
   inconsistency the form prevents at the boundary).

### Form state machine

Four states, tracked by a string-tagged discriminant:

- **`idle`** — user is filling fields. All inputs editable.
  Submit button enabled.
- **`submitting`** — insert is in flight. All inputs disabled.
  Submit button shows loading state.
- **`success`** — thank-you message replaces the form. The
  message is `feedback.thankYouMessage`. No "submit another
  response" affordance — the milestone-invariant landing-state
  is "thank-you replaces form in-place; no redirect."
- **`error`** — last submit failed. Inline error message
  appears alongside the form. Inputs re-enabled with values
  preserved. Submit button re-enabled.

The transition `idle → submitting` happens on submit-button
click after client-side validation passes. `submitting →
success` on insert success. `submitting → error` on insert
failure. `error → submitting` on a retry click. No
`success → idle` transition.

### Route component contract

The route page is a Server Component (no `'use client'`) that:

1. Awaits `params` for `slug`.
2. Calls `getEventContentBySlug(slug)`.
3. If `null`, calls `notFound()`.
4. If `content.feedback` is absent, renders the disabled-event
   state inside `<ThemeScope>` with the per-event Theme.
5. If `content.feedback` is present, renders `<FeedbackForm
   feedback={content.feedback} slug={slug} />` inside
   `<ThemeScope>`.

`generateStaticParams` is **not** added on this sub-route — the
landing-page `/event/[slug]/page.tsx` has it and that's
sufficient for prerender enumeration; the feedback sub-route
inherits the param at request time. (Plan-drafting confirms
Next.js semantics on this point — if the parent segment has
`generateStaticParams`, child segments default to following it.
If reality-check finds otherwise, add `generateStaticParams` to
the feedback `page.tsx` reading from the same
`registeredEventSlugs` source the landing page uses.)

`generateMetadata` for the feedback route emits the same
`robots: { index: false, follow: false }` posture the landing
page does for `noindex` events. Madrona's
`/event/madrona/:path*` Vercel header already covers
`/event/madrona/feedback` independently of the SSR meta.

### Disabled-event state contract

The disabled state renders inside the page shell (no separate
404). Content:

- A `<main>` wrapper with class `.event-feedback-disabled`.
- An `<h1>` carrying the event's `meta.title` (so the page is
  recognizably about that event).
- A `<p>` with the locked copy: `Feedback isn't being collected
  for this event.`
- A `<a href="/event/{slug}">` with the locked copy: `Back to
  {event hero.name}`.

The exact element shape and class names are plan-time; the
rule is the three-branch route plus the no-form, no-rating-rows
content shape.

## Files To Touch

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).

### 1.3.1 (route + form + disabled-event branch)

#### New

- `apps/site/app/event/[slug]/feedback/page.tsx` — the route
  Server Component per the route contract above.
- `apps/site/app/event/[slug]/feedback/FeedbackForm.tsx` —
  the client component, `'use client'` directive, the form
  state machine and submit handler.
- `tests/site/event/feedbackForm.test.tsx` — Vitest fixture
  per the Validation Gate.

#### Modify

- `apps/site/app/styles/_event.scss` (or a new
  `apps/site/app/styles/_feedback-form.scss` partial — plan-
  drafting picks after the dev-server consequence check) —
  form styling.
- `tests/site/event/sectionComponents.test.tsx` — extend with
  route-shape cases (form-renders / disabled-state-renders /
  notFound-on-unknown-slug). The route page is a Server
  Component; testing it directly may require additional
  fixture setup, in which case the route-level cases live in
  a new file or are covered via the manual dev-server check.
  Plan-drafting confirms.
- `apps/site/app/styles/globals.scss` — only if the new SCSS
  partial is added; that partial gets `@use`-imported here.
  Otherwise no change.
- `docs/product.md` — extend any attendee-feedback paragraph
  per the milestone Doc Currency map. Plan-drafting greps and
  fixes if any drift surfaces.
- `docs/styling.md` — verify by grep per the milestone Doc
  Currency map; edit only if a styling-discipline paragraph
  drifts.
- `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md` —
  Phase Status row 1.3 NOT flipped here (1.3.2 owns the flip
  per the sub-split). 1.3.1's PR carries Phase Status update
  only if a sub-phase-specific status convention emerges; the
  milestone-doc convention today is one row per phase, so
  1.3.1's PR records itself in a sub-row or as a parenthetical
  on the 1.3 row. Plan-drafting picks.

### 1.3.2 (madrona content opt-in + M1 milestone-terminal close-out)

#### Modify

- `apps/site/events/madrona.ts` — add the `feedback: {…}`
  literal block before the existing `footer` field. Field set
  per the 1.2 type contract: `cta.heading`, optional
  `cta.body`, `ratingDimensions[5–7]`, `freeTextPrompt`,
  `emailCopy.{label, declineLabel, newsletterOptInLabel}`,
  `thankYouMessage`. Plan-drafting locks the exact strings.
- `apps/site/events/madrona.ts` header comment — extend to
  name the feedback opt-in (per the milestone Doc Currency
  map: "phase 1.3's content opt-in extends the comment to
  name the feedback opt-in and the rating-dimension set").
- `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md` —
  flip Phase Status row 1.3 → `Landed` with the 1.3.2 PR
  link; flip the milestone-level Status `Proposed` →
  `Landed`.
- `docs/plans/epics/madrona-feedback/m1-phase-1-3-plan.md`
  (this doc) — Status block flips to "Landed in {1.3.2 PR
  link}" parallel to 1.1 / 1.2 plan-doc Status blocks.

#### Delete

- `docs/plans/epics/madrona-feedback/scoping/m1-phase-1-1.md`
- `docs/plans/epics/madrona-feedback/scoping/m1-phase-1-2.md`
- `docs/plans/epics/madrona-feedback/scoping/m1-phase-1-3.md`

  All three transient scoping docs delete in batch as the
  milestone-terminal commitment per
  [m1-form-and-storage-mvp.md](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md).

#### Intentionally not touched (across both sub-PRs)

- `supabase/migrations/`, `shared/db/types.ts` — DB substrate
  is 1.1's surface (merged).
- `apps/site/lib/eventContent.ts` — type extension is 1.2's
  surface (merged).
- `apps/site/components/event/EventLandingPage.tsx`,
  `apps/site/components/event/EventFeedbackCTA.tsx` —
  composition + section component are 1.2's surface.
- `apps/site/events/harvest-block-party.ts` and
  `apps/site/events/riverside-jam.ts` — test events stay as-is
  to keep the same-section-set invariant a structural
  falsifier (these don't opt feedback in; that's by design).
- `apps/web/vercel.json` — the existing `/event/:slug/:path*`
  rewrite already covers `/event/<slug>/feedback`; the
  existing `noindex` header on `/event/madrona/:path*`
  already covers `/event/madrona/feedback`. No change.
- `shared/urls/routes.ts` — adding an apps/site URL helper for
  feedback paths is out of scope; the inline string + 1.2's
  `encodeURIComponent` wrapper precedent suffices.

## Execution Steps

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).

### 1.3.1

1. Branch off `main`. Confirm the seven scoping reality-check
   inputs hold. Re-grep `docs/product.md` and `docs/styling.md`
   for attendee-feedback / form-styling drift.
2. Author the route `page.tsx` per the route contract. Confirm
   `generateStaticParams` semantics on a child segment by
   reading the Next.js docs and/or the existing
   `apps/site/app/event/[slug]/page.tsx` shape; if the parent
   segment's static params don't propagate, add
   `generateStaticParams` to the feedback page reading from
   `registeredEventSlugs`.
3. Author `FeedbackForm.tsx` (`'use client'`). Render rating
   rows from `feedback.ratingDimensions`, the free-text
   textarea, the email + decline + newsletter rows, the submit
   button. Implement the four-state state machine, the
   client-side validation rules, and the Supabase anon insert.
4. Author the disabled-event state inline in the route's
   conditional branch (a small inline `<main>` per the
   contract).
5. Add the SCSS rules. Run the dev server, view both routes
   on `/event/madrona/feedback` (which renders the disabled
   state today, since `madrona.ts` has not opted in) and
   on a synthetic opted-in event (temporarily mutate
   `madrona.ts` locally, view, revert — same shape as the
   1.2 consequence check). Adjust SCSS until both branches
   read coherently.
6. Author the Vitest fixture. Cover the form's behavioral
   surface (rating selection, decline-toggle, email-validation,
   state-machine transitions, thank-you replacement); cover
   the route's three branches if the test fixture supports
   Server Components, otherwise fall back to manual dev-server
   verification of the route branches.
7. Run `npm run lint` and `npm run build:site` and
   `npm test`. All must pass.
8. Update `docs/product.md` and `docs/styling.md` if grep
   surfaced drift; otherwise no doc change.
9. Commit, push, open PR.

### 1.3.2

1. Branch off `main` (or off 1.3.1's branch if 1.3.1 hasn't
   merged yet — the dependency is structural).
2. Add the `feedback: {…}` block to `apps/site/events/madrona.ts`
   per the locked field set. Pick the exact rating-dimension
   list (the milestone names five starting set; the epic flags
   1–2 more). Pick the exact form copy strings.
3. Extend the `madrona.ts` header comment to name the feedback
   opt-in and the rating-dimension set.
4. Flip the milestone doc's M1 Status to `Landed`, the Phase
   Status row 1.3 to `Landed` with the PR link.
5. Flip this plan doc's Status block to "Landed in {PR link}."
6. `git rm` the three M1 scoping docs as the milestone-
   terminal batch deletion.
7. Run the manual dev-server submission check end-to-end
   against the local Supabase stack — submit a real feedback
   row, verify it lands in `feedback_submissions` with the
   expected shape (use `supabase studio` or a SELECT under the
   service role key). Record the outcome in the PR body.
8. Run `npm run lint`, `npm run build:site`, `npm test`. All
   must pass.
9. Commit, push, open PR.

## Commit Boundaries

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).

### 1.3.1 (two commits)

1. **`feat(site): add /event/[slug]/feedback route + form`** —
   route, form component, disabled-event branch, SCSS, tests
   in one commit. Body explains the three-branch route, the
   four-state form state-machine, the client-side validation
   rules, and the direct anon-insert path.
2. **`docs: 1.3.1 doc-currency`** — only if `docs/product.md`
   or `docs/styling.md` surfaced drift in step 8 above. Skip
   if neither needed an edit.

### 1.3.2 (three commits)

1. **`feat(site): opt madrona in to feedback`** —
   `apps/site/events/madrona.ts` literal addition + header
   comment extension.
2. **`docs(plans): land M1 phase 1.3, batch-delete scoping
   docs, flip M1 milestone Status`** — milestone doc
   close-out + this plan-doc Status flip + the three scoping
   doc deletions.
3. **(optional) review-fix commit** if Codex / human reviewer
   surfaces feedback, kept distinct per
   [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
   "keep review-fix commits distinct."

## Validation Gate

The phase's load-bearing claims are: the form submits a
correctly-shaped row that the FK + CHECK constraints accept;
the form's state machine handles the four states correctly; the
route's three branches resolve correctly; client-side
validation rules match the contract; the test events still
render unchanged after `madrona.ts` opts in.

### 1.3.1 Vitest cases (in `feedbackForm.test.tsx`)

1. **Rating-row count matches `feedback.ratingDimensions`.**
   Synthetic content with three dimensions renders three rows.
2. **Tapping a star sets the rating; tapping N/A clears the
   stars and marks N/A.** Visible state changes; the
   `aria-pressed` invariants hold.
3. **Decline checkbox hides the email field and the newsletter
   row.** Synthetic render with decline checked → no email
   input visible, no newsletter checkbox visible.
4. **Email validation rejects malformed strings on submit.**
   Submit with `not-an-email` → inline error appears, no
   insert is attempted (verify by mocking the Supabase client
   insert call to assert it wasn't called, *or* by inspecting
   the form's state machine — call shape decided plan-time).
5. **Submission state-machine transitions.** With a valid
   payload, the form transitions `idle → submitting` on
   submit, then `submitting → success` on insert success;
   the thank-you message replaces the form.
6. **Submission failure renders the error state.** With an
   insert failure, the form transitions `submitting → error`,
   the inline error appears, fields preserve values, retry
   transitions back to `submitting`.
7. **Empty free-text submits as `null`, not empty string.**
   Submit with empty textarea → insert payload's `free_text`
   is `null`.
8. **Decline state submits the canonical shape.** Submit with
   decline checked → insert payload has
   `email_declined: true`, `email: null`,
   `newsletter_opt_in: false`.
9. **Newsletter-without-email is structurally impossible from
   the form.** The newsletter checkbox is not reachable when
   email is blank or decline is checked. Verify by trying to
   produce that state through the UI surface and asserting it
   can't happen, *or* by reading the form's conditional render
   logic.

### 1.3.1 route-shape coverage

Route page is a Server Component; testing through React
Testing Library requires extra fixture setup. **Plan-time
call:** if Vitest can't render the Server Component cleanly,
the route's three branches are covered by the manual dev-
server check (1.3.1 viewing the disabled-state branch on
`/event/madrona/feedback`, the form branch on a synthetic
opted-in event, and the `notFound` branch on
`/event/totally-fake-slug/feedback`). Implementer records the
three branches' rendered output in the PR body.

### 1.3.2 manual dev-server submission check

Required, recorded in the PR body. Procedure:

1. Start the local Supabase stack (`scripts/testing/run-db-tests.cjs`
   wrapper or `npx supabase start`); apply migrations.
2. Start the apps/site dev server.
3. Navigate to `/event/madrona/feedback`. Fill out a real
   submission with a non-empty free-text and a real-shaped
   email. Submit.
4. Observe the thank-you replacement.
5. Open `supabase studio` (or run a service-role SQL query)
   and confirm the `feedback_submissions` row exists with the
   expected shape — `event_slug = 'madrona'`,
   `ratings` jsonb matches the form input, `free_text` matches,
   `email` matches, `email_declined = false`,
   `newsletter_opt_in` matches the checkbox state, and
   `submitted_at` is a recent timestamp.
6. Submit a second row with decline checked. Confirm
   `email = null`, `email_declined = true`,
   `newsletter_opt_in = false`.
7. (Optional, expanded confidence) submit against an
   unregistered slug by temporarily editing a test event's
   content to opt feedback in, then submitting through the UI.
   Expect a visible error state. (This exercises the FK
   integrity falsifier from the form side; pgTAP coverage in
   1.1 already exercises it from the SQL side.)

### Other gates (both sub-PRs)

- `npm run lint` — passes against the new code.
- `npm run build:site` — passes (the type extension and form
  component compile against the existing `EventContent`
  shape).
- `npm test` (Vitest) — passes including the new fixture.

`npm run build:web` is not required (no apps/web changes).
`npm run test:db` and `npm run test:functions` are not
required (no SQL or Edge Function changes).

## Self-Review Audits

Audit names from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
implementer reads the catalog at implementation time and
matches audit names to the diff surfaces below.

- **Type-currency:** the form's submit payload typechecks
  against
  `Database['public']['Tables']['feedback_submissions']['Insert']`.
  No `as any`, no manual cast.
- **Cross-cutting invariant walk:** every field-name foreclosure
  rule, decline-as-first-class-path rule, opt-in-not-opt-out
  rule, and rating-dimension-keys-are-content-authored rule
  has at least one Vitest case asserting it. Self-review walks
  each invariant against the test list.
- **Section-component contract:** `FeedbackForm` asserts its
  `feedback` prop non-null and its `slug` prop non-empty;
  the route owns the omission guard, matching the section-
  component discipline at
  [apps/site/components/event/EventLandingPage.tsx:11-18](/apps/site/components/event/EventLandingPage.tsx).
- **In-app navigation:** the form's "back to landing" link in
  the disabled-event state and any internal navigation use
  Next.js `<Link>` (in-app), not plain `<a>` (which is
  appropriate only for cross-app destinations). The
  redirect-on-success path uses no navigation — thank-you
  replaces in-place per the milestone invariant.
- **Verified-by citation walk:** every `Verified by:`
  annotation in this PR's diff cites a path:line retrieved
  fresh from a tool result in the same response that wrote
  the citation, per the
  [retrieval-before-citing memory rule](feedback_retrieve_before_citing.md).
- **Plan-to-PR Completion Gate:** every Goal bullet is
  satisfied across the two sub-PRs or explicitly deferred in
  this plan with rationale.
- **Same-section-set invariant on test events:** 1.3.2's diff
  is scoped to `madrona.ts`. Self-review confirms
  `harvest-block-party` and `riverside-jam` content modules
  are unchanged, and the existing Vitest assertion in
  `sectionComponents.test.tsx` for the no-CTA-on-test-events
  branch continues to pass.

## Documentation Currency PR Gate

### 1.3.1

- `docs/product.md` — grep for attendee-feedback paragraphs.
  Edit only if drift surfaces (the milestone Doc Currency map's
  "may produce no edit" qualifier applies).
- `docs/styling.md` — grep for form-styling discipline
  paragraphs. Edit only if drift surfaces.

### 1.3.2

- `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md` —
  M1 milestone Status flipped `Proposed` → `Landed`; Phase
  Status row 1.3 → `Landed` with PR link. Required.
- `docs/plans/epics/madrona-feedback/m1-phase-1-3-plan.md` (this
  doc) — Status block flipped to "Landed in {1.3.2 PR}."
  Required.
- `apps/site/events/madrona.ts` header comment extended to
  name the feedback opt-in. Required (per milestone Doc
  Currency map).
- The three M1 scoping docs deleted in batch as the milestone-
  terminal commitment. Required.

Doc updates this PR is **not** responsible for: nothing
outstanding from the milestone Doc Currency map after 1.3.2.

## Out Of Scope

- Captcha, rate-limiting, per-IP fingerprinting, per-session
  dedupe — epic Resolved Decision (`Verified by:`
  [epic.md:479-481](/docs/plans/epics/madrona-feedback/epic.md)).
- An organizer-readable surface — M2 scope.
- A server-side feedback route (Server Action, Edge Function)
  — scoping Decision 2.
- An apps/site URL helper for event-scoped paths — see scoping
  Out Of Scope and the 1.2 plan's parallel decision.
- A platform-level submit-button override per event — scoping
  Decision 7 (extend later if a real signal surfaces).
- Server-side input validation — the FK + CHECK constraints in
  1.1 are the load-bearing enforcement; client-side validation
  is a UX guard.
- Multi-language support, accessibility audits beyond the
  basic ARIA roles named in scoping Decision 5 — out of M1
  scope.
- A Playwright e2e suite — scoping Decision 8 (deferred to a
  real signal that only Playwright would catch).
- Slug-format validation — the [Tier 1 backlog
  entry](/docs/backlog.md) covers this; the route trusts
  `getEventContentBySlug` to handle slug resolution and the
  FK to handle slug registration. A typo'd slug returns
  `null` from `getEventContentBySlug` and hits `notFound()`
  per scoping Decision 3 — it does **not** reach the
  disabled-event branch (that branch is for slugs the
  platform knows but that haven't opted feedback in).

## Risk Register

- **Server Component vs. client component boundary trips up
  rendering.** The route page must be a Server Component (no
  `'use client'`) for the `notFound` and `params` semantics to
  work cleanly; the form must be a client component. Boundary
  drift would surface as a Next.js build error or a runtime
  hydration mismatch. Mitigation: explicit `'use client'`
  directive at the top of `FeedbackForm.tsx`; route page
  imports the form as a child component (Next.js handles the
  boundary). The build:site gate catches mismatches.
- **Anon-insert RLS denies under realistic conditions.** The
  1.1 migration grants anon INSERT and adds the matching
  policy; a misconfigured `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  in the local environment would surface as a permission
  error. Mitigation: the manual dev-server check in 1.3.2's
  Validation Gate exercises a real submission end-to-end
  against the local stack; pgTAP coverage in 1.1 already
  proves the policy + grant fire correctly under the anon
  role.
- **Rating-key collision with future rating dimensions.** The
  form writes whatever `ratingDimensions[].key` strings the
  content author picks. Two events could pick keys with
  divergent semantics (e.g., one event's `"music"` is
  "music quality," another's is "music selection"). Accepted
  for M1 — no cross-event aggregation in M1; the M2
  organizer surface reads per-event, so the cross-event
  ambiguity has no consumer.
- **Newsletter checkbox visible-but-disabled vs. hidden when
  decline is checked.** The epic says "disabled / hidden when
  the decline-email checkbox is checked." Both shapes
  satisfy the invariant. Decision: **hidden** is cleaner UX
  (less visual clutter) and eliminates the "why is this
  disabled" question. If an accessibility reviewer surfaces
  a "missing context" concern with hidden, switch to
  disabled-with-explanation; record as Estimate Deviation.
- **Long free-text input opens an abuse surface.** No
  client-side length cap is added (epic Resolved Decision —
  defer to application-layer cap if abuse signals). The DB
  has no length cap on `text` columns. Accepted for M1; if
  a real abuse signal surfaces, file as backlog work for the
  launch epic.
- **Email regex rejects valid edge-case addresses.** A minimal
  regex will false-reject some valid-but-weird emails (e.g.,
  `user+tag@host` is fine; `"quoted name"@host` would be
  rejected; international domains may be rejected too).
  Accepted — the rule is "presence of `@` and a dot," not
  "comprehensive RFC 5322 validation." Attendees with
  unusually-formatted addresses can decline and submit
  without email.
- **Madrona's content opt-in lands without the form route
  ready.** If 1.3.2 ships before 1.3.1 (or 1.3.1 reverts
  while 1.3.2 stays merged), the `EventFeedbackCTA` link goes
  to a Next.js 404. Mitigation: 1.3.2 explicitly depends on
  1.3.1 in the sub-split; 1.3.1 must merge first. The
  sequencing isn't enforced by code; it's enforced by the
  reviewer / merger. Self-review at 1.3.2 commit time
  re-checks that `app/event/[slug]/feedback/page.tsx` exists
  on `main`.
- **Server Component boundary breaks `<ThemeScope>`
  inheritance.** The landing-page route wraps its tree in
  `<ThemeScope>` per
  [apps/site/app/event/[slug]/page.tsx:113-115](/apps/site/app/event/[slug]/page.tsx).
  The feedback route should do the same so the form inherits
  per-event Theme tokens. Mitigation: the route contract
  above names `<ThemeScope>` wrapping; self-review confirms.

## Backlog Impact

- **Closed by this phase.** Nothing in
  [`docs/backlog.md`](/docs/backlog.md) directly. The slug-
  format Tier 1 entry filed in 1.2's PR (#213) is **not**
  closed by 1.3 — that entry covers slug-shape prevention,
  which is upstream of this phase's flow.
- **Unblocked by this phase.** The Madrona '26 demo phase
  acquires its first attendee-feedback collection mechanism.
  M2 (organizer-readable surface) reads the rows this phase's
  flow produces.
- **Opened by this phase.** Anticipated candidates (file as
  concrete entries with rationale per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  doc-currency rules if any are surfaced):
  - Server-side submission rate limiting if real abuse
    surfaces post-launch — epic Risk Register accepts the
    open-REST-surface for M1; the launch epic inherits the
    decision point at real attendee volume.
  - Free-text length cap if real abuse surfaces.
  - Cross-event aggregation tooling if a future epic wants
    to compare rating distributions across events that share
    a dimension key — depends on the rating-key-collision
    risk above being resolved by then.
  - Per-event submit-button copy override if a real product
    signal surfaces.

## Related Docs

- [`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
  — parent milestone doc; this phase's terminal PR flips its
  Status to `Landed`.
- [`scoping/m1-phase-1-3.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-3.md)
  — transient scoping doc; deletes in batch with sibling
  scoping docs at 1.3.2 (the milestone-terminal PR).
- [`docs/plans/epics/madrona-feedback/epic.md`](/docs/plans/epics/madrona-feedback/epic.md)
  — parent epic; Cross-Cutting Invariants 1, 3, 4, 5, 6 are
  the load-bearing constraints this phase ships under.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-feedback/m1-phase-1-1-plan.md)
  — sibling phase plan; the migration this phase's submission
  path consumes.
- [`m1-phase-1-2-plan.md`](/docs/plans/epics/madrona-feedback/m1-phase-1-2-plan.md)
  — sibling phase plan; the type extension and section
  component this phase's route + form complete.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent.feedback` shape this phase reads.
- [`apps/site/lib/supabaseBrowser.ts`](/apps/site/lib/supabaseBrowser.ts)
  — browser Supabase client helper this phase consumes.
- [`apps/site/components/event/EventFeedbackCTA.tsx`](/apps/site/components/event/EventFeedbackCTA.tsx)
  — landing-page CTA whose `href` this phase's route serves.
- [`supabase/migrations/20260506000000_add_feedback_tables.sql`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
  — the FK + CHECK constraints + RLS policies this phase's
  submission path lands rows against.
- [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  — phase planning rules.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — cross-level rules.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — audit-name source for Self-Review Audits.
