/**
 * Canonical event-slug shape rules. Slugs are rendered into printed QR
 * URLs and the `/event/:slug/*` route family, so the shape is constrained
 * to kebab-case ASCII at the write boundary:
 *
 *   - lowercase ASCII letters, digits, and hyphens
 *   - cannot start or end with a hyphen
 *   - single-character slugs are valid
 *   - capped at 64 characters
 *
 * Pairs with the lowercase normalizer in `normalizeEventSlug.ts` (read
 * path defense) and DB CHECK constraints on `game_event_drafts.slug`,
 * `game_events.slug`, and `feedback_enabled_events.slug` (storage layer
 * defense-in-depth). Underscores are deliberately rejected even though
 * URL-safe — every shipped slug is hyphenated and consistency reduces
 * QR/URL pattern fragmentation.
 */
export const EVENT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const EVENT_SLUG_MAX_LENGTH = 64;

export const EVENT_SLUG_RULE_MESSAGE =
  "Slug must use lowercase letters, digits, and hyphens (no leading/trailing hyphen, up to 64 characters).";

/** Returns true when `slug` matches the canonical shape and length bound. */
export function isValidEventSlug(slug: string): boolean {
  return slug.length <= EVENT_SLUG_MAX_LENGTH && EVENT_SLUG_PATTERN.test(slug);
}

/** Throws a user-facing Error when `slug` violates the canonical shape. */
export function validateEventSlug(slug: string): void {
  if (!isValidEventSlug(slug)) {
    throw new Error(EVENT_SLUG_RULE_MESSAGE);
  }
}
