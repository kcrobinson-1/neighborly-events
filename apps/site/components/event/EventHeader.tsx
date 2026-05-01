import { parseEventDate, type EventContent } from "../../lib/eventContent.ts";
import { routes } from "../../../../shared/urls/index.ts";

const monthAbbreviations = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats an ISO `yyyy-mm-dd` date range into a human-readable
 * display string (e.g., "Sep 26-27, 2026" or "Sep 30 – Oct 1, 2026").
 * Falls back to the raw strings if either endpoint fails calendar
 * validity through `parseEventDate` so a content-author typo never
 * produces broken output like `undefined 5, 2026`.
 */
function formatHeroDateRange(start: string, end: string): string {
  const startDate = parseEventDate(start);
  const endDate = parseEventDate(end);

  if (!startDate || !endDate) {
    return start === end ? start : `${start} – ${end}`;
  }

  const startMonthName = monthAbbreviations[startDate.month - 1];
  const endMonthName = monthAbbreviations[endDate.month - 1];

  if (start === end) {
    return `${startMonthName} ${startDate.day}, ${startDate.year}`;
  }

  if (startDate.year !== endDate.year) {
    return `${startMonthName} ${startDate.day}, ${startDate.year} – ${endMonthName} ${endDate.day}, ${endDate.year}`;
  }

  if (startDate.month !== endDate.month) {
    return `${startMonthName} ${startDate.day} – ${endMonthName} ${endDate.day}, ${startDate.year}`;
  }

  return `${startMonthName} ${startDate.day}-${endDate.day}, ${startDate.year}`;
}

/**
 * Hero header — event name, optional tagline, formatted date range,
 * location, and the primary CTA. The CTA uses a plain `<a>` (not
 * `<Link>`) because `routes.game(slug)` lives behind the apps/web
 * Vercel rewrite — soft client-side navigation would keep the user
 * inside apps/site and never re-enter the proxy. Same href appears
 * in `EventCTA` at the bottom of the page; duplication is
 * intentional so users above the fold and at the bottom both see it.
 */
export function EventHeader({
  content,
}: {
  content: EventContent;
  slug: string;
}) {
  const { hero, cta } = content;

  return (
    <header className="event-hero">
      <p className="event-hero-eyebrow">{formatHeroDateRange(hero.dates.start, hero.dates.end)}</p>
      <h1 className="event-hero-title">{hero.name}</h1>
      {hero.tagline ? (
        <p className="event-hero-tagline">{hero.tagline}</p>
      ) : null}
      <p className="event-hero-location">{hero.location}</p>
      <a className="event-cta-button" href={routes.game(content.slug)}>
        {cta.label}
      </a>
    </header>
  );
}
