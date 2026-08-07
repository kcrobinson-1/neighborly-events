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
 * a destination owned by a different slug.
 *
 * A section whose content sets `external` opens in a new browsing
 * context always. A same-origin section navigates in the same tab
 * once the completed quiz state (including the check-in code) is
 * confirmed persisted on the device — leaving the quiz app is then
 * loss-free and returning restores the results without a replay —
 * and falls back to a new tab when device storage is unavailable, so
 * navigation cannot destroy the only copy of the code. The two rules
 * are independent; see `GameCompletionPanel`'s `ctaLinkAttrs`.
 *
 * This registry is the deliberately lightweight launch-mode
 * conditional (driver: Aug 11 Madrona launch push); if per-event
 * content later consolidates into a shared registry, fold this
 * module into it.
 *
 * Config-owned hrefs keep destinations out of component code so
 * events without an entry stay unaffected and a URL swap is a
 * content edit, not a component edit.
 *
 * `first-sample` is the local-prototype demo fixture of the Madrona
 * experience (`shared/game-config/sample-games.ts`); it mirrors the
 * `madrona` entry so local UI review and the demo flow exercise the
 * block. The mirror shares the `madrona` object, so both of its
 * destinations are the association's real ones rather than
 * nonexistent `first-sample` equivalents. Both are absolute external
 * URLs, so they resolve identically from every origin — including the
 * bare Vite dev server, where the fixture is the only entry that
 * renders. (Before the email-list destination moved off the platform
 * it was a same-origin path that only resolved behind the cross-app
 * proxy; that dev-topology gap, still tracked in
 * `docs/tracking/dev-workflow-improvements.md`, no longer touches
 * this registry.)
 */

import { madronaFacts } from "./madrona-facts.ts";

/**
 * One link-out section of the completion CTA block.
 *
 * `external` is the content-owned declaration that the destination
 * leaves the platform. It is one of the two independent reasons the
 * panel opens a link in a new browsing context — see the panel's own
 * note in `GameCompletionPanel.tsx`; the other is the pre-persistence
 * fallback described above, which applies only to same-origin links.
 * Same name, same meaning as the field on `MastheadLink`
 * (`shared/masthead/mastheadContent.ts`) and `EventLandingAction`
 * (`apps/site/lib/eventContent.ts`).
 */
export type CompletionCtaLink = {
  body: string;
  buttonLabel: string;
  href: string;
  external?: boolean;
};

/** Completion-screen CTA content for a single event. */
export type CompletionCtaContent = {
  heading: string;
  /**
   * Present only when the event has an email-list destination to
   * offer. `href` is that destination, whatever it is — the
   * organization's own signup page on a mail provider, for events
   * like Madrona whose list the platform does not own.
   */
  emailList?: CompletionCtaLink;
  /** Present only when the event has a donation destination. */
  donate?: CompletionCtaLink;
};

const madronaCompletionCta: CompletionCtaContent = {
  heading: "Enjoying Music in the Playfield?",
  emailList: {
    body:
      "Next week's lineup and neighborhood news, straight from the association.",
    buttonLabel: "Join the email list",
    href: madronaFacts.emailListHref,
    external: true,
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
