import type { AuthoringGameDraftContent } from "../game-config";
import type { GameSeedConfig } from "./seed-config.ts";

/**
 * Riverside Jam — demo game content. The second test-event quiz
 * seeded by `scripts/release/seed-game-content.cjs` so the apps/site
 * landing CTAs at `/event/riverside-jam` resolve to a real game
 * published in `game_events`. The slug is in
 * [`shared/events/testEventAllowlist.ts`](./testEventAllowlist.ts);
 * landing copy lives in
 * [`apps/site/events/riverside-jam.ts`](../../apps/site/events/riverside-jam.ts).
 *
 * Variety positioning relative to the other two seeded demos: this
 * module exercises `instant_feedback_required` (per-question correctness
 * gates progression), a mix of `single` and `multiple` selection modes
 * (so the multi-select UI is exercised by at least one production
 * demo), light per-question sponsor attribution (one of four questions
 * sponsored — most have `sponsor: null` to exercise the unsponsored
 * question UI), and tight flow flags (no back navigation, no retake).
 * Madrona and Harvest Block Party both run
 * `instant_feedback_non_blocking`: Madrona with single-select questions,
 * no sponsor attribution anywhere, and back navigation off; Harvest with
 * heavy attribution and permissive flow flags. The trio covers both
 * selection modes, sponsor-attribution UI on and off, and three of the
 * four flow-flag combinations — but only two of the three feedback
 * modes. Nothing seeded runs `final_score_reveal` since Madrona moved
 * off it for its live event, so that mode reaches no demo surface;
 * `docs/backlog.md` carries the gap.
 *
 * Question topics are sourced from the apps/site landing module so a
 * visitor who reads the landing then plays the quiz sees consistent
 * sponsors, lineup, and schedule references. The lone sponsored
 * question's `question.sponsor` string matches the spelling in the
 * landing's `sponsors` array.
 */
const riversideJamGameContent: AuthoringGameDraftContent = {
  id: "riverside-jam",
  slug: "riverside-jam",
  name: "Riverside Jam",
  location: "Harborlight Pier, Anytown",
  estimatedMinutes: 3,
  entitlementLabel: "festival drink voucher",
  // No score condition on the voucher: `complete_game_and_award_entitlement`
  // awards on completion and reads `p_score` only to record it. The
  // "pick the right answers to move on" clause is accurate and stays —
  // that is this event's `instant_feedback_required` mode, which gates
  // *progress* through the questions, not the entitlement at the end.
  intro:
    "Welcome to Riverside Jam. Four quick questions on the lineup and the festival's surroundings — pick the right answers for each one to move on. Finish and you'll earn a festival drink voucher redeemable at the harbor stage bar.",
  summary:
    "Thanks for playing. Bring your code to the harbor stage bar to claim your drink voucher and find a spot on the pier — the next set is about to start.",
  feedbackMode: "instant_feedback_required",
  allowBackNavigation: false,
  allowRetake: false,
  questions: [
    {
      id: "q1",
      sponsor: null,
      prompt:
        "Which act headlines Saturday night on the main stage at sunset?",
      selectionMode: "single",
      correctAnswerIds: ["q1-lighthouse-keepers"],
      options: [
        { id: "q1-lighthouse-keepers", label: "The Lighthouse Keepers" },
        { id: "q1-tide-pool-trio", label: "Tide Pool Trio" },
        { id: "q1-anchor-bay-brass", label: "Anchor Bay Brass" },
        { id: "q1-salt-air-strings", label: "Salt Air Strings" },
      ],
      explanation:
        "The Lighthouse Keepers headline Saturday at 8 PM on the main stage. They also close out Sunday with a sunset DJ set and lantern launch — the only act on the lineup playing both days.",
    },
    {
      id: "q2",
      sponsor: null,
      prompt: "Which acts are on the Sunday lineup? Select all that apply.",
      selectionMode: "multiple",
      correctAnswerIds: ["q2-salt-air-strings", "q2-lighthouse-keepers"],
      options: [
        { id: "q2-salt-air-strings", label: "Salt Air Strings" },
        { id: "q2-lighthouse-keepers", label: "The Lighthouse Keepers" },
        { id: "q2-tide-pool-trio", label: "Tide Pool Trio" },
        { id: "q2-anchor-bay-brass", label: "Anchor Bay Brass" },
      ],
      explanation:
        "Sunday's lineup is Salt Air Strings on the harbor stage at 2:30 PM and The Lighthouse Keepers closing the festival at 5 PM. Tide Pool Trio and Anchor Bay Brass play Saturday only.",
    },
    {
      id: "q3",
      sponsor: "Harborlight Sound",
      prompt:
        "What free Sunday-morning programming opens the second day of the festival?",
      selectionMode: "single",
      correctAnswerIds: ["q3-rigging-tour"],
      options: [
        {
          id: "q3-rigging-tour",
          label: "A coffee station and a tour of the pier rigging",
        },
        { id: "q3-yoga-on-the-pier", label: "Yoga on the pier" },
        {
          id: "q3-sunrise-acoustic-set",
          label: "A sunrise acoustic set on the harbor stage",
        },
        {
          id: "q3-makers-market-preview",
          label: "An early preview of the Marina Makers Market",
        },
      ],
      explanation:
        "Sunday opens at 10 AM with a free coffee station and a guided tour of the historic pier rigging. The Marina Makers Market opens later at noon.",
      sponsorFact:
        "Harborlight Sound runs both stages and tunes the harbor-stage rig before each set. The Sunday rigging tour visits some of the same hardware they use for the festival sound.",
    },
    {
      id: "q4",
      sponsor: null,
      prompt:
        "How does the festival close out Sunday evening?",
      selectionMode: "single",
      correctAnswerIds: ["q4-sunset-dj-lantern"],
      options: [
        {
          id: "q4-sunset-dj-lantern",
          label: "A sunset DJ set and a floating lantern launch",
        },
        {
          id: "q4-fireworks-over-harbor",
          label: "A fireworks show over the harbor",
        },
        {
          id: "q4-acoustic-around-firepit",
          label: "An acoustic set around a pier firepit",
        },
        {
          id: "q4-second-brass-set",
          label: "A second Anchor Bay Brass set",
        },
      ],
      explanation:
        "The festival closes Sunday at 5 PM with a sunset DJ set on the main stage and a floating lantern launch off the pier — the same Lighthouse Keepers crew that headlined Saturday night runs the closing.",
    },
  ],
};

/**
 * Generic seed-script input for the Riverside Jam content. `eventCode`
 * is the 3-character uppercase code projected into
 * `game_events.event_code` and `game_event_drafts.event_code`; the
 * seed script asserts no other event already holds it. `RJM` chosen to
 * be mnemonic and distinct from Madrona's `MIP` and Harvest Block
 * Party's `HBP`.
 */
export const seedConfig: GameSeedConfig = {
  eventCode: "RJM",
  content: riversideJamGameContent,
};
