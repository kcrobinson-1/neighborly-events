import Link from "next/link";

import type { EventContent } from "../../lib/eventContent.ts";
import { routes } from "../../../../shared/urls/index.ts";
import { LandingTonightSections } from "./LandingTonightSections.tsx";
import { TestEventDisclaimer } from "./TestEventDisclaimer.tsx";

/**
 * The day-of landing layout (Madrona redesign spec §4): full-bleed
 * hero (theme gradient + inlined masthead SVG + one accent-face
 * welcome line, nothing else), the four-tile action grid, the
 * resolver-driven Tonight / On-stage / This-season group
 * (`LandingTonightSections`), an optional flat FAQ, and the dark
 * footer band. Selected by `EventLandingPage` when
 * `content.landing` is present; the generic multi-section template
 * renders otherwise, so events that never author `landing` are
 * untouched.
 *
 * The page surface (`--bg`) is painted on this component's `<main>`
 * — not on `body`, which sits outside `<ThemeScope>` and can only
 * ever show the platform Theme's background (`_base.scss` paints it
 * from the `:root`-level tokens). Scoping the paint to this layout
 * keeps the generic template's events pixel-identical.
 *
 * `mastheadSvgMarkup` is the hero art's markup, read from `public/`
 * by the page route at prerender time (`readPublicSvg`) and inlined
 * via `dangerouslySetInnerHTML` — the source is a repo-committed
 * asset, not user input. The wrapper carries `role="img"` with the
 * event name as the accessible label, so the art reads as one image
 * regardless of its internal structure; a missing file degrades to
 * no art (welcome line still renders) rather than a broken image.
 *
 * Action-grid destinations are mostly renderer-owned (see
 * `EventLandingAction`): quiz is a plain `<a>` through
 * `routes.game(slug)` because the destination lives behind the
 * apps/web rewrite (the `EventCTA` precedent); feedback is a
 * same-app `<Link>`; donate reuses `content.donate.href` as an
 * external new-tab anchor. The email-list tile is the exception —
 * its destination is content-owned, because the platform serves no
 * email-signup route to derive one from. Feedback and donate tiles
 * render when the matching content opt-in is present, same presence
 * semantics as the routes themselves; the email-list tile renders
 * when its action carries an `href`.
 *
 * The visually-hidden `<h1>` keeps a text heading for the document
 * outline (the visible hero is the artwork); "Presenting sponsor" /
 * "Tonight" / "On stage" / "This season" heading text is
 * renderer-owned, like every other section heading on the platform.
 */
export function EventDayOfLanding({
  content,
  slug,
  landing,
  mastheadSvgMarkup,
}: {
  content: EventContent;
  slug: string;
  landing: NonNullable<EventContent["landing"]>;
  mastheadSvgMarkup: string | null;
}) {
  /* eslint-disable-next-line react-hooks/purity --
     Deliberate prerender-time clock read: this Server Component
     renders once at static generation, and the value exists
     precisely to bake that build-time resolution into the HTML as
     the client component's hydration-consistent initial state (its
     mount effect re-resolves against the device clock). There is no
     re-render loop for impurity to destabilize. */
  const initialNowMs = Date.now();

  return (
    <main className="event-landing">
      {content.testEvent ? (
        <div className="event-landing-section">
          <TestEventDisclaimer />
        </div>
      ) : null}
      <h1 className="event-landing-sr-only">{content.hero.name}</h1>

      <div className="event-landing-hero">
        {mastheadSvgMarkup ? (
          <div
            className="event-landing-hero-art"
            role="img"
            aria-label={content.hero.name}
            dangerouslySetInnerHTML={{ __html: mastheadSvgMarkup }}
          />
        ) : null}
        <p className="event-landing-welcome">{landing.hero.welcomeLine}</p>
      </div>

      <nav className="event-landing-actions" aria-label="Event actions">
        <a
          className="event-landing-action event-landing-action-quiz"
          href={routes.game(slug)}
        >
          {landing.actions.quiz.label}
          <small>{landing.actions.quiz.subtitle}</small>
        </a>
        {landing.actions.emailList.href ? (
          <a
            className="event-landing-action event-landing-action-email-list"
            href={landing.actions.emailList.href}
            target={landing.actions.emailList.external ? "_blank" : undefined}
            rel={landing.actions.emailList.external ? "noopener" : undefined}
          >
            {landing.actions.emailList.label}
            <small>{landing.actions.emailList.subtitle}</small>
          </a>
        ) : null}
        {content.feedback ? (
          <Link
            className="event-landing-action event-landing-action-feedback"
            href={`/event/${encodeURIComponent(slug)}/feedback`}
          >
            {landing.actions.feedback.label}
            <small>{landing.actions.feedback.subtitle}</small>
          </Link>
        ) : null}
        {content.donate ? (
          <a
            className="event-landing-action event-landing-action-donate"
            href={content.donate.href}
            target="_blank"
            rel="noopener"
          >
            {landing.actions.donate.label}
            <small>{landing.actions.donate.subtitle}</small>
          </a>
        ) : null}
      </nav>

      <LandingTonightSections
        nights={content.nights ?? null}
        lineup={content.lineup}
        landing={landing}
        donateHref={content.donate?.href ?? null}
        initialNowMs={initialNowMs}
      />

      {content.faq.length > 0 ? (
        <section
          className="event-landing-section event-landing-faq"
          aria-labelledby="event-landing-faq-heading"
        >
          <h2 id="event-landing-faq-heading" className="event-landing-rule">
            Questions
          </h2>
          <ul className="event-landing-faq-list">
            {content.faq.map((entry, entryIndex) => (
              <li key={entryIndex}>
                <details className="event-landing-faq-details">
                  <summary className="event-landing-faq-summary">
                    {entry.question}
                  </summary>
                  <p className="event-landing-faq-answer">{entry.answer}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="event-landing-footer">
        <p className="event-landing-footer-banner">
          {landing.footer.bannerLine}
        </p>
        <p className="event-landing-footer-line">
          {landing.footer.volunteerLine}
        </p>
        <p className="event-landing-footer-line">
          {landing.footer.contactLabel}:{" "}
          <a href={`mailto:${landing.footer.contactEmail}`}>
            {landing.footer.contactEmail}
          </a>
        </p>
      </footer>
    </main>
  );
}
