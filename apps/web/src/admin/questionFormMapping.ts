import {
  validateAuthoringGameDraftContent,
  type AuthoringGameDraftContent,
  type Question,
  type SelectionMode,
} from "../../../../shared/game-config";

/**
 * Form-state mapping and save-time canonicalization for admin question editing.
 * Owns how question form values are converted into canonical draft content.
 * Does not own structure operations (add/delete/move); those live in
 * questionStructure.ts.
 */
export type AdminQuestionOptionFormValues = {
  id: string;
  isCorrect: boolean;
  label: string;
};

export type AdminQuestionFormValues = {
  correctAnswerIds: string[];
  explanation: string;
  options: AdminQuestionOptionFormValues[];
  prompt: string;
  selectionMode: SelectionMode;
  sponsor: string;
  /**
   * The source lines as one block of text, newline-separated — the field is a
   * textarea, and `Question.sources` is a list. `readSourceLines` and
   * `writeSourceLines` are the only two places that conversion happens.
   */
  sources: string;
  sponsorFact: string;
};

/** Splits the authoring textarea into source lines, dropping blank ones. */
function readSourceLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Renders stored source lines back into the authoring textarea. */
function writeSourceLines(sources: string[] | undefined) {
  return (sources ?? []).join("\n");
}

function createRequiredMessage(label: string) {
  return `${label} is required.`;
}

function trimRequired(value: string, label: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(createRequiredMessage(label));
  }

  return trimmedValue;
}

function trimOptional(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}

function findQuestionIndex(
  content: AuthoringGameDraftContent,
  questionId: string,
) {
  const questionIndex = content.questions.findIndex(
    (question) => question.id === questionId,
  );

  if (questionIndex < 0) {
    throw new Error("Question not found.");
  }

  return questionIndex;
}

function replaceQuestion(
  content: AuthoringGameDraftContent,
  questionId: string,
  createQuestion: (question: Question) => Question,
) {
  findQuestionIndex(content, questionId);

  return {
    ...content,
    questions: content.questions.map((question) =>
      question.id === questionId ? createQuestion(question) : question,
    ),
  };
}

function getCorrectAnswerIdsFromOptions(values: AdminQuestionFormValues) {
  return values.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id);
}

function assertCorrectAnswerIds(
  correctAnswerIds: string[],
  selectionMode: SelectionMode,
  optionIds: Set<string>,
) {
  if (correctAnswerIds.length === 0) {
    throw new Error("Choose at least one correct answer.");
  }

  if (selectionMode === "single" && correctAnswerIds.length !== 1) {
    throw new Error("Single-select questions need exactly one correct answer.");
  }

  for (const correctAnswerId of correctAnswerIds) {
    if (!optionIds.has(correctAnswerId)) {
      throw new Error(`Correct answer "${correctAnswerId}" is not an option.`);
    }
  }
}

/**
 * Canonicalizes one question.
 *
 * Spreads rather than enumerates. Enumerating meant every field of `Question`
 * had to be named here, so a field added to the type was silently dropped on
 * save with no compile error — which is how `sources` came to be erased from
 * an entire draft by editing any one of its questions. The spread carries
 * whatever the type grows next; only fields this function actually transforms
 * are named below.
 */
function createNormalizedQuestion(question: Question): Question {
  const optionIds = new Set(question.options.map((option) => option.id));
  const correctAnswerIds = [...question.correctAnswerIds];

  assertCorrectAnswerIds(correctAnswerIds, question.selectionMode, optionIds);

  const explanation = trimOptional(question.explanation ?? "");
  const sponsorFact = trimOptional(question.sponsorFact ?? "");
  // Blank lines are dropped and each line is trimmed, so a list that empties
  // out becomes absent rather than `[]` — matching how both hydration paths
  // normalize it, and how the two optional strings below behave.
  const sources = readSourceLines(writeSourceLines(question.sources));

  const canonical = {
    ...question,
    correctAnswerIds,
    options: question.options.map((option) => ({
      id: option.id,
      label: trimRequired(option.label, `Option ${option.id} label`),
    })),
    prompt: trimRequired(question.prompt, "Question prompt"),
    sponsor: trimOptional(question.sponsor ?? "") ?? null,
  };

  // These three are absent rather than empty when they normalize to nothing,
  // which a spread cannot express — it would carry the untrimmed original
  // through.
  delete canonical.explanation;
  delete canonical.sponsorFact;
  delete canonical.sources;

  return {
    ...canonical,
    ...(explanation ? { explanation } : {}),
    ...(sponsorFact ? { sponsorFact } : {}),
    ...(sources.length > 0 ? { sources } : {}),
  };
}

/**
 * Canonicalizes every question before persistence and validates the whole draft.
 * Throws when required fields or correct-answer invariants are invalid.
 */
export function prepareQuestionContentForSave(
  content: AuthoringGameDraftContent,
): AuthoringGameDraftContent {
  const nextContent: AuthoringGameDraftContent = {
    ...content,
    questions: content.questions.map((question) =>
      createNormalizedQuestion(question),
    ),
  };

  validateAuthoringGameDraftContent(nextContent);
  return nextContent;
}

/**
 * Applies UI form values to one question without running full draft validation.
 * This is used for local editing state before explicit save.
 */
export function updateQuestionFormValues(
  content: AuthoringGameDraftContent,
  questionId: string,
  values: AdminQuestionFormValues,
): AuthoringGameDraftContent {
  return replaceQuestion(content, questionId, (question) => {
    // Spread for the same reason as `createNormalizedQuestion`: the form owns
    // a fixed set of fields, and everything it does not own has to survive the
    // edit rather than depend on being listed here.
    const next = {
      ...question,
      correctAnswerIds: getCorrectAnswerIdsFromOptions(values),
      options: question.options.map((option) => {
        const optionValues = values.options.find(
          (entry) => entry.id === option.id,
        );

        if (!optionValues) {
          throw new Error(`Option "${option.id}" is missing.`);
        }

        return {
          id: option.id,
          label: optionValues.label,
        };
      }),
      prompt: values.prompt,
      selectionMode: values.selectionMode,
      sponsor: values.sponsor,
    };

    const sources = readSourceLines(values.sources);

    delete next.explanation;
    delete next.sponsorFact;
    delete next.sources;

    return {
      ...next,
      ...(values.explanation ? { explanation: values.explanation } : {}),
      ...(values.sponsorFact ? { sponsorFact: values.sponsorFact } : {}),
      ...(sources.length > 0 ? { sources } : {}),
    };
  });
}

/**
 * Builds UI-editable form values for one question in draft content.
 * Throws when the requested question id is not present.
 */
export function createQuestionFormValues(
  content: AuthoringGameDraftContent,
  questionId: string,
): AdminQuestionFormValues {
  const question = content.questions.find((entry) => entry.id === questionId);

  if (!question) {
    throw new Error("Question not found.");
  }

  const correctAnswerIdSet = new Set(question.correctAnswerIds);

  return {
    correctAnswerIds: [...question.correctAnswerIds],
    explanation: question.explanation ?? "",
    options: question.options.map((option) => ({
      id: option.id,
      isCorrect: correctAnswerIdSet.has(option.id),
      label: option.label,
    })),
    prompt: question.prompt,
    selectionMode: question.selectionMode,
    sponsor: question.sponsor ?? "",
    sources: writeSourceLines(question.sources),
    sponsorFact: question.sponsorFact ?? "",
  };
}

/**
 * Applies question form values and returns save-ready canonical content.
 * Throws when option/correct-answer constraints are invalid.
 */
export function applyQuestionFormValues(
  content: AuthoringGameDraftContent,
  questionId: string,
  values: AdminQuestionFormValues,
): AuthoringGameDraftContent {
  const optionIds = new Set(values.options.map((option) => option.id));

  for (const correctAnswerId of values.correctAnswerIds) {
    if (!optionIds.has(correctAnswerId)) {
      throw new Error(`Correct answer "${correctAnswerId}" is not an option.`);
    }
  }

  assertCorrectAnswerIds(
    getCorrectAnswerIdsFromOptions(values),
    values.selectionMode,
    optionIds,
  );

  return prepareQuestionContentForSave(
    updateQuestionFormValues(content, questionId, values),
  );
}
