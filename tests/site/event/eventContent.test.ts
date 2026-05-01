import { describe, expect, it } from "vitest";

import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../apps/site/lib/eventContent.ts";

describe("getEventContentBySlug", () => {
  it("returns null for any slug while the registry is empty", () => {
    // The registry literal in `apps/site/lib/eventContent.ts` ships
    // empty in this commit; the Harvest Block Party content module
    // registers in the next commit, at which point this file gains a
    // round-trip case asserting the registered content resolves.
    expect(getEventContentBySlug("harvest-block-party")).toBeNull();
    expect(getEventContentBySlug("madrona")).toBeNull();
    expect(getEventContentBySlug("")).toBeNull();
  });
});

describe("registeredEventSlugs", () => {
  it("is empty while the registry holds no entries", () => {
    expect(registeredEventSlugs).toEqual([]);
  });
});
