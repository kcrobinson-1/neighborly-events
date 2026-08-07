"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type {
  EventContent,
  EventDayOfLandingContent,
  EventNights,
} from "../../lib/eventContent.ts";
import {
  calendarDateInZone,
  formatNightDate,
  formatNightDateShort,
  resolvableNights,
  resolveTonight,
} from "../../lib/eventNights.ts";
import { ARTIST_LINK_SLOTS } from "./EventLineup.tsx";

/**
 * A sponsor credit's logo, linked when the content supplies a
 * verified destination and plain otherwise — the same
 * render-when-present posture as every optional content field, so
 * the "logo-only until a URL is verified" contract on
 * `EventPresentingSponsor` / `EventNightHeadlinerSponsor` actually
 * has a rendering counterpart. External anchor, new tab.
 */
function SponsorLogo({
  className,
  logoSrc,
  logoAlt,
  href,
}: {
  className: string;
  logoSrc: string;
  logoAlt: string;
  href?: string;
}) {
  /* eslint-disable-next-line @next/next/no-img-element --
     Plain `<img>` matches the deliberate choice across the event
     section components (see EventSponsors). */
  const logo = <img className={className} src={logoSrc} alt={logoAlt} />;

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {logo}
    </a>
  ) : (
    logo
  );
}

/**
 * The resolver-driven middle of the day-of landing page: Tonight (or
 * Next concert) run-of-show, the presenting-sponsor band, On stage,
 * and the This-season strip — or the season-wrap section once the
 * final night has passed. Everything below the action grid depends
 * on which night resolves, so the whole group lives in one client
 * component.
 *
 * Client component because "tonight" is a fact about the reader's
 * *visit* time and the page is statically prerendered: the server
 * (build-time) resolution is baked into the HTML as the initial
 * state via `initialNowMs` — the server component passes its own
 * `Date.now()` so server HTML and first client render agree and
 * hydration stays clean — then a mount effect re-resolves against
 * the device clock, flipping the section if the build predates the
 * visit (it almost always does). No-JS readers see the build-time
 * state; the honest fallback for a page rebuilt on every deploy.
 *
 * Resolution then stays live for as long as the page is open. A
 * mount-only read would leave a page opened at 11 PM showing the
 * previous night forever — including past the final night, where it
 * owes the reader the season wrap — and a phone left open on a
 * blanket through the end of a concert evening is the ordinary case
 * here, not a corner one. A one-minute tick compares only the
 * event-local *calendar date* and updates state when it rolls over,
 * so the common tick costs one `Intl` format and re-renders nothing;
 * polling rather than a single timer aimed at midnight also
 * self-corrects after a device sleeps through the boundary, which is
 * exactly when a fired-once timer would be least reliable.
 *
 * Degraded states follow the section-renderer stance (broken
 * cross-reference → omit, never fake): a `performerSlug` that
 * matches no lineup entry drops the On-stage section and falls back
 * to the night's label on its season card; `nights` absent or empty
 * resolves straight to the season wrap.
 */
export function LandingTonightSections({
  nights,
  lineup,
  landing,
  slug,
  donateHref,
  hasNewsletter,
  initialNowMs,
}: {
  nights: EventNights | null;
  lineup: EventContent["lineup"];
  landing: EventDayOfLandingContent;
  slug: string;
  donateHref: string | null;
  hasNewsletter: boolean;
  initialNowMs: number;
}) {
  const [now, setNow] = useState(() => new Date(initialNowMs));
  const timezone = nights?.timezone ?? "UTC";

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       One-shot post-hydration re-resolution against the device
       clock (see the component doc comment): the statically
       prerendered initial state is almost always stale by visit
       time, and reading the clock before hydration completes would
       mismatch the server HTML. Empty dep array — exactly one extra
       render, no cascade. */
    setNow(new Date());
  }, []);

  useEffect(() => {
    // Keep resolution live across the event's local midnight. State
    // only changes when the event-local calendar date rolls over, so
    // the once-a-minute tick is otherwise a no-op.
    const tick = window.setInterval(() => {
      setNow((current) => {
        const next = new Date();
        return calendarDateInZone(next, timezone) ===
          calendarDateInZone(current, timezone)
          ? current
          : next;
      });
    }, 60_000);

    return () => window.clearInterval(tick);
  }, [timezone]);

  const resolvedNights: EventNights = nights ?? { timezone, nights: [] };
  const resolution = resolveTonight(now, resolvedNights);
  const seasonNights = resolvableNights(resolvedNights);

  const featuredNight = resolution.kind === "seasonWrap" ? null : resolution.night;
  const performer = featuredNight
    ? (lineup.find((entry) => entry.slug === featuredNight.performerSlug) ??
      null)
    : null;

  const seasonStrip =
    seasonNights.length > 0 ? (
      <section
        className="event-landing-section"
        aria-labelledby="event-landing-season-heading"
      >
        <h2 id="event-landing-season-heading" className="event-landing-rule">
          This season
        </h2>
        <ul className="event-landing-season">
          {seasonNights.map((night, nightIndex) => {
            const nightPerformer = lineup.find(
              (entry) => entry.slug === night.performerSlug,
            );
            // Object identity, not date equality: `resolveTonight`
            // returns the registered night object, so with duplicate
            // dates only the resolver's pick (earliest-listed) gets
            // the featured ring. The key carries the index for the
            // same duplicate-date reason.
            const isFeatured = featuredNight === night;
            return (
              <li
                key={`${night.date}-${nightIndex}`}
                className={
                  isFeatured
                    ? "event-landing-season-card event-landing-season-card-now"
                    : "event-landing-season-card"
                }
              >
                <span className="event-landing-season-date">
                  {formatNightDateShort(night.date)}
                </span>
                <b className="event-landing-season-name">
                  {nightPerformer?.name ?? night.label}
                </b>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  if (resolution.kind === "seasonWrap") {
    return (
      <>
        <section
          className="event-landing-section event-landing-wrap"
          aria-labelledby="event-landing-wrap-heading"
        >
          <h2 id="event-landing-wrap-heading" className="event-landing-rule">
            {landing.seasonWrap.heading}
          </h2>
          <p className="event-landing-wrap-body">{landing.seasonWrap.body}</p>
          <div className="event-landing-wrap-actions">
            {hasNewsletter ? (
              <Link
                className="event-landing-wrap-action event-landing-wrap-action-newsletter"
                href={`/event/${encodeURIComponent(slug)}/signup`}
              >
                {landing.actions.newsletter.label}
              </Link>
            ) : null}
            {donateHref ? (
              <a
                className="event-landing-wrap-action event-landing-wrap-action-donate"
                href={donateHref}
                target="_blank"
                rel="noopener"
              >
                {landing.actions.donate.label}
              </a>
            ) : null}
          </div>
        </section>
        {seasonStrip}
      </>
    );
  }

  const night = resolution.night;

  return (
    <>
      <section
        className="event-landing-section"
        aria-labelledby="event-landing-tonight-heading"
      >
        <h2 id="event-landing-tonight-heading" className="event-landing-rule">
          {resolution.kind === "tonight" ? "Tonight" : "Next concert"}
        </h2>
        <p className="event-landing-tonight-date">
          {formatNightDate(night.date)} · {night.label}
        </p>
        <ul className="event-landing-sched">
          {night.runOfShow.map((row, rowIndex) => (
            <li
              key={rowIndex}
              className={
                row.mainSet
                  ? "event-landing-sched-row event-landing-sched-row-main"
                  : "event-landing-sched-row"
              }
            >
              <span className="event-landing-sched-time">{row.time}</span>
              <span className="event-landing-sched-what">
                <span className="event-landing-sched-title">{row.title}</span>
                {row.description ? (
                  <span className="event-landing-sched-detail">
                    {row.description}
                  </span>
                ) : null}
              </span>
              {row.mainSet ? (
                <span className="event-landing-sched-star" aria-hidden="true">
                  ★
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {landing.presentingSponsor ? (
        <aside
          className="event-landing-presenting"
          aria-label={`Presenting sponsor: ${landing.presentingSponsor.name}`}
        >
          <p className="event-landing-presenting-eyebrow">Presenting sponsor</p>
          <SponsorLogo
            className="event-landing-presenting-logo"
            logoSrc={landing.presentingSponsor.logoSrc}
            logoAlt={landing.presentingSponsor.logoAlt}
            href={landing.presentingSponsor.href}
          />
        </aside>
      ) : null}

      {performer ? (
        <section
          className="event-landing-section"
          aria-labelledby="event-landing-onstage-heading"
        >
          <h2 id="event-landing-onstage-heading" className="event-landing-rule">
            On stage
          </h2>
          <div className="event-landing-band">
            {performer.imageSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element --
                  Same plain-`<img>` posture as above. */
              <img
                className="event-landing-band-photo"
                src={performer.imageSrc}
                alt={performer.imageAlt ?? performer.name}
              />
            ) : null}
            <div className="event-landing-band-copy">
              <h3 className="event-landing-band-name">{performer.name}</h3>
              {performer.bio ? (
                <p className="event-landing-band-tagline">{performer.bio}</p>
              ) : null}
              {performer.extendedBio
                ? performer.extendedBio
                    .split("\n\n")
                    .map((paragraph) => paragraph.trim())
                    .filter((paragraph) => paragraph.length > 0)
                    .map((paragraph, index) => (
                      <p key={index} className="event-landing-band-bio">
                        {paragraph}
                      </p>
                    ))
                : null}
              {performer.artistLinks ? (
                <ul className="event-landing-band-links">
                  {ARTIST_LINK_SLOTS.flatMap(({ key, label }) => {
                    const href = performer.artistLinks?.[key];
                    return href ? (
                      <li key={key}>
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {label}
                        </a>
                      </li>
                    ) : (
                      []
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
          {night.headlinerSponsor ? (
            <div className="event-landing-headliner">
              <p>{performer.name}&rsquo;s performance is brought to you by</p>
              <SponsorLogo
                className="event-landing-headliner-logo"
                logoSrc={night.headlinerSponsor.logoSrc}
                logoAlt={night.headlinerSponsor.logoAlt}
                href={night.headlinerSponsor.href}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {seasonStrip}
    </>
  );
}
