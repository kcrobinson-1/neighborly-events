import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Performer lineup. Each entry shows name, optional bio, and a
 * compact set-times list ("2026-09-26 — 2:00 PM, 2026-09-27 —
 * 3:00 PM"). Set-time `day` strings are kept as opaque ISO dates per
 * the `EventContent` contract; richer formatting is post-3.1.1
 * scope.
 *
 * Madrona M1 phase 1.2 added `imageSrc`/`imageAlt`, `extendedBio`,
 * `featuredQuote`, and `externalLinks` band-depth fields. Each is
 * truthiness-guarded independently — render-when-present, not
 * require-when-absent — so events that omit them render
 * byte-for-byte identical to the pre-1.2 output. `imageAlt` falls
 * back to the band's `name` when `imageSrc` is present without it.
 */
export function EventLineup({
  lineup,
}: {
  lineup: EventContent["lineup"];
}) {
  return (
    <section className="event-lineup" aria-labelledby="event-lineup-heading">
      <h2 id="event-lineup-heading" className="event-section-heading">
        Lineup
      </h2>
      <ul className="event-lineup-list">
        {lineup.map((performer) => {
          const extendedBioParagraphs = performer.extendedBio
            ? performer.extendedBio
                .split("\n\n")
                .map((paragraph) => paragraph.trim())
                .filter((paragraph) => paragraph.length > 0)
            : [];

          return (
            <li key={performer.slug} className="event-lineup-item">
              {performer.imageSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element --
                    Plain `<img>` mirrors `EventSponsors.tsx`'s
                    deliberate plain-`<img>`-not-`next/image` choice
                    from M3 phase 3.1.1; the upgrade is local if a
                    future phase needs responsive sizing. */
                <img
                  className="event-lineup-image"
                  src={performer.imageSrc}
                  alt={performer.imageAlt ?? performer.name}
                />
              ) : null}
              <h3 className="event-lineup-name">{performer.name}</h3>
              {performer.bio ? (
                <p className="event-lineup-bio">{performer.bio}</p>
              ) : null}
              {extendedBioParagraphs.length > 0 ? (
                <div className="event-lineup-extended-bio">
                  {extendedBioParagraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : null}
              {performer.featuredQuote ? (
                <blockquote className="event-lineup-quote">
                  <p>{performer.featuredQuote.text}</p>
                  {performer.featuredQuote.attribution ? (
                    <cite>{performer.featuredQuote.attribution}</cite>
                  ) : null}
                </blockquote>
              ) : null}
              {performer.externalLinks && performer.externalLinks.length > 0 ? (
                <ul className="event-lineup-external-links">
                  {performer.externalLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {performer.setTimes.length > 0 ? (
                <p className="event-lineup-set-times">
                  {performer.setTimes
                    .map((setTime) => `${setTime.day} — ${setTime.time}`)
                    .join(", ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
