import type { EventContent } from "../../lib/eventContent.ts";

/**
 * Schedule rendering. Each day renders as a section with an `<h2>`
 * for the day label (or formatted date) and a `<dl>` of session
 * times: `<dt>` for time + title, `<dd>` for the optional
 * description. Semantic markup so screen readers can navigate the
 * agenda day-by-day.
 *
 * `performerSlug` cross-references `lineup[].slug` but is not
 * surfaced in 3.1.1; the cross-link UX can land later. The schedule
 * still renders honestly when the cross-reference is missing — the
 * session line shows without the performer link.
 */
export function EventSchedule({
  schedule,
}: {
  schedule: EventContent["schedule"];
}) {
  return (
    <section className="event-schedule" aria-labelledby="event-schedule-heading">
      <h2 id="event-schedule-heading" className="event-section-heading">
        Schedule
      </h2>
      {schedule.days.map((day) => (
        <div key={day.date} className="event-schedule-day">
          <h3 className="event-schedule-day-heading">{day.label ?? day.date}</h3>
          <dl className="event-schedule-sessions">
            {day.sessions.map((session, sessionIndex) => (
              <div
                key={`${day.date}-${sessionIndex}`}
                className="event-schedule-session"
              >
                <dt className="event-schedule-session-head">
                  <span className="event-schedule-time">{session.time}</span>
                  <span className="event-schedule-title">{session.title}</span>
                </dt>
                {session.description ? (
                  <dd className="event-schedule-description">
                    {session.description}
                  </dd>
                ) : (
                  <dd className="event-schedule-description event-schedule-description-empty" />
                )}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}
