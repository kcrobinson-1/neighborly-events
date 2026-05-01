import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Performer lineup. Each entry shows name, optional bio, and a
 * compact set-times list ("2026-09-26 — 2:00 PM, 2026-09-27 —
 * 3:00 PM"). Set-time `day` strings are kept as opaque ISO dates per
 * the `EventContent` contract; richer formatting is post-3.1.1
 * scope.
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
        {lineup.map((performer) => (
          <li key={performer.slug} className="event-lineup-item">
            <h3 className="event-lineup-name">{performer.name}</h3>
            {performer.bio ? (
              <p className="event-lineup-bio">{performer.bio}</p>
            ) : null}
            {performer.setTimes.length > 0 ? (
              <p className="event-lineup-set-times">
                {performer.setTimes
                  .map((setTime) => `${setTime.day} — ${setTime.time}`)
                  .join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
