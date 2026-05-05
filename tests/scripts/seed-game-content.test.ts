import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const { assertHttpsUrl, assertSeedConfig, assertUuid, parseArgs } = require(
  "../../scripts/release/seed-game-content.cjs",
) as {
  assertHttpsUrl: (value: string, name: string) => void;
  assertSeedConfig: (value: unknown, source: string) => void;
  assertUuid: (value: string, name: string) => void;
  parseArgs: (argv: string[]) => Record<string, string>;
};

const validContent = {
  id: "madrona",
  slug: "madrona",
  name: "Madrona Music in the Playfield",
};

const validSeedConfig = {
  eventCode: "MAD",
  content: validContent,
};

describe("seed-game-content parseArgs", () => {
  it("parses --key value pairs", () => {
    expect(parseArgs(["--content", "shared/events/madrona.ts"])).toEqual({
      content: "shared/events/madrona.ts",
    });
  });

  it("treats a flag with no following value as the string \"true\"", () => {
    expect(parseArgs(["--dry-run"])).toEqual({ "dry-run": "true" });
  });

  it("treats consecutive --flags as boolean flags, not key/value pairs", () => {
    expect(parseArgs(["--dry-run", "--content", "x.ts"])).toEqual({
      "dry-run": "true",
      content: "x.ts",
    });
  });

  it("ignores positional tokens that don't start with --", () => {
    expect(parseArgs(["positional", "--content", "x.ts", "trailing"])).toEqual({
      content: "x.ts",
    });
  });

  it("returns an empty object for empty input", () => {
    expect(parseArgs([])).toEqual({});
  });
});

describe("seed-game-content assertHttpsUrl", () => {
  it("accepts an https:// URL", () => {
    expect(() => assertHttpsUrl("https://example.supabase.co", "URL")).not.toThrow();
  });

  it("rejects http:// (the production-edit safety check)", () => {
    expect(() => assertHttpsUrl("http://example.supabase.co", "URL")).toThrow(
      /must start with https:\/\//,
    );
  });

  it("rejects an empty / non-https value", () => {
    expect(() => assertHttpsUrl("example.supabase.co", "URL")).toThrow(
      /must start with https:\/\//,
    );
    expect(() => assertHttpsUrl("ftp://example.supabase.co", "URL")).toThrow(
      /must start with https:\/\//,
    );
  });

  it("includes the env-var name in the error message for actionable diagnostics", () => {
    expect(() => assertHttpsUrl("ws://x", "TEST_SUPABASE_URL")).toThrow(
      /TEST_SUPABASE_URL/,
    );
  });
});

describe("seed-game-content assertUuid", () => {
  it("accepts a canonical lowercase UUID", () => {
    expect(() =>
      assertUuid("00000000-0000-0000-0000-000000000000", "actor"),
    ).not.toThrow();
    expect(() =>
      assertUuid("a1b2c3d4-e5f6-7890-abcd-ef0123456789", "actor"),
    ).not.toThrow();
  });

  it("accepts uppercase hex (UUIDs are case-insensitive)", () => {
    expect(() =>
      assertUuid("A1B2C3D4-E5F6-7890-ABCD-EF0123456789", "actor"),
    ).not.toThrow();
  });

  it("rejects a non-UUID string", () => {
    expect(() => assertUuid("not-a-uuid", "actor")).toThrow(/must be a valid UUID/);
  });

  it("rejects a UUID with the wrong segment lengths", () => {
    expect(() =>
      assertUuid("00000000-0000-0000-0000-00000000000", "actor"),
    ).toThrow(/must be a valid UUID/);
    expect(() =>
      assertUuid("00000000-0000-0000-00000-000000000000", "actor"),
    ).toThrow(/must be a valid UUID/);
  });

  it("rejects an empty string", () => {
    expect(() => assertUuid("", "actor")).toThrow(/must be a valid UUID/);
  });

  it("includes the env-var name in the error message", () => {
    expect(() => assertUuid("oops", "GAME_SEED_PUBLISHED_BY_USER_ID")).toThrow(
      /GAME_SEED_PUBLISHED_BY_USER_ID/,
    );
  });
});

describe("seed-game-content assertSeedConfig", () => {
  it("accepts a well-formed config", () => {
    expect(() => assertSeedConfig(validSeedConfig, "fixture.ts")).not.toThrow();
  });

  it("rejects a missing seedConfig export", () => {
    expect(() => assertSeedConfig(undefined, "fixture.ts")).toThrow(
      /did not export a `seedConfig` object/,
    );
    expect(() => assertSeedConfig(null, "fixture.ts")).toThrow(
      /did not export a `seedConfig` object/,
    );
  });

  it("rejects a non-object seedConfig", () => {
    expect(() => assertSeedConfig("a string", "fixture.ts")).toThrow(
      /did not export a `seedConfig` object/,
    );
  });

  it("rejects an eventCode that isn't 3 characters", () => {
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: "MA" }, "fixture.ts"),
    ).toThrow(/must be a 3-character string/);
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: "MADR" }, "fixture.ts"),
    ).toThrow(/must be a 3-character string/);
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: "" }, "fixture.ts"),
    ).toThrow(/must be a 3-character string/);
  });

  it("rejects a non-string eventCode", () => {
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: 123 }, "fixture.ts"),
    ).toThrow(/must be a 3-character string/);
  });

  it("rejects a lowercase eventCode (uppercase contract)", () => {
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: "mad" }, "fixture.ts"),
    ).toThrow(/must be uppercase/);
    expect(() =>
      assertSeedConfig({ ...validSeedConfig, eventCode: "Mad" }, "fixture.ts"),
    ).toThrow(/must be uppercase/);
  });

  it("rejects a missing or non-object content", () => {
    expect(() =>
      assertSeedConfig({ eventCode: "MAD", content: undefined }, "fixture.ts"),
    ).toThrow(/`seedConfig.content` must be an object/);
    expect(() =>
      assertSeedConfig({ eventCode: "MAD", content: "string" }, "fixture.ts"),
    ).toThrow(/`seedConfig.content` must be an object/);
  });

  it("rejects content with empty / non-string id", () => {
    expect(() =>
      assertSeedConfig(
        { eventCode: "MAD", content: { ...validContent, id: "" } },
        "fixture.ts",
      ),
    ).toThrow(/`seedConfig.content.id` must be a non-empty string/);
    expect(() =>
      assertSeedConfig(
        { eventCode: "MAD", content: { ...validContent, id: 42 } },
        "fixture.ts",
      ),
    ).toThrow(/`seedConfig.content.id` must be a non-empty string/);
  });

  it("rejects content with empty / non-string slug", () => {
    expect(() =>
      assertSeedConfig(
        { eventCode: "MAD", content: { ...validContent, slug: "" } },
        "fixture.ts",
      ),
    ).toThrow(/`seedConfig.content.slug` must be a non-empty string/);
  });

  it("rejects content with empty / non-string name", () => {
    expect(() =>
      assertSeedConfig(
        { eventCode: "MAD", content: { ...validContent, name: "" } },
        "fixture.ts",
      ),
    ).toThrow(/`seedConfig.content.name` must be a non-empty string/);
  });

  it("includes the source path in error messages for actionable diagnostics", () => {
    expect(() =>
      assertSeedConfig(undefined, "shared/events/madrona-demo-game-content.ts"),
    ).toThrow(/shared\/events\/madrona-demo-game-content\.ts/);
  });
});

describe("seed-game-content seed module integration", () => {
  it("the committed Madrona seed module passes assertSeedConfig", async () => {
    const mod = (await import(
      "../../shared/events/madrona-demo-game-content.ts"
    )) as { seedConfig: unknown };
    expect(() =>
      assertSeedConfig(mod.seedConfig, "shared/events/madrona-demo-game-content.ts"),
    ).not.toThrow();
  });
});
