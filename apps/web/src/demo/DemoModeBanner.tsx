import type { TestEventSlug } from "../../../../shared/events/testEventAllowlist";

type DemoModeSurface = "admin" | "redeem" | "redemptions";

type DemoModeBannerProps = {
  slug: TestEventSlug;
  surface: DemoModeSurface;
};

const SURFACE_PHRASES: Record<DemoModeSurface, string> = {
  admin: "the event-authoring workspace",
  redeem: "the redemption booth",
  redemptions: "redemption monitoring",
};

const EVENT_DISPLAY_NAMES: Record<TestEventSlug, string> = {
  "harvest-block-party": "Harvest Block Party",
  "riverside-jam": "Riverside Jam",
};

/**
 * Banner shown above the bypass-rendered surface so a partner walking
 * the demo cannot mistake it for the production-equivalent admin /
 * volunteer / organizer experience. Mirrors the visual semantics of
 * the apps/site `TestEventDisclaimer` (`role="note"`, fixed
 * supplementary-information color recipe that opts out of themable
 * surface tokens) so the demo-mode signal reads consistently across
 * both apps.
 */
export function DemoModeBanner({ slug, surface }: DemoModeBannerProps) {
  return (
    <aside
      aria-label="Demo mode disclaimer"
      className="demo-mode-banner"
      role="note"
    >
      <strong>Demo mode.</strong>{" "}
      <span>
        You&apos;re viewing a demo of {SURFACE_PHRASES[surface]} for{" "}
        {EVENT_DISPLAY_NAMES[slug]}. This is read-only.
      </span>
    </aside>
  );
}
