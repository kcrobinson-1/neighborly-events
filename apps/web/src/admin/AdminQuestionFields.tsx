import type { FormEvent } from "react";
import { AdminOptionEditor } from "./AdminOptionEditor";
import type { AdminQuestionFormValues } from "./questionFormMapping";

type AdminQuestionFieldsProps = {
  disabled: boolean;
  focusedQuestionId: string;
  focusedQuestionIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  message: string | null;
  messageKind: "error" | "info" | "success";
  onAddOption: () => void;
  onConfirmDeleteQuestion: () => void;
  onDeleteOption: (optionId: string) => void;
  onDuplicateQuestion: () => void;
  onMoveQuestion: (direction: "down" | "up") => void;
  onRequestDeleteQuestion: () => void;
  onResetDeleteConfirmation: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateCorrectAnswer: (optionId: string, checked: boolean) => void;
  onUpdateOptionLabel: (optionId: string, label: string) => void;
  onUpdateSelectionMode: (value: AdminQuestionFormValues["selectionMode"]) => void;
  onUpdateTextValue: (
    field: keyof Pick<
      AdminQuestionFormValues,
      "explanation" | "prompt" | "sources" | "sponsor" | "sponsorFact"
    >,
    value: string,
  ) => void;
  pendingDeleteQuestionId: string | null;
  questionCount: number;
  values: AdminQuestionFormValues;
};

export function AdminQuestionFields({
  disabled,
  focusedQuestionId,
  focusedQuestionIndex,
  isDirty,
  isSaving,
  message,
  messageKind,
  onAddOption,
  onConfirmDeleteQuestion,
  onDeleteOption,
  onDuplicateQuestion,
  onMoveQuestion,
  onRequestDeleteQuestion,
  onResetDeleteConfirmation,
  onSubmit,
  onUpdateCorrectAnswer,
  onUpdateOptionLabel,
  onUpdateSelectionMode,
  onUpdateTextValue,
  pendingDeleteQuestionId,
  questionCount,
  values,
}: AdminQuestionFieldsProps) {
  return (
    // tabIndex -1 makes the form a programmatic focus target: activating
    // a question in the rail focuses it so keyboard users Tab into the
    // fields instead of the next rail button.
    <form
      aria-label="Question fields"
      className="admin-form admin-question-form"
      onSubmit={onSubmit}
      tabIndex={-1}
    >
      <div className="admin-action-row">
        <button
          className="secondary-button"
          disabled={disabled || focusedQuestionIndex <= 0}
          onClick={() => onMoveQuestion("up")}
          type="button"
        >
          Move up
        </button>
        <button
          className="secondary-button"
          disabled={
            disabled ||
            focusedQuestionIndex < 0 ||
            focusedQuestionIndex >= questionCount - 1
          }
          onClick={() => onMoveQuestion("down")}
          type="button"
        >
          Move down
        </button>
        <button
          className="secondary-button"
          disabled={disabled}
          onClick={onDuplicateQuestion}
          type="button"
        >
          Duplicate question
        </button>
        <button
          className="secondary-button"
          disabled={disabled || questionCount <= 1}
          onClick={onRequestDeleteQuestion}
          type="button"
        >
          Delete question
        </button>
      </div>
      {questionCount <= 1 ? (
        <p className="draft-row-meta">Keep at least one question.</p>
      ) : null}
      {pendingDeleteQuestionId === focusedQuestionId ? (
        <div className="admin-delete-confirmation">
          <p>Delete this question from the draft?</p>
          <div className="admin-action-row">
            <button
              className="secondary-button"
              disabled={disabled}
              onClick={onConfirmDeleteQuestion}
              type="button"
            >
              Confirm delete
            </button>
            <button
              className="secondary-button"
              disabled={disabled}
              onClick={onResetDeleteConfirmation}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <label className="admin-field">
        <span className="admin-field-label">Question prompt</span>
        <textarea
          className="admin-input admin-textarea"
          disabled={disabled}
          onChange={(event) => onUpdateTextValue("prompt", event.target.value)}
          value={values.prompt}
        />
      </label>
      <div className="admin-details-grid">
        <label className="admin-field">
          <span className="admin-field-label">Question sponsor</span>
          <input
            className="admin-input"
            disabled={disabled}
            onChange={(event) => onUpdateTextValue("sponsor", event.target.value)}
            type="text"
            value={values.sponsor}
          />
        </label>
        <label className="admin-field">
          <span className="admin-field-label">Selection mode</span>
          <select
            className="admin-input"
            disabled={disabled}
            onChange={(event) =>
              onUpdateSelectionMode(
                event.target.value as AdminQuestionFormValues["selectionMode"],
              )
            }
            value={values.selectionMode}
          >
            <option value="single">Single correct answer</option>
            <option value="multiple">Multiple correct answers</option>
          </select>
        </label>
      </div>
      <label className="admin-field">
        <span className="admin-field-label">Explanation</span>
        <textarea
          className="admin-input admin-textarea"
          disabled={disabled}
          onChange={(event) =>
            onUpdateTextValue("explanation", event.target.value)
          }
          value={values.explanation}
        />
      </label>
      {/* Sits under the explanation because that is where it renders: one
          source per line, shown to the player beneath the explanation. The
          `div` + `htmlFor` shape (rather than a wrapping label) keeps the
          grammar hint out of the field's accessible name and attaches it as a
          description instead. */}
      <div className="admin-field">
        <label htmlFor="admin-question-sources">
          <span className="admin-field-label">Sources</span>
        </label>
        <textarea
          aria-describedby="admin-question-sources-hint"
          className="admin-input admin-textarea"
          disabled={disabled}
          id="admin-question-sources"
          onChange={(event) => onUpdateTextValue("sources", event.target.value)}
          value={values.sources}
        />
        <span className="admin-field-hint" id="admin-question-sources-hint">
          One source per line. Link with [Title](https://example.org) and
          emphasize with *italics*. A bare web address outside a link is
          rejected on save.
        </span>
      </div>
      <label className="admin-field">
        <span className="admin-field-label">Sponsor fact</span>
        <textarea
          className="admin-input admin-textarea"
          disabled={disabled}
          onChange={(event) =>
            onUpdateTextValue("sponsorFact", event.target.value)
          }
          value={values.sponsorFact}
        />
      </label>
      <AdminOptionEditor
        disabled={disabled}
        focusedQuestionId={focusedQuestionId}
        onAddOption={onAddOption}
        onDeleteOption={onDeleteOption}
        onUpdateCorrectAnswer={onUpdateCorrectAnswer}
        onUpdateOptionLabel={onUpdateOptionLabel}
        options={values.options}
        selectionMode={values.selectionMode}
      />
      <div className="admin-action-row">
        <button className="primary-button" disabled={disabled || !isDirty} type="submit">
          {isSaving ? "Saving question changes..." : "Save question changes"}
        </button>
        {isDirty ? (
          <span className="admin-dirty-state">Unsaved question changes.</span>
        ) : null}
      </div>
      {message ? <p className={`admin-message admin-message-${messageKind}`}>{message}</p> : null}
    </form>
  );
}
