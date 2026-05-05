import type { AuthoringGameDraftContent } from "../game-config";

/**
 * Input shape for the generic seed script at
 * `scripts/release/seed-game-content.cjs`. Each per-event seed
 * module exports a `seedConfig: GameSeedConfig` describing the
 * publishable content and the 3-character `eventCode` the publish
 * flow projects into `game_event_drafts.event_code` and the
 * resulting `game_events.event_code`.
 *
 * `content.id` and `content.slug` are the per-event identity inside
 * the JSON payload. `eventCode` is a peer field on
 * `game_event_drafts` (not inside the `content` JSON), so it lives
 * on the wrapper. Keeping both in the same module is the load-
 * bearing simplification: adding a new event seed means committing
 * one new module that wires everything the generic seed script
 * needs.
 */
export type GameSeedConfig = {
  /**
   * Three-character uppercase code projected into
   * `game_events.event_code` and `game_event_drafts.event_code`.
   * The seed script asserts no other event already holds this
   * value (uniqueness constraint on `game_events.event_code` and
   * `game_event_drafts.event_code`); collision aborts the run.
   */
  eventCode: string;
  /**
   * The publishable game content. The seed script upserts this
   * verbatim into `game_event_drafts.content` and invokes
   * `publish_game_event_draft(content.id, $actor_id)`.
   */
  content: AuthoringGameDraftContent;
};
