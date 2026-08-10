/**
 * The host→event mapping: which organizer hostname stands for which
 * event, and which short paths that host serves.
 *
 * An organizer domain is CNAME'd to the apps/site Vercel project as an
 * additional alias, so it reaches the same deployment as the canonical
 * `*.vercel.app` host. This module is what makes it serve the
 * organizer's own event instead of the platform demo index: the
 * routing layer reads the entries below and derives its
 * host-conditional rewrites from them, rather than restating a
 * hostname or a slug of its own.
 *
 * This file lives in `shared/urls/` because it is URL topology — which
 * hostname stands for which event's route subtree — alongside the
 * canonical route table and matchers in
 * [`routes.ts`](./routes.ts).
 *
 * Two properties this module deliberately does **not** own:
 *
 * - **Exact-host matching.** Entries spell hostnames the way an
 *   operator would type them. A consumer whose matcher treats its
 *   input as a pattern is responsible for neutralizing the value it
 *   reads; nothing here is pre-escaped for one consumer's matcher.
 * - **Host-shape rules.** Support is opt-in per exact hostname. No
 *   consumer may derive behavior from a host's shape ("is this a
 *   custom domain", "is this not a `*.vercel.app`") — only from an
 *   exact entry below.
 *
 * The mapping's ceiling is deliberate: one entry per organizer host,
 * with no self-serve onboarding, per
 * [`docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md).
 */

/**
 * One organizer host and the event it stands for.
 *
 * `eventSlug` is the slug apps/site prerenders the event under (the
 * `registeredEventSlugs` key), not the event's display name and not
 * the identifier its entitlement rows carry.
 *
 * `shortPaths` are literal paths below the host root that serve the
 * event's corresponding long path — never patterns, prefixes, or
 * parameterized segments. A general prefix would capture asset
 * prefixes such as `/assets/*` and turn a stylesheet request into an
 * HTML document. The host root is always mapped and is not listed
 * here.
 */
export type OrganizerHost = {
  hostname: string;
  eventSlug: string;
  shortPaths: readonly string[];
};

/**
 * Every organizer host this platform serves, and the event each one
 * stands for. Adding an organizer host is an entry here plus the
 * onboarding steps in [`docs/dev.md`](/docs/dev.md) "Vercel".
 *
 * The quiz's short path is deliberately absent: it needs the shared
 * route contract to accept short paths first, so it is not yet an
 * opt-in any host can make.
 */
export const organizerHosts: readonly OrganizerHost[] = [
  {
    hostname: "music.madrona.us",
    eventSlug: "madrona",
    shortPaths: ["/feedback"],
  },
];

/**
 * One short path on one organizer host, paired with the long path it
 * stands for.
 */
export type OrganizerHostRoute = {
  hostname: string;
  shortPath: string;
  longPath: string;
};

/**
 * Flattens the mapping into the short→long path pairs each organizer
 * host serves: its root, which stands for the event landing, plus one
 * pair per opted-in short path.
 *
 * This is the single derivation every consumer reads, so a host that
 * serves a path in one layer cannot serve a different one in another.
 */
export function organizerHostRoutes(): OrganizerHostRoute[] {
  return organizerHosts.flatMap(({ hostname, eventSlug, shortPaths }) => {
    const eventRoot = `/event/${eventSlug}`;

    return [
      { hostname, shortPath: "/", longPath: eventRoot },
      ...shortPaths.map((shortPath) => ({
        hostname,
        shortPath,
        longPath: `${eventRoot}${shortPath}`,
      })),
    ];
  });
}
