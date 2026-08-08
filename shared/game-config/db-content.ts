import { validateGameConfig } from "./game-validation.ts";
import type {
  FeedbackMode,
  GameConfig,
  SelectionMode,
} from "./types.ts";

/** Published event row fetched from the game content tables. */
export type PublishedGameEventRow = {
  allow_back_navigation: boolean;
  allow_retake: boolean;
  estimated_minutes: number;
  feedback_mode: FeedbackMode;
  id: string;
  intro: string;
  location: string;
  name: string;
  entitlement_label: string;
  slug: string;
  summary: string;
};

/**
 * The question columns every read path that hydrates a playable game config
 * selects.
 *
 * One owner on purpose. Both read paths — the browser's and the completion
 * Edge Function's loader — cast their result rather than inferring it, so a
 * column added to one list and forgotten in the other produces no compile
 * error and fails at runtime instead. Neither path may hold a column-name
 * literal of its own; the absence of literals is what makes them agree, and
 * it is greppable.
 */
export const PUBLISHED_GAME_QUESTION_COLUMNS = [
  "event_id",
  "id",
  "display_order",
  "sponsor",
  "prompt",
  "selection_mode",
  "explanation",
  "sponsor_fact",
  // Added a release after the migration that created the column, not in the
  // same one. The release flow in docs/dev.md publishes the frontend from
  // Vercel's git integration (step 4) before release.yml applies production
  // migrations (step 5), so a release that both adds a column and selects it
  // serves a frontend naming a column the schema does not have yet — and
  // PostgREST rejects the whole question query rather than the one column, so
  // every game route fails to load until the migration lands. Splitting the
  // two releases is what makes the read safe; the schema was already live
  // before this line existed.
  "sources",
] as const;

/** Published question row fetched from the game content tables. */
export type PublishedGameQuestionRow = {
  display_order: number;
  event_id: string;
  explanation: string | null;
  id: string;
  prompt: string;
  selection_mode: SelectionMode;
  sponsor: string | null;
  sponsor_fact: string | null;
  /**
   * The column is `not null` with a `'[]'` default, so a selected row always
   * carries an array. Kept optional and nullable anyway because both read
   * paths *cast* this type onto a decoded response rather than validating it:
   * the type describes what the schema promises, not what the wire actually
   * delivered, and the mapper below treats absent, null, and empty alike.
   */
  sources?: string[] | null;
};

/** Published option row fetched from the game content tables. */
export type PublishedGameOptionRow = {
  display_order: number;
  event_id: string;
  id: string;
  is_correct: boolean;
  label: string;
  question_id: string;
};

/** Canonical DB row bundle used to hydrate a playable game config. */
export type PublishedGameRows = {
  event: PublishedGameEventRow;
  options: PublishedGameOptionRow[];
  questions: PublishedGameQuestionRow[];
};

function assertRowsBelongToEvent(
  eventId: string,
  label: string,
  rows: Array<{ event_id: string; id: string }>,
) {
  const mismatchedRow = rows.find((row) => row.event_id !== eventId);

  if (mismatchedRow) {
    throw new Error(
      `${label} "${mismatchedRow.id}" does not belong to game "${eventId}".`,
    );
  }
}

/** Maps normalized published-content rows into the shared GameConfig shape. */
export function mapPublishedGameRowsToGameConfig(
  rows: PublishedGameRows,
): GameConfig {
  const { event, options, questions } = rows;

  assertRowsBelongToEvent(event.id, "Question", questions);
  assertRowsBelongToEvent(event.id, "Option", options);

  const questionIds = new Set(questions.map((question) => question.id));
  const unknownOption = options.find((option) => !questionIds.has(option.question_id));

  if (unknownOption) {
    throw new Error(
      `Game "${event.id}" includes options for unknown question "${unknownOption.question_id}".`,
    );
  }

  const sortedOptions = [...options].sort((left, right) => {
    if (left.question_id !== right.question_id) {
      return left.question_id.localeCompare(right.question_id);
    }

    return left.display_order - right.display_order;
  });

  const optionsByQuestionId = new Map<string, PublishedGameOptionRow[]>();

  for (const option of sortedOptions) {
    const questionOptions = optionsByQuestionId.get(option.question_id) ?? [];
    questionOptions.push(option);
    optionsByQuestionId.set(option.question_id, questionOptions);
  }

  const game: GameConfig = {
    allowBackNavigation: event.allow_back_navigation,
    allowRetake: event.allow_retake,
    estimatedMinutes: event.estimated_minutes,
    feedbackMode: event.feedback_mode,
    id: event.id,
    intro: event.intro,
    location: event.location,
    name: event.name,
    entitlementLabel: event.entitlement_label,
    slug: event.slug,
    summary: event.summary,
    questions: [...questions]
      .sort((left, right) => left.display_order - right.display_order)
      .map((question) => {
        const questionOptions = optionsByQuestionId.get(question.id) ?? [];

        if (questionOptions.length === 0) {
          throw new Error(
            `Question "${question.id}" in game "${event.id}" must include at least one option.`,
          );
        }

        return {
          id: question.id,
          sponsor: question.sponsor,
          prompt: question.prompt,
          selectionMode: question.selection_mode,
          correctAnswerIds: questionOptions
            .filter((option) => option.is_correct)
            .map((option) => option.id),
          explanation: question.explanation ?? undefined,
          sponsorFact: question.sponsor_fact ?? undefined,
          ...(question.sources && question.sources.length > 0
            ? { sources: question.sources }
            : {}),
          options: questionOptions
            .sort((left, right) => left.display_order - right.display_order)
            .map((option) => ({
              id: option.id,
              label: option.label,
            })),
        };
      }),
  };

  validateGameConfig(game);
  return game;
}
