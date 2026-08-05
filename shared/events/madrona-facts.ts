/**
 * Attendee-facing Madrona launch facts stated by more than one
 * surface: the apps/site landing (`apps/site/events/madrona.ts`),
 * the game seed (`madrona-demo-game-content.ts`), and the completion
 * CTA registry (`completionCta.ts`) each render some of these, and
 * review has caught the copies drifting when only one was edited.
 * Each fact lives here once and consumers compose their copy from
 * it, so a reward, booth, or donation-URL change is a one-module
 * edit.
 *
 * Scope is repo-side copy only: the admin-authored `game_events`
 * rows are a separate drift axis, documented on the seed module.
 * This is a per-event constants seam — if per-event content later
 * consolidates into a shared registry (the completion CTA registry's
 * doc comment anticipates one), fold this module into it.
 */
export const madronaFacts = {
  /** The reward a high-scoring quiz player redeems at the booth. */
  rewardNoun: "trinket",
  /** The Madrona Neighborhood Association's Zeffy donation form. */
  donateHref:
    "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
  /** The booth where quiz completion is redeemed for the reward. */
  booth: {
    name: "Madrona Neighborhood Association booth",
    /** Abbreviated form for tight UI copy. */
    shortName: "MNA booth",
    /** Locator phrase that follows `name` in directions copy. */
    locationSuffix: "by the basketball court",
  },
} as const;
