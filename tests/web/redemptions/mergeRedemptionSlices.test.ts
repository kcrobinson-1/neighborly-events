import { describe, expect, it } from "vitest";
import { mergeRedemptionSlices } from "../../../apps/web/src/redemptions/mergeRedemptionSlices";
import type { RedemptionRow } from "../../../apps/web/src/redemptions/types";

function makeRedeemed(overrides: Partial<RedemptionRow>): RedemptionRow {
  return {
    event_id: "event-1",
    id: "row-redeemed",
    redeemed_at: "2026-04-22T10:00:00Z",
    redeemed_by: "user-a",
    redeemed_by_role: "agent",
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "MAD-0001",
    ...overrides,
  };
}

function makeReversed(overrides: Partial<RedemptionRow>): RedemptionRow {
  return {
    event_id: "event-1",
    id: "row-reversed",
    redeemed_at: null,
    redeemed_by: null,
    redeemed_by_role: null,
    redemption_reversed_at: "2026-04-22T10:05:00Z",
    redemption_reversed_by: "user-b",
    redemption_reversed_by_role: "organizer",
    redemption_status: "unredeemed",
    verification_code: "MAD-0002",
    ...overrides,
  };
}

describe("mergeRedemptionSlices", () => {
  it("returns an empty array for two empty slices", () => {
    expect(mergeRedemptionSlices([], [], 500)).toEqual([]);
  });

  it("sorts a redeemed-only slice by redeemed_at desc", () => {
    const rows = [
      makeRedeemed({ id: "a", redeemed_at: "2026-04-22T09:00:00Z" }),
      makeRedeemed({ id: "b", redeemed_at: "2026-04-22T11:00:00Z" }),
      makeRedeemed({ id: "c", redeemed_at: "2026-04-22T10:00:00Z" }),
    ];

    expect(
      mergeRedemptionSlices(rows, [], 500).map((row) => row.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("sorts a reversed-only slice by redemption_reversed_at desc", () => {
    const rows = [
      makeReversed({ id: "a", redemption_reversed_at: "2026-04-22T09:00:00Z" }),
      makeReversed({ id: "b", redemption_reversed_at: "2026-04-22T11:00:00Z" }),
      makeReversed({ id: "c", redemption_reversed_at: "2026-04-22T10:00:00Z" }),
    ];

    expect(
      mergeRedemptionSlices([], rows, 500).map((row) => row.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("interleaves redeemed and reversed rows by the activity timestamp", () => {
    const redeemed = [
      makeRedeemed({ id: "r1", redeemed_at: "2026-04-22T10:30:00Z" }),
      makeRedeemed({ id: "r2", redeemed_at: "2026-04-22T10:00:00Z" }),
    ];
    const reversed = [
      makeReversed({ id: "v1", redemption_reversed_at: "2026-04-22T10:45:00Z" }),
      makeReversed({ id: "v2", redemption_reversed_at: "2026-04-22T10:15:00Z" }),
    ];

    expect(
      mergeRedemptionSlices(redeemed, reversed, 500).map((row) => row.id),
    ).toEqual(["v1", "r1", "v2", "r2"]);
  });

  it("dedupes a row that lives in both slices and prefers the redeemed-slice record", () => {
    const redeemedRow = makeRedeemed({
      id: "shared",
      redeemed_at: "2026-04-22T12:00:00Z",
      redemption_reversed_at: "2026-04-22T11:00:00Z",
      redemption_reversed_by: "user-b",
      redemption_reversed_by_role: "organizer",
    });
    const reversedCopyOfSameRow = makeReversed({
      id: "shared",
      redeemed_at: null,
      redemption_reversed_at: "2026-04-22T11:00:00Z",
    });

    const merged = mergeRedemptionSlices(
      [redeemedRow],
      [reversedCopyOfSameRow],
      500,
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].redemption_status).toBe("redeemed");
    expect(merged[0].redeemed_at).toBe("2026-04-22T12:00:00Z");
    expect(merged[0]).toBe(redeemedRow);
  });

  it("breaks timestamp ties using id desc", () => {
    const tiedTimestamp = "2026-04-22T10:00:00Z";
    const rows = [
      makeRedeemed({ id: "a", redeemed_at: tiedTimestamp }),
      makeRedeemed({ id: "c", redeemed_at: tiedTimestamp }),
      makeRedeemed({ id: "b", redeemed_at: tiedTimestamp }),
    ];

    expect(
      mergeRedemptionSlices(rows, [], 500).map((row) => row.id),
    ).toEqual(["c", "b", "a"]);
  });

  it("applies the cap after dedupe and sort, not before", () => {
    const redeemed = [
      makeRedeemed({ id: "r-keep", redeemed_at: "2026-04-22T11:00:00Z" }),
      makeRedeemed({ id: "r-drop", redeemed_at: "2026-04-22T09:00:00Z" }),
    ];
    const reversed = [
      makeReversed({
        id: "v-keep",
        redemption_reversed_at: "2026-04-22T10:00:00Z",
      }),
      makeReversed({
        id: "v-drop",
        redemption_reversed_at: "2026-04-22T08:00:00Z",
      }),
    ];

    expect(
      mergeRedemptionSlices(redeemed, reversed, 2).map((row) => row.id),
    ).toEqual(["r-keep", "v-keep"]);
  });

  it("returns an empty array when cap is zero or negative", () => {
    const rows = [makeRedeemed({})];

    expect(mergeRedemptionSlices(rows, [], 0)).toEqual([]);
    expect(mergeRedemptionSlices(rows, [], -1)).toEqual([]);
  });
});
