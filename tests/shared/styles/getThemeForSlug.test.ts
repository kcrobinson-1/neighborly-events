import { describe, expect, it } from "vitest";

import { getThemeForSlug } from "../../../shared/styles/getThemeForSlug.ts";
import { platformTheme } from "../../../shared/styles/themes/platform.ts";
import { themes } from "../../../shared/styles/themes/index.ts";

describe("getThemeForSlug", () => {
  it("returns the platform Theme for unregistered slugs", () => {
    expect(getThemeForSlug("madrona")).toBe(platformTheme);
    expect(getThemeForSlug("any-slug")).toBe(platformTheme);
    expect(getThemeForSlug("")).toBe(platformTheme);
  });

  it("registry is empty in M1 phase 1.5.2", () => {
    // Per-event themes register over time (M3 test events; M4 Madrona).
    // This assertion is a tripwire: if the registry grows, this test
    // updates to assert per-slug resolution at the same time so
    // resolver behavior is verified, not asserted by code reasoning.
    expect(Object.keys(themes)).toHaveLength(0);
  });
});
