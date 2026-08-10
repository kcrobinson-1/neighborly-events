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

/**
 * Which platform surface an outbound link was rendered on. Becomes the
 * `utm_medium` value, so these literals are what the association reads
 * in Zeffy's and Mailchimp's own campaign reporting — they are
 * attendee-invisible but not internal, and renaming one splits a
 * destination's history in a dashboard this repo does not own.
 *
 * The masthead bar, the day-of landing, and the quiz completion panel
 * are the three surfaces that render on a concert night. The
 * season-wrap block (`LandingTonightSections`) renders the landing's
 * own tagged hrefs and so reports as `landing` rather than carrying a
 * fourth value: the medium is fixed where the content is authored, and
 * a generic renderer cannot re-tag it without knowing the campaign,
 * which would put Madrona's campaign name inside components that serve
 * every event. It first renders the day after the final concert, so
 * nothing on opening night is affected either way.
 */
export type MadronaLinkSurface = "masthead" | "landing" | "completion";

/**
 * Tags an outbound destination with the campaign parameters that make
 * a click attributable on the *destination's* side.
 *
 * The Vercel plan this platform runs on has no custom events, so
 * nothing on our side can count a click on the email-list, donate, or
 * volunteer affordances — see
 * [`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)
 * "Vercel Web Analytics". These parameters are therefore the only
 * attribution that exists for those three destinations, and they are
 * read in Zeffy's and Mailchimp's reporting rather than in ours. A
 * donation driven by the quiz completion panel is otherwise
 * indistinguishable from one off a printed flyer.
 *
 * Called where the content is authored, not where it is rendered, so
 * each destination's medium is fixed by the module that owns the copy
 * and no component has to know about campaigns.
 *
 * Returns `href` unchanged when it does not parse as an absolute URL.
 * Attribution is observability and the link is the attendee's actual
 * path to the association — these have different failure priorities,
 * and the module-load-time `throw` this would otherwise be is one that
 * would take the whole surface down rather than one link's UTM tags.
 */
export function withSource(href: string, surface: MadronaLinkSurface): string {
  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return href;
  }

  url.searchParams.set("utm_source", "neighborly");
  url.searchParams.set("utm_medium", surface);
  url.searchParams.set("utm_campaign", "madrona-2026");

  return url.toString();
}
