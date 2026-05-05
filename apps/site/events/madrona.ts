import type { EventContent } from "../lib/eventContent.ts";

/**
 * Madrona Music in the Playfield — first non-test per-event content
 * module on the Neighborly Events platform, registered by the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.1. Madrona is **not** a test event (`testEvent` is
 * deliberately omitted, not set to `false`, mirroring the
 * platform-level convention that the field is set positively only
 * for test events) — the demo-phase posture instead rides on
 * `meta.robots: "noindex"`, which the page route's
 * `generateMetadata` honors alongside the existing `testEvent`-
 * driven path so non-test events can opt into `noindex` without
 * inheriting the test-event disclaimer banner / demo-mode auth-
 * bypass eligibility (see the epic's invariant 3).
 *
 * Content here is placeholder: the canonical event name and
 * canonical dates / location reflect madrona.us's published 2026
 * "Music in the Playfield" announcement (three Tuesday-evening
 * concerts across August), but every band, sponsor, and FAQ entry
 * is authored against placeholder names. M3 of the demo-build epic
 * replaces these placeholders with the real lineup, sponsors, and
 * authored copy. The first FAQ entry surfaces the demo posture in
 * page-visible copy (mitigating the milestone-doc risk
 * "Placeholder content reads as a launch announcement") alongside
 * the SSR `noindex` meta.
 *
 * `meta.logoSrc` / `meta.logoAlt` render the committed Madrona
 * Neighborhood Association brand mark above the hero text on
 * `EventHeader`; the `Verified by:` source for the canonical event
 * name and dates is the madrona.us 2026 announcement re-fetched at
 * implementation time.
 */
export const madronaContent: EventContent = {
  slug: "madrona",
  themeSlug: "madrona",
  meta: {
    title: "Madrona Music in the Playfield",
    description:
      "Three summer evenings of music on the Madrona Playfield, hosted by the Madrona Neighborhood Association. Demo content for stakeholder preview.",
    robots: "noindex",
    logoSrc: "/events/madrona/logo.png",
    logoAlt: "Madrona Neighborhood Association logo",
  },
  hero: {
    name: "Madrona Music in the Playfield",
    tagline: "Three Tuesday evenings of community music in the park",
    dates: { start: "2026-08-11", end: "2026-08-25" },
    location: "Madrona Playfield, Seattle",
  },
  schedule: {
    days: [
      {
        date: "2026-08-11",
        label: "Tuesday — Opening Night",
        sessions: [
          {
            time: "5:30 PM",
            title: "Picnic blankets & community welcome",
            description:
              "Spread out on the playfield. The Madrona Neighborhood Association booth opens at the south edge.",
          },
          {
            time: "6:00 PM",
            title: "Cedar & Salt",
            description:
              "Acoustic Pacific Northwest folk to open the series.",
            performerSlug: "cedar-and-salt",
          },
          {
            time: "7:00 PM",
            title: "Lake Washington Brass",
            description:
              "Eight-piece neighborhood brass ensemble closing opening night.",
            performerSlug: "lake-washington-brass",
          },
        ],
      },
      {
        date: "2026-08-18",
        label: "Tuesday — Mid-Series",
        sessions: [
          {
            time: "5:30 PM",
            title: "Neighborhood food vendors open",
            description:
              "Local food carts and the Madrona Park ice-cream cart open along the playfield's east path.",
          },
          {
            time: "6:00 PM",
            title: "Arboretum Strings",
            description:
              "Chamber-folk quartet rooted in Pacific Northwest songwriting.",
            performerSlug: "arboretum-strings",
          },
          {
            time: "7:15 PM",
            title: "Roosevelt Way Soul Revue",
            description:
              "Six-piece soul revue carrying mid-series into sunset.",
            performerSlug: "roosevelt-way-soul-revue",
          },
        ],
      },
      {
        date: "2026-08-25",
        label: "Tuesday — Closing Night",
        sessions: [
          {
            time: "5:30 PM",
            title: "Community potluck setup",
            description:
              "Bring a side dish for the closing-night potluck table; the association supplies plates and utensils.",
          },
          {
            time: "6:00 PM",
            title: "Eastlake Ensemble",
            description:
              "Five-piece chamber ensemble drawing on neighborhood string traditions.",
            performerSlug: "eastlake-ensemble",
          },
          {
            time: "7:30 PM",
            title: "The Madrona Park Headliners",
            description:
              "Seven-piece headlining band closing the series at sunset.",
            performerSlug: "the-madrona-park-headliners",
          },
        ],
      },
    ],
  },
  lineup: [
    {
      slug: "cedar-and-salt",
      name: "Cedar & Salt",
      bio: "A three-piece acoustic group rooted in Pacific Northwest folk songwriting.",
      setTimes: [{ day: "2026-08-11", time: "6:00 PM" }],
    },
    {
      slug: "lake-washington-brass",
      name: "Lake Washington Brass",
      bio: "Eight-piece neighborhood brass ensemble drawing on parade and second-line traditions.",
      setTimes: [{ day: "2026-08-11", time: "7:00 PM" }],
    },
    {
      slug: "arboretum-strings",
      name: "Arboretum Strings",
      bio: "Chamber-folk quartet writing songs about lakes, ferries, and the long Seattle dusk.",
      setTimes: [{ day: "2026-08-18", time: "6:00 PM" }],
    },
    {
      slug: "roosevelt-way-soul-revue",
      name: "Roosevelt Way Soul Revue",
      bio: "Six-piece soul revue with horns, organ, and a rotating cast of neighborhood vocalists.",
      setTimes: [{ day: "2026-08-18", time: "7:15 PM" }],
    },
    {
      slug: "eastlake-ensemble",
      name: "Eastlake Ensemble",
      bio: "Five-piece chamber ensemble drawing on neighborhood string traditions across two generations.",
      setTimes: [{ day: "2026-08-25", time: "6:00 PM" }],
    },
    {
      slug: "the-madrona-park-headliners",
      name: "The Madrona Park Headliners",
      bio: "Seven-piece band built around neighborhood songwriters; closing-night headliners.",
      setTimes: [{ day: "2026-08-25", time: "7:30 PM" }],
    },
  ],
  sponsors: [
    {
      name: "Madrona Neighborhood Association",
      logoSrc: "/events/madrona/sponsors/madrona-neighborhood-association.svg",
      logoAlt: "Madrona Neighborhood Association logo",
      href: "https://example.com/madrona-neighborhood-association",
      tier: "Hosting",
    },
    {
      name: "Lake Washington Boulevard Bakery",
      logoSrc: "/events/madrona/sponsors/lake-washington-boulevard-bakery.svg",
      logoAlt: "Lake Washington Boulevard Bakery logo",
      href: "https://example.com/lake-washington-boulevard-bakery",
      tier: "Headline",
    },
    {
      name: "Arboretum Coffee Roasters",
      logoSrc: "/events/madrona/sponsors/arboretum-coffee-roasters.svg",
      logoAlt: "Arboretum Coffee Roasters logo",
      href: "https://example.com/arboretum-coffee-roasters",
      tier: "Headline",
    },
    {
      name: "Eastlake Print Shop",
      logoSrc: "/events/madrona/sponsors/eastlake-print-shop.svg",
      logoAlt: "Eastlake Print Shop logo",
      href: "https://example.com/eastlake-print-shop",
      tier: "Supporting",
    },
    {
      name: "Cedar Cycle Co-op",
      logoSrc: "/events/madrona/sponsors/cedar-cycle-co-op.svg",
      logoAlt: "Cedar Cycle Co-op logo",
      href: "https://example.com/cedar-cycle-co-op",
      tier: "Supporting",
    },
  ],
  faq: [
    {
      question: "Is this the real Madrona Music in the Playfield page?",
      answer:
        "Not yet. This page is a stakeholder demo of the Madrona Music in the Playfield experience on the Neighborly Events platform. The event name, dates, and location reflect the Madrona Neighborhood Association's published 2026 announcement, but the lineup, sponsors, and FAQ shown here are placeholder content for preview purposes. The page is set to `noindex` so it stays out of search until the real launch.",
    },
    {
      question: "What is Music in the Playfield?",
      answer:
        "A free summer concert series the Madrona Neighborhood Association hosts on the Madrona Playfield. Three Tuesday evenings of community music; bring a blanket and picnic. The 2026 announcement on madrona.us is the canonical source.",
    },
    {
      question: "How much does it cost?",
      answer:
        "All three evenings are free to attend. Local food vendors set their own prices.",
    },
    {
      question: "Where do I park?",
      answer:
        "On-street parking is available throughout the Madrona neighborhood. Accessible parking is reserved at the playfield's south entrance during event hours.",
    },
    {
      question: "Is the playfield accessible?",
      answer:
        "Yes. The playfield, the listening area, and the food vendor row are step-free; accessible seating is reserved near the main stage.",
    },
  ],
  cta: {
    label: "Play the Madrona scavenger game",
    sublabel: "Visit booths around the playfield to earn stamps and unlock prizes.",
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
