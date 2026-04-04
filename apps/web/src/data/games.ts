export type AnswerOption = {
  id: string;
  label: string;
};

export type FeedbackMode =
  | "final_score_reveal"
  | "instant_feedback_required";

export type Question = {
  id: string;
  sponsor: string;
  prompt: string;
  options: AnswerOption[];
  correctAnswer: string;
  explanation?: string;
  sponsorFact?: string;
};

export type GameConfig = {
  id: string;
  slug: string;
  name: string;
  location: string;
  estimatedMinutes: number;
  raffleLabel: string;
  intro: string;
  summary: string;
  feedbackMode: FeedbackMode;
  questions: Question[];
};

export const featuredGameSlug = "first-sample";

const firstSampleGame: GameConfig = {
  id: "madrona-music-2026",
  slug: featuredGameSlug,
  name: "Madrona Music in the Playfield",
  location: "Seattle",
  estimatedMinutes: 2,
  raffleLabel: "raffle ticket",
  summary: "Move quickly through the quiz and see your score plus the correct answers at the end.",
  feedbackMode: "final_score_reveal",
  intro: "Answer 6 quick questions, support local sponsors, and earn a raffle ticket.",
  questions: [
    {
      id: "q1",
      sponsor: "Hi Spot Cafe",
      prompt: "Which local spot is sponsoring this neighborhood music series question?",
      correctAnswer: "a",
      sponsorFact: "Hi Spot Cafe has been a long-running Madrona neighborhood favorite for brunch and community meetups.",
      options: [
        { id: "a", label: "Hi Spot Cafe" },
        { id: "b", label: "Space Needle" },
        { id: "c", label: "Pike Place Fish Throwers" },
      ],
    },
    {
      id: "q2",
      sponsor: "Bottlehouse",
      prompt: "What kind of experience should this game feel like?",
      correctAnswer: "b",
      explanation: "The best version feels like a quick neighborhood game, not a long form.",
      options: [
        { id: "a", label: "A long signup form" },
        { id: "b", label: "A quick neighborhood game" },
        { id: "c", label: "A coupon checkout flow" },
      ],
    },
    {
      id: "q3",
      sponsor: "Cafe Flora",
      prompt: "How many questions should the MVP generally ask attendees?",
      correctAnswer: "b",
      explanation: "Five to seven questions keeps the experience short while still giving sponsors meaningful visibility.",
      options: [
        { id: "a", label: "1 or 2" },
        { id: "b", label: "5 to 7" },
        { id: "c", label: "15 to 20" },
      ],
    },
    {
      id: "q4",
      sponsor: "Creature Consignment",
      prompt: "What matters most for raffle eligibility in the MVP?",
      correctAnswer: "a",
      explanation: "Completion matters more than score in the MVP so the flow stays simple and easy to redeem.",
      options: [
        { id: "a", label: "Finishing the quiz" },
        { id: "b", label: "Sharing on social media" },
        { id: "c", label: "Creating an account" },
      ],
    },
    {
      id: "q5",
      sponsor: "Central Co-op",
      prompt: "How should questions appear in the experience?",
      correctAnswer: "b",
      explanation: "One visible card at a time keeps the flow readable, fast, and game-like on phones.",
      options: [
        { id: "a", label: "All visible on one long page" },
        { id: "b", label: "One card at a time" },
        { id: "c", label: "Inside pop-up windows" },
      ],
    },
    {
      id: "q6",
      sponsor: "Glasswing",
      prompt: "What should the final screen make obvious?",
      correctAnswer: "a",
      sponsorFact: "A strong final verification moment helps volunteers trust the completion without digging through answers.",
      options: [
        { id: "a", label: "That the attendee is officially done" },
        { id: "b", label: "That there are hidden bonus levels" },
        { id: "c", label: "That they must check their email first" },
      ],
    },
  ],
};

const sponsorSpotlightGame: GameConfig = {
  id: "madrona-sponsor-spotlight-2026",
  slug: "sponsor-spotlight",
  name: "Sponsor Spotlight Challenge",
  location: "Seattle",
  estimatedMinutes: 3,
  raffleLabel: "bonus raffle ticket",
  summary: "You must answer correctly to move on, and each right answer reveals a sponsor fact before the next question.",
  feedbackMode: "instant_feedback_required",
  intro: "Get each answer right to unlock quick sponsor facts and finish the challenge.",
  questions: [
    {
      id: "q1",
      sponsor: "Bottlehouse",
      prompt: "Which answer best describes why sponsors appear inside the quiz experience?",
      correctAnswer: "c",
      sponsorFact: "Bottlehouse benefits more from active participation in a community moment than from a passive logo placement.",
      options: [
        { id: "a", label: "To interrupt players with ads" },
        { id: "b", label: "To replace the raffle entirely" },
        { id: "c", label: "To feel integrated into the neighborhood event" },
      ],
    },
    {
      id: "q2",
      sponsor: "Central Co-op",
      prompt: "What keeps the quiz feeling playable outdoors on a phone?",
      correctAnswer: "b",
      sponsorFact: "Central Co-op's sponsor moment works better when the interface stays legible, large, and thumb-friendly.",
      options: [
        { id: "a", label: "Long paragraphs and tiny controls" },
        { id: "b", label: "Large tap targets and one clear choice at a time" },
        { id: "c", label: "Multiple popups per question" },
      ],
    },
    {
      id: "q3",
      sponsor: "Cafe Flora",
      prompt: "What should happen after a correct answer in this quiz mode?",
      correctAnswer: "a",
      sponsorFact: "A short sponsor fact keeps the moment informative without derailing the pace of the quiz.",
      options: [
        { id: "a", label: "Show a quick confirmation and sponsor fact before continuing" },
        { id: "b", label: "Jump straight to the homepage" },
        { id: "c", label: "Require an email address before moving on" },
      ],
    },
    {
      id: "q4",
      sponsor: "Glasswing",
      prompt: "What should a wrong answer do in this mode?",
      correctAnswer: "b",
      explanation: "The player should try again because this mode is designed around getting the answer right before progressing.",
      options: [
        { id: "a", label: "Move on anyway without feedback" },
        { id: "b", label: "Prompt the player to try again" },
        { id: "c", label: "End the quiz immediately" },
      ],
    },
  ],
};

export const games: GameConfig[] = [firstSampleGame, sponsorSpotlightGame];

export const gamesBySlug: Record<string, GameConfig> = Object.fromEntries(
  games.map((game) => [game.slug, game]),
);

export function getGameBySlug(slug: string) {
  return gamesBySlug[slug];
}
