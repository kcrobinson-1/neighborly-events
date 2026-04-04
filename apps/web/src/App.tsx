import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { demoEvent } from "./data/demoEvent";

type Answers = Record<string, string>;

const routes = {
  home: "/",
  sampleGame: "/game/first-sample",
} as const;

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function App() {
  const [pathname, setPathname] = useState(() =>
    normalizePathname(window.location.pathname),
  );

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigate = (path: string) => {
    const nextPath = normalizePathname(path);

    if (nextPath !== pathname) {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  let content: ReactNode;

  if (pathname === routes.home) {
    content = <LandingPage onNavigate={navigate} />;
  } else if (pathname === routes.sampleGame) {
    content = <SampleGamePage onNavigate={navigate} />;
  } else {
    content = <NotFoundPage onNavigate={navigate} />;
  }

  return (
    <main className="site-shell">
      <section className="backdrop" aria-hidden="true" />
      {content}
    </main>
  );
}

function LandingPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="landing-layout">
      <header className="landing-hero panel panel-hero">
        <div className="hero-copy">
          <p className="eyebrow">Neighborhood event engagement</p>
          <h1>Turn a sponsor-friendly quiz into a neighborhood raffle moment.</h1>
          <p className="hero-body">
            Neighborly Scavenger Game is a mobile-first event experience for concerts,
            markets, and neighborhood gatherings. Attendees scan, play, and finish in
            under two minutes while sponsors become part of the experience instead of
            just background logos.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => onNavigate(routes.sampleGame)}
            type="button"
          >
            Play the first sample
          </button>
          <a className="text-link" href="#how-it-works">
            See how it works
          </a>
        </div>
      </header>

      <section className="feature-grid" id="how-it-works">
        <article className="panel feature-card">
          <span className="chip">For organizers</span>
          <h2>Lightweight fundraising without adding booth chaos.</h2>
          <p>
            Organizers configure the event, add sponsored questions, publish a QR code,
            and let the game run with minimal volunteer training.
          </p>
        </article>

        <article className="panel feature-card">
          <span className="chip">For attendees</span>
          <h2>A quick game instead of a long form.</h2>
          <p>
            One question appears at a time, progress is obvious, and the finish screen
            clearly tells people how to redeem their raffle ticket.
          </p>
        </article>

        <article className="panel feature-card">
          <span className="chip">For sponsors</span>
          <h2>Visible inside the experience, not pushed to the margins.</h2>
          <p>
            Sponsors appear inside the game flow in a way that feels local and useful
            instead of interruptive or ad-heavy.
          </p>
        </article>
      </section>

      <section className="panel landing-flow">
        <div className="section-heading">
          <p className="eyebrow">Sample route</p>
          <h2>The product can live on one site.</h2>
        </div>
        <div className="flow-grid">
          <div className="flow-step">
            <strong>/</strong>
            <p>Marketing landing page that explains the product and directs people into a live demo.</p>
          </div>
          <div className="flow-step">
            <strong>/game/first-sample</strong>
            <p>Playable sample game with the full attendee flow, from intro screen to verification state.</p>
          </div>
        </div>
      </section>
    </section>
  );
}

function SampleGamePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const questions = demoEvent.questions;
  const currentQuestion = questions[currentIndex];
  const isComplete = started && currentIndex >= questions.length;
  const progressValue = isComplete
    ? 100
    : ((currentIndex + 1) / questions.length) * 100;

  const answerCount = Object.keys(answers).length.toString().padStart(2, "0");
  const completionCode = `MMP-${answerCount}${demoEvent.id.slice(-2).toUpperCase()}`;

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
        <span className="chip">Sample game</span>
      </nav>

      <section className="app-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">{demoEvent.location} neighborhood event</p>
            <h1>{demoEvent.name}</h1>
          </div>
          {started && !isComplete ? (
            <div className="progress-copy" aria-live="polite">
              Question {currentIndex + 1} of {questions.length}
            </div>
          ) : null}
        </header>

        {!started ? (
          <section className="panel intro-panel">
            <span className="chip">Under {demoEvent.estimatedMinutes} minutes</span>
            <h2>Win a {demoEvent.raffleLabel}</h2>
            <p>{demoEvent.intro}</p>
            <ul className="intro-list">
              <li>No login</li>
              <li>One question at a time</li>
              <li>Show the final screen to the volunteer table</li>
            </ul>
            <button className="primary-button" onClick={handleStart} type="button">
              Start the game
            </button>
          </section>
        ) : null}

        {started && !isComplete ? (
          <>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progressValue}%` }} />
            </div>
            <section className="panel question-panel">
              <p className="sponsor-label">Sponsored by {currentQuestion.sponsor}</p>
              <h2>{currentQuestion.prompt}</h2>
              <div className="options" role="list" aria-label="Answer options">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    className="option-button"
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {isComplete ? (
          <section className="panel completion-panel">
            <span className="chip chip-success">Officially complete</span>
            <h2>Show this screen to the volunteer table</h2>
            <p>
              You finished the neighborhood game and earned your {demoEvent.raffleLabel}.
            </p>
            <div className="token-block">
              <span className="token-label">Verification code</span>
              <strong>{completionCode}</strong>
              <span className="token-meta">Prototype proof state for in-person redemption</span>
            </div>
            <button className="secondary-button" onClick={handleReset} type="button">
              Restart demo
            </button>
          </section>
        ) : null}
      </section>
    </section>
  );
}

function NotFoundPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <section className="not-found-layout panel">
      <span className="chip">Page not found</span>
      <h1>This route is not part of the sample site yet.</h1>
      <p>
        Head back to the product overview or jump straight into the sample game.
      </p>
      <div className="not-found-actions">
        <button
          className="primary-button"
          onClick={() => onNavigate(routes.home)}
          type="button"
        >
          Go home
        </button>
        <button
          className="secondary-button"
          onClick={() => onNavigate(routes.sampleGame)}
          type="button"
        >
          Open the sample game
        </button>
      </div>
    </section>
  );
}

export default App;
