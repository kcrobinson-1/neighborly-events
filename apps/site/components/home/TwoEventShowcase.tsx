import { harvestBlockPartyContent } from "../../events/harvest-block-party.ts";
import { riversideJamContent } from "../../events/riverside-jam.ts";
import { EventShowcaseCard } from "./EventShowcaseCard.tsx";

/**
 * Two-event showcase. Renders Harvest Block Party and Riverside Jam
 * side-by-side on desktop viewports, stacking to a single column on
 * narrow viewports. Slug list is hardcoded by direct content-module
 * import per the plan's slug-list-source contract — adding a third
 * test event should require an explicit edit here, not silently
 * extend the side-by-side layout.
 */
export function TwoEventShowcase() {
  return (
    <section
      className="home-showcase"
      aria-labelledby="home-showcase-title"
    >
      <h2 id="home-showcase-title" className="home-showcase-title">
        Test events
      </h2>
      <p className="home-showcase-copy">
        Two test events exercise the platform&rsquo;s rendering
        surface with distinct Themes. Click a card for the rich event
        landing; the landing&rsquo;s CTA continues into attendee
        gameplay.
      </p>
      <div className="home-showcase-grid">
        <EventShowcaseCard content={harvestBlockPartyContent} />
        <EventShowcaseCard content={riversideJamContent} />
      </div>
    </section>
  );
}
