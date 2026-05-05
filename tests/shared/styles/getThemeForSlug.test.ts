import { describe, expect, it } from "vitest";

import { getThemeForSlug } from "../../../shared/styles/getThemeForSlug.ts";
import { platformTheme } from "../../../shared/styles/themes/platform.ts";
import { themes } from "../../../shared/styles/themes/index.ts";
import { harvestBlockPartyTheme } from "../../../shared/styles/themes/harvest-block-party.ts";
import { madronaTheme } from "../../../shared/styles/themes/madrona.ts";
import { riversideJamTheme } from "../../../shared/styles/themes/riverside-jam.ts";

describe("getThemeForSlug", () => {
  it("returns the platform Theme for unregistered slugs", () => {
    expect(getThemeForSlug("not-a-real-slug")).toBe(platformTheme);
    expect(getThemeForSlug("")).toBe(platformTheme);
  });

  it("returns harvestBlockPartyTheme for the harvest-block-party slug", () => {
    // M3 phase 3.1.1 registered the first per-event Theme. The
    // assertion is referential identity (`toBe`), not deep-equal, so
    // the test fails if the registry is rewired to a copy or alias of
    // a different Theme.
    expect(getThemeForSlug("harvest-block-party")).toBe(harvestBlockPartyTheme);
  });

  it("returns riversideJamTheme for the riverside-jam slug", () => {
    // M3 phase 3.2 registered the second per-event Theme. Same
    // referential-identity stance as the harvest case above so a typo
    // at the consumer side fails the test even when the rendered HTML
    // looks plausible at first glance.
    expect(getThemeForSlug("riverside-jam")).toBe(riversideJamTheme);
  });

  it("returns madronaTheme for the madrona slug", () => {
    // The Madrona demo-build epic M1 phase 1.1 registered Madrona as
    // the first non-test per-event Theme. Referential identity again.
    expect(getThemeForSlug("madrona")).toBe(madronaTheme);
  });

  it("every registry key resolves to its registered Theme (not the platform fallback)", () => {
    // Contract walk over the registry rather than a hard-coded
    // exact-list assertion: this fails if a new Theme is added with
    // a key that doesn't round-trip through `getThemeForSlug`, or if
    // the registry's value is `undefined` / aliased away. Adding a
    // new event Theme requires a per-slug `toBe` case above (so
    // resolver behavior is verified per Theme), not a fixture
    // update here.
    for (const slug of Object.keys(themes)) {
      const resolved = getThemeForSlug(slug);
      expect(resolved, `expected registered Theme for slug=${slug}`).toBe(themes[slug]);
      expect(resolved, `${slug} should not fall back to platform`).not.toBe(platformTheme);
    }
  });
});
