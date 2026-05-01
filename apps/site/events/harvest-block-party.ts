import type { EventContent } from "../lib/eventContent.ts";

/**
 * Harvest Block Party — fictional test event used to prove the
 * `/event/[slug]` rendering pipeline end-to-end against a non-Sage-Civic
 * Theme. `testEvent: true` triggers the disclaimer banner and the
 * `robots: { index: false, follow: false }` SSR meta so the page is
 * never indexed by crawlers; Madrona in M4 omits the field. All
 * structural depth (multiple schedule days, lineup with set times,
 * sponsors with logos and links, FAQ) is populated so UI review
 * exercises every section component.
 */
export const harvestBlockPartyContent: EventContent = {
  slug: "harvest-block-party",
  themeSlug: "harvest-block-party",
  testEvent: true,
  meta: {
    title: "Harvest Block Party — Demo Event",
    description:
      "A two-day fall block party with live music, neighborhood food, and family activities. Demo content for platform testing.",
  },
  hero: {
    name: "Harvest Block Party",
    tagline: "A two-day neighborhood fall festival",
    dates: { start: "2026-09-26", end: "2026-09-27" },
    location: "Maple Street Commons, Anytown",
  },
  schedule: {
    days: [
      {
        date: "2026-09-26",
        label: "Saturday — Opening Day",
        sessions: [
          {
            time: "11:00 AM",
            title: "Gates open & welcome",
            description:
              "Pick up your neighborhood map and visit the welcome booth.",
          },
          {
            time: "12:00 PM",
            title: "Pumpkin patch & kids' parade",
            description:
              "Family-friendly outdoor games on the Maple Street lawn.",
          },
          {
            time: "2:00 PM",
            title: "Maple Street String Band",
            description: "Acoustic folk on the main stage.",
            performerSlug: "maple-street-string-band",
          },
          {
            time: "4:00 PM",
            title: "Heirloom Pie Bake-Off",
            description:
              "Neighborhood bakers compete for the bronze rolling pin.",
          },
          {
            time: "7:00 PM",
            title: "The Cider Press Quartet",
            description: "Headlining set with seasonal cider on tap.",
            performerSlug: "the-cider-press-quartet",
          },
        ],
      },
      {
        date: "2026-09-27",
        label: "Sunday — Community Day",
        sessions: [
          {
            time: "10:00 AM",
            title: "Pancake breakfast & coffee",
            description: "Hosted by Maple Street Volunteer Fire.",
          },
          {
            time: "12:00 PM",
            title: "Local Makers Market",
            description: "Browse handmade goods from neighborhood artisans.",
          },
          {
            time: "3:00 PM",
            title: "Brass on the Boulevard",
            description: "An afternoon brass set from a local ensemble.",
            performerSlug: "brass-on-the-boulevard",
          },
          {
            time: "5:30 PM",
            title: "Lantern lighting & farewell",
            description:
              "Close the weekend with paper lanterns along Maple Street.",
            performerSlug: "lantern-collective",
          },
        ],
      },
    ],
  },
  lineup: [
    {
      slug: "maple-street-string-band",
      name: "Maple Street String Band",
      bio: "A five-piece acoustic group rooted in Appalachian folk.",
      setTimes: [{ day: "2026-09-26", time: "2:00 PM" }],
    },
    {
      slug: "the-cider-press-quartet",
      name: "The Cider Press Quartet",
      bio: "Genre-bending jazz quartet headlining Saturday night.",
      setTimes: [{ day: "2026-09-26", time: "7:00 PM" }],
    },
    {
      slug: "brass-on-the-boulevard",
      name: "Brass on the Boulevard",
      bio: "Twelve-piece brass ensemble from the next neighborhood over.",
      setTimes: [{ day: "2026-09-27", time: "3:00 PM" }],
    },
    {
      slug: "lantern-collective",
      name: "The Lantern Collective",
      bio: "A community art collective leading Sunday's closing ritual.",
      setTimes: [{ day: "2026-09-27", time: "5:30 PM" }],
    },
  ],
  sponsors: [
    {
      name: "Maple Street Co-op",
      logoSrc: "/test-events/harvest-block-party/maple-street-coop.svg",
      logoAlt: "Maple Street Co-op logo",
      href: "https://example.com/maple-street-coop",
      tier: "Headline",
    },
    {
      name: "Anytown Cider Works",
      logoSrc: "/test-events/harvest-block-party/anytown-cider-works.svg",
      logoAlt: "Anytown Cider Works logo",
      href: "https://example.com/anytown-cider-works",
      tier: "Headline",
    },
    {
      name: "Boulevard Bakers",
      logoSrc: "/test-events/harvest-block-party/boulevard-bakers.svg",
      logoAlt: "Boulevard Bakers logo",
      href: "https://example.com/boulevard-bakers",
      tier: "Supporting",
    },
    {
      name: "Riverside Roastery",
      logoSrc: "/test-events/harvest-block-party/riverside-roastery.svg",
      logoAlt: "Riverside Roastery logo",
      href: "https://example.com/riverside-roastery",
      tier: "Supporting",
    },
    {
      name: "Northside Press",
      logoSrc: "/test-events/harvest-block-party/northside-press.svg",
      logoAlt: "Northside Press logo",
      href: "https://example.com/northside-press",
      tier: "Supporting",
    },
  ],
  faq: [
    {
      question: "Is this a real event?",
      answer:
        "No. The Harvest Block Party is fictional — it exists so the Neighborly Events platform team can exercise the public event landing pipeline end-to-end before real events ship.",
    },
    {
      question: "How much does it cost?",
      answer:
        "All weekend programming is free. Individual vendors set their own prices for food and goods.",
    },
    {
      question: "Where do I park?",
      answer:
        "On-street parking is available throughout the neighborhood. The Maple Street Lot is reserved for accessible parking and event volunteers.",
    },
    {
      question: "Is the event accessible?",
      answer:
        "Yes. The main stage area, food vendors, and restrooms are all step-free; accessible parking and seating are available near the welcome booth.",
    },
    {
      question: "Can I bring my dog?",
      answer:
        "Leashed, friendly dogs are welcome on the lawn and in the maker market. Please skip the kids' play zone and the indoor pavilion.",
    },
  ],
  cta: {
    label: "Play the Harvest Block Party game",
    sublabel: "Earn stamps at participating booths to unlock prizes.",
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
