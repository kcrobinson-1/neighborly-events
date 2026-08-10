/**
 * Helpers for the cross-surface destination-drift assertions.
 *
 * Four surfaces state the association's three outbound destinations,
 * and they live in modules that cannot all import each other, so the
 * "these all reach one address" invariant is asserted where two shapes
 * meet. Since `withSource` (`shared/events/madrona-facts.ts`) tags each
 * surface with its own `utm_medium`, those hrefs are deliberately not
 * equal as strings any more — comparing them whole would assert the
 * opposite of the invariant. `destinationOf` reduces an href to the
 * part that must not drift.
 *
 * Not a `.test.ts` file, so the vitest `include` glob does not collect
 * it as a suite.
 */

/** The address an href points at, campaign tags and query aside. */
export function destinationOf(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;

  const url = new URL(href);

  return `${url.origin}${url.pathname}`;
}

/** The `utm_medium` an href carries, or `null` when it carries none. */
export function campaignMediumOf(href: string | undefined): string | null {
  if (href === undefined) return null;

  return new URL(href).searchParams.get("utm_medium");
}
