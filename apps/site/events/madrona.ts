import { madronaFacts } from "../../../shared/events/madrona-facts.ts";
import { routes } from "../../../shared/urls/index.ts";
import type { EventContent } from "../lib/eventContent.ts";

/**
 * Madrona Music in the Playfield — first non-test per-event content
 * module on the Neighborly Events platform, registered by the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.1. Madrona is **not** a test event (`testEvent` is
 * deliberately omitted, not set to `false`, mirroring the
 * platform-level convention that the field is set positively only
 * for test events).
 *
 * Content here is the real 2026 season: three Tuesday-evening
 * concerts on the Madrona Playfield (Aug 11 / 18 / 25), one band
 * per night playing two 45-minute sets between 6:00 and 8:00 PM.
 * Canonical sources live in the `mip-2026` repository: band bios
 * are website-length adaptations of
 * `docs/workstreams/programming/BandBios-2026.md` (the wording
 * source of truth), and lineup photos are resized copies from
 * `docs/workstreams/marketing/assets/bands/`. The page is indexable
 * (no `meta.robots`) — this content is the launch surface.
 *
 * `sponsors` deliberately carries only the hosting Madrona
 * Neighborhood Association entry for now: real 2026 business
 * sponsors are confirmed-list-pending, and entries land in a
 * follow-up once the list, tiers, and links are final. Band
 * `externalLinks` are likewise omitted until real URLs are
 * collected — the renderer's render-when-present guards make both
 * absences invisible rather than placeholder-filled.
 *
 * `meta.logoSrc` / `meta.logoAlt` render the committed Madrona
 * Neighborhood Association brand mark above the hero text on
 * `EventHeader`.
 *
 * `donate` renders the `EventDonateCTA` section linking out to the
 * association's Zeffy donation form (new tab). Its destination —
 * like the reward noun and booth phrasing this module shares with
 * the game surfaces — comes from `shared/events/madrona-facts.ts`.
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
 *
 * `masthead` renders the `EventMasthead` quick-links strip above the
 * hero: Quiz (hard navigation into the apps/web game shell, href
 * composed from `routes.game`), Feedback and Sign up (same-app
 * routes), and Donate (the association's Zeffy form, composed from
 * `madrona-facts.ts` like the `donate` section below). The strip
 * exists because the page otherwise buries its key actions — quiz in
 * the hero, feedback and donate near the bottom, signup only behind
 * the completion screen.
 *
 * `newsletterSignup` opts madrona in to the standalone email-capture
 * route at `/event/madrona/signup`: presence here renders the form
 * (absence would render the route's disabled state), and anon
 * submissions flow through the `submit_newsletter_signup` RPC into
 * the same `newsletter_opt_ins` consent log the feedback form's
 * checkbox writes to — gated at the DB by the
 * `newsletter_enabled_events` registry row seeded alongside the RPC's
 * migration. Copy here composes nothing from `madrona-facts.ts`
 * because it restates no shared fact (no reward, booth, or donation
 * reference); if a future revision does, compose it from the facts
 * module rather than restating the literal.
 */
/** The 5:30 PM booth-opening session, identical on all three nights. */
const boothOpensSession = {
  time: "5:30 PM",
  title: `Blankets down — ${madronaFacts.booth.name} opens`,
  description: `Find a spot on the grass. The association booth opens with the neighborhood quiz and the ${madronaFacts.rewardNoun} table.`,
};

export const madronaContent: EventContent = {
  slug: "madrona",
  themeSlug: "madrona",
  meta: {
    title: "Madrona Music in the Playfield",
    description:
      "Three free Tuesday-evening concerts on the Madrona Playfield this August, hosted by the Madrona Neighborhood Association.",
    logoSrc: "/events/madrona/logo.png",
    logoAlt: "Madrona Neighborhood Association logo",
  },
  hero: {
    name: "Madrona Music in the Playfield",
    tagline: "Three Tuesday evenings of community music in the park",
    dates: { start: "2026-08-11", end: "2026-08-25" },
    location: "Madrona Playfield, 917 34th Ave, Seattle",
  },
  schedule: {
    days: [
      {
        date: "2026-08-11",
        label: "Tuesday — Opening Night",
        sessions: [
          boothOpensSession,
          {
            time: "6:00 PM",
            title: "Miller Campbell — first set",
            description: "First of two 45-minute sets.",
            performerSlug: "miller-campbell",
          },
          {
            time: "7:15 PM",
            title: "Miller Campbell — second set",
            description: "Second 45-minute set closes out the night.",
            performerSlug: "miller-campbell",
          },
        ],
      },
      {
        date: "2026-08-18",
        label: "Tuesday — Mid-Series",
        sessions: [
          boothOpensSession,
          {
            time: "6:00 PM",
            title: "Jacqueline Tabor — first set",
            description: "First of two 45-minute sets.",
            performerSlug: "jacqueline-tabor",
          },
          {
            time: "7:15 PM",
            title: "Jacqueline Tabor — second set",
            description: "Second 45-minute set closes out the night.",
            performerSlug: "jacqueline-tabor",
          },
        ],
      },
      {
        date: "2026-08-25",
        label: "Tuesday — Closing Night",
        sessions: [
          boothOpensSession,
          {
            time: "6:00 PM",
            title: "Frames in Motion — first set",
            description: "First of two 45-minute sets.",
            performerSlug: "frames-in-motion",
          },
          {
            time: "7:15 PM",
            title: "Frames in Motion — second set",
            description:
              "Second 45-minute set closes out the season.",
            performerSlug: "frames-in-motion",
          },
        ],
      },
    ],
  },
  lineup: [
    {
      slug: "miller-campbell",
      name: "Miller Campbell",
      bio: "A returning Madrona favorite bringing twangy, gritty, extremely honest heartland rock in the spirit of Tom Petty and John Mellencamp.",
      imageSrc: "/events/madrona/lineup/miller-campbell.jpg",
      imageAlt: "Miller Campbell and her band performing on stage",
      extendedBio:
        "The season opens with the return of Miller Campbell, who last played Music in the Playfield in 2024. A cousin of country legend Glen Campbell, Miller spent three years playing in a Seattle band before settling in Bigfork, Montana, where she now writes and records.\n\nSince her last Madrona set she has released her self-titled debut album and is touring the UK and Europe this summer before bringing the band back home for opening night.",
      featuredQuote: {
        text: "Twangy and gritty, and extremely honest.",
        attribution: "Daily Inter Lake",
      },
      setTimes: [
        { day: "2026-08-11", time: "6:00 PM" },
        { day: "2026-08-11", time: "7:15 PM" },
      ],
    },
    {
      slug: "jacqueline-tabor",
      name: "Jacqueline Tabor",
      bio: "Celebrated Seattle jazz, blues, and swing vocalist — four-time Earshot Jazz Vocalist of the Year and Earshot Jazz Hall of Fame inductee.",
      imageSrc: "/events/madrona/lineup/jacqueline-tabor.jpg",
      imageAlt: "Jacqueline Tabor performing with her band",
      extendedBio:
        "Anchoring the middle of the season is Jacqueline Tabor, one of Seattle's most celebrated jazz, blues, and swing vocalists — a four-time Earshot Jazz Vocalist of the Year, recently inducted into the Earshot Jazz Hall of Fame.\n\nWhat makes her performance memorable is the way her voice can quiet a crowd, even in a busy summer park. Her depth of skill, emotional range, and honesty pull every listener in, whether you came for the jazz or wandered over from the playground. Backed by her band, August 18 is the kind of evening worth bringing a blanket for.",
      setTimes: [
        { day: "2026-08-18", time: "6:00 PM" },
        { day: "2026-08-18", time: "7:15 PM" },
      ],
    },
    {
      slug: "frames-in-motion",
      name: "Frames in Motion",
      bio: "Joyous five-piece indie folk-rock from Seattle, led by singer-songwriter Jack Shriner — with Madrona and Leschi roots.",
      imageSrc: "/events/madrona/lineup/frames-in-motion.jpg",
      imageAlt: "Frames in Motion band photo, outdoor field",
      extendedBio:
        "The series closes with Frames in Motion, led by singer-songwriter and guitarist Jack Shriner. Jack's family lived in neighboring Leschi for a decade, and he still thinks of Madrona and Leschi as home — this booking is a bit of a homecoming.\n\nThe band fuses interlocking vocal, guitar, fiddle, and keyboard melodies with rhythms that tend to get people up and moving: reminiscent of classic pop-rock, but with a voice uniquely their own, built to close out a summer evening on the grass.",
      featuredQuote: {
        text: "The multi-layered warmth of this band's elemental sound … will bond and become friends with the little piece of soul within you that understands your fellow human.",
        attribution: "Dive-In Magazine",
      },
      setTimes: [
        { day: "2026-08-25", time: "6:00 PM" },
        { day: "2026-08-25", time: "7:15 PM" },
      ],
    },
  ],
  sponsors: [
    {
      name: "Madrona Neighborhood Association",
      logoSrc: "/events/madrona/sponsors/madrona-neighborhood-association.svg",
      logoAlt: "Madrona Neighborhood Association logo",
      href: "https://madrona.us",
      tier: "Hosting",
      shortDescription:
        "The neighborhood association that hosts Music in the Playfield — three free Tuesday concerts every August.",
    },
  ],
  faq: [
    {
      question: "What is Music in the Playfield?",
      answer:
        "A free summer concert series the Madrona Neighborhood Association hosts on the Madrona Playfield. Three Tuesday evenings of community music; bring a blanket and picnic.",
    },
    {
      question: "How much does it cost?",
      answer: "All three evenings are free to attend.",
    },
    {
      question: "What if it rains?",
      answer:
        "Concerts are free, family-friendly, and held rain or shine.",
    },
    {
      question: "Where do I park?",
      answer:
        "There is no dedicated event parking — on-street parking is available in the surrounding neighborhood, and walking or biking is encouraged.",
    },
    {
      question: "Is the playfield accessible?",
      answer:
        "The listening area is the playfield's open lawn, reachable from the sidewalk. For specific accessibility questions, check with the Madrona Neighborhood Association at madrona.us.",
    },
  ],
  cta: {
    label: "Play the Madrona quiz",
    sublabel:
      `Answer a few neighborhood questions, then show your completion screen at the ${madronaFacts.booth.shortName} for tonight's ${madronaFacts.rewardNoun}.`,
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
  newsletterSignup: {
    heading: "Sign up for updates",
    body: "Get next week's lineup and neighborhood events in your inbox — straight from the Madrona Neighborhood Association.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    submitLabel: "Sign me up",
    thankYouMessage:
      "You're on the list — see you at the Playfield.",
  },
  donate: {
    heading: "Keep the Playfield free",
    body: "These concerts are free because neighbors chip in — 100% of donations go to the Madrona Neighborhood Association.",
    buttonLabel: "Support the Playfield",
    href: madronaFacts.donateHref,
  },
  masthead: {
    quiz: { label: "Quiz", href: routes.game("madrona") },
    feedback: { label: "Feedback", href: "/event/madrona/feedback" },
    signup: { label: "Sign up", href: "/event/madrona/signup" },
    donate: { label: "Donate", href: madronaFacts.donateHref },
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
