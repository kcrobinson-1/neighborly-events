import Link from "next/link";

import {
  EventMasthead,
  type EventMastheadActiveItem,
  type EventMastheadContent,
} from "../../../../shared/masthead/index.ts";

/**
 * apps/site binding of the shared `EventMasthead`: injects Next.js
 * `<Link>` for the destinations apps/site itself serves — home
 * (the event landing page), newsletter (`/event/<slug>/signup`), and
 * feedback (`/event/<slug>/feedback`) — so those navigations stay
 * soft. `quiz` stays on the shared default plain `<a>` because its
 * destination lives behind the apps/web Vercel rewrite; soft
 * client-side navigation would keep the user inside apps/site and
 * never re-enter the proxy (same rationale as `EventHeader`'s hero
 * CTA). `donate` is owned by the shared component (external anchor,
 * new tab, `rel="noopener"`).
 *
 * Callers resolve content from the shared registry
 * (`getEventMasthead(slug)`) and render this only when an entry
 * exists — absence keeps the page byte-identical to the
 * pre-masthead output.
 */
export function SiteEventMasthead({
  masthead,
  active,
}: {
  masthead: EventMastheadContent;
  active?: EventMastheadActiveItem;
}) {
  return (
    <EventMasthead
      masthead={masthead}
      active={active}
      linkComponents={{ home: Link, newsletter: Link, feedback: Link }}
    />
  );
}
