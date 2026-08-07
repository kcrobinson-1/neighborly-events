import type { EventMastheadContent } from "../../../../shared/masthead/index.ts";
import type { EventContent } from "../../lib/eventContent.ts";
import { EventCTA } from "./EventCTA.tsx";
import { EventDayOfLanding } from "./EventDayOfLanding.tsx";
import { EventDonateCTA } from "./EventDonateCTA.tsx";
import { EventFAQ } from "./EventFAQ.tsx";
import { EventFeedbackCTA } from "./EventFeedbackCTA.tsx";
import { EventFooter } from "./EventFooter.tsx";
import { EventHeader } from "./EventHeader.tsx";
import { EventLineup } from "./EventLineup.tsx";
import { EventSchedule } from "./EventSchedule.tsx";
import { EventSponsors } from "./EventSponsors.tsx";
import { SiteEventMasthead } from "./SiteEventMasthead.tsx";
import { TestEventDisclaimer } from "./TestEventDisclaimer.tsx";

/**
 * Top-level template that composes the section components in fixed
 * order. Section omission is the renderer's responsibility, not the
 * section component's — each section component assumes its prop is
 * non-empty when rendered. Empty arrays render as omitted sections
 * (no empty section heading); this is honest degraded state for
 * content authors, not a rendering bug.
 *
 * Two layouts share this entry point: when `content.landing` is
 * present the day-of layout (`EventDayOfLanding`, Madrona redesign
 * spec §4) renders instead of the generic section stack below —
 * content presence, not a slug check, is the switch, so the choice
 * stays platform-generic and events without the field render the
 * generic template byte-identically. `mastheadSvgMarkup` is the
 * day-of hero's inlined art, read from `public/` by the page route
 * (`readPublicSvg`) so this template and its tests stay synchronous
 * and filesystem-free; it is ignored by the generic layout.
 *
 * `masthead` is the shared sticky header bar, resolved by the route
 * from the per-event registry (`getEventMasthead(slug)`) and passed
 * down so this template stays a pure function of its props. It
 * renders as a sibling *above* `<main>` — full-bleed at the top of
 * the viewport, outside the shell's inline padding — and the
 * `.event-masthead + main` rule in `_masthead.scss` collapses the
 * shell's dead top gap only when the bar is present, keeping
 * masthead-less events byte-identical. The day-of layout zeroes
 * that interim padding instead (its hero is full-bleed and sits
 * flush under the bar).
 */
export function EventLandingPage({
  content,
  slug,
  masthead,
  mastheadSvgMarkup,
}: {
  content: EventContent;
  slug: string;
  masthead?: EventMastheadContent | null;
  mastheadSvgMarkup?: string | null;
}) {
  if (content.landing) {
    return (
      <>
        {masthead ? <SiteEventMasthead masthead={masthead} /> : null}
        <EventDayOfLanding
          content={content}
          slug={slug}
          landing={content.landing}
          mastheadSvgMarkup={mastheadSvgMarkup ?? null}
        />
      </>
    );
  }

  return (
    <>
      {masthead ? <SiteEventMasthead masthead={masthead} /> : null}
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
        {content.faq && content.faq.length > 0 ? (
          <EventFAQ faq={content.faq} />
        ) : null}
        <EventCTA cta={content.cta} slug={slug} />
        {content.feedback ? (
          <EventFeedbackCTA feedback={content.feedback} slug={slug} />
        ) : null}
        {content.donate ? <EventDonateCTA donate={content.donate} /> : null}
        <EventFooter footer={content.footer} />
      </main>
    </>
  );
}
