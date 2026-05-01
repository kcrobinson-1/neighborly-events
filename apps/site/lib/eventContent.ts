/**
 * `EventContent` is the binding contract for every event the
 * `/event/[slug]` rendering pipeline can render. Every section
 * component takes its data from `EventContent` props passed down
 * from the page route — no section reads a per-event globals file,
 * a slug-keyed lookup inside its own body, or a per-section content
 * module. M3 phase 3.2 (second test event) and M4 phase 4.2
 * (Madrona) consume the same shape; if a section needs new data,
 * the data lives on `EventContent`, not on a side channel.
 *
 * Date strings (`hero.dates.*`, `schedule.days[].date`,
 * `lineup[].setTimes[].day`) are treated as opaque ISO `yyyy-mm-dd`
 * strings by the rendering layer. No `Date` parsing, no timezone
 * math; if M4 surfaces a multi-timezone event, an optional
 * `timezone` field can land on `hero.dates` without a shape break.
 *
 * `lineup[].setTimes[].day` cross-references
 * `schedule.days[].date`, and `schedule.days[].sessions[].performerSlug`
 * cross-references `lineup[].slug`. The renderer does not enforce
 * these cross-references — degraded state is preferred over a fake.
 */
export type EventContent = {
  slug: string;
  themeSlug: string;
  testEvent?: boolean;
  meta: {
    title: string;
    description: string;
    openGraphType?: "website" | "article";
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

/**
 * Slug → content registry. M3 phase 3.1.1 registers the first test
 * event (`harvest-block-party`); M3 phase 3.2 extends the literal
 * with the second test event; M4 phase 4.2 registers Madrona. Static
 * imports keep tree-shaking and Next.js bundle analysis predictable.
 */
const eventContentBySlug: Record<string, EventContent> = {
  [harvestBlockPartyContent.slug]: harvestBlockPartyContent,
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
