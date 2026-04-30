# Admin Module

## Purpose

This folder owns the per-event admin authoring shell consumed by the
`/event/:slug/admin` route. Platform-admin chrome (the event list, magic-link
sign-in, allowlist denial state, draft creation, and lifecycle controls) lives
on apps/site at `/admin*` per M2 phase 2.4.

It is responsible for:

- coordinating slug → event-id resolution and per-event organizer-or-admin
  authorization through `useEventAdminWorkspace` and the shared
  `useOrganizerForEvent` hook
- coordinating selected draft detail loading, event-detail saves, existing-
  question and question-structure saves, publish/unpublish actions, and
  sign-out state for the `/event/:slug/admin` route
- rendering the deep-editor presentational pieces — event-detail form,
  question editor, question list, question fields, option editor, and
  publish panel — used by the per-event admin route shell
- keeping route-level admin authoring state out of the attendee game module

## Boundaries

- role-neutral login/session primitives (`SignInForm`,
  `useAuthSession`, `requestMagicLink`, and `signOut`) are consumed
  through `src/auth/` and `src/lib/authApi.ts`; `/auth/callback` is
  hosted by apps/site using the shared `AuthCallbackPage`
- keep the per-event route adapter thin; route navigation remains in
  `src/pages/EventAdminPage.tsx`
- keep `/event/:slug/admin` scoped to per-event detail editing,
  existing-question content editing, question/option structure editing,
  and publish/unpublish with a pre-publish validation checklist
- load full private draft content only after the per-event seed
  summary read resolves and `useOrganizerForEvent` confirms an
  organizer-or-admin authorization
- keep event-level form mapping and validation in `eventDetails.ts`; preserve
  draft ids and question content when saving Phase 4.3 edits
- keep existing-question form mapping and save-time normalization in
  `questionFormMapping.ts`, and keep question/option structure transforms,
  id generation, delete guards, and correctness repair in
  `questionStructure.ts`; `questionBuilder.ts` remains a compatibility facade;
  preserve event details while saving Phase 4.4 edits
- keep selected question edits in a local draft buffer until the admin uses the
  explicit save action; structural changes do not call authoring APIs on their
  own
- save event-detail and question editor edits through the authenticated
  `save-draft` Edge Function, and load full draft content only through
  authenticated draft reads
- keep draft reads, admin RPC calls, and authoring function calls in
  `src/lib/adminGameApi.ts`
- keep publish checklist logic in `publishChecklist.ts`; it runs the five
  semantic content checks as independent pass/fail items so the UI can name
  each blocker; the backend remains authoritative for structural validation
  and slug uniqueness
- keep `usePreviewSession` (Phase 4.5, deferred) in this module when it
  lands; it must not modify production `useGameSession`
