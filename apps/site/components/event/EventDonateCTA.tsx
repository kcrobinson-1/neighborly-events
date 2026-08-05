import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Bottom-of-landing-page donation CTA. Renders below
 * `EventFeedbackCTA` and above `EventFooter`; `EventLandingPage`
 * owns the omission guard, so this component assumes its `donate`
 * prop is non-null when rendered (matches the section-component
 * contract documented on [EventLandingPage](./EventLandingPage.tsx)).
 *
 * Uses a plain `<a>` (not Next.js `<Link>`) because `donate.href`
 * is an external donation-platform URL — there is no in-app
 * donation route. Opens in a new tab with `rel="noopener"` so the
 * landing page stays available behind the donation form.
 */
export function EventDonateCTA({
  donate,
}: {
  donate: NonNullable<EventContent["donate"]>;
}) {
  return (
    <section
      className="event-donate-cta"
      aria-labelledby="event-donate-cta-heading"
    >
      <h2 id="event-donate-cta-heading" className="event-section-heading">
        {donate.heading}
      </h2>
      {donate.body ? (
        <p className="event-donate-cta-body">{donate.body}</p>
      ) : null}
      <a
        className="event-donate-cta-button"
        href={donate.href}
        target="_blank"
        rel="noopener"
      >
        {donate.buttonLabel}
      </a>
    </section>
  );
}
