import { madronaFacts } from "../../../shared/events/madrona-facts.ts";
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
 * no student opener — Miller Campbell plays true 45-minute sets
 * (6:00 first set / 6:45 intermission / 7:00 resume / 7:45 closing
 * thanks, music ending 7:45 with thanks running to the 8:00 close;
 * organizer decision 2026-08-06, keeping the "two 45-minute sets"
 * description accurate on every night) — **Aug 18** opens at 6:00
 * with Tessa
 * Chen on flute, and **Aug 25** opens at 6:00 with Lennon Jennings
 * on cello (with teacher Liz Mathiesen) and Logan Wilcox on
 * trumpet (with teacher Evan); main sets start at 6:15 on the two
 * opener nights. Run-of-show
 * `time` strings are bare clock readings ("5:30") because the
 * Tonight section's date line already fixes the evening context.
 * Each night also carries its headliner sponsor credit (Poppie /
 * Cambium / Zac Lee, per the 2026-08-06 sponsor placement
 * decision); the logo files land under
 * `/events/madrona/sponsors/` via the design-tokens asset slice,
 * and the Zac Lee mark is a DRAFT lockup until the final arrives
 * (a content-only swap, safe any time before Aug 25). `nights`
 * drives the landing page's Tonight / Next-concert / season-wrap
 * section through the `resolveTonight` resolver in
 * `apps/site/lib/eventNights.ts`, which computes the state in
 * America/Los_Angeles.
 *
 * `landing` opts madrona into the day-of landing layout
 * (`EventDayOfLanding`, redesign spec §4): masthead-art hero with
 * the quiet body-face orientation line beneath it (it names what the
 * page carries; the art above it already says where the reader is),
 * the four-tile action grid (subtitle copy
 * is the spec's), the Meter Music School presenting-sponsor band
 * (logo-only — no verified Meter URL, and a link's presence is a
 * claim of verification), the season-wrap copy shown from Aug 26,
 * and the dark footer band's three lines (the masthead art's banner
 * line, the volunteer sentence, and the contact address). With
 * `landing` present the generic sections (`hero` text block,
 * `schedule`, full `lineup` bios, `sponsors`, `cta`) no longer
 * render on the landing page — `hero` still feeds route metadata
 * and the OG card, `schedule` remains the generic-agenda source of
 * truth for any surface that wants it, and `lineup` feeds the
 * On-stage section (tagline = `bio`, blurb = `extendedBio`, chips =
 * `artistLinks`) and the This-season strip.
 *
 * `faq` is deliberately absent. The day-of page is read by someone
 * already standing at the Playfield, and the entries it carried
 * answered what-is-this, how-much, and where-do-I-park — questions a
 * person asks while deciding whether to come, on a page they only
 * reach once they have. The FAQ capability is untouched at the
 * platform level; the two test events still render it.
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
 * The sticky masthead header bar is not configured here: its content
 * lives in the cross-app registry at
 * `shared/masthead/mastheadContent.ts` because the quiz app renders
 * the same bar and this apps/site module is not importable there.
 *
 * The email-list affordance (`landing.actions.emailList`) points at
 * the association's own Mailchimp signup page, composed from
 * `madrona-facts.ts` because three surfaces state the same address:
 * this tile, the masthead nav item, and the quiz completion panel.
 * The platform serves no signup route of its own — the association
 * already runs the list, and it is not called a newsletter anywhere
 * an attendee reads, because the association's newsletter is a
 * printed mailer. The feedback form's opt-in checkbox is a separate
 * seam and is unchanged: it still writes through `subscribe_email`
 * into the `newsletter_opt_ins` consent log, gated at the DB by the
 * `newsletter_enabled_events` registry row.
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
  landing: {
    hero: {
      mastheadSvgPath: "/events/madrona/masthead.svg",
      welcomeLine:
        "Everything for tonight — the schedule, the quiz, and who’s playing.",
    },
    actions: {
      quiz: {
        label: "Take the quiz",
        subtitle: "how well do you know Madrona?",
      },
      emailList: {
        label: "Email list",
        subtitle: "neighborhood news from the association",
        href: madronaFacts.emailListHref,
        external: true,
      },
      feedback: {
        label: "Feedback",
        subtitle: "tell us how tonight went",
      },
      donate: {
        label: "Donate",
        subtitle: "keep the concerts free",
      },
    },
    presentingSponsor: {
      name: "Meter Music School",
      logoSrc: "/events/madrona/sponsors/meter-music-school-navy.png",
      logoAlt: "Meter Music School logo",
    },
    seasonWrap: {
      heading: "That’s a wrap on 2026",
      body: "Thank you to every neighbor, sponsor, and volunteer who filled the Playfield with music this summer. See you next year.",
    },
    footer: {
      bannerLine: "★ Your neighborhood · Your music · Your park ★",
      volunteerLine:
        "Run entirely by Madrona Neighborhood Association volunteers, with help from local sponsors and neighbors like you.",
      contactLabel: "Volunteer or contribute",
      contactEmail: "musicintheplayfield@madrona.us",
    },
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
          { time: "6:45", title: "Intermission" },
          { time: "7:00", title: "Music resumes", mainSet: true },
          { time: "7:45", title: "Closing thanks" },
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
  cta: {
    label: "Play the Madrona quiz",
    sublabel:
      `Answer a few neighborhood questions, then show your code at the ${madronaFacts.booth.shortName} to claim a ${madronaFacts.rewardNoun}.`,
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
  donate: {
    heading: "Keep the Playfield free",
    body: "These concerts are free because neighbors chip in — 100% of donations go to the Madrona Neighborhood Association.",
    buttonLabel: "Support the Playfield",
    href: madronaFacts.donateHref,
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
