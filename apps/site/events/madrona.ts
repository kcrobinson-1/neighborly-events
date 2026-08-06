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
 * Canonical sources live in the `mip-2026` repository (newsletter,
 * band bios, event program), and lineup photos are resized copies
 * from `docs/workstreams/marketing/assets/bands/`. Bio copy adapts
 * those docs with every claim cross-checked against the artist's
 * own published pages (Aug 2026): no artist-residence claims (the
 * source docs' Bigfork line conflicts with current bios), Miller
 * Campbell's album is "her new self-titled album" (never "debut"),
 * and Tabor's Hall of Fame induction stays undated. The page is
 * indexable (no `meta.robots`) — this content is the launch
 * surface.
 *
 * `nights` is the per-night content model (`EventContent.nights`)
 * behind the redesigned landing page's Tonight / Next-concert
 * section. The source docs disagreed on the per-hour run-of-show
 * (6:00 vs 6:15 main-band start; the Meter Music School opener
 * appeared only in the centerfold), so the organizer decision of
 * 2026-08-05 published times-only — "two 45-minute sets" between
 * 6:00 and 8:00 PM, no per-hour timeline, no opener billing — and
 * `schedule.days` still reflects that summary shape. Meter Music
 * School's email of 2026-08-06 resolved the conflict and
 * supersedes that decision for the per-night model: **Aug 11** has
 * no student opener (Miller Campbell's first set starts at 6:00),
 * **Aug 18** opens at 6:00 with Tessa Chen on flute, and **Aug 25**
 * opens at 6:00 with Lennon Jennings on cello (with teacher Liz
 * Mathiesen) and Logan Wilcox on trumpet (with teacher Evan);
 * main sets start at 6:15 on the two opener nights. Run-of-show
 * `time` strings are bare clock readings ("5:30") because the
 * Tonight section's date line already fixes the evening context.
 * Each night also carries its headliner sponsor credit (Poppie /
 * Cambium / Zac Lee, per the 2026-08-06 sponsor placement
 * decision); the logo files land under
 * `/events/madrona/sponsors/` via the design-tokens asset slice,
 * and the Zac Lee mark is a DRAFT lockup until the final arrives
 * (a content-only swap, safe any time before Aug 25). Until the
 * landing rebuild ships, `nights` is dormant data — no current
 * section renders it — validated by the content tests and the
 * `resolveTonight` resolver in `apps/site/lib/eventNights.ts`,
 * which computes tonight / next-concert / season-wrap states in
 * America/Los_Angeles.
 *
 * Band `artistLinks` carry each artist's verified web presence:
 * only URLs confirmed against the artist's own official site or
 * platform page are listed, and unverified or missing profiles
 * (Frames in Motion's Apple Music / Instagram / Facebook /
 * YouTube) are omitted rather than guessed — a chip's presence is
 * a claim of verification. Frames in Motion's Bandcamp is the band's own;
 * Miller Campbell's points at her label's album page (no artist
 * Bandcamp exists).
 *
 * `sponsors` deliberately carries only the hosting Madrona
 * Neighborhood Association entry for now: real 2026 business
 * sponsors are confirmed-list-pending, and entries land in a
 * follow-up once the list, tiers, and links are final — the
 * renderer's render-when-present guards make the absence invisible
 * rather than placeholder-filled.
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
            time: "6:00–8:00 PM",
            title: "Miller Campbell",
            description: "Two 45-minute sets of heartland rock open the season.",
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
            time: "6:00–8:00 PM",
            title: "Jacqueline Tabor",
            description: "Two 45-minute sets of jazz, blues, and swing.",
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
            time: "6:00–8:00 PM",
            title: "Frames in Motion",
            description:
              "Two 45-minute sets of indie folk-rock close out the season.",
            performerSlug: "frames-in-motion",
          },
        ],
      },
    ],
  },
  nights: {
    timezone: "America/Los_Angeles",
    nights: [
      {
        date: "2026-08-11",
        label: "Opening Night",
        performerSlug: "miller-campbell",
        runOfShow: [
          { time: "5:30", title: "Gathering opens" },
          {
            time: "6:00",
            title: "Miller Campbell — first set",
            mainSet: true,
          },
          { time: "7:00", title: "Intermission" },
          { time: "7:15", title: "Music resumes", mainSet: true },
          { time: "8:00", title: "Closing thanks" },
        ],
        headlinerSponsor: {
          name: "Poppie",
          logoSrc: "/events/madrona/sponsors/poppie.png",
          logoAlt: "Poppie logo",
        },
      },
      {
        date: "2026-08-18",
        label: "Mid-Series",
        performerSlug: "jacqueline-tabor",
        runOfShow: [
          { time: "5:30", title: "Gathering opens" },
          {
            time: "6:00",
            title: "Meter Music School",
            description: "Tessa Chen, flute",
          },
          {
            time: "6:15",
            title: "Jacqueline Tabor — first set",
            mainSet: true,
          },
          { time: "7:00", title: "Intermission" },
          { time: "7:15", title: "Music resumes", mainSet: true },
          { time: "8:00", title: "Closing thanks" },
        ],
        headlinerSponsor: {
          name: "Cambium",
          logoSrc: "/events/madrona/sponsors/cambium.png",
          logoAlt: "Cambium logo",
        },
      },
      {
        date: "2026-08-25",
        label: "Closing Night",
        performerSlug: "frames-in-motion",
        runOfShow: [
          { time: "5:30", title: "Gathering opens" },
          {
            time: "6:00",
            title: "Meter Music School",
            description:
              "Lennon Jennings, cello (with teacher Liz Mathiesen) and Logan Wilcox, trumpet (with teacher Evan)",
          },
          {
            time: "6:15",
            title: "Frames in Motion — first set",
            mainSet: true,
          },
          { time: "7:00", title: "Intermission" },
          { time: "7:15", title: "Music resumes", mainSet: true },
          { time: "8:00", title: "Closing thanks" },
        ],
        headlinerSponsor: {
          name: "Zac Lee",
          logoSrc: "/events/madrona/sponsors/zac-lee.png",
          logoAlt: "Zac Lee — Coldwell Banker Bain logo",
        },
      },
    ],
  },
  lineup: [
    {
      slug: "miller-campbell",
      name: "Miller Campbell",
      bio: "Twangy, gritty heartland rock — a returning Madrona favorite, back with her new self-titled album.",
      imageSrc: "/events/madrona/lineup/miller-campbell.jpg",
      imageAlt: "Miller Campbell and her band performing on stage",
      extendedBio:
        "The season opens with the return of Miller Campbell, who last played Music in the Playfield in 2024 and left the crowd buzzing with her twangy, gritty, and extremely honest brand of heartland rock in the spirit of Tom Petty and John Mellencamp. A cousin of country legend Glen Campbell, Miller spent three years playing in a Seattle band before striking out on her own.\n\nA lot has happened since her last Madrona set: Miller has released her new self-titled album and is touring the UK and Europe this summer before bringing the band back home for opening night.",
      artistLinks: {
        website: "https://www.millercampbell.com",
        spotify: "https://open.spotify.com/artist/6bxc6mv1yH88XRwQjORrKz",
        appleMusic:
          "https://music.apple.com/us/artist/miller-campbell/1292569031",
        instagram: "https://www.instagram.com/millercampbellmusic/",
        facebook: "https://www.facebook.com/millercampbellmusic/",
        youtube: "https://www.youtube.com/@millercampbellmusic",
        bandcamp:
          "https://legererecordings.bandcamp.com/album/miller-campbell",
      },
      setTimes: [{ day: "2026-08-11", time: "6:00–8:00 PM" }],
    },
    {
      slug: "jacqueline-tabor",
      name: "Jacqueline Tabor",
      bio: "Jazz, blues, and swing from the “Seattle Chanteuse” — four-time Earshot Jazz Vocalist of the Year.",
      imageSrc: "/events/madrona/lineup/jacqueline-tabor.jpg",
      imageAlt: "Jacqueline Tabor performing with her band",
      extendedBio:
        "Jacqueline Tabor is one of Seattle's most celebrated jazz, blues, and swing vocalists. She has won Earshot Jazz Vocalist of the Year four times and was recently inducted into the Earshot Jazz Hall of Fame.\n\nWhat makes a Jacqueline Tabor performance memorable is not just the resume — it's the way her voice can quiet a crowd, even in a busy summer park. Her depth of skill, emotional range, and honesty pull every listener in, whether you came for the jazz or wandered over from the playground. Backed by her band, August 18 is the kind of evening worth bringing a blanket for.",
      artistLinks: {
        website: "https://taborjazz.com",
        spotify: "https://open.spotify.com/artist/0wgUrSuMyn2ScMNOdWAe7p",
        appleMusic:
          "https://music.apple.com/us/artist/jacqueline-tabor/894927204",
        instagram: "https://www.instagram.com/seattlechanteuse/",
        facebook: "https://www.facebook.com/p/Tabor-Jazz-100063639307373/",
        youtube: "https://www.youtube.com/@JacquelineTaborjazz",
      },
      setTimes: [{ day: "2026-08-18", time: "6:00–8:00 PM" }],
    },
    {
      slug: "frames-in-motion",
      name: "Frames in Motion",
      bio: "Joyous Seattle indie folk-rock with Leschi roots — a homecoming to close the season.",
      imageSrc: "/events/madrona/lineup/frames-in-motion.jpg",
      imageAlt: "Frames in Motion band photo, outdoor field",
      extendedBio:
        "The series closes with Frames in Motion, a joyous five-piece indie folk-rock band from Seattle led by singer-songwriter and guitarist Jack Shriner. Jack's family lived in neighboring Leschi for a decade, and he still thinks of Madrona and Leschi as home — which makes this booking a bit of a homecoming.\n\nThe band fuses interlocking vocal, guitar, fiddle, and keyboard melodies with rhythms that tend to get people up and moving. The songs are reminiscent of classic pop-rock but forge ahead with a voice uniquely their own — Dive-In Magazine praises “the multi-layered warmth of this band's elemental sound.” Their live set is built to close out a summer evening on the grass.",
      artistLinks: {
        website: "https://www.framesinmotionband.com",
        spotify: "https://open.spotify.com/artist/35FepponJp4JM0EbvAfaXQ",
        bandcamp: "https://framesinmotion.bandcamp.com",
      },
      setTimes: [{ day: "2026-08-25", time: "6:00–8:00 PM" }],
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
        "A free summer concert series on the Madrona Playfield, organized and run entirely by Madrona Neighborhood Association volunteers with support from local sponsors and neighbor donations. Three Tuesday evenings of community music; bring a blanket and picnic.",
    },
    {
      question: "Why is there no concert on Tuesday, August 4?",
      answer:
        "That night is deliberately left open — August 4 is Seattle Night Out, and the series skips it so neighbors can be at their block parties. Concerts run the three Tuesdays after: August 11, 18, and 25.",
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
