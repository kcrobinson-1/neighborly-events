import { routes } from "../../../../shared/urls/index.ts";
import { RoleDoorCard } from "./RoleDoorCard.tsx";

/**
 * Home-page role-doors section. Three persona-shaped cards
 * (Attendee / Organizer / Volunteer) each linking into an
 * apps/web role-shaped surface for the Harvest Block Party demo
 * event. The slug is declared once below so swapping the demo's
 * anchor event is a one-line change; per the plan the slug is
 * hardcoded rather than read from `featuredGameSlug` or filtered
 * from `registeredEventSlugs` so future test-event additions
 * require an explicit home-page edit.
 *
 * Renders under the apps/site root layout's platform Sage Civic
 * Theme — no `<ThemeScope>` wrap. The persona vocabulary is the
 * platform's, not Harvest's; the cards consume no per-event
 * Themes (Harvest is the worked example, not the theme source).
 *
 * Per-role auth-state copy honors the milestone-doc invariant:
 * Attendee target (`routes.game`) is public, no caveat; Organizer
 * (`routes.eventAdmin`) and Volunteer (`routes.gameRedeem`) are
 * auth-gated, so each card carries a sign-in caveat with the
 * M3-bypass-pending parenthetical M3's PR will revise.
 */
const DEMO_EVENT_SLUG = "harvest-block-party";

export function RoleDoors() {
  return (
    <section className="home-roles" aria-labelledby="home-roles-title">
      <p className="home-roles-eyebrow">Step into a role</p>
      <h2 id="home-roles-title" className="home-roles-title">
        Three ways into the demo
      </h2>
      <p className="home-roles-copy">
        The platform is shaped around three personas. Each card
        opens the live Harvest Block Party surface for that role on
        apps/web; auth-gated targets name the sign-in requirement
        until demo-mode access ships.
      </p>
      <div className="home-roles-grid">
        <RoleDoorCard
          eyebrow="Public"
          title="Attendee"
          description="Play the Harvest demo: scan QR codes, answer scavenger questions, and watch the leaderboard react."
          href={routes.game(DEMO_EVENT_SLUG)}
        />
        <RoleDoorCard
          eyebrow="Auth-gated"
          title="Organizer"
          description="Author Harvest's questions, prizes, and schedule from the per-event admin workspace."
          href={routes.eventAdmin(DEMO_EVENT_SLUG)}
          authCaveat="Sign in to manage this event (or wait for demo-mode access in M3)."
        />
        <RoleDoorCard
          eyebrow="Auth-gated"
          title="Volunteer"
          description="Run the redemption booth: confirm attendee codes and hand out prizes during the event."
          href={routes.gameRedeem(DEMO_EVENT_SLUG)}
          authCaveat="Sign in to redeem codes (or wait for demo-mode access in M3)."
        />
      </div>
    </section>
  );
}
