/** Reveal panel shown after a wrong submission in non-blocking feedback mode. */
import type { Question } from "../../data/games";
import { getOptionLabels } from "../gameUtils";
import { QuestionNarrative } from "./QuestionNarrative";

/** Props for the wrong-but-revealed answer panel. */
type AnswerRevealPanelProps = {
  feedbackMessage: string;
  isLastQuestion: boolean;
  onContinue: () => void;
  question: Question;
};

/** Reveal panel shown after a wrong answer in non-blocking feedback mode. */
export function AnswerRevealPanel({
  feedbackMessage,
  isLastQuestion,
  onContinue,
  question,
}: AnswerRevealPanelProps) {
  const correctLabels = getOptionLabels(question, question.correctAnswerIds);
  const correctLabelHeading =
    question.selectionMode === "multiple" && correctLabels.length > 1
      ? "Correct answers"
      : "Correct answer";

  return (
    <section className="panel completion-panel">
      <span className="chip chip-error">Not quite</span>
      {question.sponsor ? <h2>{question.sponsor}</h2> : null}
      {correctLabels.length > 0 ? (
        <p className="answer-reveal-correct">
          <strong>{correctLabelHeading}:</strong> {correctLabels.join(", ")}
        </p>
      ) : null}
      <QuestionNarrative copy={feedbackMessage} question={question} />
      <button className="primary-button" onClick={onContinue} type="button">
        {isLastQuestion ? "See your results" : "Continue"}
      </button>
    </section>
  );
}
