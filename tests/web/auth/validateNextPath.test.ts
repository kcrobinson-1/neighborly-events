import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateNextPath } from "../../../apps/web/src/auth/validateNextPath.ts";
import { routes } from "../../../apps/web/src/routes.ts";

const TEST_ORIGIN = "https://example.test";

const rejectedInputs: Array<{ description: string; input: string | null }> = [
  { description: "absolute cross-origin https", input: "https://evil.com/anything" },
  { description: "absolute cross-origin http", input: "http://evil.com/anything" },
  { description: "protocol-relative", input: "//evil.com/anything" },
  { description: "backslash path", input: "/\\evil.com" },
  { description: "javascript: scheme", input: "javascript:alert(1)" },
  { description: "JavaScript: case variant", input: "JavaScript:alert(1)" },
  { description: "JAVASCRIPT: uppercase", input: "JAVASCRIPT:alert(1)" },
  { description: "data: scheme", input: "data:text/html,<script>alert(1)</script>" },
  { description: "mailto: scheme", input: "mailto:x@y.com" },
  { description: "file: scheme", input: "file:///etc/passwd" },
  { description: "path traversal", input: "/admin/../evil" },
  { description: "null byte injection", input: "/admin%00/evil" },
  { description: "unknown pathname", input: "/unknown/route" },
  { description: "empty string", input: "" },
  { description: "null", input: null },
  { description: "whitespace only", input: "   " },
  { description: "scheme mismatch against https origin", input: "http://example.test/admin" },
  { description: "RTL override prefix", input: "\u202e/admin" },
  { description: "callback self-loop", input: "/auth/callback" },
];

describe("validateNextPath", () => {
  const originalOrigin = Object.getOwnPropertyDescriptor(
    window,
    "location",
  );

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL(TEST_ORIGIN),
      writable: true,
    });
  });

  afterEach(() => {
    if (originalOrigin) {
      Object.defineProperty(window, "location", originalOrigin);
    }
  });

  describe("rejects bypass vectors by returning routes.home", () => {
    for (const { description, input } of rejectedInputs) {
      it(`rejects ${description}`, () => {
        expect(validateNextPath(input)).toBe(routes.home);
      });
    }
  });

  describe("accepts allow-listed paths and round-trips the pathname", () => {
    it("accepts the home path", () => {
      expect(validateNextPath("/")).toBe(routes.home);
    });

    it("accepts the admin dashboard", () => {
      expect(validateNextPath("/admin")).toBe(routes.admin);
    });

    it("accepts an admin event selection route", () => {
      expect(validateNextPath("/admin/events/some-id")).toBe(
        "/admin/events/some-id",
      );
    });

    it("accepts a URL-encoded admin event id", () => {
      expect(
        validateNextPath("/admin/events/id%20with%20spaces"),
      ).toBe("/admin/events/id%20with%20spaces");
    });

    it("accepts an attendee game route", () => {
      expect(validateNextPath("/event/some-slug/game")).toBe(
        "/event/some-slug/game",
      );
    });

    it("accepts an attendee redeem route", () => {
      expect(validateNextPath("/event/some-slug/redeem")).toBe(
        "/event/some-slug/redeem",
      );
    });

    it("accepts a URL-encoded redeem route", () => {
      expect(
        validateNextPath("/event/slug%20with%20spaces/redeem"),
      ).toBe("/event/slug%20with%20spaces/redeem");
    });

    it("drops the query string and round-trips the pathname", () => {
      expect(validateNextPath("/event/some-slug/game?foo=bar")).toBe(
        "/event/some-slug/game",
      );
    });
  });

  it("never throws on any input, including malformed strings", () => {
    const torture: Array<string | null> = [
      ...rejectedInputs.map((entry) => entry.input),
      "https://[::1",
      "http://",
      "\u0000",
      "/",
      "/admin",
      "   /admin   ",
      "%zz",
      "https://evil.com/\r\n/admin",
    ];

    for (const input of torture) {
      expect(() => validateNextPath(input)).not.toThrow();
    }
  });
});
