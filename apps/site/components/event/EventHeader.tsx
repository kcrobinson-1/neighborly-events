import type { EventContent } from "../../lib/eventContent.ts";
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
 * display string (e.g., "Sep 26-27, 2026" or "Sep 30 - Oct 1, 2026").
 * Treats the inputs as opaque calendar dates per the `EventContent`
 * contract — no `Date` parsing, no timezone math.
 */
function formatHeroDateRange(start: string, end: string): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);

  if (
    !Number.isFinite(startYear) ||
    !Number.isFinite(startMonth) ||
    !Number.isFinite(startDay) ||
    !Number.isFinite(endYear) ||
    !Number.isFinite(endMonth) ||
    !Number.isFinite(endDay)
  ) {
    return start === end ? start : `${start} – ${end}`;
  }

  const startMonthName = monthAbbreviations[startMonth - 1];
  const endMonthName = monthAbbreviations[endMonth - 1];

  if (start === end) {
    return `${startMonthName} ${startDay}, ${startYear}`;
  }

  if (startYear !== endYear) {
    return `${startMonthName} ${startDay}, ${startYear} – ${endMonthName} ${endDay}, ${endYear}`;
  }

  if (startMonth !== endMonth) {
    return `${startMonthName} ${startDay} – ${endMonthName} ${endDay}, ${startYear}`;
  }

  return `${startMonthName} ${startDay}-${endDay}, ${startYear}`;
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
