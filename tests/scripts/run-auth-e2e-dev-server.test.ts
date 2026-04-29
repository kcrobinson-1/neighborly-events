import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const { isReadyRequest, isSiteRequest, readyPath } = require(
  "../../scripts/testing/run-auth-e2e-dev-server.cjs",
) as {
  isReadyRequest: (url: string) => boolean;
  isSiteRequest: (url: string) => boolean;
  readyPath: string;
};

describe("auth e2e dev server routing", () => {
  it("keeps the readiness path owned by the proxy", () => {
    expect(readyPath).toBe("/__auth-e2e-ready");
    expect(isReadyRequest("/__auth-e2e-ready")).toBe(true);
    expect(isReadyRequest("/__auth-e2e-ready?cache-bust=1")).toBe(false);
    expect(isSiteRequest("/__auth-e2e-ready")).toBe(false);
  });

  it("routes site-owned auth, landing, and admin paths to apps/site", () => {
    expect(isSiteRequest("/")).toBe(true);
    expect(isSiteRequest("/?utm_source=test")).toBe(true);
    expect(isSiteRequest("/auth/callback")).toBe(true);
    expect(isSiteRequest("/auth/callback?next=/admin")).toBe(true);
    expect(isSiteRequest("/_next/static/chunk.js")).toBe(true);
    expect(isSiteRequest("/__nextjs_original-stack-frames")).toBe(true);
    expect(isSiteRequest("/admin")).toBe(true);
    expect(isSiteRequest("/admin?from=signin")).toBe(true);
    expect(isSiteRequest("/admin/events/sample")).toBe(true);
  });

  it("leaves event-scoped paths on apps/web", () => {
    expect(isSiteRequest("/event/first-sample/redeem")).toBe(false);
    expect(isSiteRequest("/event/first-sample/redemptions")).toBe(false);
    expect(isSiteRequest("/event/first-sample/game")).toBe(false);
    expect(isSiteRequest("/event/first-sample/admin")).toBe(false);
  });
});
