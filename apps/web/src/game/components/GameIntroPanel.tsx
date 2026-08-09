/** Intro panel for the pre-game state before the player starts an attempt. */
import type { GameConfig } from "../../data/games";

/** Props for the pre-game intro panel. */
type GameIntroPanelProps = {
  game: GameConfig;
  /**
   * The event's name for its own quiz, from the `quizIntro` registry.
   * `null` for events without an entry, which render no heading.
   */
  heading: string | null;
  isStartingSession: boolean;
  onStart: () => void | Promise<void>;
  startError: string | null;
};

/**
 * Intro panel shown before the player starts a game attempt.
 *
 * The heading and the `intro` paragraph are both event-owned; the
 * panel writes no copy of its own beyond the length estimate. It used
 * to: a "Finish to earn your <label>" heading composed from the
 * entitlement label, plus a three-bullet feature list ("No sign-in",
 * "One question on screen at a time", and a per-feedback-mode line).
 * That restated the reward a third time on a screen that had already
 * promised it twice, and spent the rest describing mechanics the
 * player learns by tapping Start. Written once for every event, none
 * of it could say anything true of the event rendering it. The length
 * estimate survives because a player weighs it before starting and
 * cannot infer it.
 */
export function GameIntroPanel({
  game,
  heading,
  isStartingSession,
  onStart,
  startError,
}: GameIntroPanelProps) {
  return (
    <section className="panel intro-panel">
      <span className="chip">About {game.estimatedMinutes} minutes</span>
      {heading ? <h2>{heading}</h2> : null}
      <p>{game.intro}</p>
      {startError ? (
        <div className="feedback-banner feedback-banner-error" role="status">
          <strong>Can't start the game right now.</strong>
          <p>{startError}</p>
        </div>
      ) : null}
      <button
        className="primary-button"
        disabled={isStartingSession}
        onClick={() => {
          void onStart();
        }}
        type="button"
      >
        {isStartingSession ? "Getting your game ready..." : "Start game"}
      </button>
    </section>
  );
}
