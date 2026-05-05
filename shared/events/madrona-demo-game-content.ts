import type { AuthoringGameDraftContent } from "../game-config";
import type { GameSeedConfig } from "./seed-config.ts";

/**
 * Placeholder Madrona game content authored by the
 * [Madrona demo-build epic](../../docs/plans/epics/madrona-demo-build/epic.md)
 * M2 phase 2.1. The content is **not** real — every prompt,
 * option, explanation, and sponsor-fact is intentionally neutral
 * music-and-neighborhood-themed copy that lets a stakeholder
 * walk the gameplay surface end-to-end without naming any real
 * Madrona band, sponsor, or specific historical fact. M3 of the
 * demo-build epic replaces this content with real Madrona
 * authoring; the content-neutrality rule (M2 milestone-doc
 * invariant 5 — placeholder content does not foreclose M3's
 * authoring) is the load-bearing check that the swap stays a
 * content edit rather than a structural edit.
 *
 * The placeholder sponsor names ("Madrona Neighborhood
 * Association", "Lake Washington Boulevard Bakery", "Arboretum
 * Coffee Roasters") match the placeholder sponsor list in
 * [`apps/site/events/madrona.ts`](../../apps/site/events/madrona.ts)
 * so that the gameplay sponsor-fact strings reference the same
 * placeholder roster the apps/site landing surfaces.
 *
 * The seed flow is: a service-role script
 * (`scripts/release/seed-game-content.cjs`) imports this module
 * with `--content shared/events/madrona-demo-game-content.ts`,
 * reads the `seedConfig` export, UPSERTs a `game_event_drafts`
 * row keyed on `seedConfig.content.id = "madrona"`, then invokes
 * `publish_game_event_draft('madrona', $user_id)` to project the
 * content into `game_events` / `game_questions` /
 * `game_question_options`. The seed script is the primary
 * consumer; the module is exported from `shared/events/index.ts`
 * so a future "Create New Event" admin-UI affordance could
 * adopt the same content as a starter template if needed.
 */
const madronaDemoGameContent: AuthoringGameDraftContent = {
  id: "madrona",
  slug: "madrona",
  name: "Madrona Music in the Playfield",
  location: "Madrona Playfield, Seattle",
  estimatedMinutes: 2,
  entitlementLabel: "reward ticket",
  intro:
    "Welcome to Madrona Music in the Playfield. Answer six quick questions about outdoor concerts and neighborhood gatherings to earn a reward ticket — redeemable at the booth.",
  summary:
    "Thank you for playing. Show your reward ticket at the redemption booth, and enjoy the rest of the evening.",
  feedbackMode: "final_score_reveal",
  allowBackNavigation: true,
  allowRetake: true,
  questions: [
    {
      id: "q1",
      sponsor: "Madrona Neighborhood Association",
      prompt:
        "Which decade is most associated with the rise of indie-folk on the Pacific Northwest scene?",
      selectionMode: "single",
      correctAnswerIds: ["q1-1990s"],
      options: [
        { id: "q1-1960s", label: "1960s" },
        { id: "q1-1970s", label: "1970s" },
        { id: "q1-1990s", label: "1990s" },
        { id: "q1-2010s", label: "2010s" },
      ],
      explanation:
        "Pacific Northwest indie-folk found its mainstream voice in the 1990s, though every other decade above has shaped the region's sound in its own way.",
      sponsorFact:
        "The Madrona Neighborhood Association supports community-led concerts year-round, not just summer evenings.",
    },
    {
      id: "q2",
      sponsor: "Lake Washington Boulevard Bakery",
      prompt:
        "An outdoor summer concert series in a public park usually pairs music with which classic neighborhood activity?",
      selectionMode: "single",
      correctAnswerIds: ["q2-picnics"],
      options: [
        { id: "q2-picnics", label: "Picnics on the lawn" },
        { id: "q2-snow", label: "Snow shoveling" },
        { id: "q2-cinema", label: "Indoor cinema" },
        { id: "q2-grocery", label: "Grocery shopping" },
      ],
      explanation:
        "Picnics and outdoor music are a long-running pairing in neighborhood parks across the region.",
      sponsorFact:
        "Lake Washington Boulevard Bakery has been a neighborhood placeholder long enough to remember when the picnic blanket was the only seating.",
    },
    {
      id: "q3",
      sponsor: "Arboretum Coffee Roasters",
      prompt:
        "Which instrument would you most expect to lead an acoustic folk trio at a community concert?",
      selectionMode: "single",
      correctAnswerIds: ["q3-guitar"],
      options: [
        { id: "q3-guitar", label: "Acoustic guitar" },
        { id: "q3-subwoofer", label: "Subwoofer" },
        { id: "q3-trombone", label: "Trombone" },
        { id: "q3-triangle", label: "Triangle" },
      ],
      explanation:
        "An acoustic guitar carries the melody for most folk trios; the others either drown it out or struggle to be heard.",
      sponsorFact:
        "Arboretum Coffee Roasters keeps the volunteer crew caffeinated through the soundcheck — and through the second-set encore.",
    },
    {
      id: "q4",
      sponsor: "Madrona Neighborhood Association",
      prompt:
        "Community-led concerts in neighborhood parks are typically supported by which type of sponsor?",
      selectionMode: "single",
      correctAnswerIds: ["q4-local"],
      options: [
        { id: "q4-local", label: "Local businesses and neighborhood associations" },
        { id: "q4-multinational", label: "Multinational tech firms only" },
        { id: "q4-anonymous", label: "Anonymous benefactors only" },
        { id: "q4-federal", label: "Federal grant programs only" },
      ],
      explanation:
        "Local businesses and neighborhood associations carry most of the weight; the other options are rarer at this scale.",
      sponsorFact:
        "The Madrona Neighborhood Association is the placeholder hosting sponsor for this demo run; the real M3 lineup will name the actual sponsors who signed on.",
    },
    {
      id: "q5",
      sponsor: "Lake Washington Boulevard Bakery",
      prompt:
        "If you arrive at an outdoor concert as the show is about to start, which is the most considerate seating choice?",
      selectionMode: "single",
      correctAnswerIds: ["q5-behind"],
      options: [
        { id: "q5-behind", label: "Behind those already seated" },
        { id: "q5-front", label: "Directly in front of the stage" },
        { id: "q5-path", label: "On the access path" },
        { id: "q5-blanket", label: "On someone else's blanket" },
      ],
      explanation:
        "Settling in behind earlier arrivals keeps sightlines and pathways open for everyone.",
      sponsorFact:
        "Lake Washington Boulevard Bakery's volunteers usually save a quiet patch near the back for late-arriving families.",
    },
    {
      id: "q6",
      sponsor: "Arboretum Coffee Roasters",
      prompt:
        "After the final song of the night at a community concert, what's a common closing tradition?",
      selectionMode: "single",
      correctAnswerIds: ["q6-applause"],
      options: [
        { id: "q6-applause", label: "Applause and thanking the band" },
        { id: "q6-storming", label: "Storming the stage" },
        { id: "q6-refunds", label: "Demanding refunds" },
        { id: "q6-noise", label: "Filing a noise complaint" },
      ],
      explanation:
        "A round of applause and a thank-you wraps the evening; the other options would surprise a lot of people.",
      sponsorFact:
        "Arboretum Coffee Roasters typically has the last cup poured by the time the headliner takes their bow.",
    },
  ],
};

/**
 * Generic seed-script input for the Madrona placeholder content.
 * The `eventCode` is a peer field on `game_event_drafts` /
 * `game_events` (not inside the `content` JSON), so it lives on
 * the wrapper. The seed script at
 * `scripts/release/seed-game-content.cjs` imports this module via
 * `--content shared/events/madrona-demo-game-content.ts` and
 * reads `seedConfig`.
 */
export const seedConfig: GameSeedConfig = {
  eventCode: "MAD",
  content: madronaDemoGameContent,
};
