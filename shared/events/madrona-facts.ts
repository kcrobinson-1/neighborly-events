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
  /**
   * Generic noun for what a high-scoring quiz player claims at the
   * booth. Deliberately unspecific (spec reward-language rule): what
   * the reward actually is stays offline, at the booth.
   */
  rewardNoun: "reward",
  /** The Madrona Neighborhood Association's Zeffy donation form. */
  donateHref:
    "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
  /**
   * The association's Mailchimp community-email signup page — the
   * canonical destination it points people at everywhere else, and
   * the one every attendee-facing email-list affordance resolves to
   * (masthead, landing action grid, season wrap, completion panel).
   *
   * Not called a newsletter anywhere attendees can read: the
   * association's newsletter is a printed mailer delivered in the
   * mail, so the word names the wrong artifact.
   */
  emailListHref:
    "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
  /**
   * The association's year-round volunteer page. Stated by two
   * surfaces — the day-of landing's volunteer section and the quiz
   * completion panel — which is what puts it here rather than in
   * either one.
   *
   * This is the *year-round* ask and not the night-of one: the page
   * lists the Music in the Playfield team as a 20-hour
   * January–May commitment, so it is the wrong destination for
   * someone offering to carry chairs tonight. That ask routes to the
   * organizer contact instead.
   */
  volunteerHref: "https://madrona.us/volunteers/",
  /** The booth where quiz completion is redeemed for the reward. */
  booth: {
    name: "Madrona Neighborhood Association booth",
    /** Abbreviated form for tight UI copy. */
    shortName: "MNA booth",
    /** Locator phrase that follows `name` in directions copy. */
    locationSuffix: "by the basketball court",
  },
} as const;
