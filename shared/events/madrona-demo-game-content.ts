import type { AuthoringGameDraftContent } from "../game-config";
import { madronaFacts } from "./madrona-facts.ts";
import type { GameSeedConfig } from "./seed-config.ts";

/**
 * Madrona Music in the Playfield — game content first authored as
 * demo content by the
 * [Madrona demo-build epic](../../docs/plans/epics/madrona-demo-build/epic.md)
 * M2 phase 2.1 and since iterated: the questions are real
 * neighborhood facts (no band or business-sponsor references — the
 * only named sponsor is the hosting association), and the reward
 * copy stays generic per the spec reward-language rule: attendees
 * show their code at the booth to claim a reward, and what the
 * reward actually is stays offline. The reward noun and booth facts
 * are composed from `madrona-facts.ts`, the shared constants module
 * the apps/site landing's `cta.sublabel` also composes from.
 *
 * Canonical-ownership note: the live event renders the published
 * `game_events` rows, which are authored and edited through /admin —
 * not this module. This seed is the bootstrap for fresh or reseeded
 * environments (and a starter template for a future "Create New
 * Event" affordance), so it can go stale relative to /admin edits;
 * a reseed overwrites from this file, it does not restore what
 * /admin last published.
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
const madronaGameContent: AuthoringGameDraftContent = {
  id: "madrona",
  slug: "madrona",
  name: "Madrona Music in the Playfield",
  location: "Madrona Playfield, Seattle",
  estimatedMinutes: 3,
  entitlementLabel: madronaFacts.rewardNoun,
  intro:
    `Welcome to Madrona Music in the Playfield. How well do you think you know Madrona? Take our quiz to find out. Score high enough, then show your code at the ${madronaFacts.booth.name} ${madronaFacts.booth.locationSuffix} to claim a ${madronaFacts.rewardNoun}.`,
  summary:
    `Thanks for playing. Show your code at the ${madronaFacts.booth.name} to claim your ${madronaFacts.rewardNoun}, then settle in — the next set is about to start.`,
  feedbackMode: "final_score_reveal",
  allowBackNavigation: true,
  allowRetake: true,
  questions: [
    {
      id: "q1",
      sponsor: "Madrona Neighborhood Association",
      prompt: "What is the Madrona neighborhood named after?",
      selectionMode: "single",
      correctAnswerIds: ["q1-madrone-tree"],
      options: [
        { id: "q1-madrone-tree", label: "The Pacific madrone tree" },
        { id: "q1-streetcar", label: "The streetcar line that once served the bluff" },
        { id: "q1-developer", label: "An early Madrona Park developer" },
        { id: "q1-bluff", label: "The bluff above Lake Washington" },
      ],
      explanation:
        "The neighborhood is named for the Pacific madrone (Arbutus menziesii) — an evergreen with peeling reddish bark that's native to the bluffs along Lake Washington. The Spanish-derived name was already attached to the tree long before the neighborhood took it on.",
      sponsorFact:
        "The Madrona Neighborhood Association takes its name from the same trees the neighborhood does.",
    },
    {
      id: "q2",
      sponsor: null,
      prompt:
        "In 1969, the Seattle chapter of the Black Panther Party launched its Free Breakfast Program for schoolchildren at which Madrona location?",
      selectionMode: "single",
      correctAnswerIds: ["q2-madrona-grace-presbyterian"],
      options: [
        { id: "q2-madrona-grace-presbyterian", label: "Madrona Grace Presbyterian Church" },
        { id: "q2-madrona-elementary", label: "Madrona Elementary School" },
        { id: "q2-madrona-library", label: "The Madrona Branch Library" },
        { id: "q2-madrona-community-center", label: "Madrona Community Center" },
      ],
      explanation:
        "The program launched at Madrona Grace Presbyterian Church on 32nd Avenue, coordinated by Elmer Dixon III. It expanded to five locations and served an estimated 300,000 meals between 1969 and 1977.",
    },
    {
      id: "q3",
      sponsor: null,
      prompt: "What is the statue outside the Madrona library called?",
      selectionMode: "single",
      correctAnswerIds: ["q3-peaceable-kingdom"],
      options: [
        { id: "q3-peaceable-kingdom", label: "The Peaceable Kingdom" },
        { id: "q3-lion-and-the-lamb", label: "The Lion and the Lamb" },
        { id: "q3-common-ground", label: "Common Ground" },
        { id: "q3-madrona-menagerie", label: "The Madrona Menagerie" },
      ],
      explanation:
        "Sculptor Richard Beyer's aluminum 'Peaceable Kingdom' was installed on the library lawn in 1984. The four animals stand in for groups living in the neighborhood at the time — the panther for the Black Panthers (headquartered in Madrona), the pig for the police, the sheep for the elderly, and the wolf for the street toughs — coexisting peaceably.",
    },
    {
      id: "q4",
      sponsor: null,
      prompt: "What is the current use of the Madrona Bathhouse on the waterfront in Madrona Park?",
      selectionMode: "single",
      correctAnswerIds: ["q4-dance-studio"],
      options: [
        { id: "q4-dance-studio", label: "A dance studio" },
        { id: "q4-community-theater", label: "A community theater" },
        { id: "q4-clay-studio", label: "A clay studio" },
        { id: "q4-boathouse", label: "A boathouse for kayak and paddleboard rentals" },
      ],
      explanation:
        "The 1927-28 brick bathhouse was converted to a dance studio in 1971. Spectrum Dance Theater — a contemporary dance company founded in 1982 — has been based there ever since, with choreographer Donald Byrd as artistic director since 2002.",
    },
    {
      id: "q5",
      sponsor: null,
      prompt: "Before being renamed to MLK Jr Way, what was the name of the street that borders the western edge of Madrona?",
      selectionMode: "single",
      correctAnswerIds: ["q5-empire-way"],
      options: [
        { id: "q5-empire-way", label: "Empire Way" },
        { id: "q5-hill-way", label: "Hill Way" },
        { id: "q5-cascade-way", label: "Cascade Way" },
        { id: "q5-pacific-way", label: "Pacific Way" },
      ],
      explanation:
        "Empire Way was named after railroad magnate James J. Hill — 'the empire builder' — until a 1983 Washington Supreme Court ruling cleared a renaming campaign activist Eddie Rye Jr. had launched two years earlier on Black radio station KYAC. Seattle's renaming joined a small early-1980s wave of West Coast cities — Berkeley, Oakland, and South LA all made the change the same year — but Seattle's was unusually contested, requiring two years and a court battle to overcome merchant opposition.",
    },
  ],
};

/**
 * Generic seed-script input for the Madrona content.
 * The `eventCode` is a peer field on `game_event_drafts` /
 * `game_events` (not inside the `content` JSON), so it lives on
 * the wrapper. The seed script at
 * `scripts/release/seed-game-content.cjs` imports this module via
 * `--content shared/events/madrona-demo-game-content.ts` and
 * reads `seedConfig`.
 */
export const seedConfig: GameSeedConfig = {
  eventCode: "MIP",
  content: madronaGameContent,
};
