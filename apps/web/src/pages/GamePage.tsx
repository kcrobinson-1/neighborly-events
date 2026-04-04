import { useState } from "react";
import type { GameConfig } from "../data/games";
import { featuredGameSlug } from "../data/games";
import { routes } from "../routes";

type Answers = Record<string, string>;

type GamePageProps = {
  game: GameConfig;
  onNavigate: (path: string) => void;
};

export function GamePage({ game, onNavigate }: GamePageProps) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const questions = game.questions;
  const currentQuestion = questions[currentIndex];
  const isComplete = started && currentIndex >= questions.length;
  const progressValue = isComplete
    ? 100
    : ((currentIndex + 1) / questions.length) * 100;

  const answerCount = Object.keys(answers).length.toString().padStart(2, "0");
  const completionCode = `MMP-${answerCount}${game.id.slice(-2).toUpperCase()}`;

  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));

    setCurrentIndex((index) => index + 1);
  };

  const handleReset = () => {
    setStarted(false);
    setCurrentIndex(0);
    setAnswers({});
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
          {game.slug === featuredGameSlug ? "Sample game" : "Game"}
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
          <CurrentQuestionPanel
            currentIndex={currentIndex}
            game={game}
            onAnswerSelect={handleAnswerSelect}
            progressValue={progressValue}
            question={currentQuestion}
            questionCount={questions.length}
          />
        ) : null}

        {isComplete ? (
          <GameCompletionPanel
            completionCode={completionCode}
            game={game}
            onReset={handleReset}
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
  return (
    <section className="panel intro-panel">
      <span className="chip">Under {game.estimatedMinutes} minutes</span>
      <h2>Win a {game.raffleLabel}</h2>
      <p>{game.intro}</p>
      <ul className="intro-list">
        <li>No login</li>
        <li>One question at a time</li>
        <li>Show the final screen to the volunteer table</li>
      </ul>
      <button className="primary-button" onClick={onStart} type="button">
        Start the game
      </button>
    </section>
  );
}

type CurrentQuestionPanelProps = {
  currentIndex: number;
  game: GameConfig;
  onAnswerSelect: (questionId: string, optionId: string) => void;
  progressValue: number;
  question: GameConfig["questions"][number];
  questionCount: number;
};

function CurrentQuestionPanel({
  currentIndex,
  game,
  onAnswerSelect,
  progressValue,
  question,
  questionCount,
}: CurrentQuestionPanelProps) {
  return (
    <>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${progressValue}%` }} />
      </div>
      <section className="panel question-panel">
        <p className="sponsor-label">Sponsored by {question.sponsor}</p>
        <h2>{question.prompt}</h2>
        <div className="options" role="list" aria-label={`${game.name} answer options`}>
          {question.options.map((option) => (
            <button
              key={option.id}
              className="option-button"
              onClick={() => onAnswerSelect(question.id, option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="sr-only">
          Question {currentIndex + 1} of {questionCount}
        </p>
      </section>
    </>
  );
}

type GameCompletionPanelProps = {
  completionCode: string;
  game: GameConfig;
  onReset: () => void;
};

function GameCompletionPanel({
  completionCode,
  game,
  onReset,
}: GameCompletionPanelProps) {
  return (
    <section className="panel completion-panel">
      <span className="chip chip-success">Officially complete</span>
      <h2>Show this screen to the volunteer table</h2>
      <p>
        You finished the neighborhood game and earned your {game.raffleLabel}.
      </p>
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
