/**
 * Per-event completion-screen CTA registry for the game completion
 * panel in apps/web. Content-shaped, like the per-event Theme
 * registry (`shared/styles/themes/`) and the apps/site `EventContent`
 * registry — it catalogs launch content, not policy, so it does not
 * consume `testEventAllowlist.ts` (see that module's rationale for
 * keeping content catalogs and bypass policy on separate seams).
 *
 * The CTA block rides on the completion entitlement but never gates
 * it: absence of an entry (or of either optional section) simply
 * renders nothing, so events without an entry are unaffected.
 *
 * Every CTA section carries its own `href` — the component renders
 * destinations from config and never derives them from the game
 * slug, so a registry key (like the demo fixture below) can point at
 * a destination owned by a different slug. `newsletter.href` must be
 * the same-origin signup path of an event whose newsletter surface
 * is enabled — the `newsletter_enabled_events` row seeded by the
 * standalone-signup migration plus the apps/site
 * `EventContent.newsletterSignup` block that makes
 * `/event/<slug>/signup` a real form route. The completion panel
 * links there with a plain same-origin anchor because the signup
 * route is owned by apps/site across the proxy topology. CTA links
 * navigate in the same tab once the completed quiz state (including
 * the check-in code) is confirmed persisted on the device — leaving
 * the quiz app is then loss-free and returning restores the results
 * without a replay; when device storage is unavailable the panel
 * falls back to new-tab links so navigation cannot destroy the only
 * copy of the code. This registry is the deliberately
 * lightweight launch-mode conditional (driver: Aug 11 Madrona launch
 * push); if per-event content later consolidates into a shared
 * registry, fold this module into it.
 *
 * Config-owned hrefs keep destinations out of component code so
 * events without an entry stay unaffected and a URL swap is a
 * content edit, not a component edit.
 *
 * `first-sample` is the local-prototype demo fixture of the Madrona
 * experience (`shared/game-config/sample-games.ts`); it mirrors the
 * `madrona` entry so local UI review and the demo flow exercise the
 * block. The mirror shares the `madrona` object, so its newsletter
 * href names the real `/event/madrona/signup` route rather than a
 * nonexistent `first-sample` one. Same-origin resolution still
 * requires an origin that proxies site routes (the canonical site
 * origin and its preview deployments): on the bare Vite dev server —
 * the only place the fixture resolves — and on the direct apps/web
 * host there is no cross-app proxy, so the click falls to the SPA's
 * not-found page. Accepted: the fixture exists for rendering
 * coverage, not cross-app navigation, and closing that gap is a dev-
 * topology task (a Vite dev proxy or origin-aware href helper)
 * tracked in `docs/tracking/dev-workflow-improvements.md`, not a
 * content concern.
 */

import { madronaFacts } from "./madrona-facts.ts";

/** One link-out section of the completion CTA block. */
export type CompletionCtaLink = {
  body: string;
  buttonLabel: string;
  href: string;
};

/** Completion-screen CTA content for a single event. */
export type CompletionCtaContent = {
  heading: string;
  /**
   * Present only when the event's newsletter surface is enabled;
   * `href` is the same-origin `/event/<slug>/signup` path of that
   * surface.
   */
  newsletter?: CompletionCtaLink;
  /** Present only when the event has a donation destination. */
  donate?: CompletionCtaLink;
};

const madronaCompletionCta: CompletionCtaContent = {
  heading: "Enjoying Music in the Playfield?",
  newsletter: {
    body: "Get next week's lineup and neighborhood events in your inbox.",
    buttonLabel: "Sign up for updates",
    href: "/event/madrona/signup",
  },
  donate: {
    body:
      "These concerts are free because neighbors chip in — 100% of donations go to the association.",
    buttonLabel: "Support the Playfield",
    href: madronaFacts.donateHref,
  },
};

/** Slug → completion CTA content. Absent slugs render no CTA block. */
export const completionCtaBySlug: Record<string, CompletionCtaContent> = {
  "madrona": madronaCompletionCta,
  "first-sample": madronaCompletionCta,
};

/** Resolves the completion CTA content for an event slug, if any. */
export function getCompletionCta(slug: string): CompletionCtaContent | null {
  return completionCtaBySlug[slug] ?? null;
}
