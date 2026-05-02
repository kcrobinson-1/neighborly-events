import type { EventContent } from "../../lib/eventContent.ts";
import { formatHeroDateRange } from "../../lib/eventDateFormat.ts";
import { ThemeScope, getThemeForSlug } from "../../../../shared/styles/index.ts";
import { routes } from "../../../../shared/urls/index.ts";

/**
 * Per-event preview card on the home-page showcase. Each card is
 * wrapped in its own `<ThemeScope>` so the showcase can render two
 * distinct Themes side-by-side — a single outer `<ThemeScope>`
 * shared between cards would silently regress the milestone doc's
 * "Two-theme exercise on showcase" invariant.
 *
 * Theme resolution reads `content.themeSlug`, **not** the URL slug,
 * matching the contract `/event/[slug]/page.tsx` already honors. The
 * link target is same-app `routes.eventLanding(content.slug)` (the
 * rich event landing); cross-app entry into apps/web's gameplay
 * shell happens from the event landing's existing CTA, not from
 * this card.
 *
 * Brand-tied surfaces (border, link affordance, eyebrow) read
 * `var(--primary)` / `var(--secondary)` / `var(--accent)`. Derived
 * shades (e.g. `var(--primary-surface)`) pin to the apps/site
 * `:root` substitution and do not re-evaluate inside `<ThemeScope>`
 * per the M1-recorded empirical finding tracked at
 * `docs/plans/themescope-derived-shade-cascade.md`; the card avoids
 * them on brand-bearing surfaces.
 */
export function EventShowcaseCard({
  content,
}: {
  content: EventContent;
}) {
  return (
    <ThemeScope theme={getThemeForSlug(content.themeSlug)}>
      <a
        className="home-showcase-card"
        href={routes.eventLanding(content.slug)}
      >
        <p className="home-showcase-card-eyebrow">
          {formatHeroDateRange(content.hero.dates.start, content.hero.dates.end)}
        </p>
        <h3 className="home-showcase-card-title">{content.hero.name}</h3>
        {content.hero.tagline ? (
          <p className="home-showcase-card-tagline">{content.hero.tagline}</p>
        ) : null}
        <p className="home-showcase-card-location">{content.hero.location}</p>
        <span className="home-showcase-card-link" aria-hidden="true">
          View event &rarr;
        </span>
      </a>
    </ThemeScope>
  );
}
