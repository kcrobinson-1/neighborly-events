import type { EventContent } from "../../lib/eventContent.ts";
import { routes } from "../../../../shared/urls/index.ts";

const DEFAULT_ATTRIBUTION =
  "Hosted on Neighborly Events.";

/**
 * Footer — platform attribution (or `footer.attribution` if set)
 * and a hard-navigation link back to `/`. The home link uses a
 * plain `<a>` because `/` is owned by apps/site itself but the
 * route is reached through the apps/web Vercel rewrite when the
 * user came in via the apps/web origin; a plain `<a>` re-enters the
 * proxy and is universally correct.
 */
export function EventFooter({
  footer,
}: {
  footer?: EventContent["footer"];
}) {
  const attribution = footer?.attribution ?? DEFAULT_ATTRIBUTION;

  return (
    <footer className="event-footer">
      <p className="event-footer-attribution">{attribution}</p>
      <p className="event-footer-home-link">
        <a href={routes.home}>Back to Neighborly Events</a>
      </p>
    </footer>
  );
}
