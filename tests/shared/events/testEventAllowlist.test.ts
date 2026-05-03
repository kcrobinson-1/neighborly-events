import { describe, expect, it } from "vitest";
import {
  isTestEventSlug,
  TEST_EVENT_SLUGS,
} from "../../../shared/events/testEventAllowlist.ts";

describe("TEST_EVENT_SLUGS", () => {
  it("contains exactly the two demo-expansion test event slugs", () => {
    expect([...TEST_EVENT_SLUGS]).toEqual([
      "harvest-block-party",
      "riverside-jam",
    ]);
  });
});

describe("isTestEventSlug", () => {
  it("returns true for harvest-block-party", () => {
    expect(isTestEventSlug("harvest-block-party")).toBe(true);
  });

  it("returns true for riverside-jam", () => {
    expect(isTestEventSlug("riverside-jam")).toBe(true);
  });

  it("returns false for an unrelated real-event slug", () => {
    expect(isTestEventSlug("madrona-launch-day")).toBe(false);
  });

  it("returns false for an empty slug", () => {
    expect(isTestEventSlug("")).toBe(false);
  });

  it("returns false for a near-miss with a trailing character (suffix-match drift guard)", () => {
    expect(isTestEventSlug("harvest-block-partyy")).toBe(false);
  });

  it("returns false for a near-miss with leading whitespace", () => {
    expect(isTestEventSlug(" harvest-block-party")).toBe(false);
  });
});
