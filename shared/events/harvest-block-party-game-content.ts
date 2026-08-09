import type { AuthoringGameDraftContent } from "../game-config";
import type { GameSeedConfig } from "./seed-config.ts";

/**
 * Harvest Block Party — demo game content. One of the two test-event
 * quizzes seeded by `scripts/release/seed-game-content.cjs` so the
 * apps/site landing CTAs at `/event/harvest-block-party` resolve to a
 * real game published in `game_events`. The slug is in
 * [`shared/events/testEventAllowlist.ts`](./testEventAllowlist.ts);
 * landing copy lives in
 * [`apps/site/events/harvest-block-party.ts`](../../apps/site/events/harvest-block-party.ts).
 *
 * Variety positioning relative to the other two seeded demos: this
 * module exercises `instant_feedback_non_blocking` (the third feedback
 * mode added by the `extend_game_events_feedback_mode_check` migration),
 * heavy per-question sponsor attribution (every question sponsored by
 * one of the five landing-page sponsors with a `sponsorFact`), and
 * permissive flow flags (back navigation + retake both on). Madrona
 * runs `final_score_reveal` with mostly-unsponsored questions; Riverside
 * Jam runs `instant_feedback_required` with mixed selection modes and
 * tight flow flags. The trio together covers all three feedback modes,
 * both selection modes, sponsor-attribution UI on/off, and both flow
 * flag combinations.
 *
 * Question topics are sourced from the apps/site landing module so a
 * visitor who reads the landing then plays the quiz sees consistent
 * sponsors, programming, and lineup names. Sponsor strings on each
 * question match the spelling in the landing's `sponsors` array.
 */
const harvestBlockPartyGameContent: AuthoringGameDraftContent = {
  id: "harvest-block-party",
  slug: "harvest-block-party",
  name: "Harvest Block Party",
  location: "Maple Street Commons, Anytown",
  estimatedMinutes: 4,
  entitlementLabel: "harvest reward",
  // No score condition on the reward: `complete_game_and_award_entitlement`
  // awards on completion and reads `p_score` only to record it.
  intro:
    "Welcome to the Harvest Block Party. Five quick questions about the weekend's programming and the neighborhood businesses making it possible. Finish, then show your code at the welcome booth on Maple Street to claim a harvest reward.",
  summary:
    "Thanks for playing. Show your code at the welcome booth to claim your reward, then head down Maple Street — the next set is starting soon.",
  feedbackMode: "instant_feedback_non_blocking",
  allowBackNavigation: true,
  allowRetake: true,
  questions: [
    {
      id: "q1",
      sponsor: "Maple Street Co-op",
      prompt:
        "Which Saturday-afternoon programming on the Maple Street lawn is geared toward families with young kids?",
      selectionMode: "single",
      correctAnswerIds: ["q1-pumpkin-patch"],
      options: [
        { id: "q1-pumpkin-patch", label: "The pumpkin patch and kids' parade" },
        { id: "q1-pie-bake-off", label: "The Heirloom Pie Bake-Off" },
        { id: "q1-cider-tap", label: "The seasonal cider tap" },
        { id: "q1-string-band", label: "The Maple Street String Band set" },
      ],
      explanation:
        "The pumpkin patch and kids' parade run Saturday at noon on the Maple Street lawn — the welcome booth has the route map and a free craft table set up alongside.",
      sponsorFact:
        "The Maple Street Co-op donates the pumpkins from neighborhood farms every year and runs the welcome booth where you'll claim your reward.",
    },
    {
      id: "q2",
      sponsor: "Anytown Cider Works",
      prompt:
        "Which Saturday headliner closes out opening day with a 7 PM main-stage set?",
      selectionMode: "single",
      correctAnswerIds: ["q2-cider-press-quartet"],
      options: [
        { id: "q2-cider-press-quartet", label: "The Cider Press Quartet" },
        { id: "q2-maple-street-string-band", label: "Maple Street String Band" },
        { id: "q2-brass-on-the-boulevard", label: "Brass on the Boulevard" },
        { id: "q2-lantern-collective", label: "The Lantern Collective" },
      ],
      explanation:
        "The Cider Press Quartet headlines Saturday night at 7 PM — the only set with seasonal cider on tap from Anytown Cider Works alongside.",
      sponsorFact:
        "Anytown Cider Works presses every batch within five miles of the Maple Street Commons. Their Saturday-night tap is the only weekend pour with cider straight from the press.",
    },
    {
      id: "q3",
      sponsor: "Boulevard Bakers",
      prompt:
        "What does the winner of the Heirloom Pie Bake-Off take home?",
      selectionMode: "single",
      correctAnswerIds: ["q3-rolling-pin"],
      options: [
        { id: "q3-rolling-pin", label: "A bronze rolling pin" },
        { id: "q3-blue-ribbon", label: "A blue ribbon and a year of pies" },
        { id: "q3-engraved-pie-tin", label: "An engraved cast-iron pie tin" },
        { id: "q3-cash-prize", label: "A cash prize donated by the co-op" },
      ],
      explanation:
        "The bronze rolling pin has been the bake-off trophy since the first Harvest Block Party — winners' names are engraved along the handle and the trophy returns each year for the next round.",
      sponsorFact:
        "Boulevard Bakers judges the bake-off and supplies the rolling pin. Past winners get a standing invitation to apprentice in the boulevard kitchen.",
    },
    {
      id: "q4",
      sponsor: "Riverside Roastery",
      prompt:
        "Who hosts the Sunday-morning pancake breakfast that opens the second day?",
      selectionMode: "single",
      correctAnswerIds: ["q4-volunteer-fire"],
      options: [
        { id: "q4-volunteer-fire", label: "Maple Street Volunteer Fire" },
        { id: "q4-co-op", label: "Maple Street Co-op" },
        { id: "q4-makers-market", label: "The Local Makers Market" },
        { id: "q4-northside-press", label: "Northside Press" },
      ],
      explanation:
        "Maple Street Volunteer Fire runs the Sunday-morning pancake breakfast at 10 AM — they've hosted it every year of the block party.",
      sponsorFact:
        "Riverside Roastery supplies the coffee for the Sunday breakfast at cost. Their Sunday roast is bagged exclusively for the block party.",
    },
    {
      id: "q5",
      sponsor: "Northside Press",
      prompt:
        "How does the festival close out Sunday evening?",
      selectionMode: "single",
      correctAnswerIds: ["q5-lantern-lighting"],
      options: [
        {
          id: "q5-lantern-lighting",
          label: "A lantern lighting along Maple Street",
        },
        { id: "q5-fireworks", label: "A fireworks show over the commons" },
        { id: "q5-bonfire", label: "A bonfire at the boulevard end" },
        { id: "q5-final-bake-off", label: "A second bake-off round" },
      ],
      explanation:
        "The Lantern Collective leads a paper lantern lighting along Maple Street at 5:30 PM Sunday — the closing ritual of the weekend.",
      sponsorFact:
        "Northside Press prints every program, lantern tag, and bake-off scorecard for the Harvest Block Party out of the boulevard storefront.",
    },
  ],
};

/**
 * Generic seed-script input for the Harvest Block Party content.
 * `eventCode` is the 3-character uppercase code projected into
 * `game_events.event_code` and `game_event_drafts.event_code`; the
 * seed script asserts no other event already holds it. `HBP` chosen
 * to be mnemonic and distinct from Madrona's `MIP` and Riverside Jam's
 * `RJM`.
 */
export const seedConfig: GameSeedConfig = {
  eventCode: "HBP",
  content: harvestBlockPartyGameContent,
};
