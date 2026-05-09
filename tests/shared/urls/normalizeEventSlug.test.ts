import { describe, expect, it } from "vitest";
import { normalizeEventSlug } from "../../../shared/urls";

describe("normalizeEventSlug", () => {
  it("lowercases ASCII uppercase characters", () => {
    expect(normalizeEventSlug("Madrona")).toBe("madrona");
    expect(normalizeEventSlug("MADRONA")).toBe("madrona");
  });

  it("preserves already-lowercase slugs", () => {
    expect(normalizeEventSlug("harvest-block-party")).toBe(
      "harvest-block-party",
    );
  });

  it("preserves digits, hyphens, and underscores", () => {
    expect(normalizeEventSlug("event-2026_v2")).toBe("event-2026_v2");
  });

  it("lowercases Unicode uppercase characters", () => {
    expect(normalizeEventSlug("Ädrona")).toBe("ädrona");
  });
});
