/** Re-export shared quiz configuration so the app can import from a local module path. */
export {
  featuredGameSlug,
  games,
  gamesById,
  gamesBySlug,
  getGameById,
  getGameBySlug,
  type AnswerOption,
  type FeedbackMode,
  type GameConfig,
  type Question,
  type SelectionMode,
  type SubmittedAnswers,
} from "../../../../shared/game-config";
