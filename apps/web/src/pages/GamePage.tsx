import type { GameConfig, Question } from "../data/games";
import { featuredGameSlug } from "../data/games";
import { type FormEvent } from "react";
import {
  type Answers,
  answersMatch,
  getOptionLabels,
  getSelectionLabel,
} from "../game/quizUtils";
import { routes } from "../routes";
import { useQuizSession } from "../game/useQuizSession";

type GamePageProps = {
  game: GameConfig;
  onNavigate: (path: string) => void;
};

export function GamePage({ game, onNavigate }: GamePageProps) {
  const {
    answers,
    completionCode,
    continueFromCorrectFeedback,
    currentIndex,
    currentQuestion,
    feedbackKind,
    feedbackMessage,
    canSubmit,
    isComplete,
    isShowingCorrectFeedback,
    isShowingQuestion,
    isStarted,
    pendingSelection,
    progressValue,
    reset,
    score,
    selectOption,
    start,
    submit,
  } = useQuizSession(game);

  const questionCount = game.questions.length;

  return (
    <section className="game-layout">
      <nav className="sample-nav">
        <button
          className="text-link"
          onClick={() => onNavigate(routes.home)}
          type="button"
        >
          Back to product overview
        </button>
        <span className="chip">
          {game.slug === featuredGameSlug ? "Featured sample" : "Sample game"}
        </span>
      </nav>

      <section className="app-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">{game.location} neighborhood event</p>
            <h1>{game.name}</h1>
          </div>
          {isStarted && !isComplete ? (
            <div className="progress-copy" aria-live="polite">
              Question {currentIndex + 1} of {questionCount}
            </div>
          ) : null}
        </header>

        {!isStarted ? <GameIntroPanel game={game} onStart={start} /> : null}

        {isStarted && !isComplete && currentQuestion ? (
          <>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>
            {isShowingCorrectFeedback && feedbackMessage ? (
              <CorrectAnswerPanel
                feedbackMessage={feedbackMessage}
                onContinue={continueFromCorrectFeedback}
                question={currentQuestion}
              />
            ) : null}
            {isShowingQuestion ? (
              <CurrentQuestionPanel
                currentIndex={currentIndex}
                feedbackKind={feedbackKind}
                feedbackMessage={feedbackMessage}
                game={game}
                canSubmit={canSubmit}
                onOptionSelect={selectOption}
                onSubmit={submit}
                pendingSelection={pendingSelection}
                question={currentQuestion}
                questionCount={questionCount}
              />
            ) : null}
          </>
        ) : null}

        {isComplete ? (
          <GameCompletionPanel
            answers={answers}
            completionCode={completionCode}
            game={game}
            onReset={reset}
            score={score}
          />
        ) : null}
      </section>
    </section>
  );
}

type GameIntroPanelProps = {
  game: GameConfig;
  onStart: () => void;
};

function GameIntroPanel({ game, onStart }: GameIntroPanelProps) {
  const modeDescription =
    game.feedbackMode === "instant_feedback_required"
      ? "Pick an answer, submit it, and get it right to unlock a sponsor fact before the next question."
      : "Pick your answer, submit it, and review your score at the end.";

  return (
    <section className="panel intro-panel">
      <span className="chip">Under {game.estimatedMinutes} minutes</span>
      <h2>Win a {game.raffleLabel}</h2>
      <p>{game.intro}</p>
      <ul className="intro-list">
        <li>No login</li>
        <li>One question at a time</li>
        <li>{modeDescription}</li>
      </ul>
      <button className="primary-button" onClick={onStart} type="button">
        Start the game
      </button>
    </section>
  );
}

type CurrentQuestionPanelProps = {
  canSubmit: boolean;
  currentIndex: number;
  feedbackKind: "correct" | "incorrect" | null;
  feedbackMessage: string | null;
  game: GameConfig;
  onOptionSelect: (optionId: string) => void;
  onSubmit: () => void;
  pendingSelection: string[];
  question: GameConfig["questions"][number];
  questionCount: number;
};

function CurrentQuestionPanel({
  canSubmit,
  currentIndex,
  feedbackKind,
  feedbackMessage,
  game,
  onOptionSelect,
  onSubmit,
  pendingSelection,
  question,
  questionCount,
}: CurrentQuestionPanelProps) {
  const submitLabel =
    question.selectionMode === "multiple" ? "Submit answers" : "Submit answer";
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <section className="panel question-panel">
      <p className="sponsor-label">Sponsored by {question.sponsor}</p>
      <h2>{question.prompt}</h2>
      <p className="selection-hint">{getSelectionLabel(question)}</p>
      <form className="question-form" onSubmit={handleSubmit}>
        <OptionField
          gameName={game.name}
          onOptionSelect={onOptionSelect}
          pendingSelection={pendingSelection}
          question={question}
        />
        {feedbackKind === "incorrect" && feedbackMessage ? (
          <div className="feedback-banner feedback-banner-error" role="status">
            <strong>Not quite.</strong>
            <p>{feedbackMessage}</p>
          </div>
        ) : null}
        <button
          className="primary-button submit-button"
          disabled={!canSubmit}
          type="submit"
        >
          {submitLabel}
        </button>
        <p className="sr-only">
          Question {currentIndex + 1} of {questionCount}
        </p>
      </form>
    </section>
  );
}

type OptionFieldProps = {
  gameName: string;
  onOptionSelect: (optionId: string) => void;
  pendingSelection: string[];
  question: Question;
};

function OptionField({
  gameName,
  onOptionSelect,
  pendingSelection,
  question,
}: OptionFieldProps) {
  const inputType =
    question.selectionMode === "multiple" ? "checkbox" : "radio";

  return (
    <fieldset className="option-fieldset">
      <legend className="sr-only">{question.prompt}</legend>
      <div className="options" aria-label={`${gameName} answer options`}>
        {question.options.map((option) => {
          const checked = pendingSelection.includes(option.id);
          const inputId = `${question.id}-${option.id}`;

          return (
            <label
              className={`option-choice${checked ? " option-choice-selected" : ""}`}
              htmlFor={inputId}
              key={option.id}
            >
              <input
                checked={checked}
                className="option-input"
                id={inputId}
                name={`question-${question.id}`}
                onChange={() => onOptionSelect(option.id)}
                type={inputType}
              />
              <span className="option-button">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type CorrectAnswerPanelProps = {
  feedbackMessage: string;
  onContinue: () => void;
  question: Question;
};

function CorrectAnswerPanel({
  feedbackMessage,
  onContinue,
  question,
}: CorrectAnswerPanelProps) {
  return (
    <section className="panel completion-panel">
      <span className="chip chip-success">Correct</span>
      <h2>{question.sponsor}</h2>
      <p>{feedbackMessage}</p>
      <button className="primary-button" onClick={onContinue} type="button">
        Next question
      </button>
    </section>
  );
}

type GameCompletionPanelProps = {
  answers: Answers;
  completionCode: string;
  game: GameConfig;
  onReset: () => void;
  score: number;
};

function GameCompletionPanel({
  answers,
  completionCode,
  game,
  onReset,
  score,
}: GameCompletionPanelProps) {
  return (
    <section className="panel completion-panel">
      <span className="chip chip-success">Officially complete</span>
      <h2>Show this screen to the volunteer table</h2>
      <p>
        You finished the neighborhood game and earned your {game.raffleLabel}.
      </p>

      {game.feedbackMode === "final_score_reveal" ? (
        <div className="results-block">
          <div className="score-card">
            <span className="token-label">Score</span>
            <strong>
              {score} / {game.questions.length}
            </strong>
          </div>
          <div className="answer-review-list">
            {game.questions.map((question) => {
              const selectedAnswerIds = answers[question.id] ?? [];
              const selectedLabels = getOptionLabels(question, selectedAnswerIds);
              const correctLabels = getOptionLabels(
                question,
                question.correctAnswerIds,
              );
              const isCorrect = answersMatch(
                selectedAnswerIds,
                question.correctAnswerIds,
              );

              return (
                <article className="answer-review-card" key={question.id}>
                  <p className="sponsor-label">Sponsored by {question.sponsor}</p>
                  <h3>{question.prompt}</h3>
                  <p>
                    <strong>Your answer:</strong>{" "}
                    {selectedLabels.length > 0
                      ? selectedLabels.join(", ")
                      : "No answer recorded"}
                  </p>
                  <p>
                    <strong>Correct answer:</strong> {correctLabels.join(", ")}
                  </p>
                  <p
                    className={
                      isCorrect
                        ? "review-status review-status-correct"
                        : "review-status review-status-incorrect"
                    }
                  >
                    {isCorrect ? "Correct" : "Needs review"}
                  </p>
                  {question.sponsorFact ?? question.explanation ? (
                    <p className="answer-review-note">
                      {question.sponsorFact ?? question.explanation}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="token-block">
        <span className="token-label">Verification code</span>
        <strong>{completionCode}</strong>
        <span className="token-meta">Prototype proof state for in-person redemption</span>
      </div>
      <button className="secondary-button" onClick={onReset} type="button">
        Restart demo
      </button>
    </section>
  );
}
