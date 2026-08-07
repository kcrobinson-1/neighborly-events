import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { registeredEventSlugs } from "../../../apps/site/lib/eventContent.ts";

/**
 * Route-set assertions for the `/event/[slug]` family.
 *
 * These read the App Router directory rather than rendered output,
 * because filesystem structure *is* the route set in Next.js App
 * Router: a `page.tsx` under `app/event/[slug]/<segment>/` publishes
 * `/event/<slug>/<segment>` for every slug `generateStaticParams`
 * enumerates, regardless of what that page renders. A route removed by
 * emptying its page body would still serve a 200 at its path and would
 * pass any assertion made against rendered output; it fails here.
 *
 * The composed set is derived from `registeredEventSlugs` — the same
 * source `generateStaticParams` reads — so registering a new event
 * extends the walk without editing this file.
 */

const eventRouteDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../apps/site/app/event/[slug]",
);

/** The sub-route segments the `[slug]` directory publishes today. */
function publishedSubRouteSegments(): string[] {
  return readdirSync(eventRouteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) =>
      readdirSync(path.join(eventRouteDir, entry.name)).some((file) =>
        /^page\.(tsx|ts|jsx|js)$/.test(file),
      ),
    )
    .map((entry) => entry.name);
}

/** Every concrete path the event route family serves. */
function builtEventRoutes(): string[] {
  const segments = publishedSubRouteSegments();

  return registeredEventSlugs.flatMap((slug) => [
    `/event/${slug}`,
    ...segments.map((segment) => `/event/${slug}/${segment}`),
  ]);
}

describe("event route set", () => {
  it("serves no email-signup path for any registered slug", () => {
    // The on-site signup surface was removed from the platform: the
    // association runs its own list, and the route prerendered for every
    // registered slug whether or not that event had opted in — which is
    // how two test events came to publish crawlable signup pages for a
    // form neither of them authored.
    const routes = builtEventRoutes();

    expect(publishedSubRouteSegments()).not.toContain("signup");

    for (const slug of registeredEventSlugs) {
      expect(routes, `${slug} signup path`).not.toContain(
        `/event/${slug}/signup`,
      );
    }
  });

  it("still serves the landing and feedback paths for every registered slug", () => {
    // The negative above is only meaningful if this file can see the
    // routes that do exist; without this case, a broken directory read
    // would make the signup assertion pass vacuously.
    const routes = builtEventRoutes();

    expect(registeredEventSlugs.length).toBeGreaterThan(0);

    for (const slug of registeredEventSlugs) {
      expect(routes).toContain(`/event/${slug}`);
      expect(routes).toContain(`/event/${slug}/feedback`);
    }
  });
});
