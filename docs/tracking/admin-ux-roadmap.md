# Admin UX Roadmap

This file tracks concrete admin UX refinements that are intentionally deferred
after Phases 4.1 through 4.4.2. The goal is to keep the current implementation
reviewable while still preserving the next product decisions we already know we
will want to revisit.

Use this file for product-facing polish items, layout decisions, and navigation
shape questions. Keep workflow tooling, screenshot capture, and PR process
changes in `docs/tracking/dev-workflow-improvements.md` instead.

## Candidate Refinements

Recent browser walkthrough notes from the deployed `/admin` surface
(`2026-04-21`) that should inform prioritization:

- the signed-in desktop workspace is still dominated by the auth-era hero, so
  the actual editor starts too low on the page
- the selected-question actions and editor body feel detached from the selected
  question list, which makes ownership harder to scan
- answer-option rows feel cramped and fragile once labels, correctness
  controls, and delete actions share the same space
- at least one event currently appears as `Live` in admin while `Open live
  game` lands on the public unavailable state

### Align admin live status with public-route availability

Status: Landed in [`../plans/archive/admin-live-status-plan.md`](../plans/archive/admin-live-status-plan.md)

This item graduated from the general admin UX roadmap into its own plan
and has now landed across three slices: the correctness fix, the admin
read-model cleanup, and the non-live `Open live game` UX treatment.
Production admin smoke confirms the deployed behavior matches the
public-route availability contract. Refer to
[`../plans/archive/admin-live-status-plan.md`](../plans/archive/admin-live-status-plan.md)
for the historical decisions, slice boundaries, and shipped commits.

### Improve the mobile question editor layout

Status: landed (`feat/mobile-question-editor-layout`, 2026-04-24)

This item now keeps the same single-column mobile hierarchy while improving the
question editor readability on narrow viewports:

- answer-option rows switch to a mobile-only two-row layout so the option label
  field gets full width and no longer competes inline with correctness and
  delete controls
- correctness and delete controls remain paired to the same option row while
  avoiding clipped/truncated label editing
- the admin screenshot-capture fixture now includes a long option label so
  future `ui:review:capture:admin` runs reliably surface spacing regressions in
  the mobile question editor

Validation used for landing:

- `npm run ui:review:capture:admin` (before/after mobile screenshot comparison)
- browser check of question selection, save/validation messaging, and mobile
  option-row readability

### Clarify the desktop admin workspace hierarchy

Status: open

Value:

- makes the selected event workspace easier to scan on wide screens
- reduces the sense that the question list and editor are stacked as two equal
  panels when they actually have different jobs
- removes the signed-in desktop feeling that the page is still an auth shell
  with an oversized hero rather than an active editor workspace
- helps future preview or publish controls fit into the page without crowding
  the editor

Work required:

- reduce or restack the signed-in hero/auth chrome so the selected workspace and
  first editing actions appear higher in the viewport
- reconsider the balance between the selected-event summary, the event-details
  form, and the question editor on desktop widths
- decide whether the question list should read as navigation, as a sidebar, or
  as part of the editor body
- make the action hierarchy clearer so primary save actions remain obvious and
  list-level actions such as `Open workspace` and `Open live game` do not blend
  together visually

Open questions:

- should the selected workspace become a true two-column layout on desktop, or
  should the current stacked flow remain the default for consistency with
  mobile?
- does the question list need a separate heading or visual treatment to read as
  selection state rather than content?
- should signed-in admins see a more compact page header than signed-out admins
  so the editor starts above the fold on laptop-sized screens?
- should the future preview and publish phases reserve a fixed space in the
  desktop layout now, or be added only when they land?

Steps to complete:

1. Review the current desktop screenshots and identify the specific hierarchy
   problems.
2. Propose one desktop layout direction and validate it in the browser.
3. Keep the explicit-save model and selected-question focus behavior intact.
4. Re-run the admin screenshot capture flow after the change.

Minimum validation:

- `npm run ui:review:capture -- --mode admin`
- browser check of the selected-workspace desktop state

### Decide whether event details should stay inline

Status: open

Value:

- clarifies whether quick edits belong in the selected workspace or on a more
  explicit detail route
- reduces future duplication if the workspace grows beyond the current
  event-level editor
- helps the roadmap stay clear before preview and publish add more controls to
  the same page

Work required:

- compare the current inline editor against a dedicated event-details route or
  event-card editing affordance
- evaluate how much navigation cost is acceptable for the most common admin
  edits
- decide whether deep linking or quick scanning should be the primary goal of
  the event-details experience

Open questions:

- should event details remain in the selected workspace because it keeps the
  editing flow together, or should they eventually move to a dedicated route
  once the page gets denser?
- would inline event-card editing reduce clicks enough to justify the added
  complexity?
- do we want one route per event for both summary and detail editing, or a
  summary route plus a separate detail route?

Steps to complete:

1. Review the current admin navigation and the amount of scrolling required for
   common event-detail edits.
2. Decide whether the current route shape is still the right default.
3. If a route change is chosen later, define it before adding more editor
   phases.

Minimum validation:

- browser check of the selected-workspace saved and failed-save states
- updated admin screenshot capture if the route or layout changes
