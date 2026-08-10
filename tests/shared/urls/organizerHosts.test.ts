import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import nextConfig from "../../../apps/site/next.config.ts";
import { registeredEventSlugs } from "../../../apps/site/lib/eventContent.ts";
import {
  organizerHostRoutes,
  organizerHosts,
} from "../../../shared/urls/organizerHosts.ts";

/**
 * Assertions on the rewrite set `apps/site/next.config.ts` actually
 * produces, with every expectation derived from the host→event mapping
 * rather than restated here.
 *
 * The derivation is the thing under test, so a case that spelled the
 * expected hostname out would pass while asserting nothing about it.
 * The mapping is therefore the only source of hostnames and slugs
 * below, and the config's own source text is checked for the same
 * property.
 */

const nextConfigPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../apps/site/next.config.ts",
);

/** The apps/site Vercel project's primary alias — never a mapped host. */
const CANONICAL_HOST = "neighborly-events-site.vercel.app";

/** The proxy rows that predate host-conditional routing, in file order. */
const PROXY_SOURCES = [
  "/event/:slug/game",
  "/event/:slug/game/:path*",
  "/event/:slug/admin",
  "/event/:slug/admin/:path*",
  "/assets/:path*",
];

type RewriteRow = {
  source: string;
  destination: string;
  has?: Array<{ type: string; key?: string; value?: string }>;
};

async function emittedRewrites() {
  const rewrites = await nextConfig.rewrites?.();

  if (!rewrites || Array.isArray(rewrites)) {
    throw new Error(
      "rewrites() must return the object form; the bare array puts every " +
        "row in afterFiles, which the organizer root can never reach.",
    );
  }

  return {
    beforeFiles: rewrites.beforeFiles as RewriteRow[],
    afterFiles: rewrites.afterFiles as RewriteRow[],
  };
}

/**
 * Resolves a `has` host condition the way the runtime does: Next.js
 * lowercases the request hostname, strips any port, and tests it
 * against a `RegExp` built by anchoring the condition's value at both
 * ends (`matchHas` in
 * `next/dist/shared/lib/router/utils/prepare-destination.js`).
 *
 * Mirrored rather than asserted on the condition's spelling, so the
 * case fails for any escaping that does not actually narrow the match.
 */
function hostConditionMatches(row: RewriteRow, hostname: string): boolean {
  const condition = row.has?.find((entry) => entry.type === "host");

  if (!condition?.value) {
    return false;
  }

  const requestHostname = hostname.split(":", 1)[0].toLowerCase();

  return new RegExp(`^${condition.value}$`).test(requestHostname);
}

/**
 * A hostname that differs from a mapped one only at a separator, which
 * an unescaped condition absorbs. Derived from the mapping so it stays
 * a near-match of whatever the mapping holds.
 */
function nearMatchHostname(hostname: string): string {
  return hostname.replace(".", "-");
}

describe("organizer host mapping", () => {
  it("maps only slugs apps/site prerenders", () => {
    expect(organizerHosts.length).toBeGreaterThan(0);

    for (const { hostname, eventSlug } of organizerHosts) {
      expect(registeredEventSlugs, `${hostname} event slug`).toContain(
        eventSlug,
      );
    }
  });

  it("maps only literal short paths", () => {
    for (const { hostname, shortPath } of organizerHostRoutes()) {
      expect(shortPath, `${hostname} short path`).toMatch(/^\/[^:*]*$/);
    }
  });
});

describe("organizer host rewrites", () => {
  it("emits exactly the mapping's routes, in the beforeFiles phase", async () => {
    // beforeFiles is what lets the organizer root win against `/`,
    // which is a real route on this app.
    const { beforeFiles } = await emittedRewrites();
    const routes = organizerHostRoutes();

    expect(beforeFiles).toHaveLength(routes.length);

    for (const { hostname, shortPath, longPath } of routes) {
      const row = beforeFiles.find(
        (candidate) =>
          candidate.source === shortPath &&
          hostConditionMatches(candidate, hostname),
      );

      expect(row, `${hostname}${shortPath}`).toBeDefined();
      expect(row?.destination).toBe(longPath);
    }
  });

  it("gives every added row a host condition and a literal source", async () => {
    const { beforeFiles } = await emittedRewrites();

    for (const row of beforeFiles) {
      expect(
        row.has?.filter((entry) => entry.type === "host"),
        `${row.source} host condition`,
      ).toHaveLength(1);
      expect(row.source, `${row.source} source`).toMatch(/^\/[^:*]*$/);
    }
  });

  it("matches each mapped host exactly and no near-match of it", async () => {
    // The mapped-and-canonical pair alone passes whether or not the
    // condition is escaped. A near-match is what tells them apart: an
    // unescaped separator absorbs the difference, and the result is a
    // registrable hostname that would silently serve this event.
    const { beforeFiles } = await emittedRewrites();

    for (const { hostname, shortPath } of organizerHostRoutes()) {
      const nearMatch = nearMatchHostname(hostname);

      expect(nearMatch, `${hostname} near-match`).not.toBe(hostname);

      const rows = beforeFiles.filter((row) => row.source === shortPath);
      const matching = rows.filter((row) => hostConditionMatches(row, hostname));

      expect(matching, `${hostname}${shortPath}`).toHaveLength(1);

      for (const row of rows) {
        expect(
          hostConditionMatches(row, nearMatch),
          `${nearMatch}${shortPath}`,
        ).toBe(false);
        expect(
          hostConditionMatches(row, hostname.toUpperCase()),
          `${hostname.toUpperCase()}${shortPath} is the same host`,
        ).toBe(true);
      }
    }
  });

  it("leaves the canonical host with no host-conditional row", async () => {
    // I1: the regression this phase can cause is invisible to any case
    // that exercises only the new host.
    const { beforeFiles } = await emittedRewrites();

    expect(organizerHosts.map((entry) => entry.hostname)).not.toContain(
      CANONICAL_HOST,
    );

    for (const row of beforeFiles) {
      expect(
        hostConditionMatches(row, CANONICAL_HOST),
        `${CANONICAL_HOST}${row.source}`,
      ).toBe(false);
    }
  });

  it("keeps the proxy rows in afterFiles, in their emitted order", async () => {
    // Moving to the object form could have relocated these silently:
    // they would still resolve in most probes, and the failure would
    // surface only where a real file shadows a proxied path.
    const { beforeFiles, afterFiles } = await emittedRewrites();

    expect(afterFiles.map((row) => row.source)).toEqual(PROXY_SOURCES);
    expect(afterFiles.every((row) => row.has === undefined)).toBe(true);

    for (const source of PROXY_SOURCES) {
      expect(beforeFiles.map((row) => row.source)).not.toContain(source);
    }
  });

  it("writes no mapped hostname or slug alongside the import", () => {
    // Without this, the config could restate the mapping and every
    // case above would still pass — reporting coverage of a derivation
    // that isn't happening.
    const source = readFileSync(nextConfigPath, "utf8");

    for (const { hostname, eventSlug } of organizerHosts) {
      expect(source, `${hostname} in next.config.ts`).not.toContain(hostname);
      expect(source, `${eventSlug} in next.config.ts`).not.toContain(eventSlug);
    }
  });
});
