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
 */
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
    setTimes: Array<{ day: string; time: string }>;
  }>;
  sponsors: Array<{
    name: string;
    logoSrc: string;
    logoAlt: string;
    href: string;
    tier?: string;
  }>;
  faq: Array<{ question: string; answer: string }>;
  cta: { label: string; sublabel?: string };
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
