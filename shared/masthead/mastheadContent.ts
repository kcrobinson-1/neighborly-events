/**
 * Per-event masthead registry for the shared sticky header bar
 * (`EventMasthead.tsx`). Content-shaped, like the per-event Theme
 * registry (`shared/styles/themes/`) and the completion-CTA registry
 * (`shared/events/completionCta.ts`) — it catalogs launch content,
 * not policy, so it does not consume `testEventAllowlist.ts`.
 *
 * Presence is the render gate: events without an entry render no
 * header bar at all, byte-identically to the pre-masthead output.
 * Both apps resolve through `getEventMasthead(slug)` — apps/site on
 * the madrona landing/signup/feedback routes, apps/web when the quiz
 * app adopts the bar.
 *
 * Every link carries its own `href` — the component renders
 * destinations from config and never derives them from the slug (the
 * `completionCta.ts` principle). *How* each link navigates is the
 * consuming app's decision, injected per link via
 * `EventMasthead`'s `linkComponents` prop: a destination that is
 * same-app for apps/site (the signup route) is cross-app for apps/web
 * behind the proxy, so the mechanism cannot live in content. The one
 * exception is `donate`, always an external new-tab anchor.
 *
 * From apps/web the site-owned destinations (home, newsletter,
 * feedback) resolve only on an origin that proxies site routes — the
 * canonical site origin and its preview deployments. On the bare Vite
 * dev server and the direct apps/web host they fall to the SPA's
 * not-found page, exactly as `completionCta.ts`'s links do. Accepted:
 * closing it is a dev-topology task tracked in
 * `docs/tracking/dev-workflow-improvements.md`, not a content or
 * component concern.
 */

import { madronaFacts } from "../events/madrona-facts.ts";
import { routes } from "../urls/index.ts";

/** One navigation link of the masthead bar. */
export type MastheadLink = {
  label: string;
  href: string;
};

/**
 * Masthead content for a single event. The brand lockup IS the Home
 * link (spec: no separate "Home" item); `name` renders in the
 * highlight color, `tagline` in the header foreground, both in the
 * display face.
 */
export type EventMastheadContent = {
  brand: {
    name: string;
    tagline: string;
    homeHref: string;
  };
  quiz: MastheadLink;
  newsletter: MastheadLink;
  feedback: MastheadLink;
  /** Rendered as the visually distinct pill; external, new tab. */
  donate: MastheadLink;
};

const madronaMasthead: EventMastheadContent = {
  brand: {
    name: "MADRONA",
    tagline: "MUSIC IN THE PLAYFIELD",
    homeHref: "/event/madrona",
  },
  quiz: { label: "Quiz", href: routes.game("madrona") },
  newsletter: { label: "Newsletter", href: "/event/madrona/signup" },
  feedback: { label: "Feedback", href: "/event/madrona/feedback" },
  donate: { label: "Donate", href: madronaFacts.donateHref },
};

/** Slug → masthead content. Absent slugs render no header bar. */
export const mastheadBySlug: Record<string, EventMastheadContent> = {
  "madrona": madronaMasthead,
};

/** Resolves the masthead content for an event slug, if any. */
export function getEventMasthead(slug: string): EventMastheadContent | null {
  return mastheadBySlug[slug] ?? null;
}
