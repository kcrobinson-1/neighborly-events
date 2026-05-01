import { describe, expect, it } from "vitest";

import { getThemeForSlug } from "../../../shared/styles/getThemeForSlug.ts";
import { platformTheme } from "../../../shared/styles/themes/platform.ts";
import { themes } from "../../../shared/styles/themes/index.ts";
import { harvestBlockPartyTheme } from "../../../shared/styles/themes/harvest-block-party.ts";
import { riversideJamTheme } from "../../../shared/styles/themes/riverside-jam.ts";

describe("getThemeForSlug", () => {
  it("returns the platform Theme for unregistered slugs", () => {
    expect(getThemeForSlug("madrona")).toBe(platformTheme);
    expect(getThemeForSlug("any-slug")).toBe(platformTheme);
    expect(getThemeForSlug("")).toBe(platformTheme);
  });

  it("returns harvestBlockPartyTheme for the harvest-block-party slug", () => {
    // M3 phase 3.1.1 registers the first per-event Theme. The
    // assertion is referential identity (`toBe`), not deep-equal, so
    // the test fails if the registry is rewired to a copy or alias of
    // a different Theme.
    expect(getThemeForSlug("harvest-block-party")).toBe(harvestBlockPartyTheme);
  });

  it("returns riversideJamTheme for the riverside-jam slug", () => {
    // M3 phase 3.2 registers the second per-event Theme. Same
    // referential-identity stance as the harvest case above so a typo
    // at the consumer side fails the test even when the rendered HTML
    // looks plausible at first glance.
    expect(getThemeForSlug("riverside-jam")).toBe(riversideJamTheme);
  });

  it("registry contains the registered per-event themes", () => {
    // Tripwire: when a phase registers a new per-event Theme, this
    // assertion updates alongside an explicit per-slug resolution
    // case above so resolver behavior is verified, not asserted by
    // code reasoning.
    expect(Object.keys(themes).sort()).toEqual([
      "harvest-block-party",
      "riverside-jam",
    ]);
  });
});
