import type {
  AdminQuestionFormValues,
  AdminQuestionOptionFormValues,
} from "./questionFormMapping";

type AdminOptionEditorProps = {
  disabled: boolean;
  focusedQuestionId: string;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onUpdateCorrectAnswer: (optionId: string, checked: boolean) => void;
  onUpdateOptionLabel: (optionId: string, label: string) => void;
  options: AdminQuestionOptionFormValues[];
  selectionMode: AdminQuestionFormValues["selectionMode"];
};

export function AdminOptionEditor({
  disabled,
  focusedQuestionId,
  onAddOption,
  onDeleteOption,
  onUpdateCorrectAnswer,
  onUpdateOptionLabel,
  options,
  selectionMode,
}: AdminOptionEditorProps) {
  return (
    <fieldset className="admin-option-fieldset">
      <legend>Answer options</legend>
      {options.map((option, index) => (
        <div className="admin-option-row" key={option.id}>
          <label className="admin-correct-answer">
            <input
              checked={option.isCorrect}
              disabled={disabled}
              name={
                selectionMode === "single"
                  ? `correct-answer-${focusedQuestionId}`
                  : undefined
              }
              onChange={(event) =>
                onUpdateCorrectAnswer(option.id, event.target.checked)
              }
              type={selectionMode === "single" ? "radio" : "checkbox"}
            />{" "}
            Correct
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Option {index + 1} label</span>
            <input
              className="admin-input"
              disabled={disabled}
              onChange={(event) =>
                onUpdateOptionLabel(option.id, event.target.value)
              }
              type="text"
              value={option.label}
            />
          </label>
          <button
            className="secondary-button"
            disabled={disabled || options.length <= 1}
            onClick={() => onDeleteOption(option.id)}
            type="button"
          >
            Delete option
          </button>
        </div>
      ))}
      {options.length <= 1 ? (
        <p className="draft-row-meta">Keep at least one answer option.</p>
      ) : null}
      <button
        className="secondary-button admin-inline-button"
        disabled={disabled}
        onClick={onAddOption}
        type="button"
      >
        Add option
      </button>
    </fieldset>
  );
}
