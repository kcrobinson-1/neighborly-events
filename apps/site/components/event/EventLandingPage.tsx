import type { EventContent } from "../../lib/eventContent.ts";
import { EventCTA } from "./EventCTA.tsx";
import { EventFAQ } from "./EventFAQ.tsx";
import { EventFooter } from "./EventFooter.tsx";
import { EventHeader } from "./EventHeader.tsx";
import { EventLineup } from "./EventLineup.tsx";
import { EventSchedule } from "./EventSchedule.tsx";
import { EventSponsors } from "./EventSponsors.tsx";
import { TestEventDisclaimer } from "./TestEventDisclaimer.tsx";

/**
 * Top-level template that composes the section components in fixed
 * order. Section omission is the renderer's responsibility, not the
 * section component's — each section component assumes its prop is
 * non-empty when rendered. Empty arrays render as omitted sections
 * (no empty section heading); this is honest degraded state for
 * content authors, not a rendering bug.
 */
export function EventLandingPage({
  content,
  slug,
}: {
  content: EventContent;
  slug: string;
}) {
  return (
    <main className="event-shell">
      {content.testEvent ? <TestEventDisclaimer /> : null}
      <EventHeader content={content} slug={slug} />
      {content.schedule.days.length > 0 ? (
        <EventSchedule schedule={content.schedule} />
      ) : null}
      {content.lineup.length > 0 ? (
        <EventLineup lineup={content.lineup} />
      ) : null}
      {content.sponsors.length > 0 ? (
        <EventSponsors sponsors={content.sponsors} />
      ) : null}
      {content.faq.length > 0 ? <EventFAQ faq={content.faq} /> : null}
      <EventCTA cta={content.cta} slug={slug} />
      <EventFooter footer={content.footer} />
    </main>
  );
}
