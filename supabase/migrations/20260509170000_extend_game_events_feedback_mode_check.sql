-- Widen the game_events.feedback_mode CHECK constraint to accept the third
-- mode value, instant_feedback_non_blocking, alongside the two existing ones.
-- This is a *widening* (not a tightening): every row that satisfied the old
-- predicate continues to satisfy the new one, so no legacy-data precheck is
-- required. The constraint name is unchanged.
alter table public.game_events
  drop constraint game_events_feedback_mode_check;

alter table public.game_events
  add constraint game_events_feedback_mode_check
    check (
      feedback_mode in (
        'final_score_reveal',
        'instant_feedback_required',
        'instant_feedback_non_blocking'
      )
    );
