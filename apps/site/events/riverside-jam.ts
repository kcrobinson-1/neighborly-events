import type { EventContent } from "../lib/eventContent.ts";

/**
 * Riverside Jam — fictional summer riverside music festival, the
 * second test event registered against apps/site's `/event/[slug]`
 * rendering pipeline (M3 phase 3.2). Pairs with the cool maritime
 * `riversideJamTheme` to prove the registry-driven multi-theme
 * pipeline works across two visually-distinct identities.
 *
 * `testEvent: true` triggers the disclaimer banner and the
 * `robots: { index: false, follow: false }` SSR meta so the page is
 * never indexed by crawlers; Madrona in M4 omits the field. All
 * structural depth (two schedule days, lineup with set-time
 * cross-references, sponsors with logos and tier groupings, FAQ
 * including an explicit test-event disclosure first) mirrors the
 * harvest precedent so the multi-theme proof rests on
 * visually-equivalent content density across the two test events.
 */
export const riversideJamContent: EventContent = {
  slug: "riverside-jam",
  themeSlug: "riverside-jam",
  testEvent: true,
  meta: {
    title: "Riverside Jam — Demo Event",
    description:
      "A two-day summer riverside music festival with live bands, waterfront food, and sunset sets. Demo content for platform testing.",
  },
  hero: {
    name: "Riverside Jam",
    tagline: "A two-day waterfront summer music festival",
    dates: { start: "2026-07-18", end: "2026-07-19" },
    location: "Harborlight Pier, Anytown",
  },
  schedule: {
    days: [
      {
        date: "2026-07-18",
        label: "Saturday — Opening Day",
        sessions: [
          {
            time: "11:00 AM",
            title: "Gates open & boardwalk welcome",
            description:
              "Pick up your festival wristband at the harbor entrance.",
          },
          {
            time: "12:30 PM",
            title: "Tide Pool Trio",
            description: "Indie folk on the harbor stage.",
            performerSlug: "tide-pool-trio",
          },
          {
            time: "3:00 PM",
            title: "Waterfront food stalls open",
            description: "Local vendors line the pier through sunset.",
          },
          {
            time: "5:00 PM",
            title: "Anchor Bay Brass",
            description: "Twelve-piece brass set on the main stage.",
            performerSlug: "anchor-bay-brass",
          },
          {
            time: "8:00 PM",
            title: "The Lighthouse Keepers",
            description: "Headlining indie rock as the sun drops.",
            performerSlug: "the-lighthouse-keepers",
          },
        ],
      },
      {
        date: "2026-07-19",
        label: "Sunday — Sunset Day",
        sessions: [
          {
            time: "10:00 AM",
            title: "Harbor coffee & rigging tour",
            description: "Free tour of the historic pier rigging.",
          },
          {
            time: "12:00 PM",
            title: "Marina Makers Market",
            description: "Browse handmade goods from waterfront artisans.",
          },
          {
            time: "2:30 PM",
            title: "Salt Air Strings",
            description: "Acoustic strings on the harbor stage.",
            performerSlug: "salt-air-strings",
          },
          {
            time: "5:00 PM",
            title: "Sunset DJ set & lantern launch",
            description:
              "Closing the festival with a sunset DJ and floating lanterns.",
            performerSlug: "the-lighthouse-keepers",
          },
        ],
      },
    ],
  },
  lineup: [
    {
      slug: "tide-pool-trio",
      name: "Tide Pool Trio",
      bio: "Three-piece indie folk group rooted in coastal songwriting.",
      setTimes: [{ day: "2026-07-18", time: "12:30 PM" }],
    },
    {
      slug: "anchor-bay-brass",
      name: "Anchor Bay Brass",
      bio: "Twelve-piece brass ensemble built around marching-band traditions.",
      setTimes: [{ day: "2026-07-18", time: "5:00 PM" }],
    },
    {
      slug: "the-lighthouse-keepers",
      name: "The Lighthouse Keepers",
      bio: "Headlining indie rock quintet with two harbor-released EPs.",
      setTimes: [
        { day: "2026-07-18", time: "8:00 PM" },
        { day: "2026-07-19", time: "5:00 PM" },
      ],
    },
    {
      slug: "salt-air-strings",
      name: "Salt Air Strings",
      bio: "Acoustic string quartet pulling from chamber folk and sea shanty.",
      setTimes: [{ day: "2026-07-19", time: "2:30 PM" }],
    },
  ],
  sponsors: [
    {
      name: "Riverside Brewing Co.",
      logoSrc: "/test-events/riverside-jam/riverside-brewing-co.svg",
      logoAlt: "Riverside Brewing Co. logo",
      href: "https://example.com/riverside-brewing-co",
      tier: "Headline",
    },
    {
      name: "Harborlight Sound",
      logoSrc: "/test-events/riverside-jam/harborlight-sound.svg",
      logoAlt: "Harborlight Sound logo",
      href: "https://example.com/harborlight-sound",
      tier: "Headline",
    },
    {
      name: "Marina District Records",
      logoSrc: "/test-events/riverside-jam/marina-district-records.svg",
      logoAlt: "Marina District Records logo",
      href: "https://example.com/marina-district-records",
      tier: "Supporting",
    },
    {
      name: "Boardwalk Bites",
      logoSrc: "/test-events/riverside-jam/boardwalk-bites.svg",
      logoAlt: "Boardwalk Bites logo",
      href: "https://example.com/boardwalk-bites",
      tier: "Supporting",
    },
    {
      name: "Lighthouse Outfitters",
      logoSrc: "/test-events/riverside-jam/lighthouse-outfitters.svg",
      logoAlt: "Lighthouse Outfitters logo",
      href: "https://example.com/lighthouse-outfitters",
      tier: "Supporting",
    },
  ],
  faq: [
    {
      question: "Is this a real event?",
      answer:
        "No. Riverside Jam is fictional — it exists so the Neighborly Events platform team can exercise the public event landing pipeline against a second per-event Theme alongside the Harvest Block Party demo.",
    },
    {
      question: "How much does it cost?",
      answer:
        "All weekend programming is free. Individual food and merch vendors set their own prices.",
    },
    {
      question: "Where do I park?",
      answer:
        "Public parking is available at the Harborlight Garage on Marina Way. Accessible parking is reserved at the pier entrance for the full weekend.",
    },
    {
      question: "Is the festival accessible?",
      answer:
        "Yes. The pier, both stages, food stalls, and restrooms are all step-free; accessible seating is available near the harbor stage and the main stage.",
    },
    {
      question: "Can I bring my dog?",
      answer:
        "Leashed, friendly dogs are welcome on the boardwalk and at the makers market. Please skip the main-stage seating area and the food stall queue.",
    },
  ],
  cta: {
    label: "Play the Riverside Jam game",
    sublabel: "Earn stamps at participating booths to unlock prizes.",
  },
  footer: {
    attribution:
      "Hosted on Neighborly Events — a platform for neighborhood-scale events.",
  },
};
