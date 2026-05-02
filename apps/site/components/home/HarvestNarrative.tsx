import { harvestBlockPartyContent } from "../../events/harvest-block-party.ts";
import { ThemeScope, getThemeForSlug } from "../../../../shared/styles/index.ts";
import { NarrativePersona } from "./NarrativePersona.tsx";

/**
 * Home-page narrative section. Walks the platform's three-role arc
 * — attendee plays, organizer authors, volunteer redeems — through
 * Harvest Block Party as the worked example, so a partner reading
 * the home page top-to-bottom sees what the platform actually does
 * without clicking through to auth-gated apps/web surfaces.
 *
 * The whole section wraps in a single section-level `<ThemeScope>`
 * resolving Harvest's Theme so brand-bearing surfaces (eyebrow,
 * persona-heading underline, accent rule) read in Harvest's pumpkin
 * family. The wrap input is `harvestBlockPartyContent.themeSlug`,
 * not the literal `"harvest-block-party"` URL slug, mirroring the
 * resolver-uniformity contract `/event/[slug]/page.tsx` already
 * honors.
 *
 * Brand-bearing surfaces consume brand-base tokens (`--primary`,
 * `--secondary`, `--accent`, `--bg`) only — never derived shades
 * (`--primary-surface`, `--secondary-focus`, etc.) which pin to
 * apps/site `:root` and don't re-evaluate inside `<ThemeScope>` per
 * the M1-recorded empirical finding tracked at
 * `docs/plans/themescope-derived-shade-cascade.md`.
 *
 * The narrative carries zero outbound `<a href>` / `<Link href>`.
 * Click-through into live surfaces is the showcase cards' job
 * (phase 2.1, same-app event landing) and the role-doors' job
 * (phase 2.3, cross-app role surfaces) — not the narrative's.
 */
export function HarvestNarrative() {
  return (
    <ThemeScope theme={getThemeForSlug(harvestBlockPartyContent.themeSlug)}>
      <section
        className="home-narrative"
        aria-labelledby="home-narrative-title"
      >
        <p className="home-narrative-eyebrow">Worked example</p>
        <h2 id="home-narrative-title" className="home-narrative-title">
          Harvest Block Party walks the three-role arc
        </h2>
        <p className="home-narrative-lead">
          The platform serves three roles around a single event:
          attendees who play the game, organizers who author it, and
          volunteers who hand out prizes. Here is what each role
          does at {harvestBlockPartyContent.hero.location}, the
          weekend of September 26&ndash;27, 2026.
        </p>

        <div className="home-narrative-personas">
          <NarrativePersona
            eyebrow="Attendee"
            heading="Plays the game during the event"
          >
            <p>
              An attendee opens the Harvest Block Party game on
              their phone, picks up a neighborhood map at the
              welcome booth, and works through stamp-style prompts
              tied to participating booths and stages. Earning
              stamps unlocks prizes claimed at the on-site
              redemption booth.
            </p>
            <p>
              The gameplay route is open to anyone with the link
              &mdash; no sign-in &mdash; so a partner can click
              into it from the showcase card above and exercise
              the live attendee shell against this test event right
              now.
            </p>
          </NarrativePersona>

          <NarrativePersona
            eyebrow="Organizer"
            heading="Authors the event ahead of the weekend"
          >
            <p>
              An organizer writes the schedule, lineup, sponsors,
              and FAQ in an event-scoped admin workspace, then
              defines the stamp prompts that the attendee game will
              ask. The same content drives the public event landing
              and the in-game prompts, so there is one source of
              truth per event.
            </p>
            <p>
              The admin workspace lives behind a magic-link sign-in
              today &mdash; an organizer enters their email, clicks
              the link, and lands authorized on the event admin
              page. M3 ships a demo-mode bypass for test-event
              slugs that lets a partner walk the authoring flow on
              Harvest without a sign-in round trip; until then the
              gate is real.
            </p>
          </NarrativePersona>

          <NarrativePersona
            eyebrow="Volunteer"
            heading="Redeems prizes at the on-site booth"
          >
            <p>
              At the redemption booth on Maple Street, a volunteer
              looks up an attendee&rsquo;s progress, confirms the
              stamps they have earned, and marks each prize handed
              out so the same code cannot be claimed twice. The
              booth view is read-mostly with a single confirm
              action per prize.
            </p>
            <p>
              The booth view also requires a magic-link sign-in
              today and inherits the same M3 demo-mode bypass the
              organizer flow inherits &mdash; the two surfaces
              flip together, and the narrative will pick up the new
              copy in lockstep with that change.
            </p>
          </NarrativePersona>
        </div>
      </section>
    </ThemeScope>
  );
}
