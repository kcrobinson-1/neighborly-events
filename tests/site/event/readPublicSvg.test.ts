import { describe, expect, it } from "vitest";

import { readPublicSvg } from "../../../apps/site/lib/readPublicSvg.ts";

/**
 * Filesystem-facing tests run from the repo root (vitest's cwd), so
 * they exercise the `apps/site/public` probe branch; `next build`
 * exercises the `public` branch with the same files. Reading the
 * real committed masthead doubles as an asset-presence check for the
 * launch content's `mastheadSvgPath`.
 */
describe("readPublicSvg", () => {
  it("reads the committed madrona masthead and strips the XML declaration", () => {
    const markup = readPublicSvg("/events/madrona/masthead.svg");
    expect(markup).not.toBeNull();
    expect(markup!.startsWith("<svg")).toBe(true);
    expect(markup).toContain('viewBox="0 0 1848 1284"');
    expect(markup).not.toContain("<?xml");
  });

  it("returns null for a missing file", () => {
    expect(readPublicSvg("/events/madrona/not-a-real-file.svg")).toBeNull();
  });

  it("returns null for a path that escapes public/", () => {
    expect(readPublicSvg("/../package.json")).toBeNull();
    expect(readPublicSvg("../../../package.json")).toBeNull();
  });
});
