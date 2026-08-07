/**
 * `EventContent` is the binding contract for every event the
 * `/event/[slug]` rendering pipeline can render. Every section
 * component takes its data from `EventContent` props passed down
 * from the page route — no section reads a per-event globals file,
 * a slug-keyed lookup inside its own body, or a per-section content
 * module. The two test events (`harvest-block-party`, `riverside-jam`)
 * and Madrona (registered by the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.1) consume the same shape; if a section needs new data,
 * the data lives on `EventContent`, not on a side channel.
 *
 * Date strings (`hero.dates.*`, `schedule.days[].date`,
 * `lineup[].setTimes[].day`) are ISO `yyyy-mm-dd` calendar strings.
 * The renderer never interprets them in a local timezone — display
 * formatting builds output from parsed numeric components, not from
 * a `Date` instance — so the date a content author writes is the
 * date a reader sees regardless of viewer locale. Validation goes
 * through `parseEventDate` (below), which uses `Date.UTC` for a
 * round-trip calendar-validity check; that use is bounded to
 * validation and never escapes into rendering. A future
 * multi-timezone event can land an optional `timezone` field on
 * `hero.dates` without a shape break.
 *
 * `lineup[].setTimes[].day` cross-references
 * `schedule.days[].date`, and `schedule.days[].sessions[].performerSlug`
 * cross-references `lineup[].slug`. The renderer does not enforce
 * these cross-references — degraded state is preferred over a fake.
 *
 * `meta.robots`, when set to `"noindex"`, instructs the page route's
 * `generateMetadata` to emit `robots: { index: false, follow: false }`
 * regardless of `testEvent`. This lets non-test events opt into
 * `noindex` for demo-phase posture without setting `testEvent: true`
 * (which carries other consequences — disclaimer banner, demo-mode
 * auth bypass eligibility — that demo-mode events like Madrona must
 * not adopt; see the Madrona demo-build epic invariant 3). The field
 * type is the literal `"noindex"`, not a generic `string`, so future
 * posture additions go through phase planning rather than widening
 * this field's value type ad-hoc.
 *
 * `meta.logoSrc` and `meta.logoAlt`, when both present, render a
 * brand-mark `<img>` above the hero text in `EventHeader`. The
 * pair is optional: when either is absent, the hero renders
 * unchanged byte-for-byte (the load-bearing falsifier for the M1
 * cross-cutting invariant 4 — render-when-present, not require-
 * when-absent). The renderer reads both fields together; setting
 * one without the other yields the no-logo render.
 *
 * `lineup[number]` and `sponsors[number]` carry additive optional
 * depth fields the [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.2 added: bands gain `imageSrc` / `imageAlt`,
 * `extendedBio`, and `featuredQuote`; sponsors gain
 * `shortDescription` and `socialLinks`. Every new field is
 * `?: T` and the `EventLineup` / `EventSponsors` renderers
 * truthiness-guard each independently — an event that omits the
 * new fields renders byte-for-byte identical to the pre-1.2
 * output (the same render-when-present discipline the
 * `meta.logoSrc/Alt` paragraph above commits to). The two test
 * events (`harvest-block-party`, `riverside-jam`) deliberately
 * omit the new fields so that falsifier stays structural rather
 * than aspirational. `extendedBio` splits on `\n\n` for paragraph
 * rendering — markdown is intentionally not supported in 1.2.
 * `featuredQuote.attribution` is meaningful only when
 * `featuredQuote.text` is present, so the pair nests; `imageAlt`
 * falls back to the band's `name` when `imageSrc` is present
 * without it.
 *
 * `lineup[number].artistLinks` is the typed successor to 1.2's
 * free-form `externalLinks` label/href list, which no event ever
 * populated: when real artist URLs were collected for Madrona,
 * the free list was replaced with a fixed slot set — `website`,
 * `spotify`, `appleMusic`, `instagram`, `facebook`, `youtube`,
 * `bandcamp`, each an optional external href — so `EventLineup`
 * owns the display labels and renders whichever slots are present
 * as consistently-ordered link chips (new tab, `rel="noopener"`).
 * Sponsors' `socialLinks` keeps its free label/href shape; the
 * two stay separately named (not unified under a generic
 * `links[]`) because the semantic role differs across bands and
 * sponsors, and the field-name specificity preserves invariant 2
 * — no foreclosure of the donation / feedback child epics.
 *
 * `feedback?` is the [Madrona feedback child epic](../../../docs/plans/epics/madrona-feedback/epic.md)
 * M1 phase 1.2 opt-in field: presence renders the
 * `EventFeedbackCTA` section on the landing page (between
 * `EventCTA` and `EventFooter`) and, in a future phase, makes
 * `/event/<slug>/feedback` a real form route. Absence omits the
 * CTA section and renders the disabled-event state on the
 * feedback route. The outer field name `feedback` provides
 * namespace, so inner field names stay domain-natural (`cta`,
 * `ratingDimensions`, `freeTextPrompt`, `emailCopy`,
 * `thankYouMessage`) without colliding with anything a future
 * `donation?` outer field might want — the same field-name-
 * specificity discipline the lineup / sponsor depth fields
 * adopted, applied at the outer-field level. The two test events
 * (`harvest-block-party`, `riverside-jam`) deliberately omit
 * `feedback` so the omission-guard falsifier stays structural.
 *
 * `newsletterSignup?` is the standalone email-capture counterpart to
 * `feedback?`, with the same presence semantics on its own route:
 * presence makes `/event/<slug>/signup` a real single-field form
 * route; absence renders the friendly disabled state there. The
 * form's anon write path is the `submit_newsletter_signup` SECURITY
 * DEFINER RPC, gated at the DB by the `newsletter_enabled_events`
 * registry (a seam deliberately separate from
 * `feedback_enabled_events`, so an event can offer signup without
 * offering feedback) — as with `feedback?`, enabling a new event
 * takes both a content-module edit (to surface the form) and a
 * registry seed (to admit writes). The two test events omit the
 * field so the omission-guard falsifier stays structural.
 *
 * `donate?` is the donation counterpart to `feedback?`, following
 * the same named-outer-field discipline (not a generic `links[]`):
 * presence renders the `EventDonateCTA` section on the landing page
 * (below `EventFeedbackCTA`, above `EventFooter`); absence omits
 * the section entirely, so events without a donation destination
 * render byte-for-byte identical to the pre-field output. `href` is
 * an external donation-platform URL and the renderer opens it in a
 * new tab with `rel="noopener"` — unlike the feedback CTA there is
 * no in-app donation route, so there is nothing slug-derived about
 * the destination.
 *
 * `nights?` is the per-night content model behind the Tonight /
 * Next-concert section of the redesigned landing page: one
 * `EventNight` per concert night carrying the night's date, display
 * label ("Opening Night"), per-hour `runOfShow` rows, the night's
 * performer (`performerSlug`, cross-referencing `lineup[].slug` the
 * same unenforced way `sessions[].performerSlug` does), and an
 * optional per-night `headlinerSponsor` credit. The container also
 * names the event's IANA `timezone`: which night is "tonight" is a
 * fact about the event's own clock, not the viewer's, and
 * `resolveTonight` ([`eventNights.ts`](./eventNights.ts)) is the one
 * consumer of that field. Run-of-show rows are display data —
 * `time` is a display string, not a timestamp, and `mainSet` marks
 * the headline performer's rows so the renderer (not the data)
 * owns the emphasis treatment. `nights` deliberately does not
 * replace `schedule` — `schedule.days` remains the generic
 * multi-day agenda shape every event renders today; `nights` is the
 * additive opt-in for events whose landing page leads with a single
 * resolved night. Absence renders byte-identically to the
 * pre-field output; the two test events omit it so the
 * omission-guard falsifier stays structural.
 *
 * `landing?` selects the day-of landing layout: presence renders
 * `EventDayOfLanding` (tonight-focused hero / action grid / resolver-
 * driven Tonight section) instead of the generic section template;
 * absence renders the generic template byte-identically to the
 * pre-field output. See `EventDayOfLandingContent` below for the
 * field-level contract.
 *
 * The sticky header bar is NOT an `EventContent` field: masthead
 * content lives in the cross-app registry at
 * `shared/masthead/mastheadContent.ts` (the
 * `shared/events/completionCta.ts` pattern) because the quiz app
 * renders the same bar and apps/site content modules are not
 * importable there. Routes resolve it per slug via
 * `getEventMasthead(slug)`; absence renders byte-identically to the
 * pre-masthead output.
 */
/**
 * One row of a night's run-of-show ("5:30 · Gathering opens").
 * `time` and `title` are display strings owned by the content
 * author; `description` carries detail lines (e.g. a student
 * opener's names and instruments) the renderer shows under the
 * title when present. `mainSet` marks rows that belong to the
 * night's headline performer — the data claims the semantic, the
 * renderer decides the visual emphasis.
 */
export type EventNightRow = {
  time: string;
  title: string;
  description?: string;
  mainSet?: boolean;
};

/**
 * The per-night headliner sponsor credit ("<Artist>'s performance
 * is brought to you by <logo>"). Distinct from the event-level
 * `sponsors` list: this is a per-night pairing, not a roster entry,
 * so it carries its own logo ref rather than cross-referencing
 * `sponsors[].name`. `href` is optional — a credit can be
 * logo-only.
 */
export type EventNightHeadlinerSponsor = {
  name: string;
  logoSrc: string;
  logoAlt: string;
  href?: string;
};

/**
 * One concert night of an `EventContent.nights` model. `date` is an
 * ISO `yyyy-mm-dd` calendar string in the event's timezone (same
 * authoring convention as `schedule.days[].date`);
 * `performerSlug` cross-references `lineup[].slug`, unenforced like
 * every other content cross-reference here.
 */
export type EventNight = {
  date: string;
  label: string;
  performerSlug: string;
  runOfShow: EventNightRow[];
  headlinerSponsor?: EventNightHeadlinerSponsor;
};

/**
 * The `EventContent.nights` container: the event's IANA `timezone`
 * (the zone `resolveTonight` computes "today" in) plus the night
 * list, in any order — resolution sorts a copy.
 */
export type EventNights = {
  timezone: string;
  nights: EventNight[];
};

/**
 * One tile of the day-of landing page's action grid. `label` is the
 * big display line ("Take the quiz"), `subtitle` the small one-liner
 * under it. Destinations are renderer-owned, not content fields:
 * quiz resolves through `routes.game(slug)`, newsletter and feedback
 * through the slug-derived in-app routes, donate through
 * `EventContent.donate.href` — so the grid can never disagree with
 * the routes the rest of the page uses.
 */
export type EventLandingAction = {
  label: string;
  subtitle: string;
};

/**
 * The event-wide presenting sponsor credit (the Madrona spec's putty
 * "PRESENTING SPONSOR" band above On stage). Distinct from the
 * per-night `EventNightHeadlinerSponsor`: this one renders every
 * night. `href` is optional — the credit can be logo-only, and for
 * launch it is (no verified sponsor URL, so no link; a chip's
 * presence is a claim of verification, and the same holds here).
 */
export type EventPresentingSponsor = {
  name: string;
  logoSrc: string;
  logoAlt: string;
  href?: string;
};

/**
 * Content for the day-of landing layout (`EventDayOfLanding`
 * renderer). Presence of `EventContent.landing` switches the event's
 * landing page from the generic multi-section template to the
 * tonight-focused layout; absence renders the generic template
 * byte-identically to the pre-field output (the test events omit it,
 * keeping that falsifier structural).
 *
 * `hero.mastheadSvgPath` is a `public/`-relative URL path to the
 * masthead art the hero inlines as SVG (the page route reads the
 * file at prerender time — see `readPublicSvg`). `seasonWrap` is the
 * post-final-night state's copy (the resolver's `seasonWrap` kind);
 * the footer fields are the dark band's three lines. An event that
 * adopts this layout is expected to also author `nights` — without
 * it the Tonight section resolves straight to the wrap state.
 */
export type EventDayOfLandingContent = {
  hero: {
    mastheadSvgPath: string;
    welcomeLine: string;
  };
  actions: {
    quiz: EventLandingAction;
    newsletter: EventLandingAction;
    feedback: EventLandingAction;
    donate: EventLandingAction;
  };
  presentingSponsor?: EventPresentingSponsor;
  seasonWrap: {
    heading: string;
    body: string;
  };
  footer: {
    bannerLine: string;
    volunteerLine: string;
    contactLabel: string;
    contactEmail: string;
  };
};

export type EventContent = {
  slug: string;
  themeSlug: string;
  testEvent?: boolean;
  meta: {
    title: string;
    description: string;
    openGraphType?: "website" | "article";
    robots?: "noindex";
    logoSrc?: string;
    logoAlt?: string;
  };
  hero: {
    name: string;
    tagline?: string;
    dates: { start: string; end: string };
    location: string;
  };
  schedule: {
    days: Array<{
      date: string;
      label?: string;
      sessions: Array<{
        time: string;
        title: string;
        description?: string;
        performerSlug?: string;
      }>;
    }>;
  };
  lineup: Array<{
    slug: string;
    name: string;
    bio?: string;
    imageSrc?: string;
    imageAlt?: string;
    extendedBio?: string;
    featuredQuote?: { text: string; attribution?: string };
    artistLinks?: {
      website?: string;
      spotify?: string;
      appleMusic?: string;
      instagram?: string;
      facebook?: string;
      youtube?: string;
      bandcamp?: string;
    };
    setTimes: Array<{ day: string; time: string }>;
  }>;
  sponsors: Array<{
    name: string;
    logoSrc: string;
    logoAlt: string;
    href: string;
    tier?: string;
    shortDescription?: string;
    socialLinks?: Array<{ label: string; href: string }>;
  }>;
  faq: Array<{ question: string; answer: string }>;
  cta: { label: string; sublabel?: string };
  feedback?: {
    cta: {
      heading: string;
      body?: string;
    };
    ratingDimensions: Array<{
      key: string;
      label: string;
    }>;
    freeTextPrompt: string;
    emailCopy: {
      label: string;
      placeholder?: string;
      newsletterOptInLabel: string;
    };
    thankYouMessage: string;
  };
  newsletterSignup?: {
    heading: string;
    body?: string;
    emailLabel: string;
    emailPlaceholder?: string;
    submitLabel: string;
    thankYouMessage: string;
  };
  donate?: {
    heading: string;
    body?: string;
    buttonLabel: string;
    href: string;
  };
  nights?: EventNights;
  landing?: EventDayOfLandingContent;
  footer?: { attribution?: string };
};

import { harvestBlockPartyContent } from "../events/harvest-block-party.ts";
import { madronaContent } from "../events/madrona.ts";
import { riversideJamContent } from "../events/riverside-jam.ts";

/**
 * Slug → content registry. M3 phase 3.1.1 registered the first
 * test event (`harvest-block-party`); M3 phase 3.2 extended the
 * literal with the second test event (`riverside-jam`); the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.1 registered Madrona as the first non-test entry.
 * Static imports keep tree-shaking and Next.js bundle analysis
 * predictable.
 */
const eventContentBySlug: Record<string, EventContent> = {
  [harvestBlockPartyContent.slug]: harvestBlockPartyContent,
  [madronaContent.slug]: madronaContent,
  [riversideJamContent.slug]: riversideJamContent,
};

/**
 * Synchronous slug → content resolver consumed by the page route's
 * `Page` and `generateMetadata`. Returns `null` for unknown slugs;
 * the caller decides 404 vs. fallback metadata.
 */
export function getEventContentBySlug(slug: string): EventContent | null {
  return eventContentBySlug[slug] ?? null;
}

/**
 * The list of registered event slugs. Consumed by the page route's
 * `generateStaticParams` so the prerender list stays in sync with
 * the registry by construction — adding a new event to
 * `eventContentBySlug` automatically extends the prerender set.
 */
export const registeredEventSlugs = Object.keys(eventContentBySlug);

/** Parsed ISO `yyyy-mm-dd` date as numeric calendar components. */
export type EventDate = { year: number; month: number; day: number };

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a strict ISO `yyyy-mm-dd` calendar string into its numeric
 * components. Returns `null` for any string that does not match the
 * pattern or that names a non-existent calendar date (out-of-range
 * month, out-of-range day, or month-specific overflow such as
 * Feb 30, Apr 31, or Feb 29 in a non-leap year).
 *
 * The `Date.UTC` round-trip is the calendar-validity check; using
 * UTC avoids timezone shift, and we never read display values off
 * the resulting `Date` — render output is built from the returned
 * numeric components — so this stays consistent with the
 * "renderer never interprets dates in a local timezone" property
 * stated on `EventContent` above.
 */
export function parseEventDate(value: string): EventDate | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));

  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}
