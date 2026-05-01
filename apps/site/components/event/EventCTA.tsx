import type { EventContent } from "../../lib/eventContent.ts";
import { routes } from "../../../../shared/urls/index.ts";

/**
 * Bottom CTA. Renders a centered link into the apps/web-owned game
 * shell with optional sublabel below. Plain `<a>` (not `<Link>`)
 * because `routes.game(slug)` lives behind the apps/web Vercel
 * rewrite — soft client-side navigation would keep the user inside
 * apps/site and never re-enter the proxy. Same href as the primary
 * CTA in `EventHeader`.
 */
export function EventCTA({
  cta,
  slug,
}: {
  cta: EventContent["cta"];
  slug: string;
}) {
  return (
    <section className="event-cta" aria-labelledby="event-cta-heading">
      <h2 id="event-cta-heading" className="event-section-heading">
        Ready to play?
      </h2>
      <a className="event-cta-button" href={routes.game(slug)}>
        {cta.label}
      </a>
      {cta.sublabel ? (
        <p className="event-cta-sublabel">{cta.sublabel}</p>
      ) : null}
    </section>
  );
}
