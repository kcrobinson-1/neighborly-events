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
 *
 * `feedback` opts madrona in to the
 * [Madrona feedback child epic](../../../docs/plans/epics/madrona-feedback/epic.md)
 * M1 attendee feedback flow registered in phase 1.1's migration:
 * presence here renders the `EventFeedbackCTA` button on the landing
 * page (1.2) and the form route at `/event/madrona/feedback` (1.3.1),
 * and routes anon submissions to the `feedback_submissions` row whose
 * FK target — `feedback_enabled_events.slug = 'madrona'` — was seeded
 * by the same 1.1 migration. The starter rating-dimension set
 * (Music choice, Sound quality, Park experience, Website experience,
 * Overall) tracks the milestone doc's named starter set; the keys
 * are content-authored stable identifiers per epic Invariant 3, so a
 * future copy revision can edit the visible `label` without
 * invalidating already-stored rows that reference the `key`. Future
 * events that opt feedback in inherit the same `EventContent.feedback`
 * shape (1.2's type extension) and the same submission path; the
 * platform-genericity invariant (epic Invariant 1) means there are
 * no madrona-keyed branches inside the route, the form, or the
 * insert path.
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
      imageSrc: "/events/madrona/lineup/cedar-and-salt.jpg",
      imageAlt: "Cedar & Salt — placeholder band photo",
      extendedBio:
        "Cedar & Salt formed during a long winter of porch sessions on the east side of the lake.\n\nTheir songs trace the small geographies of Pacific Northwest neighborhoods — ferry landings, garden plots, the slow turn from rain to sun.\n\nThis is placeholder copy authored for the Madrona demo build; M3 replaces it with the band's real bio.",
      featuredQuote: {
        text: "Demo placeholder: a featured-quote string used to exercise the new EventLineup quote affordance.",
        attribution: "Placeholder Reviewer, Demo Outlet",
      },
      externalLinks: [
        { label: "Spotify", href: "https://example.com/cedar-and-salt-spotify" },
        { label: "Bandcamp", href: "https://example.com/cedar-and-salt-bandcamp" },
        { label: "Website", href: "https://example.com/cedar-and-salt" },
      ],
      setTimes: [{ day: "2026-08-11", time: "6:00 PM" }],
    },
    {
      slug: "lake-washington-brass",
      name: "Lake Washington Brass",
      bio: "Eight-piece neighborhood brass ensemble drawing on parade and second-line traditions.",
      imageSrc: "/events/madrona/lineup/lake-washington-brass.jpg",
      imageAlt: "Lake Washington Brass — placeholder band photo",
      setTimes: [{ day: "2026-08-11", time: "7:00 PM" }],
    },
    {
      slug: "arboretum-strings",
      name: "Arboretum Strings",
      bio: "Chamber-folk quartet writing songs about lakes, ferries, and the long Seattle dusk.",
      extendedBio:
        "Arboretum Strings has played the Madrona neighborhood since the early '20s.\n\nTheir set leans on slow-build folk arrangements with cello, acoustic guitar, and a single voice. Demo content; M3 replaces with the real bio.",
      featuredQuote: {
        text: "Demo placeholder quote — used here to show that a band can carry a quote without an image.",
      },
      setTimes: [{ day: "2026-08-18", time: "6:00 PM" }],
    },
    {
      slug: "roosevelt-way-soul-revue",
      name: "Roosevelt Way Soul Revue",
      bio: "Six-piece soul revue with horns, organ, and a rotating cast of neighborhood vocalists.",
      externalLinks: [
        { label: "Bandcamp", href: "https://example.com/roosevelt-way-bandcamp" },
        { label: "Instagram", href: "https://example.com/roosevelt-way-instagram" },
      ],
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
      shortDescription:
        "Demo placeholder: the neighborhood association that organizes the series, with a short blurb to exercise the new sponsor-description affordance.",
      socialLinks: [
        { label: "Instagram", href: "https://example.com/madrona-na-instagram" },
        { label: "Newsletter", href: "https://example.com/madrona-na-newsletter" },
      ],
    },
    {
      name: "Lake Washington Boulevard Bakery",
      logoSrc: "/events/madrona/sponsors/lake-washington-boulevard-bakery.svg",
      logoAlt: "Lake Washington Boulevard Bakery logo",
      href: "https://example.com/lake-washington-boulevard-bakery",
      tier: "Headline",
      shortDescription:
        "Demo placeholder: a neighborhood bakery sponsor blurb.",
    },
    {
      name: "Arboretum Coffee Roasters",
      logoSrc: "/events/madrona/sponsors/arboretum-coffee-roasters.svg",
      logoAlt: "Arboretum Coffee Roasters logo",
      href: "https://example.com/arboretum-coffee-roasters",
      tier: "Headline",
      socialLinks: [
        { label: "Instagram", href: "https://example.com/arboretum-coffee-instagram" },
      ],
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
  feedback: {
    cta: {
      heading: "How was Music in the Playfield?",
      body: "Tell us what you'd want different next year — answers go straight to the Madrona Neighborhood Association.",
    },
    ratingDimensions: [
      { key: "music-choice", label: "Music choice" },
      { key: "sound-quality", label: "Sound quality" },
      { key: "park-experience", label: "Park experience" },
      { key: "website-experience", label: "Website experience" },
      { key: "overall", label: "Overall" },
    ],
    freeTextPrompt: "Anything specific you'd like the organizer to hear?",
    emailCopy: {
      label: "Email — so we can follow up if you'd like (optional)",
      placeholder: "you@example.com",
      newsletterOptInLabel: "Add me to the Madrona Neighborhood Association mailing list",
    },
    thankYouMessage: "Thanks — every response goes straight to the organizers.",
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
