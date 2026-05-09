# Analytics Phase 1 Implementation Plan

## Status

Landed.

## Context

This plan was extracted from the parent strategy doc
[`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)
and archived in place. It captured the per-PR contract for the
"Phase 1 — Data Collection (Pre-Event)" sequencing item: the
two pull requests that landed the `sponsor` nullability fix and
the `game_starts` table + `issue-session` start tracking. Both
PRs landed before the parent doc moved into `docs/tracking/`,
which is why this is recorded here as archive rather than as an
in-flight contract. The parent strategy doc retains the
forward-looking sequencing entry (Phase 2 — Organizer Reporting
Surface, Future Consideration — Cross-Event/Question-Level
Funnel Analysis).

## Phase 1 Implementation Plan

Phase 1 is two pull requests. They cannot be combined because they require different reviewer mental contexts and touch completely different parts of the system. PR 1 is a type-system and data model fix whose changes ripple through UI rendering and shared validation. PR 2 is new infrastructure — a new table, edge function changes, and a client API update — where the reviewer needs to hold "does start tracking work correctly and fail gracefully" as the focus. They share no files.

### PR 1 — Make `sponsor` nullable

**Why:** The `game_questions.sponsor` column is currently `NOT NULL`, which prevents modeling unsponsored house questions. This is a prerequisite for analytics views that need to correctly distinguish sponsored from unsponsored questions. It is also a standalone data model correctness fix.

**Files:**

- `supabase/migrations/` — new migration: `ALTER TABLE public.game_questions ALTER COLUMN sponsor DROP NOT NULL`
- `shared/game-config/types.ts` — change `sponsor: string` to `sponsor: string | null` on the `Question` type; the TypeScript compiler will surface every downstream call site that needs updating
- `shared/game-config/db-content.ts` — update the sponsor type annotation in the DB row type
- `shared/game-config/draft-content.ts` — update the sponsor field validation to accept null/undefined in addition to a string; update the type annotation
- `apps/web/src/game/components/CurrentQuestionPanel.tsx` — wrap the "Sponsored by" label in a null guard so it only renders when `question.sponsor` is set
- `apps/web/src/game/components/GameIntroPanel.tsx` — null guard on the sponsor heading
- `apps/web/src/game/components/CorrectAnswerPanel.tsx` — the fallback feedback message references `question.sponsor`; needs null-safe handling
- `apps/web/src/game/components/GameCompletionPanel.tsx` — null guard on any sponsor label
- `supabase/functions/_shared/published-game-loader.ts` — the sponsor field is selected and mapped; update the type to allow null

**Validation:** `npm run lint`, `npm test`, `npm run test:functions`, `deno check` on `issue-session` and `complete-game`, `npm run build:web`. The type change on `Question.sponsor` will cause compiler errors at every unguarded call site, so the build itself enforces completeness.

---

### PR 2 — Add game start tracking

**Why:** `issue-session` currently mints a signed session credential but writes nothing to the database. Adding a single INSERT into a new `game_starts` table provides the funnel denominator — how many people started the quiz — which is permanently unrecoverable for any event that runs without this in place.

**Files:**

- `supabase/migrations/` — new migration adding a `game_starts` table with columns `id uuid`, `event_id text`, `client_session_id text not null`, `issued_at timestamptz not null default now()`, and a unique constraint on `(event_id, client_session_id)`. RLS enabled; no public read policy needed at this stage since the table is analytics-only.
- `supabase/functions/issue-session/index.ts` — accept an optional `event_id` field in the POST body. After a session is confirmed (new or existing), if `event_id` is present, INSERT into `game_starts` with `ON CONFLICT DO NOTHING` for idempotency. The INSERT must be best-effort: a database failure must not prevent the session response from returning. The function gains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as new runtime dependencies; add them to `IssueSessionHandlerDependencies` following the same pattern as `complete-game`.
- `apps/web/src/lib/gameApi.ts` — update `ensureServerSession()` to accept an optional `eventId` parameter and include it in the POST body when provided.
- `apps/web/src/pages/GamePage.tsx` — pass `game.id` to `ensureServerSession(game.id)` at the existing call site.
- `tests/supabase/functions/issue-session.test.ts` — add cases covering: start row is inserted when `event_id` is provided, a second call for the same event/session pair is idempotent, and a missing `event_id` leaves the starts table untouched.

**Key design decisions:**
- `event_id` is optional in the request body so the function continues to work in backward-compatible and non-event contexts.
- `ON CONFLICT DO NOTHING` means a page refresh or session retry does not create duplicate start rows. The `issued_at` timestamp reflects the first start for that session/event pair.
- The INSERT failing does not fail the response. Start tracking is observability infrastructure; session issuance is the trust boundary. These have different failure priorities.

**Validation:** `npm run lint`, `npm test`, `npm run test:functions`, `npm run test:supabase`, `deno check` on `issue-session`, `npm run build:web`.
