import type { EventContent } from "../../lib/eventContent.ts";

type ArtistLinks = NonNullable<
  EventContent["lineup"][number]["artistLinks"]
>;

/**
 * Display labels and render order for the artist-link chips. The
 * order is fixed here, not by content-object key order, so every
 * band card presents the same platforms in the same sequence.
 * Exported so the day-of landing's On-stage section renders the same
 * slots in the same order from one table.
 */
export const ARTIST_LINK_SLOTS: ReadonlyArray<{
  key: keyof ArtistLinks;
  label: string;
}> = [
  { key: "website", label: "Website" },
  { key: "spotify", label: "Spotify" },
  { key: "appleMusic", label: "Apple Music" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "bandcamp", label: "Bandcamp" },
];

/**
 * Performer lineup. Each entry shows name, optional bio, and a
 * compact set-times list ("2026-09-26 — 2:00 PM, 2026-09-27 —
 * 3:00 PM"). Set-time `day` strings are kept as opaque ISO dates per
 * the `EventContent` contract; richer formatting is post-3.1.1
 * scope.
 *
 * Madrona M1 phase 1.2 added `imageSrc`/`imageAlt`, `extendedBio`,
 * and `featuredQuote` band-depth fields; the typed `artistLinks`
 * slot set later replaced 1.2's never-populated free-form
 * `externalLinks` (see the `EventContent` doc comment). Each field
 * is truthiness-guarded independently — render-when-present, not
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
          const artistLinks = ARTIST_LINK_SLOTS.flatMap(({ key, label }) => {
            const href = performer.artistLinks?.[key];
            return href ? [{ key, label, href }] : [];
          });
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
              {artistLinks.length > 0 ? (
                <ul className="event-lineup-artist-links">
                  {artistLinks.map((link) => (
                    <li key={link.key}>
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
