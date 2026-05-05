import type { EventContent } from "../../lib/eventContent.ts";
import { formatHeroDateRange } from "../../lib/eventDateFormat.ts";
import { routes } from "../../../../shared/urls/index.ts";

/**
 * Hero header — optional brand logo, event name, optional tagline,
 * formatted date range, location, and the primary CTA. The CTA uses
 * a plain `<a>` (not `<Link>`) because `routes.game(slug)` lives
 * behind the apps/web Vercel rewrite — soft client-side navigation
 * would keep the user inside apps/site and never re-enter the proxy.
 * Same href appears in `EventCTA` at the bottom of the page;
 * duplication is intentional so users above the fold and at the
 * bottom both see it.
 *
 * The optional logo renders above `hero.name` only when both
 * `meta.logoSrc` and `meta.logoAlt` are set. When either is absent,
 * the rendered output is identical to the pre-logo render
 * byte-for-byte — the load-bearing falsifier for invariant 4
 * (render-when-present, not require-when-absent) so test events
 * that omit the field render unchanged.
 */
export function EventHeader({
  content,
}: {
  content: EventContent;
  slug: string;
}) {
  const { hero, cta, meta } = content;
  const hasLogo = Boolean(meta.logoSrc && meta.logoAlt);

  return (
    <header className="event-hero">
      {hasLogo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element --
              Plain `<img>` mirrors the deliberate choice on
              `EventSponsors`; the upgrade to `next/image` is local
              when needed. */}
          <img
            className="event-hero-logo"
            src={meta.logoSrc}
            alt={meta.logoAlt}
          />
        </>
      ) : null}
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
