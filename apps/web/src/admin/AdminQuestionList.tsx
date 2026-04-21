import type { DraftEventDetail } from "../lib/adminGameApi";

type AdminQuestionListProps = {
  disabled: boolean;
  focusedQuestionId: string;
  onFocusQuestion: (questionId: string) => void;
  onResetDeleteConfirmation: () => void;
  questions: DraftEventDetail["content"]["questions"];
};

export function AdminQuestionList({
  disabled,
  focusedQuestionId,
  onFocusQuestion,
  onResetDeleteConfirmation,
  questions,
}: AdminQuestionListProps) {
  return (
    <div className="admin-question-list" aria-label="Question list">
      {questions.map((question, index) => (
        <button
          aria-pressed={question.id === focusedQuestionId}
          className="secondary-button admin-question-list-button"
          disabled={disabled}
          key={question.id}
          onClick={() => {
            onFocusQuestion(question.id);
            onResetDeleteConfirmation();
          }}
          type="button"
        >
          Question {index + 1}: {question.prompt || "Untitled question"}
        </button>
      ))}
    </div>
  );
}
