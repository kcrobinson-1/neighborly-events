import { describe, expect, it } from "vitest";
import {
  EVENT_SLUG_MAX_LENGTH,
  EVENT_SLUG_PATTERN,
  EVENT_SLUG_RULE_MESSAGE,
  isValidEventSlug,
  validateEventSlug,
} from "../../../shared/urls";

describe("isValidEventSlug", () => {
  it.each([
    "a",
    "harvest-block-party",
    "riverside-jam",
    "community-checklist",
    "madrona",
    "event-2026",
    "2026-event",
    "a1",
  ])("accepts canonical kebab-case slug %s", (slug) => {
    expect(isValidEventSlug(slug)).toBe(true);
  });

  it.each([
    ["", "empty string"],
    ["-leading", "leading hyphen"],
    ["trailing-", "trailing hyphen"],
    ["UPPER", "uppercase"],
    ["Mixed-Case", "mixed case"],
    ["has space", "whitespace"],
    ["with_underscore", "underscore"],
    ["with/slash", "slash"],
    ["with?query", "reserved url char"],
    ["with#fragment", "fragment marker"],
    ["with.dot", "dot"],
    ["with%percent", "percent"],
    ["héllo", "non-ascii"],
  ])("rejects %s (%s)", (slug) => {
    expect(isValidEventSlug(slug)).toBe(false);
  });

  it("rejects slugs longer than the max length", () => {
    const tooLong = "a".repeat(EVENT_SLUG_MAX_LENGTH + 1);
    expect(isValidEventSlug(tooLong)).toBe(false);
  });

  it("accepts slugs exactly at the max length", () => {
    const atLimit = "a".repeat(EVENT_SLUG_MAX_LENGTH);
    expect(isValidEventSlug(atLimit)).toBe(true);
  });
});

describe("validateEventSlug", () => {
  it("returns silently for a canonical slug", () => {
    expect(() => validateEventSlug("harvest-block-party")).not.toThrow();
  });

  it("throws the canonical rule message for an invalid slug", () => {
    expect(() => validateEventSlug("Bad Slug")).toThrow(
      EVENT_SLUG_RULE_MESSAGE,
    );
  });
});

describe("EVENT_SLUG_PATTERN", () => {
  it("is anchored and matches the canonical shape", () => {
    expect(EVENT_SLUG_PATTERN.source).toBe(
      "^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$",
    );
  });
});
