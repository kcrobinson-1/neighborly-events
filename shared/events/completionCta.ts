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
 * the same-origin feedback path of an event whose feedback surface
 * is enabled — the `feedback_enabled_events` row seeded by the
 * Madrona feedback epic's migration plus the apps/site
 * `EventContent.feedback` block that makes `/event/<slug>/feedback`
 * a real form route. The completion panel links there with a plain
 * same-origin anchor because the feedback route is owned by apps/site
 * across the proxy topology. This registry is the deliberately
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
 * button lands on the real `/event/madrona/feedback` route rather
 * than a nonexistent `first-sample` one. The fixture only resolves
 * under the Vite prototype fallback, so the mirror never reaches
 * production routes.
 */

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
   * Present only when the event's feedback surface is enabled; `href`
   * is the same-origin `/event/<slug>/feedback` path of that surface.
   */
  newsletter?: CompletionCtaLink;
  /** Present only when the event has a donation destination. */
  donate?: CompletionCtaLink;
};

const madronaCompletionCta: CompletionCtaContent = {
  heading: "Enjoying Music in the Playfield?",
  newsletter: {
    body: "Get the next lineup and neighborhood events in your inbox.",
    buttonLabel: "Sign up for updates",
    href: "/event/madrona/feedback",
  },
  donate: {
    body:
      "This concert series is free because neighbors chip in — 100% of donations go to the association.",
    buttonLabel: "Support the Playfield",
    href: "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
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
