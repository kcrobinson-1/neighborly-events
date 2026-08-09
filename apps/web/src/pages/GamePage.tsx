import { useState } from "react";
import type { GameConfig } from "../data/games";
import { featuredGameSlug } from "../data/games";
import { AnswerRevealPanel } from "../game/components/AnswerRevealPanel";
import { CorrectAnswerPanel } from "../game/components/CorrectAnswerPanel";
import { CurrentQuestionPanel } from "../game/components/CurrentQuestionPanel";
import { GameCompletionPanel } from "../game/components/GameCompletionPanel";
import { GameIntroPanel } from "../game/components/GameIntroPanel";
import { useGameSession } from "../game/useGameSession";
import { ensureServerSession } from "../lib/gameApi";
import { useAttendeeRedemptionStatus } from "../redemptions/useAttendeeRedemptionStatus";
import { getCompletionCta } from "../../../../shared/events/completionCta";
import { getQuizIntro } from "../../../../shared/events/quizIntro";
import { getRedemptionLocation } from "../../../../shared/events/redemptionLocation";
import { getEventMasthead } from "../../../../shared/masthead";
import { routes } from "../../../../shared/urls";

/** Props for the top-level game route. */
type GamePageProps = {
  game: GameConfig;
  onNavigate: (path: string) => void;
};

/** Orchestrates the full player-facing game flow for a single game. */
export function GamePage({ game, onNavigate }: GamePageProps) {
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const {
    answers,
    allowRetake,
    canGoBack,
    canSubmit,
    completionError,
    continueFromAnswerReveal,
    currentIndex,
    currentQuestion,
    feedbackKind,
    feedbackMessage,
    goBack,
    isComplete,
    isCompletionPersisted,
    isShowingAnswerReveal,
    isShowingQuestion,
    isStarted,
    isSubmittingCompletion,
    latestCompletion,
    pendingSelection,
    progressValue,
    reset,
    resetForRetake,
    retryCompletionSubmission,
    score,
    selectOption,
    start,
    submit,
  } = useGameSession(game);
  const redemptionStatus = useAttendeeRedemptionStatus(
    latestCompletion ? game.id : null,
  );

  const questionCount = game.questions.length;
  // The demo-overview nav is prototype scaffolding: a way back to the
  // sample-game index plus a chip labelling the flow as a demo. An
  // event that registers the shared masthead is a real event whose
  // quiz is reached from its own site, and the bar already carries
  // the way out (the brand lockup is the Home link) — so registration
  // is the switch, and the nav keeps rendering for the demo fixtures
  // and test events that have no bar. `App.tsx` resolves the same
  // registry to decide whether to render the bar itself.
  const hasMasthead = getEventMasthead(game.slug) !== null;
  const isGameActive = isStarted && !isComplete && !isSubmittingCompletion;
  const handleStart = async () => {
    setIsStartingSession(true);
    setStartError(null);

    try {
      await ensureServerSession(game.id);
      start();
    } catch (error: unknown) {
      setStartError(
        error instanceof Error
          ? error.message
          : "We couldn't prepare your game session right now.",
      );
    } finally {
      setIsStartingSession(false);
    }
  };

  return (
    <section className="game-layout">
      {hasMasthead ? null : (
        <nav className="sample-nav">
          <button
            className="text-link"
            onClick={() => onNavigate(routes.home)}
            type="button"
          >
            Back to demo overview
          </button>
          <span className="chip">
            {game.slug === featuredGameSlug ? "Featured demo" : "Demo flow"}
          </span>
        </nav>
      )}

      <section className="app-card">
        {/* Page-head: the title block. Renders as plain flow on the
            token defaults; themes with a banded page-head (Madrona's
            putty band) style it via the quiz-surface tokens — no
            event-keyed branches here.

            No subtext line under the title. It carried a per-event
            "Show your code at <place> to claim a reward" sentence that
            said what the event's own intro paragraph says a few lines
            below it, so the screen made the same promise twice before
            the player had answered anything. The place is still named
            once, by the intro, and again on the completion panel where
            the code actually appears. */}
        <div className="game-page-head">
          <div className="game-page-head-inner">
            <header className={`topbar${isGameActive ? " topbar-compact" : ""}`}>
              <div>
                {!isGameActive ? (
                  <p className="eyebrow">{game.location} neighborhood event</p>
                ) : null}
                <h1 className={isGameActive ? "topbar-title-compact" : undefined}>
                  {game.name}
                </h1>
              </div>
              {isGameActive ? (
                <div className="progress-copy progress-pill" aria-live="polite">
                  Question {currentIndex + 1} of {questionCount}
                </div>
              ) : null}
            </header>
          </div>
        </div>

        {!isStarted ? (
          <GameIntroPanel
            game={game}
            heading={getQuizIntro(game.slug)?.heading ?? null}
            isStartingSession={isStartingSession}
            onStart={handleStart}
            startError={startError}
          />
        ) : null}

        {isStarted && !isComplete && !isSubmittingCompletion && currentQuestion ? (
          <>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>
            {isShowingAnswerReveal && feedbackMessage ? (
              feedbackKind === "incorrect" ? (
                <AnswerRevealPanel
                  feedbackMessage={feedbackMessage}
                  isLastQuestion={currentIndex === questionCount - 1}
                  onContinue={continueFromAnswerReveal}
                  question={currentQuestion}
                />
              ) : (
                <CorrectAnswerPanel
                  feedbackMessage={feedbackMessage}
                  isLastQuestion={currentIndex === questionCount - 1}
                  onContinue={continueFromAnswerReveal}
                  question={currentQuestion}
                />
              )
            ) : null}
            {isShowingQuestion ? (
              <CurrentQuestionPanel
                canGoBack={canGoBack}
                canSubmit={canSubmit}
                currentIndex={currentIndex}
                feedbackKind={feedbackKind}
                feedbackMessage={feedbackMessage}
                onGoBack={goBack}
                onOptionSelect={selectOption}
                onSubmit={submit}
                pendingSelection={pendingSelection}
                question={currentQuestion}
                questionCount={questionCount}
              />
            ) : null}
          </>
        ) : null}

        {isSubmittingCompletion || isComplete ? (
          <GameCompletionPanel
            answers={answers}
            completion={latestCompletion}
            completionError={completionError}
            cta={getCompletionCta(game.slug)}
            game={game}
            isCompletionPersisted={isCompletionPersisted}
            isSubmitting={isSubmittingCompletion}
            onReset={reset}
            onRetake={resetForRetake}
            onRetrySubmission={retryCompletionSubmission}
            redemptionLocationName={
              getRedemptionLocation(game.slug)?.name ?? null
            }
            score={score}
            showRetake={allowRetake}
            status={redemptionStatus}
          />
        ) : null}
      </section>
    </section>
  );
}
