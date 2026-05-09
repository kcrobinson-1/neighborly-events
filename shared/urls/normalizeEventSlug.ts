/**
 * Canonical event-slug normalizer. Every URL entry point that extracts
 * a slug from the request path must route its raw slug through this
 * helper before using it for DB lookup, theme resolution, persisted
 * fields (`event_slug` inserts), or rendered URL interpolation.
 *
 * The rule is "match the lowercase canonical slug stored in the DB."
 * A printed QR with an accidentally capitalized letter, or an attendee
 * hand-typing a proper-noun slug, otherwise renders the not-found /
 * empty state because the slug is compared byte-for-byte against the
 * lowercase canonical form.
 *
 * Centralized so future normalization rules (Unicode NFC, trim, etc.)
 * land in one place rather than diffusing across every event-route
 * entry point in apps/web and apps/site.
 */
export function normalizeEventSlug(rawSlug: string): string {
  return rawSlug.toLowerCase();
}
