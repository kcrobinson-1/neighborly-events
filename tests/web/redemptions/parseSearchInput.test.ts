import { describe, expect, it } from "vitest";
import { parseSearchInput } from "../../../apps/web/src/redemptions/parseSearchInput";

describe("parseSearchInput", () => {
  it("returns no_filter for empty and whitespace-only input", () => {
    expect(parseSearchInput("", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("   ", "MAD")).toEqual({ type: "no_filter" });
  });

  it("returns suffix_match for a pure 4-digit suffix", () => {
    expect(parseSearchInput("0427", "MAD")).toEqual({
      suffix: "0427",
      type: "suffix_match",
    });
  });

  it("matches a lowercase acronym plus dash and suffix when the acronym agrees", () => {
    expect(parseSearchInput("mad-0427", "MAD")).toEqual({
      suffix: "0427",
      type: "suffix_match",
    });
  });

  it("tolerates a space instead of a dash between acronym and suffix", () => {
    expect(parseSearchInput("MAD 0427", "MAD")).toEqual({
      suffix: "0427",
      type: "suffix_match",
    });
  });

  it("tolerates no separator between acronym and suffix", () => {
    expect(parseSearchInput("MAD0427", "MAD")).toEqual({
      suffix: "0427",
      type: "suffix_match",
    });
  });

  it("returns cross_event_mismatch for an acronym that disagrees with the locked event code", () => {
    const result = parseSearchInput("MAD-0427", "FALL");

    expect(result).toEqual({ type: "cross_event_mismatch" });
    // Explicit non-leakage contract: the result shape must not expose the
    // input acronym, suffix, or any hint that the code might exist elsewhere.
    expect(JSON.stringify(result)).not.toContain("MAD");
    expect(JSON.stringify(result)).not.toContain("0427");
  });

  it("returns no_filter for partial shapes so a typing user sees the full list", () => {
    expect(parseSearchInput("04", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("M", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("MAD-", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("MAD-04", "MAD")).toEqual({ type: "no_filter" });
  });

  it("returns no_filter for non-matching shapes (letters only, more than 4 digits)", () => {
    expect(parseSearchInput("XYZ999", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("12345", "MAD")).toEqual({ type: "no_filter" });
    expect(parseSearchInput("MAD-12345", "MAD")).toEqual({ type: "no_filter" });
  });

  it("does not throw on malformed input", () => {
    expect(() => parseSearchInput("\u0000", "MAD")).not.toThrow();
    expect(() => parseSearchInput("*(!@", "MAD")).not.toThrow();
  });
});
