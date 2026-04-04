import { useMemo, useState } from "react";
import type { GameConfig, Question } from "../data/games";
import { featuredGameSlug } from "../data/games";
import { routes } from "../routes";

type Answers = Record<string, string>;

type FeedbackState =
  | {
      kind: "incorrect";
      message: string;
      selectedOptionId: string;
    }
  | {
      kind: "correct";
      message: string;
      selectedOptionId: string;
    };

type GamePageProps = {
  game: GameConfig;
  onNavigate: (path: string) => void;
};

export function GamePage({ game, onNavigate }: GamePageProps) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [feedbackState, setFeedbackState] = useState<FeedbackState | null>(null);

  const questions = game.questions;
  const currentQuestion = questions[currentIndex];
  const isComplete = started && currentIndex >= questions.length;
  const progressValue = isComplete
    ? 100
    : ((currentIndex + 1) / questions.length) * 100;

  const answerCount = Object.keys(answers).length.toString().padStart(2, "0");
  const completionCode = `MMP-${answerCount}${game.id.slice(-2).toUpperCase()}`;

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return total + Number(answers[question.id] === question.correctAnswer);
      }, 0),
    [answers, questions],
  );

  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
  };

  const advanceToNextQuestion = () => {
    setFeedbackState(null);
    setCurrentIndex((index) => index + 1);
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    if (game.feedbackMode === "final_score_reveal") {
      setAnswers((current) => ({
        ...current,
        [questionId]: optionId,
      }));
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (optionId !== currentQuestion.correctAnswer) {
      setFeedbackState({
        kind: "incorrect",
        selectedOptionId: optionId,
        message: currentQuestion.explanation ?? "Not quite. Try again.",
      });
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));

    setFeedbackState({
      kind: "correct",
      selectedOptionId: optionId,
      message:
        currentQuestion.sponsorFact ??
        currentQuestion.explanation ??
        `Correct. ${currentQuestion.sponsor} is part of the neighborhood event experience.`,
    });
  };

  const handleReset = () => {
    setStarted(false);
    setCurrentIndex(0);
    setAnswers({});
    setFeedbackState(null);
  };

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
          {started && !isComplete ? (
            <div className="progress-copy" aria-live="polite">
              Question {currentIndex + 1} of {questions.length}
            </div>
          ) : null}
        </header>

        {!started ? <GameIntroPanel game={game} onStart={handleStart} /> : null}

        {started && !isComplete ? (
          <>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>
            {feedbackState?.kind === "correct" ? (
              <CorrectAnswerPanel
                feedbackMessage={feedbackState.message}
                onContinue={advanceToNextQuestion}
                question={currentQuestion}
              />
            ) : (
              <CurrentQuestionPanel
                currentIndex={currentIndex}
                feedbackState={feedbackState}
                game={game}
                onAnswerSelect={handleAnswerSelect}
                question={currentQuestion}
                questionCount={questions.length}
              />
            )}
          </>
        ) : null}

        {isComplete ? (
          <GameCompletionPanel
            answers={answers}
            completionCode={completionCode}
            game={game}
            onReset={handleReset}
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
      ? "Get each one right to unlock a sponsor fact before the next question."
      : "Move quickly through the quiz and see your score at the end.";

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
  currentIndex: number;
  feedbackState: FeedbackState | null;
  game: GameConfig;
  onAnswerSelect: (questionId: string, optionId: string) => void;
  question: GameConfig["questions"][number];
  questionCount: number;
};

function CurrentQuestionPanel({
  currentIndex,
  feedbackState,
  game,
  onAnswerSelect,
  question,
  questionCount,
}: CurrentQuestionPanelProps) {
  return (
    <section className="panel question-panel">
      <p className="sponsor-label">Sponsored by {question.sponsor}</p>
      <h2>{question.prompt}</h2>
      <div className="options" role="list" aria-label={`${game.name} answer options`}>
        {question.options.map((option) => {
          const isIncorrectSelection =
            feedbackState?.kind === "incorrect" &&
            feedbackState.selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              className={`option-button${isIncorrectSelection ? " option-button-error" : ""}`}
              onClick={() => onAnswerSelect(question.id, option.id)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {feedbackState?.kind === "incorrect" ? (
        <div className="feedback-banner feedback-banner-error" role="status">
          <strong>Not quite.</strong>
          <p>{feedbackState.message}</p>
        </div>
      ) : null}
      <p className="sr-only">
        Question {currentIndex + 1} of {questionCount}
      </p>
    </section>
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
              const selectedAnswer = answers[question.id];
              const selectedOption = question.options.find(
                (option) => option.id === selectedAnswer,
              );
              const correctOption = question.options.find(
                (option) => option.id === question.correctAnswer,
              );
              const isCorrect = selectedAnswer === question.correctAnswer;

              return (
                <article className="answer-review-card" key={question.id}>
                  <p className="sponsor-label">Sponsored by {question.sponsor}</p>
                  <h3>{question.prompt}</h3>
                  <p>
                    <strong>Your answer:</strong>{" "}
                    {selectedOption?.label ?? "No answer recorded"}
                  </p>
                  <p>
                    <strong>Correct answer:</strong> {correctOption?.label}
                  </p>
                  <p className={isCorrect ? "review-status review-status-correct" : "review-status review-status-incorrect"}>
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
