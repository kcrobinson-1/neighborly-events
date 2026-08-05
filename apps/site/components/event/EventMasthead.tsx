import Link from "next/link";

import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Quick-links nav strip rendered above the hero. `EventLandingPage`
 * owns the omission guard, so this component assumes its `masthead`
 * prop is non-null when rendered (matches the section-component
 * contract documented on [EventLandingPage](./EventLandingPage.tsx));
 * each named slot is additionally presence-guarded here because every
 * slot is independently optional.
 *
 * Destinations come from config — the component never derives an
 * href from the slug (the `completionCta.ts` principle restated on
 * `EventContent.masthead`). What the slot *name* fixes is the
 * navigation mechanism:
 *
 * - `quiz` uses a plain `<a>` (not `<Link>`) because its destination
 *   lives behind the apps/web Vercel rewrite — soft client-side
 *   navigation would keep the user inside apps/site and never
 *   re-enter the proxy (same rationale as `EventHeader`'s hero CTA).
 * - `feedback` and `signup` use Next.js `<Link>` because their
 *   destinations are apps/site routes (same rationale as
 *   `EventFeedbackCTA`).
 * - `donate` is an external donation-platform URL and opens in a new
 *   tab with `rel="noopener"` (same rationale as `EventDonateCTA`).
 */
export function EventMasthead({
  masthead,
}: {
  masthead: NonNullable<EventContent["masthead"]>;
}) {
  return (
    <nav className="event-masthead" aria-label="Event quick links">
      {masthead.quiz ? (
        <a className="event-masthead-link" href={masthead.quiz.href}>
          {masthead.quiz.label}
        </a>
      ) : null}
      {masthead.feedback ? (
        <Link className="event-masthead-link" href={masthead.feedback.href}>
          {masthead.feedback.label}
        </Link>
      ) : null}
      {masthead.signup ? (
        <Link className="event-masthead-link" href={masthead.signup.href}>
          {masthead.signup.label}
        </Link>
      ) : null}
      {masthead.donate ? (
        <a
          className="event-masthead-link"
          href={masthead.donate.href}
          target="_blank"
          rel="noopener"
        >
          {masthead.donate.label}
        </a>
      ) : null}
    </nav>
  );
}
