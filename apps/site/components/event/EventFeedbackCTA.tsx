import Link from "next/link";

import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Bottom-of-landing-page CTA into the event-scoped feedback form.
 * Renders below `EventCTA` (gameplay) and above `EventFooter`;
 * `EventLandingPage` owns the omission guard, so this component
 * assumes its `feedback` prop is non-null when rendered (matches
 * the section-component contract documented on
 * [EventLandingPage](./EventLandingPage.tsx)).
 *
 * Uses Next.js `<Link>` because `/event/<slug>/feedback` is owned
 * by apps/site (the same app that renders this landing page) per
 * the `/event/:slug/:path*` rewrite. Soft client-side navigation
 * is the correct default for in-app destinations — this is the
 * inverse of `EventCTA`'s plain `<a>`, which targets apps/web's
 * gameplay shell across the rewrite boundary.
 */
export function EventFeedbackCTA({
  feedback,
  slug,
}: {
  feedback: NonNullable<EventContent["feedback"]>;
  slug: string;
}) {
  return (
    <section
      className="event-feedback-cta"
      aria-labelledby="event-feedback-cta-heading"
    >
      <h2
        id="event-feedback-cta-heading"
        className="event-section-heading"
      >
        {feedback.cta.heading}
      </h2>
      {feedback.cta.body ? (
        <p className="event-feedback-cta-body">{feedback.cta.body}</p>
      ) : null}
      <Link
        className="event-feedback-cta-button"
        href={`/event/${encodeURIComponent(slug)}/feedback`}
      >
        Share feedback
      </Link>
    </section>
  );
}
