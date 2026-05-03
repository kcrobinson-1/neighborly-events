/**
 * Single source of truth for the demo-expansion test-event allowlist.
 *
 * Every TypeScript guard site that asks "is this slug bypass-eligible
 * for demo-mode" — apps/web page-component bypass branches, the
 * `read-demo-event` Edge Function's allowlist gate, the future write-
 * side rejection branches in mutation Edge Functions — imports
 * `isTestEventSlug` from this module and consumes the predicate. Slug
 * literals must not appear at any new bypass-eligibility guard site.
 *
 * Content-shaped slug references (the per-event Theme registry, the
 * apps/site `EventContent` registry, the home-page `RoleDoors` demo
 * target) are deliberately not refactored to consume this module:
 * those references catalog content, not bypass policy, and coupling
 * them would conflate two seams that change for different reasons.
 */

export const TEST_EVENT_SLUGS = [
  "harvest-block-party",
  "riverside-jam",
] as const;

export type TestEventSlug = (typeof TEST_EVENT_SLUGS)[number];

export function isTestEventSlug(slug: string): slug is TestEventSlug {
  return (TEST_EVENT_SLUGS as readonly string[]).includes(slug);
}
