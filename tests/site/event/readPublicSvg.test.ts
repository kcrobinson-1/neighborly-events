import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readPublicSvg } from "../../../apps/site/lib/readPublicSvg.ts";

/**
 * `readPublicSvg` resolves against `process.cwd()/public` through a
 * single statically-scoped expression (the shape Next's file tracing
 * requires — see the module doc), so these tests `chdir` into
 * `apps/site` the way `next build` runs, and restore afterwards.
 * Reading the real committed masthead doubles as an asset-presence
 * check for the launch content's `mastheadSvgPath`.
 */
describe("readPublicSvg", () => {
  const repoRootCwd = process.cwd();

  beforeAll(() => {
    process.chdir(join(repoRootCwd, "apps", "site"));
  });

  afterAll(() => {
    process.chdir(repoRootCwd);
  });
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
