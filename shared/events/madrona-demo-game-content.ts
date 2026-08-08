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
 *
 * Question and option ids follow the rule in
 * [`README.md`](./README.md): bare-letter option ids, question ids
 * that name what the question asks, and at both levels an id that is
 * retired rather than reassigned when the thing it named is replaced.
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
  // Non-blocking instant feedback: the explanation and its sources arrive
  // right after the answer, and a wrong answer stays wrong. Back navigation is
  // off because the two together let a player return to a revealed question and
  // overwrite the graded answer — closed here as content; the shared fix is a
  // backlog item.
  feedbackMode: "instant_feedback_non_blocking",
  allowBackNavigation: false,
  allowRetake: true,
  questions: [
    {
      // Not the `q1` this replaced: that question asked what the neighborhood
      // was named after, and every option and the answer changed with it. A
      // replaced question takes a new id rather than inheriting the old one.
      id: "first-named-madrona",
      // No sponsor and no sponsor fact on any question: the sponsor slot never
      // sold this year and the printed sign is unsponsored, so the screen and
      // the sign agree. The sponsor fact matters beyond the name — the reveal
      // resolvers prefer it over the explanation, so leaving one here would
      // show sponsor copy where the sourced explanation belongs.
      sponsor: null,
      prompt: "What was the first thing in the neighborhood to be named Madrona?",
      selectionMode: "single",
      correctAnswerIds: ["a"],
      options: [
        { id: "a", label: "A private trolley park" },
        { id: "b", label: "A schoolhouse" },
        { id: "c", label: "A streetcar line" },
        { id: "d", label: "A real estate plat" },
      ],
      explanation:
        "The land company developing the hillside laid out a private park on the waterfront to anchor the trolley line it was building, which was a standard trick for selling lots. J. E. Ayer, one of the property owners who contributed ground for the park, suggested calling it Madrona after the tree. However, this might have been more of a marketing move than a description, since there were very few of that tree in the area. Parks historian Don Sherwood's files say the park held \"scarcely more than a few little (Madrona) sprouts,\" and a Seattle Post-Intelligencer story from September 6, 1927 called the name \"a pioneer jest,\" because madrona trees \"were not that prominent a feature.\"\n\nThe name traveled up the hill, and fast. Pretty soon the entire neighborhood was called Madrona, and the landmarks followed one at a time. The schoolhouse at the top of the hill, Randell School, became Madrona in 1904 when a new building replaced the original barn. The road down to the park became Madrona Drive in 1915. The streetcar was the #8 Madrona by the 1930s.",
      sources: [
        "Don Sherwood, [Madrona Park](https://www.seattle.gov/documents/Departments/CityArchive/Sherwood/MadronaPk.pdf) and [Madrona Playground](https://www.seattle.gov/documents/departments/cityarchive/sherwood/madronapg.pdf) history sheets, Don Sherwood Parks History Collection, Seattle Municipal Archives",
        "Nile Thompson, Carolyn J. Marr, and Nick Rousso, [Seattle Public Schools, 1862-2023: Madrona Elementary School](https://www.historylink.org/File/10551), HistoryLink Essay 10551",
        "[Madrona Drive](https://www.writesofway.org/madrona-drive/), Writes of Way",
        "[Seattle's East Union and Madrona Streetcar](https://ba-kground.com/seattles-east-union-and-madrona-streetcar/), ba-kground",
        "Junius Rochester, [Seattle Neighborhoods: Madrona, Thumbnail History](https://www.historylink.org/file/2235), HistoryLink Essay 2235, 1999",
      ],
    },
    {
      id: "free-breakfast-location",
      sponsor: null,
      prompt:
        "In 1969, the Seattle chapter of the Black Panther Party launched its Free Breakfast Program for schoolchildren at which Madrona location?",
      selectionMode: "single",
      correctAnswerIds: ["a"],
      options: [
        { id: "a", label: "Madrona Grace Presbyterian Church" },
        { id: "b", label: "Madrona Elementary School" },
        { id: "c", label: "The Madrona Branch Library" },
        { id: "d", label: "Madrona Community Center" },
      ],
      explanation:
        "The program launched at 832 32nd Avenue, the building that is Madrona Grace Presbyterian Church today. In 1969 it went by Madrona Community Presbyterian Church, having merged with Grace Presbyterian in 1953. Elmer Dixon III coordinated it. From that one kitchen the program grew to five locations and served an estimated 300,000 meals between 1969 and 1977.",
      sources: [
        "Linda Holden Givens, [Black Panther Party Seattle Chapter (1968-1978)](https://www.historylink.org/File/20648), HistoryLink Essay 20648, 2018",
        "Jeffrey Zane and Judson L. Jeffries, \"A Panther Sighting in the Pacific Northwest: The Seattle Chapter of the Black Panther Party,\" in *On the Ground: The Black Panther Party in Communities Across America*, University Press of Mississippi, 2010, pages 41 to 95",
        "Quintard Taylor, *The Forging of a Black Community: Seattle's Central District from 1870 through the Civil Rights Era*, University of Washington Press",
        "[Our Story](https://www.madronagrace.org/about-us/our-story), Madrona Grace Presbyterian Church",
      ],
    },
    {
      id: "library-statue-name",
      sponsor: null,
      prompt: "What is the statue outside the Madrona library called?",
      selectionMode: "single",
      correctAnswerIds: ["a"],
      options: [
        { id: "a", label: "The Peaceable Kingdom" },
        { id: "b", label: "The Lion and the Lamb" },
        { id: "c", label: "Common Ground" },
        { id: "d", label: "The Madrona Menagerie" },
      ],
      // HistoryLink says the animals have their paws on a book. There is no
      // book — the library's own page for the branch describes the boulder
      // arrangement, and nothing else mentions one. The explanation follows the
      // library, and the library page is cited alongside Wilma, who stays the
      // source for the artist, the aluminum, and the 1984 installation.
      //
      // No emphasis markup here. The inline grammar is parsed for source lines
      // only; an explanation renders as plain text, so `*a title*` would print
      // its asterisks. Work titles in explanation prose stay unmarked.
      explanation:
        "Richard Beyer, who also made Waiting for the Interurban in Fremont, cast the aluminum group and it was installed on the library lawn in 1984. The panther and the pig sit on top of a granite boulder, with the wolf and the sheep at the base. The four animals stand in for groups living in the neighborhood at the time, the panther for the Black Panthers, the pig for the police, the sheep for the elderly, and the wolf for the street toughs, four uneasy neighbors sharing one rock. That is where the title The Peaceable Kingdom comes from, and Madrona has used it as an unofficial motto ever since.",
      sources: [
        "David Wilma, [Madrona-Sally Goldmark Branch, The Seattle Public Library](https://www.historylink.org/File/4034), HistoryLink Essay 4034, 2002",
        "[Madrona-Sally Goldmark Branch Highlights](https://www.spl.org/hours-and-locations/madrona-sally-goldmark-branch/madrona-sally-goldmark-branch-highlights), The Seattle Public Library",
        "Brangien Davis, [Madrona: Best Seattle Neighborhoods 2013](https://seattlemag.com/home-garden/madrona-best-seattle-neighborhoods-2013), Seattle Magazine",
        "Thomas Veith, [*History of the Central Area*](https://www.seattle.gov/documents/Departments/Neighborhoods/HistoricPreservation/HistoricResourcesSurvey/context-central-area.pdf), Seattle Historic Preservation Program, 2009",
      ],
    },
    {
      id: "bathhouse-current-use",
      sponsor: null,
      // The stem names Madrona once. It used to read "the Madrona Bathhouse
      // on the waterfront in Madrona Park", which said the word twice and
      // buried the question inside the location.
      prompt:
        "The old bathhouse down at Madrona Park is still in use. What happens in it now?",
      selectionMode: "single",
      correctAnswerIds: ["a"],
      options: [
        { id: "a", label: "A dance studio" },
        { id: "b", label: "A community theater" },
        { id: "c", label: "A clay studio" },
        { id: "d", label: "A boathouse for kayak and paddleboard rentals" },
      ],
      explanation:
        "A wood-frame bathhouse went up in 1919 and was replaced by the brick building that still stands, built in two parts across 1927 and 1928. Swimmers gave way to dancers in 1971, when a second story was added to create studio space. Spectrum Dance Theater, founded in 1982, has been based there since, with choreographer Donald Byrd as artistic director since 2002.",
      sources: [
        "[Madrona Bathhouse Home of Spectrum Dance Theater](https://theclio.com/entry/106625), Clio",
        "Don Sherwood, [Madrona Park history sheet](https://www.seattle.gov/documents/Departments/CityArchive/Sherwood/MadronaPk.pdf), Seattle Municipal Archives",
        "Erin Naomi Burrows, [Byrd and the Bath House: A Case Study of Spectrum Dance Theater (1982-2012)](https://scholarworks.seattleu.edu/spectrum-dance-theater/1), Seattle University, 2019",
        "[Spectrum Dance Theater, About](https://www.spectrumdance.org/about)",
      ],
    },
    {
      id: "mlk-way-former-name",
      sponsor: null,
      prompt: "Before being renamed to MLK Jr Way, what was the name of the street that borders the western edge of Madrona?",
      selectionMode: "single",
      correctAnswerIds: ["a"],
      options: [
        { id: "a", label: "Empire Way" },
        { id: "b", label: "Hill Way" },
        { id: "c", label: "Cascade Way" },
        { id: "d", label: "Pacific Way" },
      ],
      // The two sources disagree about the start, so the copy carries no start
      // date: Banel dates the KYAC broadcast to November 1980, while Kemezis
      // has Rye circulating the petition early in 1981 and mentions neither the
      // station nor Jackson. They also part on the day after the ruling —
      // Kemezis says the city resumed manufacturing signs, Banel says
      // installation began — so the copy says only what both support. The
      // earlier claim about a West Coast renaming wave in one year is gone for
      // the same reason: nothing here supports it.
      explanation:
        "Empire Way honored railroad magnate James J. Hill, \"the empire builder.\" The campaign to change it started with a radio show: activist Eddie Rye Jr. was hosting a program on Black station KYAC, with Jesse Jackson as his guest, when he learned that cities around the country were honoring Dr. King locally. Rye gathered 4,000 signatures, the City Council voted unanimously in July 1982, and then 36 merchants sued to stop it, objecting mainly to what changing their address would cost them. The Washington State Supreme Court ruled against them on November 30, 1983, and the city went back to making signs the next day. A crowd gathered to unveil the final one on January 15, 1984.",
      sources: [
        "Kathleen Kemezis, [Hundreds celebrate the placement of the last sign to designate Seattle's new Martin Luther King Jr. Way on January 15, 1984](https://www.historylink.org/File/9568), HistoryLink Essay 9568, 2010",
        "Feliks Banel, [Seattle's long-ago battle to honor Dr. Martin Luther King Jr.](https://mynorthwest.com/local/battle-honor-martin-luther-king-jr/946066), MyNorthwest, 2018",
      ],
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
