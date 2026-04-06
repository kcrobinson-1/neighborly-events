# Web Quiz Module

## Purpose

This folder owns the frontend quiz module for the attendee game flow.

It keeps the quiz-specific browser code together while leaving shared quiz
correctness in `shared/game-config` and backend trust/completion behavior in
`apps/web/src/lib/quizApi.ts` plus the Supabase backend.

## Public Entrypoints

- `useQuizSession.ts`
  Public React hook for the quiz session lifecycle. This is the main interface
  that route-level UI should consume.
- `quizUtils.ts`
  Public pure helper surface for quiz-specific selection, labeling, and
  feedback-copy logic.

These are the stable imports that other frontend files should prefer.

## Internal Structure

- `quizSessionState.ts`
  Pure reducer-owned state machine types, initial-state helpers, request-id
  creation for final-question completion, and transition logic.
- `quizSessionSelectors.ts`
  Pure derived-state selectors that turn reducer state plus game config into the
  React-facing view state used by the page and quiz components.
- `components/`
  Quiz-specific presentation components used by `GamePage.tsx`.
  These components should stay presentational and receive state/actions through
  props rather than owning quiz business rules themselves.

## Ownership Boundaries

- `GamePage.tsx` should stay a route shell.
  It handles route-level framing, session bootstrap, and choosing which quiz
  panel to render.
- `useQuizSession.ts` owns the browser quiz lifecycle.
  It wires reducer state, derived selectors, completion submission, retries, and
  hook-facing actions together.
- `quizSessionState.ts` owns state transitions.
  If a quiz phase or reducer transition changes, update that file first.
- `quizSessionSelectors.ts` owns read-only derived state.
  If a page/component needs new derived booleans or progress calculations, add
  them there instead of growing the hook body.
- `quizUtils.ts` owns frontend-only helper logic.
  Keep shared answer correctness, scoring, and validation in `shared/game-config`.

## Testing Layout

- `tests/web/game/useQuizSession.test.ts`
  Hook contract coverage.
- `tests/web/game/quizSessionState.test.ts`
  Pure reducer/state-machine coverage.
- `tests/web/game/quizSessionSelectors.test.ts`
  Pure derived-state selector coverage.
- `tests/web/game/quizUtils.test.ts`
  Pure helper coverage.
- `tests/web/game/components/`
  Focused component rendering and interaction coverage for extracted quiz
  panels.
- `tests/web/pages/GamePage.test.tsx`
  Route-shell wiring coverage for intro, active question, start-error, and
  completion states.

## Maintenance Notes

- Keep this module non-authoritative for quiz correctness.
  Shared quiz rules still belong in `shared/game-config`.
- Preserve current strings and class names when refactoring components unless
  there is an intentional UX change.
- Prefer adding a small pure helper or selector over pushing more logic back
  into `GamePage.tsx`.
- Prefer direct tests for pure state, selector, and helper modules plus focused
  wiring tests for the page shell.

## Current Status

The quiz module refactor is complete. The reducer, derived selectors, quiz
panels, and tests now follow the current module boundaries described above.
