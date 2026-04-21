import { type FormEvent, useMemo, useState } from "react";
import type { DraftEventDetail, DraftEventSummary } from "../lib/adminGameApi";
import { AdminQuestionFields } from "./AdminQuestionFields";
import { AdminQuestionList } from "./AdminQuestionList";
import {
  createQuestionFormValues,
  updateQuestionFormValues,
  type AdminQuestionFormValues,
} from "./questionFormMapping";
import {
  addOption,
  addQuestion,
  deleteOption,
  deleteQuestion,
  duplicateQuestion,
  moveQuestion,
  updateQuestionSelectionMode,
} from "./questionStructure";

/**
 * Question-editor workspace for one selected draft event.
 * Owns local question-content buffering, structural edits, and save handoff.
 * Does not own canonical content validation or persistence contracts; those are
 * delegated to question mapping/structure helpers and admin authoring APIs.
 */
type AdminQuestionEditorProps = {
  disabled: boolean;
  draft: DraftEventDetail;
  focusedQuestionId: string;
  isSaving: boolean;
  message: string | null;
  messageKind: "error" | "info" | "success";
  onFocusQuestion: (questionId: string) => void;
  onSave: (
    content: DraftEventDetail["content"],
    questionId: string,
  ) => Promise<DraftEventSummary | null>;
};

function serializeContent(content: DraftEventDetail["content"]) {
  return JSON.stringify(content);
}

export function AdminQuestionEditor({
  disabled,
  draft,
  focusedQuestionId,
  isSaving,
  message,
  messageKind,
  onFocusQuestion,
  onSave,
}: AdminQuestionEditorProps) {
  const [editableContent, setEditableContent] = useState(draft.content);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [pendingDeleteQuestionId, setPendingDeleteQuestionId] = useState<
    string | null
  >(null);
  const focusedQuestion = editableContent.questions.find(
    (question) => question.id === focusedQuestionId,
  );
  const focusedQuestionIndex = editableContent.questions.findIndex(
    (question) => question.id === focusedQuestionId,
  );
  const baselineSerializedContent = useMemo(
    () => serializeContent(draft.content),
    [draft.content],
  );
  const isDirty =
    serializeContent(editableContent) !== baselineSerializedContent;
  const values = useMemo(
    () => createQuestionFormValues(editableContent, focusedQuestionId),
    [editableContent, focusedQuestionId],
  );
  const saveMessage = localMessage ?? message;
  const saveMessageKind = localMessage ? "error" : messageKind;

  const applyContentChange = (
    updater: (
      content: DraftEventDetail["content"],
    ) => DraftEventDetail["content"],
  ) => {
    setEditableContent((currentContent) => updater(currentContent));
    setLocalMessage(null);
  };

  const updateValues = (nextValues: AdminQuestionFormValues) => {
    applyContentChange((currentContent) =>
      updateQuestionFormValues(currentContent, focusedQuestionId, nextValues));
  };

  const updateTextValue = (
    field: keyof Pick<
      AdminQuestionFormValues,
      "explanation" | "prompt" | "sponsor" | "sponsorFact"
    >,
    value: string,
  ) => {
    updateValues({
      ...values,
      [field]: value,
    });
  };

  const updateSelectionMode = (
    selectionMode: AdminQuestionFormValues["selectionMode"],
  ) => {
    applyContentChange((currentContent) =>
      updateQuestionSelectionMode(
        updateQuestionFormValues(currentContent, focusedQuestionId, values),
        focusedQuestionId,
        selectionMode,
      ));
  };

  const updateOptionLabel = (optionId: string, label: string) => {
    updateValues({
      ...values,
      options: values.options.map((option) =>
        option.id === optionId ? { ...option, label } : option,
      ),
    });
  };

  const updateCorrectAnswer = (optionId: string, checked: boolean) => {
    updateValues({
      ...values,
      options: values.options.map((option) => {
        if (values.selectionMode === "single") {
          return {
            ...option,
            isCorrect: option.id === optionId,
          };
        }

        return option.id === optionId
          ? { ...option, isCorrect: checked }
          : option;
      }),
    });
  };

  const applyStructureResult = (
    result: {
      content: DraftEventDetail["content"];
      focusedQuestionId: string;
    },
  ) => {
    setEditableContent(result.content);
    onFocusQuestion(result.focusedQuestionId);
    setLocalMessage(null);
    setPendingDeleteQuestionId(null);
  };

  const handleAddQuestion = () => {
    applyStructureResult(addQuestion(editableContent));
  };

  const handleDuplicateQuestion = () => {
    applyStructureResult(duplicateQuestion(editableContent, focusedQuestionId));
  };

  const handleMoveQuestion = (direction: "down" | "up") => {
    applyStructureResult(
      moveQuestion(editableContent, focusedQuestionId, direction),
    );
  };

  const handleDeleteQuestion = () => {
    try {
      applyStructureResult(deleteQuestion(editableContent, focusedQuestionId));
    } catch (error: unknown) {
      setLocalMessage(
        error instanceof Error ? error.message : "We couldn't delete the question.",
      );
    }
  };

  const handleAddOption = () => {
    applyContentChange((currentContent) =>
      addOption(currentContent, focusedQuestionId));
  };

  const handleDeleteOption = (optionId: string) => {
    try {
      applyContentChange((currentContent) =>
        deleteOption(currentContent, focusedQuestionId, optionId));
    } catch (error: unknown) {
      setLocalMessage(
        error instanceof Error ? error.message : "We couldn't delete the option.",
      );
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSave(
      updateQuestionFormValues(editableContent, focusedQuestionId, values),
      focusedQuestionId,
    );
  };

  if (!focusedQuestion) {
    return (
      <section className="admin-question-editor" aria-label="Question editor">
        <p className="admin-message admin-message-error">
          This question is no longer available.
        </p>
      </section>
    );
  }

  return (
    <section className="admin-question-builder" aria-label="Question builder">
      <div className="admin-workspace-heading">
        <div>
          <p className="eyebrow">Questions</p>
          <h3>Edit existing questions</h3>
        </div>
        <span className="chip">{editableContent.questions.length} questions</span>
      </div>
      <div className="admin-toolbar">
        <button
          className="primary-button"
          disabled={disabled}
          onClick={handleAddQuestion}
          type="button"
        >
          Add question
        </button>
      </div>
      <div className="admin-question-layout">
        <AdminQuestionList
          disabled={disabled}
          focusedQuestionId={focusedQuestionId}
          onFocusQuestion={onFocusQuestion}
          onResetDeleteConfirmation={() => setPendingDeleteQuestionId(null)}
          questions={editableContent.questions}
        />
        <AdminQuestionFields
          disabled={disabled}
          focusedQuestionId={focusedQuestionId}
          focusedQuestionIndex={focusedQuestionIndex}
          isDirty={isDirty}
          isSaving={isSaving}
          message={saveMessage}
          messageKind={saveMessageKind}
          onAddOption={handleAddOption}
          onConfirmDeleteQuestion={handleDeleteQuestion}
          onDeleteOption={handleDeleteOption}
          onDuplicateQuestion={handleDuplicateQuestion}
          onMoveQuestion={handleMoveQuestion}
          onRequestDeleteQuestion={() => setPendingDeleteQuestionId(focusedQuestionId)}
          onResetDeleteConfirmation={() => setPendingDeleteQuestionId(null)}
          onSubmit={handleSubmit}
          onUpdateCorrectAnswer={updateCorrectAnswer}
          onUpdateOptionLabel={updateOptionLabel}
          onUpdateSelectionMode={updateSelectionMode}
          onUpdateTextValue={updateTextValue}
          pendingDeleteQuestionId={pendingDeleteQuestionId}
          questionCount={editableContent.questions.length}
          values={values}
        />
      </div>
    </section>
  );
}
