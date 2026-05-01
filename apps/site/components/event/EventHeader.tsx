import type { EventContent } from "../../lib/eventContent.ts";
import { formatHeroDateRange } from "../../lib/eventDateFormat.ts";
import { routes } from "../../../../shared/urls/index.ts";

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
